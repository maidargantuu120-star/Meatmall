import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WysiwygEditor } from "./wysiwyg-editor";
import { HelpTooltip } from "./help-tooltip";
import { helpIllustrations } from "@/assets/help";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
} from "@/components/ui";

// Define the form schema
const contentFormSchema = z.object({
  key: z.string().min(1, { message: "Түлхүүр оруулна уу" }),
  title: z.string().min(1, { message: "Гарчиг оруулна уу" }),
  content: z.string().min(1, { message: "Контент оруулна уу" }),
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

interface ContentFormProps {
  content?: any; // Use SiteContent type from schema
  onSuccess: () => void;
  onCancel: () => void;
}

export function ContentForm({
  content,
  onSuccess,
  onCancel,
}: ContentFormProps) {
  const { toast } = useToast();

  // Initialize form with default values
  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      key: content?.key || "",
      title: content?.title || "",
      content: content?.content || "",
    },
  });

  // Form submission handler
  const onSubmit = async (data: ContentFormValues) => {
    try {
      if (content) {
        // Update existing content
        await apiRequest("PATCH", `/api/site-content/${content.id}`, data);
        toast({
          title: "Контент шинэчлэгдлээ",
          description: "Контент амжилттай шинэчлэгдлээ.",
        });
      } else {
        // Create new content
        await apiRequest("POST", "/api/site-content", data);
        toast({
          title: "Контент үүсгэгдлээ",
          description: "Шинэ контент амжилттай үүсгэгдлээ.",
        });
      }

      onSuccess();
    } catch (error) {
      toast({
        title: "Алдаа гарлаа",
        description: "Контент хадгалах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center">
                  <FormLabel>Түлхүүр</FormLabel>
                  <div className="ml-2">
                    <HelpTooltip
                      content={
                        <div>
                          <p className="font-medium mb-1">Түлхүүр:</p>
                          <p>
                            Энэ нь контентыг вебсайт дээр дуудахад ашиглагдах
                            техникийн нэр. Англи үсгээр, доогуур зураас ашиглан
                            бичнэ үү.
                          </p>
                          <p className="text-xs mt-1">
                            Жишээ: home_banner, about_us, contact_info
                          </p>
                        </div>
                      }
                      size="sm"
                    />
                  </div>
                </div>
                <FormLabel>Түлхүүр</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Жишээ: home_banner"
                    disabled={!!content} // Disable editing key for existing content
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Гарчиг</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Контентын гарчиг" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <FormLabel>Контент</FormLabel>
                <div className="ml-2">
                  <HelpTooltip
                    content={
                      <div>
                        <p className="font-medium mb-1">WYSIWYG Редактор:</p>
                        <p className="mb-2">
                          Хүссэн контентоо форматлах боломжтой. Текст, зураг,
                          линк гэх мэт оруулах боломжтой.
                        </p>
                        <p className="text-xs">
                          Санамж: Зураг оруулахын тулд Media Library-с зураг
                          сонгох боломжтой.
                        </p>
                      </div>
                    }
                    illustration={helpIllustrations.wysiwyg}
                    size="sm"
                    side="right"
                  />
                </div>
              </div>
              <FormControl>
                <WysiwygEditor
                  content={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Цуцлах
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Хадгалж байна...
              </span>
            ) : content ? (
              "Шинэчлэх"
            ) : (
              "Хадгалах"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
