import { useAuth } from "@/hooks/use-auth";
import { loginWithGoogle } from "@/lib/native-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema, signupSchema } from "@shared/schema";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getFullImageUrl } from "@/lib/image-utils";
import { BrandLogo } from "@/components/brand-logo";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const { toast } = useToast();

  // Fetch background images
  const { data: loginImagesData } = useQuery<{ images: string[] }>({
    queryKey: ["/api/settings/login-images"],
    queryFn: async () => {
      const res = await fetch("/api/settings/login-images");
      if (!res.ok) throw new Error("Failed to fetch images");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const IMAGES =
    loginImagesData?.images && loginImagesData.images.length > 0
      ? loginImagesData.images
      : [
          "/hero-meat.webp",
          "/hero-meat.webp",
          "/hero-meat.webp",
          "/hero-meat.webp",
          "/hero-meat.webp",
          "/hero-meat.webp",
          "/hero-meat.webp",
          "/hero-meat.webp",
          "/hero-meat.webp",
          "/hero-meat.webp",
        ];

  // Logic for columns based on current images
  const COLUMN_1 = IMAGES.slice(0, Math.ceil(IMAGES.length / 3));
  const COLUMN_2 = IMAGES.slice(
    Math.ceil(IMAGES.length / 3),
    Math.ceil((IMAGES.length * 2) / 3),
  );
  const COLUMN_3 = IMAGES.slice(Math.ceil((IMAGES.length * 2) / 3));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "register") {
      setActiveTab("register");
    }
  }, []);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
    },
  });

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = async (data: z.infer<typeof signupSchema>) => {
    registerMutation.mutate(data);
  };

  // Local development only: Google OAuth is registered to the production domain,
  // so the dev server offers a test-user login (server side: POST /api/dev/login).
  const showDevLogin =
    import.meta.env.DEV &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const [devLoginPending, setDevLoginPending] = useState(false);

  const handleDevLogin = async () => {
    setDevLoginPending(true);
    try {
      const res = await fetch("/api/dev/login", { method: "POST" });
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "DEV_LOGIN=true is missing from .env (restart the dev server after adding it)"
            : `HTTP ${res.status}`,
        );
      }
      // Full load so the new session cookie is used everywhere
      window.location.href = "/my-page";
    } catch (error: any) {
      toast({
        title: "Dev login failed",
        description: error.message,
        variant: "destructive",
      });
      setDevLoginPending(false);
    }
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-brand flex flex-col items-center justify-center">
      {/* Scrolling Background */}
      <div className="absolute inset-0 grid grid-cols-3 gap-6 opacity-60 select-none pointer-events-none -skew-y-6 scale-110 transform-gpu">
        <Column images={COLUMN_1} duration={45} />
        <Column images={COLUMN_2} duration={55} reverse />
        <Column images={COLUMN_3} duration={50} />
      </div>

      {/* Dark Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a4202]/70 via-brand/50 to-[#072e01]/80 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6 my-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-xl mb-2">
            <BrandLogo className="h-28 md:h-36 w-auto mx-auto" />
          </h1>
          <p className="text-gray-200 text-sm md:text-base font-medium">
            Шинэ, чанартай мах махан бүтээгдэхүүн
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden"
        >
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "login" | "register")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100/50">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-white data-[state=active]:text-brand font-bold"
              >
                Нэвтрэх
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-white data-[state=active]:text-brand font-bold"
              >
                Бүртгүүлэх
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="login" className="mt-0">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Имэйл эсвэл Хэрэглэгчийн нэр</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Имэйл эсвэл Хэрэглэгчийн нэр"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Нууц үг</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Нууц үг"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-brand hover:brightness-110 text-white font-bold h-11"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Уншиж байна...
                        </>
                      ) : (
                        "Нэвтрэх"
                      )}
                    </Button>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300"></span>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">
                          Эсвэл
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-gray-300 hover:bg-gray-50 text-gray-700 font-medium h-11 flex items-center justify-center gap-2"
                      onClick={() => loginWithGoogle()}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                        <path fill="none" d="M1 1 23 23" />
                      </svg>
                      Google-ээр нэвтрэх
                    </Button>

                    {/* Local development only: test login without Google */}
                    {showDevLogin && (
                      <button
                        type="button"
                        onClick={handleDevLogin}
                        disabled={devLoginPending}
                        className="w-full h-11 rounded-md border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800 text-sm font-semibold hover:bg-amber-100 disabled:opacity-60"
                        data-testid="dev-login"
                      >
                        {devLoginPending
                          ? "..."
                          : "DEV · Тест хэрэглэгчээр нэвтрэх → Миний хуудас"}
                      </button>
                    )}
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Хэрэглэгчийн нэр</FormLabel>
                          <FormControl>
                            <Input placeholder="Хэрэглэгчийн нэр" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Имэйл хаяг</FormLabel>
                          <FormControl>
                            <Input placeholder="user@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Нууц үг</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Нууц үг"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Нууц үг давтах</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Нууц үг давтах"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Утас (Заавал биш)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="010-0000-0000"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-brand hover:brightness-110 text-white font-bold h-11"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Бүртгүүлж байна...
                        </>
                      ) : (
                        "Бүртгүүлэх"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </div>
          </Tabs>

          <div className="p-4 bg-gray-50 text-center text-xs text-gray-500 border-t border-gray-100">
            Нэвтэрснээр та үйлчилгээний нөхцөлийг зөвшөөрч байна.
          </div>
        </motion.div>
      </div>

      {/* Only for admin bypass - hidden trigger (DEV ONLY) */}
      {import.meta.env.DEV && (
        <div
          className="absolute bottom-0 right-0 w-10 h-10 cursor-alias z-50 opacity-0"
          onClick={() => (window.location.href = "/admin/login")}
          title="Admin Login"
        />
      )}
    </div>
  );
}

const Column = ({
  images,
  duration,
  reverse = false,
}: {
  images: string[];
  duration: number;
  reverse?: boolean;
}) => {
  return (
    <motion.div
      initial={{ y: reverse ? -1000 : 0 }}
      animate={{ y: reverse ? 0 : -1000 }}
      transition={{
        repeat: Infinity,
        repeatType: "loop",
        duration: duration,
        ease: "linear",
      }}
      className="flex flex-col gap-6"
    >
      {/* Loop the images multiple times to creating seamless infinite scroll */}
      {[...images, ...images, ...images, ...images].map((src, index) => (
        <div
          key={index}
          className="relative rounded-xl overflow-hidden shadow-2xl w-full aspect-[3/4]"
        >
          <img
            src={getFullImageUrl(src)}
            alt="background"
            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
          />
        </div>
      ))}
    </motion.div>
  );
};
