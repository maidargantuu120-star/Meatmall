import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn, formatPrice, isBulkyMeat } from "@/lib/utils";
import { getFullImageUrl } from "@/lib/image-utils";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { logger } from "@/lib/logger";
import { Check, Copy, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { BankAccount, CartItem } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";
import { readShippingRates, shippingQuote } from '@shared/shipping';
import { AddressSearch } from '@/components/address-search';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Extend the order schema for checkout form validation
const checkoutFormSchema = z.object({
  customerName: z.string().min(2, {
    message: "Нэр хамгийн багадаа 2 тэмдэгт байх ёстой",
  }),
  customerPhone: z
    .string()
    .regex(/^010-\d{4}-\d{4}$/, {
      message: "Утасны дугаар 010-0000-0000 хэлбэртэй байх ёстой",
    }),
  customerEmail: z.string().email({
    message: "Имэйл хаягаа зөв оруулна уу",
  }),
  customerAddress: z.string().min(5, {
    message: "Хүргэлтийн хаяг хамгийн багадаа 5 тэмдэгт байх ёстой",
  }),
  customerPostalCode: z.string().regex(/^(?!00000)[0-9]{5}$/, '5 оронтой шуудангийн кодоо оруулна уу.'),
  paymentMethod: z.enum(["bank_transfer"], {
    required_error: "Төлбөрийн хэлбэрээ сонгоно уу",
  }),
  selectedBankAccount: z.string({
    required_error: "Банкаа сонгоно уу",
  }),
  transferAccountHolder: z.string().min(2, {
    message: "Шилжүүлсэн хүний нэр хамгийн багадаа 2 тэмдэгт байх ёстой",
  }),
  totalAmount: z.string().optional(), // Make this optional since we calculate it
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountCopied, setAccountCopied] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  // Step chips follow the scroll: "Төлбөр" once the payment card reaches the upper part of the screen
  const hasCheckoutForm = !!user && items.length > 0;
  useEffect(() => {
    if (!hasCheckoutForm) return;
    const update = () => {
      const payment = document.getElementById(STEP_SECTION_IDS[2]);
      if (!payment) return;
      setActiveStep(payment.getBoundingClientRect().top < window.innerHeight * 0.45 ? 2 : 1);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [hasCheckoutForm]);

  const scrollToStep = (index: number) => {
    const id = STEP_SECTION_IDS[index];
    if (!id) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  // 로그인 상태 확인 및 리다이렉트
  useEffect(() => {
    if (!isAuthLoading && !user) {
      toast({
        title: "Нэвтрэх шаардлагатай",
        description:
          "Захиалга хийхийн тулд нэвтрэх эсвэл бүртгүүлэх шаардлагатай.",
        variant: "default",
      });
      setLocation("/auth?tab=signup");
    }
  }, [user, isAuthLoading, setLocation, toast]);



  // Fetch shipping rules from server
  const { data: shippingRates, isLoading: isLoadingShippingFee, isError: shippingError } = useQuery(
    {
      queryKey: ["/api/settings/shipping-fee"],
      queryFn: async () => {
        const data = await apiRequest("GET", "/api/settings/shipping-fee");
        return readShippingRates(data.value);
      },
    },
  );


  // Fetch all bank accounts
  const { data: bankAccounts = [], isLoading: isBankAccountsLoading } =
    useQuery<BankAccount[]>({
      queryKey: ["bank-accounts"],
      queryFn: async () => {
        return await apiRequest("GET", "/api/bank-accounts");
      },
    });

  // Fetch default bank account
  const { data: defaultBankAccount, isLoading: isBankAccountLoading } =
    useQuery<BankAccount>({
      queryKey: ["bank-account-default"],
      queryFn: async () => {
        try {
          return await apiRequest("GET", "/api/bank-accounts/default");
        } catch (e) {
          return null; // No default account might return 404
        }
      },
    });

  // Log bank account data when it changes
  useEffect(() => {
    if (defaultBankAccount) {
      console.log("Bank account data loaded successfully:", defaultBankAccount);
    }
    if (bankAccounts.length > 0) {
      console.log("All bank accounts loaded:", bankAccounts);
    }
  }, [defaultBankAccount, bankAccounts]);

  // Form definition with prefilled user data if available
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customerName: user?.name || "",
      customerEmail: user?.email || "",
      customerPhone: user?.phone || "",
      customerAddress: "",
      customerPostalCode: "",
      paymentMethod: "bank_transfer",
      selectedBankAccount: defaultBankAccount?.id?.toString() || "",
      transferAccountHolder: user?.name || "",
    },
    mode: "onChange", // Validate fields on change for better user feedback
  });

  const destinationAddress = form.watch('customerAddress');
  const destinationPostcode = form.watch('customerPostalCode');
  const deliveryQuote = shippingRates ? shippingQuote(shippingRates, destinationAddress, destinationPostcode) : null;
  const shippingFee = deliveryQuote?.total ?? 0;

  // Update the form values when user or defaultBankAccount changes
  useEffect(() => {
    if (user) {
      form.setValue("customerName", user.name || "");
      form.setValue("customerEmail", user.email || "");
      form.setValue("customerPhone", user.phone || "");
      form.setValue("transferAccountHolder", user.name || "");
    }

    if (defaultBankAccount && defaultBankAccount.id) {
      form.setValue("selectedBankAccount", defaultBankAccount.id.toString());
    }
  }, [user, defaultBankAccount, form]);

  // Handle successful checkout - redirects to My Page instead of order confirmation
  const handleCheckoutSuccess = (orderId: number) => {
    clearCart();

    // Invalidate the order history query cache to ensure My Page displays all orders
    queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });

    toast({
      title: "Захиалга амжилттай",
      description:
        "Таны захиалгыг хүлээн авлаа. Захиалгын түүх руу чиглүүлж байна.",
    });

    // Redirect to My Page where user can view all their orders
    setLocation("/my-page");
  };

  // Enhanced form submission handler with better debugging
  const onSubmit = async (data: CheckoutFormValues) => {
    if (!deliveryQuote || shippingError || deliveryQuote.mismatch) {
      toast({ title: deliveryQuote?.mismatch ? t.shipping.mismatch : t.shipping.unavailable, variant: 'destructive' });
      return;
    }
    logger.custom("⏳", "주문 생성 시작...");

    // Log order data
    logger.custom("🛒", "주문 데이터:", {
      customerName: data.customerName,
      totalAmount: totalPrice + shippingFee,
      itemsCount: items.length,
      paymentMethod: data.paymentMethod,
      deliveryAddress: data.customerAddress,
    });

    // Check for form validation errors (logging already added by logger above implicitly via custom if needed, but keeping existing logic)
    if (Object.keys(form.formState.errors).length > 0) {
      console.error("Form has validation errors:", form.formState.errors);
      toast({
        title: "Форм алдаатай байна",
        description: "Формын бүх талбаруудыг зөв бөглөнө үү.",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Сагс хоосон байна",
        description: "Захиалга хийхийн тулд сагсандаа бүтээгдэхүүн нэмнэ үү.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate total with shipping fee
      const orderTotalWithShipping = totalPrice + shippingFee;

      const orderData = {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        customerPostalCode: data.customerPostalCode,
        expectedShippingFee: shippingFee,
        paymentMethod: data.paymentMethod,
        selectedBankAccount: data.selectedBankAccount,
        transferAccountHolder: data.transferAccountHolder,
        totalAmount: orderTotalWithShipping,
        status: "pending",
      };

      const cartItemsForApi = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      const response = await fetch('/api/orders', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderData, cartItems: cartItemsForApi }) });
      const order = await response.json() as { id: number; totalAmount: number; message?: string; code?: string };
      if (!response.ok) {
        if (order.code === 'SHIPPING_FEE_CHANGED') {
          await queryClient.invalidateQueries({ queryKey: ['/api/settings/shipping-fee'] });
          toast({ title: t.shipping.changed, variant: 'destructive' });
          return;
        }
        throw new Error(order.message || 'Order failed');
      }

      logger.success("Master Order болон Items амжилттай үүслээ:", {
        orderId: order.id,
        totalAmount: order.totalAmount,
      });

      handleCheckoutSuccess(order.id);
    } catch (error: any) {
      logger.error("주문 생성 실패:", {
        formData: data,
        error: error.message,
        details: error,
      });

      toast({
        title: "Алдаа гарлаа",
        description:
          error.message ||
          "Захиалга боловсруулах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selected (or default) account shown on the red account card
  const selectedBankAccountId = form.watch("selectedBankAccount");
  const activeBankAccount =
    bankAccounts.find((account) => account?.id?.toString() === selectedBankAccountId) ||
    defaultBankAccount ||
    null;

  const copyAccountNumber = async (accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setAccountCopied(true);
      setTimeout(() => setAccountCopied(false), 2000);
    } catch {
      // Clipboard blocked: the number stays visible and selectable
    }
  };

  // 로그인 중이거나 로그인 되지 않은 경우 로딩 화면 표시
  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <CheckoutHeader title={t.checkout} steps={t.checkoutPage.steps} />
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
        </div>
        <Footer />
      </div>
    );
  }

  // If cart is empty, redirect to home
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <CheckoutHeader title={t.checkout} steps={t.checkoutPage.steps} />
        <div className="mx-auto -mt-10 max-w-xl px-4 pb-16">
          <div className={cn(CARD, "text-center")}>
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
              <ShoppingBag className="h-8 w-8" />
            </span>
            <h2 className="font-display text-xl font-extrabold text-ink">Сагс хоосон байна</h2>
            <p className="mt-2 text-ink/60">Захиалга хийхийн тулд сагсандаа бүтээгдэхүүн нэмнэ үү.</p>
            <Button
              onClick={() => setLocation("/")}
              className="mt-6 h-12 rounded-xl bg-brand px-6 font-display font-bold text-white hover:bg-brand-deep"
            >
              Бүтээгдэхүүн харах
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const fieldLabel = "font-bold text-ink";
  const fieldInput = "h-12 rounded-xl border-ink/15 text-base placeholder:text-ink/35 focus-visible:ring-brand/30";
  const required = <span className="ml-0.5 text-brand">*</span>;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <CheckoutHeader title={t.checkout} steps={t.checkoutPage.steps} activeStep={activeStep} onStep={scrollToStep} />

      <main className="mx-auto -mt-10 max-w-6xl px-3 pb-16 sm:px-4 md:px-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6"
          >
            <div className="min-w-0 space-y-4">
              {/* Cart */}
              <section className={CARD}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className={CARD_TITLE}>{t.checkoutPage.yourCart}</h2>
                  <span className="text-sm font-semibold text-ink/50">
                    {items.length} {t.checkoutPage.itemsUnit}
                  </span>
                </div>
                <ul className="divide-y divide-ink/10">
                  {items.map((item) => (
                    <CheckoutCartItem key={item.productId} item={item} />
                  ))}
                </ul>
              </section>

              {/* Customer */}
              <section id={STEP_SECTION_IDS[1]} className={cn(CARD, "scroll-mt-24")}>
                <h2 className={cn(CARD_TITLE, "mb-5")}>{t.checkoutPage.customerInfo}</h2>
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={fieldLabel}>{t.name}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.name} autoComplete="name" className={fieldInput} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={fieldLabel}>{t.email}</FormLabel>
                          <FormControl>
                            <Input placeholder="example@mail.com" type="email" autoComplete="email" className={fieldInput} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={fieldLabel}>
                            {t.phone}
                            {required}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="010-0000-0000"
                              inputMode="tel"
                              autoComplete="tel"
                              className={fieldInput}
                              {...field}
                              value={field.value}
                              onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-[13px] text-ink/55">{t.phoneFormat}</p>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </section>

              {/* Delivery address */}
              <section className={CARD}>
                <h2 className={cn(CARD_TITLE, "mb-5")}>{t.checkoutPage.deliveryAddress}</h2>
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="customerAddress"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <FormLabel className={fieldLabel}>
                            {t.address}
                            {required}
                          </FormLabel>
                          <AddressSearch
                            buttonClassName="h-10 gap-1.5 rounded-full border-brand px-4 font-bold text-brand hover:bg-brand hover:text-white"
                            onSelect={(address, postcode) => {
                              form.setValue("customerAddress", address, { shouldValidate: true });
                              form.setValue("customerPostalCode", postcode, { shouldValidate: true });
                            }}
                          />
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder="Та хот/дүүрэг хороо/ байрны тоотоо тодорхой солонгосоор бичиж оруулна уу."
                            className="min-h-[96px] resize-none rounded-xl border-ink/15 text-base placeholder:text-ink/35 focus-visible:ring-brand/30"
                            autoComplete="street-address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-[13px] text-ink/55">{t.shipping.hint}</p>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerPostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={fieldLabel}>{t.shipping.postcode}</FormLabel>
                        <FormControl>
                          <Input {...field} inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="63122" className={fieldInput} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {deliveryQuote?.mismatch && <p role="alert" className="text-sm text-destructive">{t.shipping.mismatch}</p>}
                  {deliveryQuote?.region === "jeju" && (
                    <p role="status" className="rounded-xl bg-brand/5 p-3 text-sm text-brand">{t.shipping.detected}</p>
                  )}
                </div>
              </section>

              {/* Payment: bank transfer */}
              <section id={STEP_SECTION_IDS[2]} className={cn(CARD, "scroll-mt-24")}>
                <h2 className={CARD_TITLE}>
                  {t.checkoutPage.steps[2]} · {t.bankTransfer}
                </h2>
                <p className="mt-1 text-sm text-ink/60">{t.bankTransferDesc}</p>

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => <input type="hidden" {...field} value="bank_transfer" />}
                />

                <FormField
                  control={form.control}
                  name="selectedBankAccount"
                  render={({ field }) => (
                    <FormItem className="mt-5">
                      <FormLabel className={fieldLabel}>{t.checkoutPage.selectBank}</FormLabel>
                      {isBankAccountsLoading ? (
                        <div className="h-14 animate-pulse rounded-xl bg-ink/5" />
                      ) : bankAccounts.length > 0 ? (
                        <div role="radiogroup" aria-label={t.checkoutPage.selectBank} className="space-y-2">
                          {bankAccounts
                            .filter((account) => account && account.id)
                            .map((account) => {
                              const checked = field.value === String(account.id);
                              return (
                                <button
                                  key={account.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={checked}
                                  onClick={() => field.onChange(String(account.id))}
                                  className={cn(
                                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                                    checked ? "border-brand bg-brand/5" : "border-ink/15 bg-white hover:border-ink/30",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2",
                                      checked ? "border-brand" : "border-ink/25",
                                    )}
                                  >
                                    {checked && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block font-bold text-ink">{account.bankName}</span>
                                    {account.description && (
                                      <span className="block truncate text-xs text-ink/55">{account.description}</span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selected account: red card with a copy button */}
                {!isBankAccountsLoading &&
                  (activeBankAccount ? (
                    <div className="mt-4 rounded-2xl bg-brand p-5 text-white shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 font-bold">{activeBankAccount.bankName}</p>
                        {activeBankAccount.isDefault && (
                          <span className="flex-shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
                            {t.defaultAccount}
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-xs font-semibold text-white/75">{t.accountNumber}</p>
                      <p className="mt-0.5 break-all font-display text-2xl font-extrabold tracking-wider sm:text-[28px]">
                        {activeBankAccount.accountNumber}
                      </p>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white/75">{t.accountHolder}</p>
                          <p className="mt-0.5 break-words font-bold">{activeBankAccount.accountHolder}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyAccountNumber(activeBankAccount.accountNumber)}
                          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand shadow-sm transition-colors hover:bg-white/90"
                        >
                          {accountCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {accountCopied ? t.install.copied : t.copy}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-surface p-4 text-sm font-medium text-ink/60">{t.bankInfoNotFound}</p>
                  ))}

                <FormField
                  control={form.control}
                  name="transferAccountHolder"
                  render={({ field }) => (
                    <FormItem className="mt-5">
                      <FormLabel className={fieldLabel}>{t.transferSenderName}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.transferSenderNamePlaceholder} className={fieldInput} {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-[13px] text-ink/55">{t.transferSenderNameDesc}</p>
                    </FormItem>
                  )}
                />
              </section>
            </div>

            {/* Summary + submit (sticky beside the form on large screens) */}
            <aside className={cn(CARD, "lg:sticky lg:top-24")}>
              <dl className="space-y-3 text-[15px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/60">{t.products}</dt>
                  <dd className="font-display font-extrabold text-ink">{formatPrice(totalPrice)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/60">{t.shippingFee}</dt>
                  <dd className="font-display font-extrabold text-ink">
                    {isLoadingShippingFee ? (
                      <span className="inline-block h-4 w-16 animate-pulse rounded bg-ink/10" />
                    ) : (
                      formatPrice(shippingFee)
                    )}
                  </dd>
                </div>
              </dl>
              {deliveryQuote?.region === "jeju" && (
                <p className="mt-2 text-xs text-ink/60" data-testid="jeju-shipping-breakdown">
                  {t.shipping.base}: {formatPrice(deliveryQuote.baseFee)} + {t.shipping.jeju}: {formatPrice(deliveryQuote.surcharge)} = {formatPrice(deliveryQuote.total)}
                </p>
              )}
              {/* Jeju surcharge note: only for customers whose address/postcode is in Jeju */}
              {deliveryQuote?.region === "jeju" && <p className="mt-2 text-xs text-ink/60">{t.shipping.estimate}</p>}
              {shippingError && <p role="alert" className="mt-2 text-sm text-destructive">{t.shipping.unavailable}</p>}

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink/10 pt-4">
                <span className="font-display text-lg font-extrabold text-ink">{t.totalAmount}</span>
                <span className="font-display text-2xl font-black text-brand sm:text-[28px]">
                  {formatPrice(totalPrice + shippingFee)}
                </span>
              </div>

              <Button
                type="submit"
                className="mt-5 h-14 w-full gap-2 rounded-xl bg-brand font-display text-lg font-extrabold text-white shadow-sm transition-colors hover:bg-brand-deep"
                disabled={isSubmitting || isLoadingShippingFee || shippingError || !deliveryQuote || deliveryQuote.mismatch}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t.processingPayment}
                  </>
                ) : (
                  <>
                    {t.placeOrder}
                    <ShoppingBag className="h-5 w-5" />
                  </>
                )}
              </Button>
            </aside>
          </form>
        </Form>
      </main>

      <Footer />
    </div>
  );
}

// Shared card look for every checkout section
const CARD = "rounded-2xl bg-white p-5 shadow-card sm:p-6";
const CARD_TITLE = "font-display text-xl font-extrabold text-ink";

// Korean mobile number as the customer types: 010-0000-0000
function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

// Section each step chip jumps to (index 0, the cart, is its own page)
const STEP_SECTION_IDS = [null, "checkout-details", "checkout-payment"] as const;

// Red page header with the three checkout steps (cart → details → payment).
// "Сагс" opens the cart page; the other two scroll to their card on this page,
// and the highlighted chip follows the scroll position.
function CheckoutHeader({
  title,
  steps,
  activeStep = 1,
  onStep,
}: {
  title: string;
  steps: readonly string[];
  activeStep?: number;
  onStep?: (index: number) => void;
}) {
  return (
    <div className="bg-brand px-4 pb-16 pt-8 text-center text-white md:pb-20 md:pt-10">
      <h1 className="font-display text-[28px] font-black leading-tight md:text-4xl">{title}</h1>
      <ol className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {steps.map((label, index) => {
          const content = `${index + 1} ${label}`;
          const active = index === activeStep;
          const chip = cn(
            "inline-flex rounded-full px-3.5 py-1.5 font-display text-sm font-bold transition-colors",
            active ? "bg-white text-brand" : "bg-white/20 text-white hover:bg-white/30",
          );
          return (
            <li key={label}>
              {index === 0 ? (
                <Link href="/cart" className={chip}>
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onStep?.(index)}
                  disabled={!onStep}
                  aria-current={active ? "step" : undefined}
                  className={cn(chip, "disabled:cursor-default")}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Cart row: photo (or placeholder), name, unit price, quantity stepper and delete
function CheckoutCartItem({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  // Bulky cuts are sold in 4kg steps (same rule as the cart page)
  const bulky = isBulkyMeat(item.name);
  const step = bulky ? 4 : 1;
  const showImage = !!item.imageUrl && !imageFailed;

  return (
    <li className="flex gap-4 py-4 first:pt-0 last:pb-0">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-brand/10">
        {showImage ? (
          <img
            src={getFullImageUrl(item.imageUrl)}
            alt={item.name}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-brand/70">
            {t.checkoutPage.noImage}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 font-bold leading-snug text-ink">{item.name}</p>
          <button
            type="button"
            onClick={() => removeItem(item.productId)}
            aria-label={t.remove}
            className="-mr-1 -mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-brand transition-colors hover:bg-brand/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {/* Price and stepper share one centre line; the row ends level with the photo */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-sm font-semibold text-ink/60">
            {formatPrice(item.price)} {bulky ? "/ 4кг" : "/ кг"}
          </p>
          <div className="flex items-center rounded-full border border-ink/15 bg-white">
            <button
              type="button"
              onClick={() => (item.quantity > step ? updateQuantity(item.productId, item.quantity - step) : removeItem(item.productId))}
              aria-label={t.decrease}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[24px] text-center font-display font-extrabold text-ink">{item.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, item.quantity + step)}
              aria-label={t.increase}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
