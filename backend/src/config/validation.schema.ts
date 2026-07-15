import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(12).required(),
  AUTH_ACCESS_TOKEN_TTL: Joi.string().default('12h'),
  AUTH_REFRESH_TOKEN_TTL_DAYS: Joi.number().default(30),
  DEV_SEED_PASSWORD: Joi.string().min(6).default('Password@123'),
  RETAILER_NOTE_THRESHOLD_CACHE_TTL_MS: Joi.number().min(0).default(60000),
  RETAILER_CREDIT_NOTE_MAX_AMOUNT: Joi.number().positive().default(1000000),
  RETAILER_CREDIT_NOTE_MAX_TAX_AMOUNT: Joi.number().positive().default(1000000),
  RETAILER_CREDIT_NOTE_MAX_TOTAL_AMOUNT: Joi.number().positive().default(1000000),
  RETAILER_DEBIT_NOTE_MAX_AMOUNT: Joi.number().positive().default(1000000),
});
