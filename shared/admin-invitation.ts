import { z } from 'zod';

export const adminInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email('И-мэйл хаягаа зөв оруулна уу.').max(254),
});
export const adminActivationSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().trim().min(1, 'Нэрээ оруулна уу.').max(100),
  newPassword: z.string().min(12, 'Нууц үг 12-оос доошгүй тэмдэгттэй байна.').max(128),
  confirmPassword: z.string(),
}).refine(value => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'], message: 'Нууц үг таарахгүй байна.',
});
