import dotenv from 'dotenv';

dotenv.config();

export interface FeatureFlags {
  enableRedisCache: boolean;
  enableBetaFeatures: boolean;
  enableExportService: boolean;
}

export const getFeatureFlags = (): FeatureFlags => {
  return {
    enableRedisCache: process.env.ENABLE_REDIS_CACHE === 'true',
    enableBetaFeatures: process.env.ENABLE_BETA_FEATURES === 'true',
    enableExportService: process.env.ENABLE_EXPORT_SERVICE === 'true',
  };
};

export const featureFlags = getFeatureFlags();

