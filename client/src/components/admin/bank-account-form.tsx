import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BankAccount, insertBankAccountSchema } from "@shared/schema";

// Extend the bank account schema for form validation
const bankAccountFormSchema = z.object({
  bankName: z.string().min(1, "Банкны нэр оруулна уу"),
  accountNumber: z.string().min(1, "Дансны дугаар оруулна уу"),
  accountHolder: z.string().min(1, "Данс эзэмшигчийн нэр оруулна уу"),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>;

interface BankAccountFormProps {
  bankAccount?: BankAccount;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BankAccountForm({
  bankAccount,
  onSuccess,
  onCancel,
}: BankAccountFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues: {
      bankName: bankAccount?.bankName || "",
      accountNumber: bankAccount?.accountNumber || "",
      accountHolder: bankAccount?.accountHolder || "",
      description: bankAccount?.description || "",
      isDefault: bankAccount?.isDefault || false,
      isActive: bankAccount?.isActive ?? true,
    },
  });

  const onSubmit = async (data: BankAccountFormValues) => {
    setIsSubmitting(true);
    try {
      // Process null or empty string
      const processedData = {
        ...data,
        description: data.description === "" ? null : data.description,
      };

      if (bankAccount) {
        // Update existing bank account
        await apiRequest(
          "PATCH",
          `/api/bank-accounts/${bankAccount.id}`,
          processedData
        );
        toast({
          title: "Банкны данс шинэчлэгдлээ",
          description: "Банкны дансны мэдээлэл амжилттай шинэчлэгдлээ.",
        });
      } else {
        // Create new bank account
        await apiRequest(
          "POST",
          "/api/bank-accounts",
          processedData
        );
        toast({
          title: "Банкны данс үүсгэгдлээ",
          description: "Шинэ банкны данс амжилттай үүсгэгдлээ.",
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving bank account:", error);
      let errorMessage =
        "Банкны данс хадгалахад алдаа гарлаа. Дахин оролдоно уу.";

      if (error instanceof Error) {
        console.error("Error details:", error.message);
        // Extract more specific error message if possible
        if (
          error.message.includes("400") ||
          error.message.includes("Invalid")
        ) {
          errorMessage =
            "Формын талбаруудыг бөглөх үед алдаа гарлаа. Мэдээллийг дахин шалгана уу.";
        } else if (
          error.message.includes("401") ||
          error.message.includes("unauthorized")
        ) {
          errorMessage = "Таны эрх хүрэхгүй байна. Дахин нэвтэрнэ үү.";
        } else if (error.message.includes("500")) {
          errorMessage = "Серверийн алдаа гарлаа. Дахин оролдоно уу.";
        }
      }

      toast({
        title: "Алдаа гарлаа",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full rounded-2xl">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="font-display text-lg font-extrabold md:text-2xl">
          {bankAccount ? "Банкны данс засах" : "Шинэ банкны данс үүсгэх"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Банкны нэр</FormLabel>
                  <FormControl>
                    <Input placeholder="Голомт банк" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дансны дугаар</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Данс эзэмшигчийн нэр</FormLabel>
                  <FormControl>
                    <Input placeholder="Компанийн нэр" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тайлбар</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Шилжүүлэг хийх заавар эсвэл нэмэлт мэдээлэл"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0 rounded-lg border border-ink/10 p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Үндсэн данс</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Энэ дансыг захиалгын хуудас дээр үндсэн байдлаар харуулах
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="h-11 w-full md:h-10 md:w-auto"
              >
                Цуцлах
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full md:h-10 md:w-auto"
              >
                {isSubmitting ? "Хадгалж байна..." : "Хадгалах"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
