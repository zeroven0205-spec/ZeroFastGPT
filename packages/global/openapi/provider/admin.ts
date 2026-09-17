import { createDocument } from 'zod-openapi';
import { adminOpenAPIPaths, adminOpenAPITagGroups } from '../path';

export const adminOpenAPIDocument = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'gptGO Admin API',
    version: '0.1.0',
    description: 'gptGO Admin API 文档'
  },
  paths: adminOpenAPIPaths,
  servers: [{ url: '/api' }],
  'x-tagGroups': adminOpenAPITagGroups
});
