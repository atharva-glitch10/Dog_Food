import { z } from 'zod';
import { CertificateType } from '@prisma/client';

export const GenerateCertificatesSchema = z.object({
  type: z.nativeEnum(CertificateType),
});
