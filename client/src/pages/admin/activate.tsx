import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { adminActivationSchema } from '@shared/admin-invitation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';

export default function AdminActivate() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/invitations/inspect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async response => { const result = await response.json() as { email: string; message?: string }; if (!response.ok) throw new Error(result.message); if (alive) setEmail(result.email); })
      .catch(e => { if (alive) setError(e.message || 'Урилгыг шалгаж чадсангүй.'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [token]);
  async function accept(event: FormEvent) {
    event.preventDefault();
    const parsed = adminActivationSchema.safeParse({ token, name, newPassword, confirmPassword });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Мэдээллээ шалгана уу.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/invitations/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message);
      setNewPassword(''); setConfirmPassword(''); setDone(true);
      window.history.replaceState(null, '', '/admin/activate');
    } catch (e) { setError(e instanceof Error ? e.message : 'Дахин оролдоно уу.'); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
    <Card className="w-full max-w-lg">
      <CardHeader><CardTitle>Meat Mall · Админ бүртгэл</CardTitle>
        <p className="text-sm text-muted-foreground">Өөрийн нэр, шинэ нууц үгээ тохируулна уу. Өмнөх админы нууц үг шаардлагагүй.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {done ? <div role="status" className="space-y-4">
          <p className="font-semibold text-green-700">Админ бүртгэл амжилттай үүслээ.</p>
          <p className="break-all text-sm">{email} и-мэйл болон шинэ нууц үгээрээ нэвтэрнэ үү.</p>
          <Link href="/admin/login" className="inline-block font-semibold text-brand underline">Админ нэвтрэх</Link>
        </div> : <>
          {busy && !email && <p role="status">Урилгыг шалгаж байна...</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {email && <form onSubmit={accept} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">Нэвтрэх и-мэйл<Input type="email" value={email} readOnly autoComplete="username" /></label>
            <label className="block space-y-2 text-sm font-medium">Таны нэр<Input value={name} onChange={e => setName(e.target.value)} required maxLength={100} autoComplete="name" disabled={busy} /></label>
            <label className="block space-y-2 text-sm font-medium">Шинэ нууц үг<Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={12} maxLength={128} autoComplete="new-password" disabled={busy} /></label>
            <label className="block space-y-2 text-sm font-medium">Шинэ нууц үг давтах<Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={12} maxLength={128} autoComplete="new-password" disabled={busy} /></label>
            <p className="text-sm text-muted-foreground">12–128 тэмдэгттэй, өөр газар ашигладаггүй нууц үг сонгоно уу. Энэ бүртгэл дэлгүүрийн бүх админ эрхтэй байна.</p>
            <Button type="submit" className="w-full" disabled={busy}>Админ бүртгэл үүсгэх</Button>
          </form>}
        </>}
      </CardContent>
    </Card>
  </main>;
}
