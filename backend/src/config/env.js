const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('*'),
  APP_TIMEZONE: z
    .string()
    .min(1)
    .refine((value) => {
      try {
        Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch (error) {
        return false;
      }
    }, 'APP_TIMEZONE must be a valid IANA timezone')
    .default('Asia/Kolkata'),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  ADMIN_EMAILS: z.string().optional(),
  MAX_EXPORT_ROWS: z.coerce.number().int().positive().default(5000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.message).join(', ');
  throw new Error(`Invalid environment variables: ${issues}`);
}

const env = parsed.data;

const adminEmails = new Set(
  (env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

const corsOrigins = env.CORS_ORIGIN === '*'
  ? ['*']
  : env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean);

module.exports = {
  ...env,
  adminEmails,
  corsOrigins,
};
