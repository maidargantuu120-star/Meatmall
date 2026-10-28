import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useState } from 'react';

type EmailState = {
  configured: boolean;
  delivery: { status: string; attempts: number; updated_at: number } | null;
};

const labels: Record<string, string> = {
  pending: 'Илгээхэд бэлэн',
  sending: 'Илгээж байна…',
  sent: 'Илгээх хүсэлтийг хүлээн авсан',
  failed: 'Илгээж чадсангүй',
  uncertain: 'Brevo дээр хүргэлтийг шалгана уу',
};

export function OrderEmailStatus({ orderId }: { orderId: number }) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<{ orderId: number; at: number; failed: boolean } | null>(null);
  const query = useQuery<EmailState>({
    queryKey: [`/api/orders/${orderId}/email`],
    queryFn: () => apiRequest('GET', `/api/orders/${orderId}/email`),
    refetchInterval: q => {
      const delivery = q.state.data?.delivery;
      return delivery && (delivery.status === 'sending' ||
        (delivery.status === 'pending' && q.state.data?.configured && delivery.updated_at > Date.now() - 60000)) ? 5000 : false;
    },
  });
  const retry = useMutation({
    mutationFn: () => apiRequest('POST', `/api/orders/${orderId}/email/retry`),
    onSettled: () => { void query.refetch(); },
  });
  const state = query.data;
  const status = state?.delivery?.status;
  const canRetry = state?.configured && (status === 'pending' || status === 'failed');
  const feedback = lastCheck?.orderId === orderId ? lastCheck : null;

  async function checkStatus() {
    setIsChecking(true);
    setLastCheck(null);
    try {
      await query.refetch({ throwOnError: true });
      setLastCheck({ orderId, at: Date.now(), failed: false });
    } catch {
      setLastCheck({ orderId, at: Date.now(), failed: true });
    } finally {
      setIsChecking(false);
    }
  }

  return (
    // Phone: label and state on one row. PC (receipt side panel): stacked like the status/SMS rows.
    <div className="space-y-2 text-xs text-black">
      <div className="flex items-center justify-between gap-3 md:flex-col md:items-stretch md:gap-1">
        <span className="font-semibold md:text-ink/60">Захиалгын и-мэйл</span>
        <span role="status" className="text-right md:text-left md:text-sm md:font-semibold">
          {query.isPending ? 'Шалгаж байна…' : query.isError ? 'Төлөв шалгахад алдаа гарлаа'
            : !state?.configured ? 'И-мэйл илгээлт тохируулаагүй'
            : labels[status || ''] || 'Энэ захиалгын и-мэйл байхгүй'}
        </span>
      </div>
      <div className="flex justify-end gap-2 md:justify-stretch">
        <button type="button" onClick={() => void checkStatus()} disabled={isChecking || query.isFetching || retry.isPending}
          aria-busy={isChecking || query.isFetching}
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-50 md:flex-1 md:py-2">
          {isChecking || query.isFetching ? 'Шалгаж байна…' : 'Шалгах'}
        </button>
        {canRetry && <button type="button" onClick={() => retry.mutate()} disabled={retry.isPending || query.isFetching}
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-50 md:flex-1 md:py-2">
          {retry.isPending ? 'Илгээж байна…' : status === 'failed' ? 'Дахин илгээх' : 'Илгээх'}
        </button>}
      </div>
      {feedback && <p role={feedback.failed ? 'alert' : 'status'} aria-live="polite"
        className={feedback.failed ? 'text-red-700' : 'text-gray-600'}>
        {feedback.failed ? 'Төлөв шалгаж чадсангүй. Дахин оролдоно уу.'
          : `Төлөвийг шалгалаа · ${new Date(feedback.at).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
      </p>}
      {status === 'failed' && <p className="text-gray-600">Brevo-ийн үнэгүй өдрийн хязгаар дүүрсэн эсэхийг шалгаад дараа дахин илгээнэ үү.</p>}
      {status === 'uncertain' && <p className="text-gray-600">Давхар и-мэйлээс сэргийлж автоматаар дахин илгээхгүй. Brevo-ийн логийг шалгана уу.</p>}
      {retry.isError && <p role="alert" className="text-red-700">Илгээх хүсэлт амжилтгүй боллоо. Төлөвийг дахин шалгана уу.</p>}
    </div>
  );
}
