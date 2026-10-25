import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/layout";
import { AdminHeader } from "@/components/admin/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Review } from "@shared/schema";
import {
  Loader2,
  Search,
  Star,
  Check,
  X,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { normalizeDate } from "@/lib/utils";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// DB timestamps are stored as ms but read as seconds - normalize before display
const formatReviewDate = (value: Review["createdAt"]) => {
  if (!value) return "-";
  const date = normalizeDate(value as Date | string | number);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("mn-MN");
};

export default function AdminReviews() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteReviewId, setDeleteReviewId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["reviews"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/admin/reviews");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      isApproved,
    }: {
      id: number;
      isApproved: boolean;
    }) => {
      await apiRequest("PATCH", `/api/admin/reviews/${id}`, { isApproved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast({
        title: "Амжилттай",
        description: "Сэтгэгдэл шинэчлэгдлээ",
      });
    },
    onError: () => {
      toast({
        title: "Алдаа",
        description: "Сэтгэгдэл шинэчлэхэд алдаа гарлаа",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast({
        title: "Амжилттай",
        description: "Сэтгэгдэл устгагдлаа",
      });
      setDeleteReviewId(null);
    },
    onError: () => {
      toast({
        title: "Алдаа",
        description: "Сэтгэгдэл устгахад алдаа гарлаа",
        variant: "destructive",
      });
    },
  });

  const filteredReviews = reviews.filter(
    (review) =>
      review.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.content?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const pendingCount = filteredReviews.filter((r) => !r.isApproved).length;

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-brand text-brand" : "text-ink/15"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="md:p-6">
        <AdminHeader
          title="Сэтгэгдлүүд"
          description="Хэрэглэгчдийн сэтгэгдлийг удирдах"
          icon={<MessageSquare className="h-6 w-6" />}
        />

        <Card className="mt-3 rounded-2xl border-ink/10 shadow-card md:mt-6 md:rounded-lg md:border-border md:shadow-sm">
          <CardHeader className="gap-3 space-y-0 p-4 md:flex-row md:items-center md:justify-between md:gap-0 md:space-y-1.5 md:p-6">
            <CardTitle className="max-md:font-display max-md:text-base max-md:font-extrabold">
              Бүх сэтгэгдлүүд
            </CardTitle>
            <div className="flex w-full items-center gap-2 md:w-auto">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/40 md:left-2.5 md:top-2.5 md:text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Хайх..."
                  className="h-11 w-full rounded-full border-transparent bg-surface pl-10 md:h-10 md:w-[300px] md:rounded-md md:border-input md:bg-background md:pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-reviews"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Phones: stacked list instead of a sideways-scrolling table */}
                <div className="md:hidden">
                  <div className="mb-1 flex items-baseline justify-between border-b border-ink/10 pb-3 text-sm">
                    <span className="font-semibold text-ink">
                      Нийт{" "}
                      <span className="font-display text-base font-extrabold text-brand">
                        {filteredReviews.length}
                      </span>{" "}
                      сэтгэгдэл
                    </span>
                    <span className="text-ink/60">
                      Хүлээгдэж буй{" "}
                      <span className="font-display text-base font-extrabold text-brand">
                        {pendingCount}
                      </span>
                    </span>
                  </div>
                  {filteredReviews.length === 0 ? (
                    <p className="py-10 text-center text-sm text-ink/50">
                      Сэтгэгдэл олдсонгүй
                    </p>
                  ) : (
                    <ul className="divide-y divide-ink/10">
                      {filteredReviews.map((review) => (
                        <li
                          key={review.id}
                          className="py-4"
                          data-testid={`review-card-${review.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-bold text-ink">
                                {review.customerName}{" "}
                                <span className="text-xs font-semibold text-ink/40">
                                  #{review.id}
                                </span>
                              </p>
                              <div className="mt-1">
                                {renderStars(review.rating)}
                              </div>
                            </div>
                            {review.isApproved ? (
                              <span className="flex-shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink/60">
                                Зөвшөөрөгдсөн
                              </span>
                            ) : (
                              <span className="flex-shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand">
                                Хүлээгдэж буй
                              </span>
                            )}
                          </div>
                          <p
                            className="mt-2 line-clamp-3 break-words text-sm text-ink/80"
                            title={review.content}
                          >
                            {review.content}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="mr-auto text-xs text-ink/50">
                              {formatReviewDate(review.createdAt)}
                            </span>
                            {!review.isApproved ? (
                              <Button
                                size="sm"
                                className="h-10 rounded-full bg-ink px-4 text-xs font-semibold text-white hover:bg-ink/85"
                                onClick={() =>
                                  approveMutation.mutate({
                                    id: review.id,
                                    isApproved: true,
                                  })
                                }
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-mobile-${review.id}`}
                              >
                                <Check className="mr-1 h-4 w-4" />
                                Зөвшөөрөх
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 rounded-full border-ink/15 px-4 text-xs font-semibold text-ink/70 hover:bg-surface hover:text-ink"
                                onClick={() =>
                                  approveMutation.mutate({
                                    id: review.id,
                                    isApproved: false,
                                  })
                                }
                                disabled={approveMutation.isPending}
                                data-testid={`button-unapprove-mobile-${review.id}`}
                              >
                                <X className="mr-1 h-4 w-4" />
                                Цуцлах
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label="Устгах"
                              className="h-10 w-10 rounded-full border-brand/25 text-brand hover:bg-brand/5 hover:text-brand-deep"
                              onClick={() => setDeleteReviewId(review.id)}
                              data-testid={`button-delete-mobile-${review.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="px-4 py-3 text-sm font-medium">ID</th>
                        <th className="px-4 py-3 text-sm font-medium">
                          Хэрэглэгч
                        </th>
                        <th className="px-4 py-3 text-sm font-medium">Үнэлгээ</th>
                        <th className="px-4 py-3 text-sm font-medium">
                          Сэтгэгдэл
                        </th>
                        <th className="px-4 py-3 text-sm font-medium">Төлөв</th>
                        <th className="px-4 py-3 text-sm font-medium">Огноо</th>
                        <th className="px-4 py-3 text-sm font-medium">Үйлдэл</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReviews.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-4 text-center text-muted-foreground"
                          >
                            Сэтгэгдэл олдсонгүй
                          </td>
                        </tr>
                      ) : (
                        filteredReviews.map((review) => (
                          <tr
                            key={review.id}
                            className="border-b hover:bg-muted/50"
                            data-testid={`row-review-${review.id}`}
                          >
                            <td className="px-4 py-3 text-sm">{review.id}</td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {review.customerName}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {renderStars(review.rating)}
                            </td>
                            <td
                              className="px-4 py-3 text-sm max-w-xs truncate"
                              title={review.content}
                            >
                              {review.content}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {review.isApproved ? (
                                <span className="px-2 py-1 text-xs bg-ink/5 text-ink/70 rounded-full">
                                  Зөвшөөрөгдсөн
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs bg-brand/10 text-brand rounded-full">
                                  Хүлээгдэж буй
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatReviewDate(review.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex gap-2">
                                {!review.isApproved ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-ink hover:text-ink hover:bg-ink/5"
                                    onClick={() =>
                                      approveMutation.mutate({
                                        id: review.id,
                                        isApproved: true,
                                      })
                                    }
                                    disabled={approveMutation.isPending}
                                    data-testid={`button-approve-${review.id}`}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-ink/50 hover:text-ink hover:bg-surface"
                                    onClick={() =>
                                      approveMutation.mutate({
                                        id: review.id,
                                        isApproved: false,
                                      })
                                    }
                                    disabled={approveMutation.isPending}
                                    data-testid={`button-unapprove-${review.id}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-brand hover:text-brand-deep hover:bg-brand/5"
                                  onClick={() => setDeleteReviewId(review.id)}
                                  data-testid={`button-delete-${review.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={deleteReviewId !== null}
        onOpenChange={(open) => !open && setDeleteReviewId(null)}
      >
        <AlertDialogContent className="max-md:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Сэтгэгдэл устгах</AlertDialogTitle>
            <AlertDialogDescription>
              Та энэ сэтгэгдлийг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг
              буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Цуцлах
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteReviewId && deleteMutation.mutate(deleteReviewId)
              }
              className="bg-brand hover:bg-brand-deep"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Устгах"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
