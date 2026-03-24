export const configuration = () => ({
  NODE_ENV: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),
  openai_api_key: process.env.OPENAI_API_KEY,
  jwt_secret: process.env.SUPABASE_JWT_SECRET,
});
