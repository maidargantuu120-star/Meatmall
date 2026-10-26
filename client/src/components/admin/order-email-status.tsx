import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

type EmailState = {
  configured: boolean;
  delivery: { status: string; attempts: number; updated_at: number } | null;
};

const labels: Record<string, string> = {
  pending: 'Илгээхэд бэлэн',
  sending: 'Илгээж байна…',
  sent: 'Brevo илгээхээр хүлээн авсан',
  failed: 'Илгээж чадсангүй',
  uncertain: 'Brevo дээр хүргэлтийг шалгана уу',
};

export function OrderEmailStatus({ orderId }: { orderId: number }) {
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

  return (
    <div className="space-y-2 text-xs text-black">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">Захиалгын и-мэйл</span>
        <span role="status" className="text-right">
          {query.isPending ? 'Шалгаж байна…' : query.isError ? 'Төлөв шалгахад алдаа гарлаа'
            : !state?.configured ? 'И-мэйл илгээлт тохируулаагүй'
            : labels[status || ''] || 'Энэ захиалгын и-мэйл байхгүй'}
        </span>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching || retry.isPending}
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-50">Шалгах</button>
        {canRetry && <button type="button" onClick={() => retry.mutate()} disabled={retry.isPending || query.isFetching}
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-50">
          {retry.isPending ? 'Илгээж байна…' : status === 'failed' ? 'Дахин илгээх' : 'Илгээх'}
        </button>}
      </div>
      {status === 'failed' && <p className="text-gray-600">Brevo-ийн үнэгүй өдрийн хязгаар дүүрсэн эсэхийг шалгаад дараа дахин илгээнэ үү.</p>}
      {status === 'uncertain' && <p className="text-gray-600">Давхар и-мэйлээс сэргийлж автоматаар дахин илгээхгүй. Brevo-ийн логийг шалгана уу.</p>}
      {retry.isError && <p role="alert" className="text-red-700">Илгээх хүсэлт амжилтгүй боллоо. Төлөвийг дахин шалгана уу.</p>}
    </div>
  );
}
