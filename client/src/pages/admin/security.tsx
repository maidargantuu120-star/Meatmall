import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, LockKeyhole } from 'lucide-react';
import { adminPasswordChangeSchema } from '@shared/admin-password';
import { AdminLayout } from '@/components/admin/layout';
import { AdminHeader } from '@/components/admin/header';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui';
import { setAuthToken } from '@/lib/auth-token';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AdminInvitations } from '@/components/admin/invitations';

type PasswordForm = z.infer<typeof adminPasswordChangeSchema>;

export default function AdminSecurity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const form = useForm<PasswordForm>({
    resolver: zodResolver(adminPasswordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: PasswordForm) {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json() as { message?: string; token?: string };
      if (!response.ok) throw new Error(result.message || 'Нууц үг солиход алдаа гарлаа.');
      setAuthToken(result.token);
      form.reset();
      setSaved(true);
      toast({ title: 'Нууц үг амжилттай солигдлоо.' });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Дахин оролдоно уу.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-xl space-y-6">
        <AdminHeader title="Админ бүртгэл" />
        <AdminInvitations />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5" /> Админы нууц үг</CardTitle>
            <p className="break-all text-sm text-muted-foreground">Нэвтэрсэн админ: {user?.email}</p>
            <a href="/admin/forgot-password" className="text-sm font-semibold text-brand hover:underline">Одоогийн нууц үгээ мартсан уу? И-мэйлээр сэргээх</a>
            <p className="text-sm text-muted-foreground">Шинэ нууц үг хадгалмагц хүчинтэй болно. Бусад төхөөрөмжийн нэвтрэлт дуусна.</p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <fieldset disabled={saving} className="space-y-5">
                  {([
                    ['currentPassword', 'Одоогийн нууц үг', 'current-password'],
                    ['newPassword', 'Шинэ нууц үг', 'new-password'],
                    ['confirmPassword', 'Шинэ нууц үг давтах', 'new-password'],
                  ] as const).map(([name, label, autoComplete]) => (
                    <FormField key={name} control={form.control} name={name} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl><Input {...field} type="password" autoComplete={autoComplete} maxLength={name === 'currentPassword' ? 1024 : 128} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </fieldset>
                <p className="text-sm text-muted-foreground">12–128 тэмдэгттэй, өөр газар ашигладаггүй нууц үг сонгоно уу.</p>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {saved && <p role="status" className="text-sm text-green-700">Нууц үг солигдлоо. Дараагийн удаа шинэ нууц үгээрээ нэвтэрнэ үү.</p>}
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Нууц үг солих
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
