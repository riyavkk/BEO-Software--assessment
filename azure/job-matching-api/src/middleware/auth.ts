import { Request, Response, NextFunction } from 'express';
import { ConfidentialClientApplication, AuthenticationResult } from '@azure/msal-node';
import { UserRole } from '../types';
import dotenv from 'dotenv';

dotenv.config();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

let msalClient: ConfidentialClientApplication | null = null;

const getMsalClient = (): ConfidentialClientApplication | null => {
  if (msalClient) {
    return msalClient;
  }

  const clientId = process.env.AZURE_AD_B2C_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_B2C_CLIENT_SECRET;
  const authority = process.env.AZURE_AD_B2C_AUTHORITY;

  if (!clientId || !clientSecret || !authority) {
    console.warn('Azure AD B2C configuration missing, using JWT fallback');
    return null;
  }

  try {
    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority,
      },
    });
    return msalClient;
  } catch (error) {
    console.error('Failed to initialize MSAL client:', error);
    return null;
  }
};

/**
 * Authenticate using Azure AD B2C or JWT fallback
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Try Azure AD B2C first
    const msal = getMsalClient();
    if (msal) {
      try {
        const result: AuthenticationResult | null = await msal.acquireTokenOnBehalfOf({
          scopes: ['openid', 'profile', 'email'],
          oboAssertion: token,
        });

        if (result && result.account) {
          // Extract user info from Azure AD B2C token
          // In production, you would decode the token and extract claims
          req.user = {
            id: result.account.homeAccountId,
            email: result.account.username || '',
            role: UserRole.USER, // Default role, should be extracted from token claims
          };
          next();
          return;
        }
      } catch (msalError) {
        console.warn('MSAL authentication failed, falling back to JWT:', msalError);
      }
    }

    // Fallback to JWT verification
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: UserRole;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Authorize based on user roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};

