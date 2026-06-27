const requiredEnv = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

export const ENV = {
  API_URL: requiredEnv(import.meta.env.VITE_API_URL, "VITE_API_URL"),
  GOOGLE_CLIENT_ID: requiredEnv(
    import.meta.env.VITE_GOOGLE_CLIENT_ID,
    "VITE_GOOGLE_CLIENT_ID"
  ),
  NODE_ENV: import.meta.env.MODE,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;