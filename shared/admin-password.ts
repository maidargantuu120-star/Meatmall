import { z } from 'zod';

export const adminPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Одоогийн нууц үгээ оруулна уу.').max(1024),
  newPassword: z.string().min(12, 'Шинэ нууц үг 12-оос доошгүй тэмдэгттэй байна.').max(128, '128-аас ихгүй тэмдэгт оруулна уу.'),
  confirmPassword: z.string(),
}).refine(value => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'], message: 'Шинэ нууц үг таарахгүй байна.',
}).refine(value => value.currentPassword !== value.newPassword, {
  path: ['newPassword'], message: 'Одоогийн нууц үгээс өөр нууц үг сонгоно уу.',
});
