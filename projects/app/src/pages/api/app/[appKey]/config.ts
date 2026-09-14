import type { NextApiRequest } from 'next';
import { AppErrEnum } from '@fastgpt/global/common/error/code/app';
import {
  AppEntryPublicConfigSchema,
  GetAppEntryConfigQuerySchema,
  type AppEntryPublicConfigType
} from '@fastgpt/global/openapi/core/appEntry/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { NextAPI } from '@/service/middleware/entry';
import { getAppEntryConfig, toPublicAppEntryConfig } from '@/service/core/appEntry/config';
import { withAppEntryPublicError } from '@/service/core/appEntry/error';

async function handler(req: NextApiRequest): Promise<AppEntryPublicConfigType> {
  const { appKey } = parseApiInput({
    req,
    querySchema: GetAppEntryConfigQuerySchema
  }).query;

  return withAppEntryPublicError(async () => {
    const config = await getAppEntryConfig({ appKey });
    if (!config) {
      return Promise.reject(AppErrEnum.unExist);
    }

    return AppEntryPublicConfigSchema.parse(toPublicAppEntryConfig({ config }));
  });
}

export default NextAPI(handler);
