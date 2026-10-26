import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Loader2, Mail, LockKeyhole } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { passwordRecoveryRequestSchema, passwordRecoveryResetSchema } from '@shared/password-recovery';
import { clearAuthToken } from '@/lib/auth-token';

async function recoveryRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch('/api/admin/password-recovery/' + path, {
    method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(result.message || 'Дахин оролдоно уу.');
  return result;
}
function RecoveryLayout({ title, children }: { title: string; children: ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
    <div className="w-full max-w-md">
      <BrandLogo className="mx-auto mb-5 h-24 w-auto" />
      <Card className="rounded-2xl border-0 border-t-4 border-brand shadow-card">
        <CardHeader><CardTitle className="text-xl">{title}</CardTitle></CardHeader>
        <CardContent className="space-y-5">{children}
          <a href="/admin/login" className="block text-center text-sm font-semibold text-brand underline">Админ нэвтрэх рүү буцах</a>
        </CardContent>
      </Card>
    </div>
  </main>;
}
function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => {
    let active = true;
    recoveryRequest<{ configured: boolean }>('status').then(data => { if (active) setConfigured(data.configured); })
      .catch(() => { if (active) { setConfigured(false); setError('Имэйлийн үйлчилгээний төлөвийг шалгаж чадсангүй. Дахин ачаална уу.'); } });
    return () => { active = false; };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = passwordRecoveryRequestSchema.safeParse({ email });
    if (!parsed.success) { setError('И-мэйл хаягаа зөв оруулна уу.'); return; }
    setSending(true); setError(''); setSent(false);
    try { await recoveryRequest('request', parsed.data); setSent(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Дахин оролдоно уу.'); }
    finally { setSending(false); }
  }
  return <RecoveryLayout title="Админы нууц үг сэргээх">
    <p className="text-sm text-muted-foreground">Бүртгэлтэй админы и-мэйлээ оруулна уу. Шинэ нууц үг тохируулах холбоос илгээнэ.</p>
    {configured === false && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Нууц үг сэргээх имэйлийн үйлчилгээ хараахан холбогдоогүй байна. Дэлгүүрийн эзэмшигчтэй холбогдоно уу.</p>}
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2 text-sm font-medium">Админы и-мэйл
        <Input type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} disabled={sending} />
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={sending || configured !== true}>
        {sending || configured === null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Сэргээх холбоос авах
      </Button>
    </form>
    {sent && <div role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
      Энэ и-мэйл админ бүртгэлтэй бол сэргээх холбоос илгээнэ. Ирсэн имэйл болон spam хавтсаа шалгана уу.
      <p className="mt-2">Хамгийн сүүлд ирсэн холбоосыг ашиглана уу. Холбоос 15 минутын хугацаатай, нэг удаа ашиглагдана.</p>
    </div>}
  </RecoveryLayout>;
}
function ResetPassword() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    recoveryRequest<{ email: string }>('inspect', { token }).then(data => { if (active) setEmail(data.email); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [token]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = passwordRecoveryResetSchema.safeParse({ token, newPassword, confirmPassword });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Нууц үгээ шалгана уу.'); return; }
    setSaving(true); setError('');
    try {
      await recoveryRequest('reset', parsed.data);
      clearAuthToken(); setNewPassword(''); setConfirmPassword(''); setDone(true);
      window.history.replaceState(null, '', '/admin/reset-password');
    } catch (e) { setError(e instanceof Error ? e.message : 'Дахин оролдоно уу.'); }
    finally { setSaving(false); }
  }
  return <RecoveryLayout title="Шинэ нууц үг тохируулах">
    {checking && <p role="status" className="text-sm">Холбоосыг шалгаж байна...</p>}
    {done ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">Нууц үг шинэчлэгдлээ. Бүх төхөөрөмжийн хуучин нэвтрэлт дууссан. Шинэ нууц үгээрээ дахин нэвтэрнэ үү.</p> : <>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {email && <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium">Админы и-мэйл<Input value={email} readOnly autoComplete="username" /></label>
        <label className="block space-y-2 text-sm font-medium">Шинэ нууц үг<Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required disabled={saving} /></label>
        <label className="block space-y-2 text-sm font-medium">Шинэ нууц үг давтах<Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required disabled={saving} /></label>
        <p className="text-xs text-muted-foreground">12–128 тэмдэгттэй нууц үг сонгоно уу. Одоогийн нууц үг шаардлагагүй.</p>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}Шинэ нууц үг хадгалах</Button>
      </form>}
      {!checking && !email && <a href="/admin/forgot-password" className="inline-block font-semibold text-brand underline">Шинэ холбоос авах</a>}
    </>}
  </RecoveryLayout>;
}
export default function AdminPasswordRecovery() {
  const [location] = useLocation();
  useEffect(() => {
    const existing = document.querySelector<HTMLMetaElement>('meta[name="referrer"]');
    const meta = existing || document.createElement('meta');
    const previous = meta.content;
    meta.name = 'referrer'; meta.content = 'no-referrer';
    if (!existing) document.head.appendChild(meta);
    return () => { if (existing) meta.content = previous; else meta.remove(); };
  }, []);
  return location === '/admin/reset-password' ? <ResetPassword /> : <ForgotPassword />;
}
