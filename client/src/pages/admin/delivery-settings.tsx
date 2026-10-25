import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { NonDeliveryDay, DeliverySetting } from "@shared/schema";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { mn } from "date-fns/locale";

import { AdminHeader } from "@/components/admin/header";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Truck,
} from "lucide-react";

export default function DeliverySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isRecurringYearly, setIsRecurringYearly] = useState(false);
  const [dayToDelete, setDayToDelete] = useState<NonDeliveryDay | null>(null);

  const [cutoffHour, setCutoffHour] = useState(18);
  const [cutoffMinute, setCutoffMinute] = useState(30);
  const [processingDays, setProcessingDays] = useState(1);

  const { data: nonDeliveryDays = [], isLoading: isLoadingDays } = useQuery<
    NonDeliveryDay[]
  >({
    queryKey: ["non-delivery-days"],
    queryFn: async () => {
      const days = await apiRequest("GET", "/api/non-delivery-days");
      return days.map((day: any) => ({
        ...day,
        date: new Date(day.date),
        createdAt: day.createdAt ? new Date(day.createdAt) : null,
      }));
    },
  });

  const { data: deliverySettings, isLoading: isLoadingSettings } =
    useQuery<DeliverySetting>({
      queryKey: ["delivery-settings"],
      queryFn: async () => {
        const settings = await apiRequest("GET", "/api/delivery-settings");
        return {
          ...settings,
          updatedAt: settings.updatedAt ? new Date(settings.updatedAt) : null,
        };
      },
    });

  useEffect(() => {
    if (deliverySettings) {
      setCutoffHour(deliverySettings.cutoffHour);
      setCutoffMinute(deliverySettings.cutoffMinute);
      setProcessingDays(deliverySettings.processingDays);
    }
  }, [deliverySettings]);

  const createNonDeliveryDayMutation = useMutation({
    mutationFn: async (data: {
      date: string;
      reason: string;
      isRecurringYearly: boolean;
    }) => {
      await apiRequest("POST", "/api/non-delivery-days", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["non-delivery-days"] });
      toast({
        title: "Хүргэлтгүй өдөр нэмэгдлээ",
        description: "Шинэ хүргэлтгүй өдөр амжилттай тохируулагдлаа.",
      });
      setIsAddDialogOpen(false);
      setSelectedDate(null);
      setReason("");
      setIsRecurringYearly(false);
    },
    onError: () => {
      toast({
        title: "Алдаа гарлаа",
        description: "Хүргэлтгүй өдөр нэмэхэд алдаа гарлаа.",
        variant: "destructive",
      });
    },
  });

  const deleteNonDeliveryDayMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/non-delivery-days/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["non-delivery-days"] });
      toast({
        title: "Хүргэлтгүй өдөр устгагдлаа",
        description: "Хүргэлтгүй өдөр амжилттай устгагдлаа.",
      });
      setDayToDelete(null);
    },
    onError: () => {
      toast({
        title: "Алдаа гарлаа",
        description: "Хүргэлтгүй өдөр устгахад алдаа гарлаа.",
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: {
      cutoffHour: number;
      cutoffMinute: number;
      processingDays: number;
    }) => {
      await apiRequest("PUT", "/api/delivery-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-settings"] });
      toast({
        title: "Тохиргоо хадгалагдлаа",
        description: "Хүргэлтийн тохиргоо амжилттай шинэчлэгдлээ.",
      });
    },
    onError: () => {
      toast({
        title: "Алдаа гарлаа",
        description: "Тохиргоо хадгалахад алдаа гарлаа.",
        variant: "destructive",
      });
    },
  });

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsAddDialogOpen(true);
  };

  const handleAddNonDeliveryDay = () => {
    if (selectedDate && reason.trim()) {
      createNonDeliveryDayMutation.mutate({
        date: selectedDate.toISOString(),
        reason: reason.trim(),
        isRecurringYearly,
      });
    }
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      cutoffHour,
      cutoffMinute,
      processingDays,
    });
  };

  const isNonDeliveryDay = (date: Date) => {
    return nonDeliveryDays.some((day) => {
      const dayDate = new Date(day.date);
      if (day.isRecurringYearly) {
        return (
          dayDate.getMonth() === date.getMonth() &&
          dayDate.getDate() === date.getDate()
        );
      }
      return isSameDay(dayDate, date);
    });
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getStartingDayOffset = () => {
    const start = startOfMonth(currentMonth);
    return start.getDay();
  };

  const weekDays = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];

  if (isLoadingDays || isLoadingSettings) {
    return (
      <AdminLayout>
        <div className="space-y-4 md:space-y-6">
          <AdminHeader title="Хүргэлтийн тохиргоо" />
          <div className="flex justify-center p-8">
            <p>Ачааллаж байна...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <AdminHeader title="Хүргэлтийн тохиргоо" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card className="rounded-2xl">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
                <Clock className="h-5 w-5 flex-shrink-0 text-brand" />
                Захиалгын хаалтын цаг
              </CardTitle>
              <CardDescription>
                Энэ цагаас өмнө захиалга өгсөн бол маргааш хүргэгдэнэ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="cutoffHour">Цаг</Label>
                  <Input
                    className="mt-1.5 h-11 w-full md:h-10"
                    id="cutoffHour"
                    type="number"
                    min="0"
                    max="23"
                    value={cutoffHour}
                    onChange={(e) =>
                      setCutoffHour(parseInt(e.target.value) || 0)
                    }
                    data-testid="input-cutoff-hour"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Label htmlFor="cutoffMinute">Минут</Label>
                  <Input
                    className="mt-1.5 h-11 w-full md:h-10"
                    id="cutoffMinute"
                    type="number"
                    min="0"
                    max="59"
                    value={cutoffMinute}
                    onChange={(e) =>
                      setCutoffMinute(parseInt(e.target.value) || 0)
                    }
                    data-testid="input-cutoff-minute"
                  />
                </div>
              </div>
              <div className="p-3 bg-surface border border-ink/10 rounded-lg text-sm text-ink/70">
                Одоогийн тохиргоо: {cutoffHour}:
                {cutoffMinute.toString().padStart(2, "0")} өмнө захиалга →
                Маргааш хүргэгдэнэ
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
                <Truck className="h-5 w-5 flex-shrink-0 text-brand" />
                Хүргэлтийн хугацаа
              </CardTitle>
              <CardDescription>
                Захиалга өгсөнөөс хойш хүргэх хоног
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
              <div>
                <Label htmlFor="processingDays">Боловсруулах хоног</Label>
                <Input
                  className="mt-1.5 h-11 w-full md:h-10"
                  id="processingDays"
                  type="number"
                  min="1"
                  max="7"
                  value={processingDays}
                  onChange={(e) =>
                    setProcessingDays(parseInt(e.target.value) || 1)
                  }
                  data-testid="input-processing-days"
                />
              </div>
              <div className="p-3 bg-surface border border-ink/10 rounded-lg text-sm text-ink/70">
                Одоогийн тохиргоо: Захиалгаас {processingDays} хоногийн дараа
                хүргэгдэнэ
              </div>
              <Button
                onClick={handleSaveSettings}
                className="h-11 w-full md:h-10"
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                Тохиргоо хадгалах
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg md:text-2xl">
              <Calendar className="h-5 w-5 flex-shrink-0 text-brand" />
              Хүргэлтгүй өдрийн хуанли
            </CardTitle>
            <CardDescription>
              Улаан өнгөөр тэмдэглэсэн өдрүүдэд хүргэлт хийгдэхгүй. Өдөр дээр
              дарж хүргэлтгүй өдөр нэмнэ үү.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="flex items-center justify-between gap-2 mb-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 flex-shrink-0 rounded-full border-ink/15"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-display text-base font-extrabold md:text-lg">
                {format(currentMonth, "yyyy оны M сар", { locale: mn })}
              </h3>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 flex-shrink-0 rounded-full border-ink/15"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                data-testid="button-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="min-w-0 text-center text-xs md:text-sm font-medium text-ink/50 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: getStartingDayOffset() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}
              {getDaysInMonth().map((date) => {
                const isNonDelivery = isNonDeliveryDay(date);
                const isToday = isSameDay(date, new Date());
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => handleDateClick(date)}
                    className={`h-10 min-w-0 rounded-lg text-sm font-medium tabular-nums transition-colors ${
                      isNonDelivery
                        ? "bg-brand text-white hover:bg-brand-deep"
                        : isToday
                        ? "bg-brand/10 text-brand hover:bg-brand/20"
                        : "text-ink hover:bg-ink/5"
                    }`}
                    data-testid={`calendar-day-${format(date, "yyyy-MM-dd")}`}
                  >
                    {format(date, "d")}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
            <div>
              <CardTitle className="text-lg md:text-2xl">
                Хүргэлтгүй өдрийн жагсаалт
              </CardTitle>
              <CardDescription>Бүх хүргэлтгүй өдрийн жагсаалт</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {nonDeliveryDays.length === 0 ? (
              <div className="text-center p-6 md:p-8 text-sm md:text-base text-ink/50">
                Хүргэлтгүй өдөр тохируулаагүй байна. Хуанлиас өдөр сонгож нэмнэ
                үү.
              </div>
            ) : (
              <>
                {/* Phones: stacked list instead of a table */}
                <ul className="divide-y divide-ink/10 border-t border-ink/10 md:hidden">
                  {nonDeliveryDays.map((day) => (
                    <li
                      key={day.id}
                      className="flex items-center gap-3 py-3"
                      data-testid={`non-delivery-day-row-${day.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink">
                          {format(
                            new Date(day.date),
                            "yyyy оны M сарын d (EEE)",
                            {
                              locale: mn,
                            }
                          )}
                        </p>
                        <p className="mt-0.5 break-words text-xs text-ink/50">
                          {day.reason}
                          {day.isRecurringYearly && (
                            <>
                              <span className="mx-1.5 text-ink/20">|</span>
                              <span className="font-semibold text-brand">
                                Жил бүр давтагдах
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 flex-shrink-0 rounded-full text-brand hover:bg-brand/5 hover:text-brand"
                        onClick={() => setDayToDelete(day)}
                        aria-label="Устгах"
                        data-testid={`button-delete-day-mobile-${day.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Огноо</TableHead>
                        <TableHead>Шалтгаан</TableHead>
                        <TableHead>Жил бүр давтагдах</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nonDeliveryDays.map((day) => (
                        <TableRow key={day.id}>
                          <TableCell>
                            {format(
                              new Date(day.date),
                              "yyyy оны M сарын d (EEE)",
                              {
                                locale: mn,
                              }
                            )}
                          </TableCell>
                          <TableCell>{day.reason}</TableCell>
                          <TableCell>
                            {day.isRecurringYearly ? (
                              <span className="font-semibold text-brand">
                                Тийм
                              </span>
                            ) : (
                              <span className="text-ink/40">Үгүй</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDayToDelete(day)}
                              data-testid={`button-delete-day-${day.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-brand" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="scrollbar-hide max-h-[92vh] w-[calc(100vw-24px)] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Хүргэлтгүй өдөр нэмэх</DialogTitle>
            <DialogDescription>
              {selectedDate &&
                format(selectedDate, "yyyy оны M сарын d", { locale: mn })}
              -г хүргэлтгүй өдөр болгон тохируулна
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Шалтгаан</Label>
              <Input
                className="h-11 w-full md:h-10"
                id="reason"
                placeholder="Жишээ нь: Баяр, Цагаан сар, Наадам гэх мэт"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-testid="input-reason"
              />
            </div>
            <div className="flex min-h-10 items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurringYearly}
                onCheckedChange={(checked) =>
                  setIsRecurringYearly(checked === true)
                }
                data-testid="checkbox-recurring"
              />
              <Label htmlFor="recurring" className="text-sm">
                Жил бүр давтагдах (Жишээ нь: Цагаан сар, Наадам)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 w-full md:h-10 md:w-auto"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Болих
            </Button>
            <Button
              className="h-11 w-full md:h-10 md:w-auto"
              onClick={handleAddNonDeliveryDay}
              disabled={
                !reason.trim() || createNonDeliveryDayMutation.isPending
              }
              data-testid="button-confirm-add"
            >
              Нэмэх
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!dayToDelete}
        onOpenChange={() => setDayToDelete(null)}
      >
        <AlertDialogContent className="scrollbar-hide max-h-[92vh] w-[calc(100vw-24px)] overflow-y-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Хүргэлтгүй өдөр устгах</AlertDialogTitle>
            <AlertDialogDescription>
              {dayToDelete && (
                <>
                  {format(new Date(dayToDelete.date), "yyyy оны M сарын d", {
                    locale: mn,
                  })}{" "}
                  ({dayToDelete.reason})-г устгах уу?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-10">
              Болих
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                dayToDelete &&
                deleteNonDeliveryDayMutation.mutate(dayToDelete.id)
              }
              className="h-11 bg-brand hover:bg-brand-deep md:h-10"
              data-testid="button-confirm-delete"
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
