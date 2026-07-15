export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  appName: process.env.APP_NAME ?? 'Dairy Distributor ERP API',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  authAccessTokenTtl: process.env.AUTH_ACCESS_TOKEN_TTL ?? '12h',
  authRefreshTokenTtlDays: parseInt(
    process.env.AUTH_REFRESH_TOKEN_TTL_DAYS ?? '30',
    10,
  ),
  devSeedPassword: process.env.DEV_SEED_PASSWORD ?? 'Password@123',
});
