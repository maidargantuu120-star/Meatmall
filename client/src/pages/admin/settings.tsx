import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/header";
import { AdminLayout } from "@/components/admin/layout";
import { HelpTooltip } from "@/components/admin/help-tooltip";
import { helpIllustrations } from "@/assets/help/index";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { readShippingRates, serializeShippingRates } from '@shared/shipping';
import { formatPrice } from '@/lib/utils';

// Define our validation schema
const shippingRulesSchema = z.object({
  fee: z.coerce.number().int().min(0).max(1000000),
  jejuSurcharge: z.coerce.number().int().min(0).max(1000000),
});

type ShippingRulesFormValues = z.infer<typeof shippingRulesSchema>;

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the current shipping rules
  const { data: shippingRulesData, isLoading } = useQuery({
    queryKey: ["/api/settings/shipping-fee"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/settings/shipping-fee");
      return readShippingRates(response.value);
    },
  });

  // Set up the form with react-hook-form
  const form = useForm<ShippingRulesFormValues>({
    resolver: zodResolver(shippingRulesSchema),
    defaultValues: {
      fee: 6000, jejuSurcharge: 6000,
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (shippingRulesData) form.reset(shippingRulesData);
  }, [shippingRulesData, form]);

  // Update shipping rules mutation
  const { mutate: updateShippingRules, isPending } = useMutation({
    mutationFn: async (data: ShippingRulesFormValues) => {
      // Keep backend schema structure the same by wrapping in array for 'shipping_rules' setting
      return apiRequest("PUT", "/api/settings/shipping-fee", {
        value: serializeShippingRates(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Хүргэлтийн дүрэм шинэчлэгдлээ",
        description: "Үндсэн төлбөр болон Чэжүгийн нэмэгдэл хадгалагдлаа.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/settings/shipping-fee"],
      });
    },
    onError: () => {
      toast({
        title: "Хүргэлтийн дүрмийг шинэчлэхэд алдаа гарлаа",
        description: "Дахин оролдоно уу.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ShippingRulesFormValues) {
    updateShippingRules(data);
  }

  return (
    <AdminLayout>
      <div className="p-6 max-md:p-0">
        <div className="flex items-center justify-between mb-6 max-md:mb-3">
          {/* Phones: header stretches full width; md+: unchanged (display: contents) */}
          <div className="min-w-0 flex-1 md:contents">
            <AdminHeader title="Системийн тохиргоо" />
          </div>
          {/* Hover tooltip can't be opened by touch, so it is hidden on phones */}
          <div className="hidden md:contents">
          <HelpTooltip
            content={
              <div className="space-y-4">
                <p>
                  Энэ хэсэгт та веб дэлгүүрийн ерөнхий тохиргоог хийх боломжтой.
                </p>
                <p>
                  <strong>Хүргэлтийн төлбөр:</strong> Энэ тохиргоо нь захиалга
                  хийх үед үндсэн төлбөр болон Чэжү бүсийн нэмэлт төлбөрийг
                  тохируулна.
                </p>
              </div>
            }
            illustration={helpIllustrations.categoryManagement}
          />
          </div>
        </div>

        <Card className="overflow-hidden max-md:rounded-2xl max-md:border-ink/10 max-md:shadow-none">
          <CardHeader className="max-md:p-4">
            <CardTitle className="max-md:font-display max-md:text-lg max-md:font-extrabold max-md:leading-snug max-md:text-ink">
              Хүргэлтийн төлбөрийн тохиргоо
            </CardTitle>
            <div className="text-sm text-gray-500 mt-1 max-md:text-xs max-md:text-ink/60">
              Бүх захиалгад автоматаар нэмэгдэх хүргэлтийн тогтмол төлбөрийг тохируулна.
            </div>
          </CardHeader>
          <CardContent className="max-md:p-4 max-md:pt-0">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6 max-md:space-y-4"
                >
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="max-md:text-xs max-md:font-semibold max-md:text-ink/60">
                            Үндсэн хүргэлтийн төлбөр (₩)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="10"
                              inputMode="numeric"
                              className="max-w-xs max-md:h-11 max-md:max-w-none max-md:rounded-full max-md:border-transparent max-md:bg-surface max-md:px-4 max-md:font-display max-md:font-semibold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField control={form.control} name="jejuSurcharge" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Чэжү нэмэлт төлбөр · 제주 추가 배송비 (₩)</FormLabel>
                      <FormControl><Input {...field} type="number" min="0" max="1000000" step="10" inputMode="numeric" className="max-w-xs max-md:max-w-none" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="rounded-xl bg-surface p-4 text-sm" role="status">
                    <p>Үндсэн: {formatPrice(Number(form.watch('fee')) || 0)}</p>
                    <p className="mt-1 font-semibold">Чэжү нийт: {formatPrice((Number(form.watch('fee')) || 0) + (Number(form.watch('jejuSurcharge')) || 0))}</p>
                    <p className="mt-2 text-ink/60">Хүргэлтийн хаяг, шуудангийн кодоор Чэжү (제주) бүсийг автоматаар ялгана. Шинэ төлбөр дараагийн захиалгад шууд үйлчилнэ.</p>
                  </div>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="max-md:h-11 max-md:w-full max-md:rounded-full max-md:bg-brand max-md:font-semibold max-md:text-white max-md:hover:bg-brand-deep"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Хадгалж байна...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Хадгалах
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
