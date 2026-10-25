import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

// 다국어 토스트 메시지를 번역하는 함수
function getTranslatedToastMessage(message: string, t: any): string {
  // 토스트 메시지 키워드 매핑
  const toastMap: Record<string, string> = {
    Success: t.toast.success,
    Error: t.toast.error,
    "Added to cart": t.toast.cartAdded,
    "Product has been added to your cart": t.toast.cartAddedDesc,
    "Login required": t.toast.loginRequired,
    "Please log in to add items to cart": t.toast.loginRequiredDesc,
    "Failed to add to cart": t.toast.addToCartError,
    "An error occurred while adding the item to cart":
      t.toast.addToCartErrorDesc,
    "Login successful": t.toast.loginSuccess,
    "You have successfully logged in": t.toast.loginSuccessDesc,
    "Welcome back": t.toast.loginSuccessWelcome,
    "Login failed": t.toast.loginFailed,
    "Invalid username or password": t.toast.loginFailedDesc,
    "Registration successful": t.toast.registerSuccess,
    "Your account has been created successfully": t.toast.registerSuccessDesc,
    "Registration failed": t.toast.registerFailed,
    "An error occurred during registration": t.toast.registerFailedDesc,
    "Logout successful": t.toast.logoutSuccess,
    "You have been logged out successfully": t.toast.logoutSuccessDesc,
    "Logout failed": t.toast.logoutFailed,
    "An error occurred during logout": t.toast.logoutFailedDesc,
  };

  // 메시지에서 키워드를 찾아 매핑
  for (const [keyword, translatedMessage] of Object.entries(toastMap)) {
    if (message.includes(keyword)) {
      return translatedMessage;
    }
  }

  // 기본값은 원본 메시지 반환
  return message;
}

export function Toaster() {
  const { toasts } = useToast();
  const { t, language } = useLanguage();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        // 언어 변경에 따라 실시간으로 번역 (language를 key에 포함하여 강제 리렌더링)
        const translatedTitle = title
          ? getTranslatedToastMessage(String(title), t)
          : title;
        const translatedDescription = description
          ? getTranslatedToastMessage(String(description), t)
          : description;

        return (
          <Toast key={`${id}-${language}`} {...props}>
            <div className="grid gap-1">
              {translatedTitle && <ToastTitle>{translatedTitle}</ToastTitle>}
              {translatedDescription && (
                <ToastDescription>{translatedDescription}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
