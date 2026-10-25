import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSiteContentSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WysiwygEditor } from "./wysiwyg-editor";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
} from "@/components/ui";

// Extend the schema for form validation
const siteContentFormSchema = insertSiteContentSchema.extend({
  id: z.number().optional(),
});

type SiteContentFormValues = z.infer<typeof siteContentFormSchema>;

interface SiteContentFormProps {
  content?: any; // Use SiteContent type from schema
  onSuccess: () => void;
  onCancel: () => void;
}

export function SiteContentForm({
  content,
  onSuccess,
  onCancel,
}: SiteContentFormProps) {
  const { toast } = useToast();
  const isEditing = !!content;

  const form = useForm<SiteContentFormValues>({
    resolver: zodResolver(siteContentFormSchema),
    defaultValues: {
      key: content?.key || "",
      title: content?.title || "",
      content: content?.content || "<p>Энд агуулгыг оруулна уу.</p>",
      imageUrl: content?.imageUrl || "",
      active: content?.active ?? true,
    },
  });

  const onSubmit = async (data: SiteContentFormValues) => {
    try {
      if (isEditing && content.id) {
        await apiRequest("PUT", `/api/site-content/${content.id}`, data);
        toast({
          title: "Агуулга шинэчлэгдлээ",
          description: "Сайтын агуулга амжилттай шинэчлэгдлээ.",
        });
      } else {
        await apiRequest("POST", "/api/site-content", data);
        toast({
          title: "Агуулга үүсгэгдлээ",
          description: "Шинэ сайтын агуулга амжилттай нэмэгдлээ.",
        });
      }
      onSuccess();
    } catch (error) {
      toast({
        title: "Алдаа гарлаа",
        description: "Агуулга хадгалах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Агуулга засах" : "Шинэ агуулга нэмэх"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Түлхүүр (key)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="home_hero"
                        {...field}
                        disabled={isEditing}
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
                      <Input placeholder="Агуулгын гарчиг" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Зурган хаяг (URL)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Агуулга</FormLabel>
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

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Идэвхтэй</FormLabel>
                    <div className="text-sm text-gray-500">
                      Энэ агуулгыг сайт дээр харуулах эсэх
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

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Цуцлах
              </Button>
              <Button type="submit" variant="default">
                {isEditing ? "Хадгалах" : "Үүсгэх"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
