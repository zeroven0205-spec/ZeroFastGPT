import z from 'zod';

export const AppEntryAppKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._~-]*$/)
  .describe('业务方 AppKey');

export const GetAppEntryConfigQuerySchema = z.object({
  appKey: AppEntryAppKeySchema
});
export type GetAppEntryConfigQueryType = z.infer<typeof GetAppEntryConfigQuerySchema>;

const AppEntryBrandConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  logo: z.string(),
  favicon: z.string(),
  primaryColor: z.string(),
  supportUrl: z.string().url().optional(),
  privacyUrl: z.string().url().optional(),
  termsUrl: z.string().url().optional()
});

const AppEntryFeaturesSchema = z.object({
  showHistory: z.boolean(),
  allowFileUpload: z.boolean(),
  allowVoiceInput: z.boolean(),
  showCitation: z.boolean(),
  showFeedback: z.boolean(),
  allowRegister: z.boolean()
});

export const AppEntryPublicConfigSchema = z.object({
  appKey: AppEntryAppKeySchema,
  enabled: z.literal(true),
  brand: AppEntryBrandConfigSchema,
  features: AppEntryFeaturesSchema
}).strict();
export type AppEntryPublicConfigType = z.infer<typeof AppEntryPublicConfigSchema>;
