import type { NextApiRequest, NextApiResponse } from 'next';
import {
  IssueAppEntryAuthCodeBodySchema,
  IssueAppEntryAuthCodeQuerySchema,
  IssueAppEntryAuthCodeResponseSchema,
  type IssueAppEntryAuthCodeResponseType
} from '@fastgpt/global/openapi/core/appEntry/auth';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { NextAPI } from '@/service/middleware/entry';
import { assertAppEntryAuthCodeIssuer, issueAppEntryAuthCode } from '@/service/core/appEntry/auth';
import { withAppEntryPublicError } from '@/service/core/appEntry/error';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<IssueAppEntryAuthCodeResponseType> {
  res.setHeader('Cache-Control', 'no-store');
  const { query, body } = parseApiInput({
    req,
    querySchema: IssueAppEntryAuthCodeQuerySchema,
    bodySchema: IssueAppEntryAuthCodeBodySchema
  });

  return withAppEntryPublicError(async () => {
    assertAppEntryAuthCodeIssuer({ authorization: req.headers.authorization });
    return IssueAppEntryAuthCodeResponseSchema.parse(
      await issueAppEntryAuthCode({ appKey: query.appKey, tmbId: body.tmbId })
    );
  });
}

// 该接口只供 APP 后端通过 Bearer 密钥调用，不依赖浏览器 Cookie 或 CSRF Token。
export default NextAPI(handler, { csrf: false });
