import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Form components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Define the footer settings form schema
const footerSettingsSchema = z.object({
  companyName: z.string().min(1, { message: "Компанийн нэр оруулна уу" }),
  description: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email({ message: "Зөв имэйл хаяг оруулна уу" }),
  copyrightText: z.string(),
  logoUrl: z.string().optional(),
  // These will be handled separately in the form
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  // Quick links will be handled separately
});

type FooterFormValues = z.infer<typeof footerSettingsSchema>;

export function FooterSettingsForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [quickLinks, setQuickLinks] = useState<
    Array<{ title: string; url: string }>
  >([]);
  const [newQuickLinkTitle, setNewQuickLinkTitle] = useState("");
  const [newQuickLinkUrl, setNewQuickLinkUrl] = useState("");

  // Fetch existing footer settings
  const { data: footerSettings, isLoading } = useQuery<any>({
    queryKey: ["/api/settings/footer"],
    queryFn: async () => {
      const res = await fetch("/api/settings/footer");
      if (!res.ok) throw new Error("Failed to fetch footer settings");
      return res.json();
    },
  });

  // Setup form with default values
  const form = useForm<FooterFormValues>({
    resolver: zodResolver(footerSettingsSchema),
    defaultValues: {
      companyName: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      copyrightText: "",
      logoUrl: "",
      facebook: "",
      twitter: "",
      instagram: "",
      youtube: "",
    },
  });

  // Update form when data is loaded
  useEffect(() => {
    if (footerSettings && !isLoading) {
      // Set form values
      form.reset({
        companyName: footerSettings.companyName,
        description: footerSettings.description,
        address: footerSettings.address,
        phone: footerSettings.phone,
        email: footerSettings.email,
        copyrightText: footerSettings.copyrightText,
        logoUrl: footerSettings.logoUrl || "",
        // Extract social links if they exist
        facebook: footerSettings.socialLinks?.facebook || "",
        twitter: footerSettings.socialLinks?.twitter || "",
        instagram: footerSettings.socialLinks?.instagram || "",
        youtube: footerSettings.socialLinks?.youtube || "",
      });

      // Set quick links
      if (
        footerSettings.quickLinks &&
        Array.isArray(footerSettings.quickLinks)
      ) {
        setQuickLinks(footerSettings.quickLinks);
      }

      // Set preview URL for logo if it exists
      if (footerSettings.logoUrl) {
        setPreviewUrl(footerSettings.logoUrl);
      }
    }
  }, [footerSettings, isLoading, form]);

  // Handle file selection for logo upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
    }
  };

  // Handle adding a new quick link
  const handleAddQuickLink = () => {
    if (newQuickLinkTitle && newQuickLinkUrl) {
      setQuickLinks([
        ...quickLinks,
        { title: newQuickLinkTitle, url: newQuickLinkUrl },
      ]);
      setNewQuickLinkTitle("");
      setNewQuickLinkUrl("");
    } else {
      toast({
        title: "Гарчиг болон URL оруулна уу",
        variant: "destructive",
      });
    }
  };

  // Handle removing a quick link
  const handleRemoveQuickLink = (index: number) => {
    const newLinks = [...quickLinks];
    newLinks.splice(index, 1);
    setQuickLinks(newLinks);
  };

  // Submit data to backend
  const updateFooterMutation = useMutation({
    mutationFn: async (data: FooterFormValues) => {
      // Create a FormData object to handle file uploads
      const formData = new FormData();

      // Add basic form fields
      formData.append("companyName", data.companyName);
      formData.append("description", data.description);
      formData.append("address", data.address);
      formData.append("phone", data.phone);
      formData.append("email", data.email);
      formData.append("copyrightText", data.copyrightText);

      // Add logo if one is selected
      if (selectedFile) {
        formData.append("footerLogo", selectedFile);
      } else if (data.logoUrl) {
        formData.append("logoUrl", data.logoUrl);
      }

      // Add social links
      const socialLinks = {
        facebook: data.facebook,
        twitter: data.twitter,
        instagram: data.instagram,
        youtube: data.youtube,
      };
      formData.append("socialLinks", JSON.stringify(socialLinks));

      // Add quick links
      formData.append("quickLinks", JSON.stringify(quickLinks));

      // Send the data to the server
      const response = await fetch("/api/settings/footer", {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(
          errorData.message || "Failed to update footer settings",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      // Show success message
      toast({
        title: "Амжилттай!",
        description: "Хөлны тохиргоо шинэчлэгдлээ",
        variant: "default",
      });

      // Invalidate the footer settings query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/settings/footer"] });
    },
    onError: (error) => {
      // Show error message
      toast({
        title: "Алдаа гарлаа!",
        description: error.message || "Хөлны тохиргоог шинэчлэхэд алдаа гарлаа",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FooterFormValues) => {
    updateFooterMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        Ачааллаж байна...
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">Ерөнхий</TabsTrigger>
            <TabsTrigger value="contact">Холбоо барих</TabsTrigger>
            <TabsTrigger value="social">Сошиал хаягууд</TabsTrigger>
            <TabsTrigger value="links">Холбоос</TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ерөнхий мэдээлэл</CardTitle>
                <CardDescription>
                  Хөлний хэсэгт харагдах компанийн мэдээллийг оруулна уу
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Компанийн нэр</FormLabel>
                      <FormControl>
                        <Input placeholder="Герин Мах" {...field} />
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
                          placeholder="Монголын хамгийн чанартай махыг танд хүргэж байна."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="copyrightText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Зохиогчийн эрхийн тэмдэглэл</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={`© ${new Date().getFullYear()} Герин Мах. Бүх эрх хуулиар хамгаалагдсан.`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel htmlFor="footerLogo">
                    Хөлний лого (хэрэв шаардлагатай бол)
                  </FormLabel>
                  <div className="flex flex-col space-y-2">
                    {previewUrl && (
                      <div className="relative w-48 h-24 bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={previewUrl}
                          alt="Footer logo preview"
                          className="object-contain w-full h-full"
                        />
                      </div>
                    )}
                    <Input
                      id="footerLogo"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Information Tab */}
          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Холбоо барих мэдээлэл</CardTitle>
                <CardDescription>
                  Хэрэглэгчид тантай холбоо барих мэдээллийг оруулна уу
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-primary" />
                        Хаяг
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Улаанбаатар хот, Монгол Улс"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FaPhoneAlt className="text-primary" />
                        Утасны дугаар
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+976 9911-2233" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FaEnvelope className="text-primary" />
                        Имэйл хаяг
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="info@gerinmah.mn" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Сошиал хаягууд</CardTitle>
                <CardDescription>
                  Сошиал медиа хаягуудын холбоосыг оруулна уу (заавал биш)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FaFacebook className="text-blue-600" />
                        Facebook
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://facebook.com/" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FaTwitter className="text-blue-400" />
                        Twitter
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://twitter.com/" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FaInstagram className="text-pink-600" />
                        Instagram
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://instagram.com/"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="youtube"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FaYoutube className="text-red-600" />
                        YouTube
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://youtube.com/" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quick Links Tab */}
          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Түргэн холбоосууд</CardTitle>
                <CardDescription>
                  Хөлний хэсэгт харагдах холбоосуудыг оруулна уу
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {quickLinks.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Одоогийн холбоосууд</h3>
                    <ul className="space-y-2">
                      {quickLinks.map((link, index) => (
                        <li
                          key={index}
                          className="flex justify-between items-center p-2 rounded bg-secondary/10"
                        >
                          <div>
                            <p className="font-medium">{link.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {link.url}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveQuickLink(index)}
                          >
                            Устгах
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-secondary/10 rounded-md">
                    <p className="text-muted-foreground">
                      Одоогоор холбоос байхгүй байна
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Шинэ холбоос нэмэх</h3>
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <div className="flex-1">
                      <Input
                        placeholder="Гарчиг (жнь: Бидний тухай)"
                        value={newQuickLinkTitle}
                        onChange={(e) => setNewQuickLinkTitle(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="URL (жнь: /about)"
                        value={newQuickLinkUrl}
                        onChange={(e) => setNewQuickLinkUrl(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddQuickLink}
                    >
                      Нэмэх
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Тайлбар: Ангилал, бүтээгдэхүүн зэрэг холбоосууд байна
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={updateFooterMutation.isPending}
            className="w-full sm:w-auto"
          >
            {updateFooterMutation.isPending ? "Хадгалж байна..." : "Хадгалах"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
