import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AppEntryAuthSessionResponseSchema,
  IssueAppEntryAuthCodeQuerySchema,
  type AppEntryAuthSessionResponseType
} from '@fastgpt/global/openapi/core/appEntry/auth';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { NextAPI } from '@/service/middleware/entry';
import { authAppEntry } from '@/service/core/appEntry/config';
import { withAppEntryPublicError } from '@/service/core/appEntry/error';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AppEntryAuthSessionResponseType> {
  res.setHeader('Cache-Control', 'no-store');
  const { appKey } = parseApiInput({
    req,
    querySchema: IssueAppEntryAuthCodeQuerySchema
  }).query;

  return withAppEntryPublicError(async () => {
    await authAppEntry({ req, appKey });
    return AppEntryAuthSessionResponseSchema.parse({ authenticated: true });
  });
}

export default NextAPI(handler);
