import z from 'zod';
import { ObjectIdSchema } from '../../../common/type/mongo';
import { AppEntryAppKeySchema } from './api';

export const APP_ENTRY_REQUEST_HEADER = 'x-app-entry-key';

export const IssueAppEntryAuthCodeQuerySchema = z.object({
  appKey: AppEntryAppKeySchema
});
export type IssueAppEntryAuthCodeQueryType = z.infer<typeof IssueAppEntryAuthCodeQuerySchema>;

export const IssueAppEntryAuthCodeBodySchema = z
  .object({
    tmbId: ObjectIdSchema.describe('已由业务 APP 服务端映射出的团队成员 ID')
  })
  .strict();
export type IssueAppEntryAuthCodeBodyType = z.infer<typeof IssueAppEntryAuthCodeBodySchema>;

export const IssueAppEntryAuthCodeResponseSchema = z
  .object({
    code: z.string().min(32).max(128),
    expiresIn: z.number().int().min(30).max(120)
  })
  .strict();
export type IssueAppEntryAuthCodeResponseType = z.infer<typeof IssueAppEntryAuthCodeResponseSchema>;

export const AppEntryAuthSessionResponseSchema = z
  .object({
    authenticated: z.literal(true)
  })
  .strict();
export type AppEntryAuthSessionResponseType = z.infer<typeof AppEntryAuthSessionResponseSchema>;
