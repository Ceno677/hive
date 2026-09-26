import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {planSchema,bundleSchema,keySchema} from './domain.js';
const uuid=z.string().uuid(),transaction=z.string().max(16000);
export const requestSchemas:Record<string,z.ZodTypeAny>={
 '/api/auth/challenge':z.object({wallet:keySchema}).strict(),
 '/api/auth/verify':z.object({id:uuid,wallet:keySchema,signature:z.string().max(100)}).strict(),
 '/api/mint/quote':z.object({requestKey:uuid,seatId:z.number().int().min(1).max(888)}).strict(),
 '/api/mint/prepare':z.object({id:uuid}).strict(),
 '/api/mint/confirm':z.object({id:uuid,transaction}).strict(),
 '/api/requests/quote':z.object({requestKey:uuid,prompt:z.string().min(12).max(8000),public:z.boolean().default(false),mode:z.enum(['BUILD','SOLANA_APP']).default('BUILD'),plan:planSchema.optional(),turnstileToken:z.string().min(1).max(2048).optional()}).strict(),
 '/api/requests/:id/submit':z.object({transaction}).strict(),
 '/api/workflows/:id/prepare-expired-refund':z.object({}).strict(),
 '/api/workflows/:id/submit-expired-refund':z.object({transaction}).strict(),
 '/api/github/connect':z.object({}).strict(),
 '/api/worker/claim':z.object({kind:z.enum(['BUILD','VERIFY'])}).strict(),
 '/api/worker/attempts/:id/renew':z.object({generation:z.number().int()}).strict(),
 '/api/worker/attempts/:id/submit':z.object({generation:z.number().int(),bundle:bundleSchema}).strict(),
 '/api/workers/register':z.object({seatId:z.number().int().min(1).max(888),deviceKey:keySchema,name:z.string().min(1).max(80),capabilities:z.array(z.enum(['typescript','html','rust'])).min(1).max(3),maxConcurrent:z.number().int().min(1).max(4).default(1),public:z.boolean().default(false)}).strict(),
 '/api/workflows/:id/approve-delivery':z.object({action:z.enum(['GITHUB','STATIC_SITE','SOLANA_PROGRAM']),target:z.string().min(1).max(160),artifactHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict()
};
export function jsonSchema(path:string){const schema=requestSchemas[path];return schema?zodToJsonSchema(schema,{$refStrategy:'none',target:'openApi3'}):undefined;}
