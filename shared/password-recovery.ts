import { z } from 'zod';

export const passwordRecoveryRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('И-мэйл хаягаа зөв оруулна уу.').max(254),
});
export const recoveryTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const passwordRecoveryResetSchema = z.object({
  token: recoveryTokenSchema,
  newPassword: z.string().min(12, 'Нууц үг 12-оос доошгүй тэмдэгттэй байна.').max(128),
  confirmPassword: z.string(),
}).refine(value => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'], message: 'Шинэ нууц үг таарахгүй байна.',
});
