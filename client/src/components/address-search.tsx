import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/language-context';

type AddressResult = { address: string; roadAddress: string; jibunAddress: string; zonecode: string };
type PostcodeConstructor = new (options: { oncomplete: (data: AddressResult) => void; width: string; height: string }) => { embed: (element: HTMLElement) => void };
declare global { interface Window { kakao?: { Postcode?: PostcodeConstructor }; daum?: { Postcode?: PostcodeConstructor } } }
let loading: Promise<PostcodeConstructor> | undefined;
function loadPostcode() {
  const loaded = window.kakao?.Postcode || window.daum?.Postcode;
  if (loaded) return Promise.resolve(loaded);
  if (!loading) loading = new Promise<PostcodeConstructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    const timer = setTimeout(() => { script.remove(); loading = undefined; reject(new Error('Address search timeout')); }, 15000);
    script.onload = () => {
      clearTimeout(timer);
      const api = window.kakao?.Postcode || window.daum?.Postcode;
      if (api) resolve(api); else { loading = undefined; reject(new Error('Address search unavailable')); }
    };
    script.onerror = () => { clearTimeout(timer); script.remove(); loading = undefined; reject(new Error('Address search unavailable')); };
    document.head.appendChild(script);
  });
  return loading;
}
export function AddressSearch({ onSelect, buttonClassName }: {
  onSelect: (address: string, postcode: string) => void;
  buttonClassName?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  // A stable callback ref avoids remounting the address iframe as the form updates.
  const select = useRef(onSelect); select.current = onSelect;
  useEffect(() => {
    if (!open || !container) return;
    let active = true;
    loadPostcode().then(Postcode => {
      if (!active) return;
      new Postcode({ width: '100%', height: '100%', oncomplete: data => {
        select.current(data.roadAddress || data.jibunAddress || data.address, data.zonecode);
        setOpen(false);
      } }).embed(container);
    }).catch(() => { if (active) { setOpen(false); setError(true); } });
    return () => { active = false; };
  }, [open, container]);
  return <>
    <Button type="button" variant="outline" className={buttonClassName} onClick={() => { setError(false); setOpen(true); }}>
      <Search className="h-4 w-4" aria-hidden="true" />
      {t.shipping.search}
    </Button>
    {/* w-full: drops below the button when it sits in a flex row */}
    {error && <p role="alert" className="w-full text-sm text-destructive">{t.shipping.searchError}</p>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-lg p-4">
        <DialogTitle>{t.shipping.search}</DialogTitle>
        <DialogDescription>{t.shipping.hint}</DialogDescription>
        <div ref={setContainer} className="h-[min(65vh,520px)] min-h-[320px] w-full" />
      </DialogContent>
    </Dialog>
  </>;
}
