import * as React from "react";
import { useFormField } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const { t } = useLanguage();
  const body = error ? getTranslatedMessage(error.message || "", t) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

// 에러 메시지를 다국어로 번역하는 함수
function getTranslatedMessage(message: string, t: any): string {
  // 공통 검증 에러 메시지 매핑
  const errorMap: Record<string, keyof typeof t.formErrors> = {
    Required: "required",
    "This field is required": "required",
    "Email is required": "required",
    "Invalid email address": "invalidEmail",
    "Invalid email": "invalidEmail",
    "Passwords do not match": "passwordMismatch",
    "Password must match": "passwordMismatch",
    "Username must be at least 3 characters": "minLength",
    "Password must be at least 6 characters": "minLength",
    "String must contain at least": "minLength",
    "Too short": "minLength",
    "String must contain at most": "maxLength",
    "Too long": "maxLength",
    "Invalid phone number": "invalidPhone",
    "Username already exists": "usernameExists",
    "Email already exists": "emailExists",
  };

  // 메시지에서 키워드를 찾아 매핑
  for (const [keyword, key] of Object.entries(errorMap)) {
    if (message.includes(keyword)) {
      return t.formErrors[key];
    }
  }

  // Zod 에러 메시지 패턴 매칭
  if (
    message.includes("least") &&
    (message.includes("character") || message.includes("characters"))
  ) {
    return t.formErrors.minLength;
  }
  if (
    message.includes("most") &&
    (message.includes("character") || message.includes("characters"))
  ) {
    return t.formErrors.maxLength;
  }
  if (message.toLowerCase().includes("required")) {
    return t.formErrors.required;
  }
  if (
    message.toLowerCase().includes("email") &&
    message.toLowerCase().includes("invalid")
  ) {
    return t.formErrors.invalidEmail;
  }

  // 기본값은 원본 메시지 반환
  return message;
}

export { FormMessage };
