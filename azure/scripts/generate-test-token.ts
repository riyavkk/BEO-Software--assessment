#!/usr/bin/env tsx

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { UserRole } from '../src/types';

dotenv.config();

const secret: string = process.env.JWT_SECRET || 'default-secret-change-in-production';

interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

function generateToken(payload: TokenPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as unknown as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, secret, { expiresIn });
}

const adminToken = generateToken({
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
});

const userToken = generateToken({
  id: '22222222-2222-2222-2222-222222222222',
  email: 'user@example.com',
  role: UserRole.USER,
});


