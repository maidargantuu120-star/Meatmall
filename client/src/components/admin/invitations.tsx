import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus, Copy } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';

type Invitation = { id: string; email: string; expiresAt: number; usedAt: number | null; revokedAt: number | null };
async function request<T = { success: boolean }>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(result.message || 'Дахин оролдоно уу.');
  return result;
}

export function AdminInvitations() {
  const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get('inviteEmail') || '');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const refresh = async () => setInvitations(await request<Invitation[]>('/api/admin/invitations'));
  useEffect(() => { void refresh().catch(e => setError(e.message)); }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true); setError(''); setLink(''); setCopied(false);
    try {
      const result = await request<{ url: string }>('/api/admin/invitations', { email });
      setLink(result.url); setConfirmed(false);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Дахин оролдоно уу.'); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setError('');
    try { await request(`/api/admin/invitations/${id}/revoke`, {}); setLink(''); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Дахин оролдоно уу.'); }
    finally { setBusy(false); }
  }
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Шинэ админ урих</CardTitle>
      <p className="text-sm text-muted-foreground">Дараагийн ажилтан өөрийн и-мэйл, нууц үгээр нэвтэрнэ. Таны бүртгэл хэвээр үлдэнэ. Одоогийн нууц үг шаардлагагүй.</p>
    </CardHeader>
    <CardContent className="space-y-5">
      <form onSubmit={create} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium">Шинэ админы и-мэйл
          <Input type="email" autoComplete="off" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} className="mt-1" />
          Энэ хүн бүтээгдэхүүн, захиалга, хэрэглэгч болон бүх админ тохиргоог удирдах эрхтэй болохыг зөвшөөрч байна.
        </label>
        <Button type="submit" disabled={busy || !confirmed}>Урилгын холбоос үүсгэх</Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {link && <div role="status" className="space-y-3 rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-semibold">Энэ холбоосыг зөвхөн шинэ админд хувийн сувгаар дамжуулна уу.</p>
        <Input aria-label="Урилгын холбоос" value={link} readOnly onFocus={e => e.target.select()} />
        <Button type="button" variant="outline" onClick={async () => {
          try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError('Холбоосыг сонгоод хуулна уу.'); }
        }}><Copy className="mr-2 h-4 w-4" />{copied ? 'Хууллаа' : 'Холбоос хуулах'}</Button>
        <p className="text-xs text-muted-foreground">И-мэйл автоматаар илгээгдэхгүй. Холбоос 24 цагийн хугацаатай, нэг удаа ашиглагдана. Хүлээн авагч нэр, шинэ нууц үгээ өөрөө тохируулна.</p>
      </div>}
      {invitations.length > 0 && <ul className="divide-y text-sm">
        {invitations.map(invitation => {
          const pending = !invitation.usedAt && !invitation.revokedAt && invitation.expiresAt > Date.now();
          return <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div><p className="break-all font-medium">{invitation.email}</p>
              <p className="text-xs text-muted-foreground">{invitation.usedAt ? 'Бүртгэл үүссэн' : invitation.revokedAt ? 'Цуцлагдсан' : pending ? `Хүлээгдэж байна · ${new Date(invitation.expiresAt).toLocaleString('mn-MN')}` : 'Хугацаа дууссан'}</p>
            </div>
            {pending && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => revoke(invitation.id)}>Цуцлах</Button>}
          </li>;
        })}
      </ul>}
    </CardContent>
  </Card>;
}
