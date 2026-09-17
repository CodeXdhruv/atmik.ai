export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  VECTORIZE: VectorizeIndex;
  AI: any; // Cloudflare Workers AI Binding
  
  // Environment variables
  OPENAI_API_KEY?: string;
  KOKORO_API_URL?: string; 
  TTS_ENDPOINT?: string;
  YOURVOIC_API_KEY?: string;
  
  // R2 S3 API Variables
  CLOUDFLARE_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_CUSTOM_DOMAIN?: string;
  FIREBASE_PROJECT_ID: string;
};
