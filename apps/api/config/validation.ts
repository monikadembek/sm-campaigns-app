import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production'),
  PORT: Joi.number().default(3000),
  OPENAI_API_KEY: Joi.string().required(),
  SUPABASE_SECRET_KEY: Joi.string().required(),
  JWKS_DISCOVERY_URL: Joi.string().required(),
});
