export const configuration = () => ({
  NODE_ENV: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),
  openai_api_key: process.env.OPENAI_API_KEY,
  supabase_secret_key: process.env.SUPABASE_SECRET_KEY,
  jwks_discovery_url: process.env.JWKS_DISCOVERY_URL,
});
