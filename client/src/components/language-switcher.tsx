import React, { useState } from "react";
import {
  useLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
} from "@/contexts/language-context";
import { ChevronDown, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === language,
  );

  const handleLanguageChange = (newLanguage: Language) => {
    const previousLanguage = language;
    setLanguage(newLanguage);
    setIsOpen(false);

    // 언어 변경 후 약간의 지연을 두고 토스트 메시지 표시
    // 이렇게 하면 새로운 언어 컨텍스트가 완전히 적용된 후 토스트가 표시됩니다
    setTimeout(() => {
      const newLanguageName = SUPPORTED_LANGUAGES.find(
        (lang) => lang.code === newLanguage,
      )?.name;

      // 새로운 언어 컨텍스트로 메시지 생성
      if (newLanguage === "mn") {
        toast({
          title: "Хэл амжилттай солигдлоо",
          description: `Одоо ${newLanguageName} хэл идэвхжсэн байна`,
        });
      } else if (newLanguage === "ru") {
        toast({
          title: "Язык успешно изменен",
          description: `Теперь активен ${newLanguageName} язык`,
        });
      } else if (newLanguage === "en") {
        toast({
          title: "Language changed successfully",
          description: `${newLanguageName} is now active`,
        });
      }
    }, 100); // 100ms 지연으로 언어 컨텍스트 업데이트 완료 대기
  };

  return (
    <div className="relative">
      {/* 현재 선택된 언어 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200 text-gray-700 bg-white shadow-sm"
      >
        <Globe className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium hidden sm:block">
          {currentLanguage?.name}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
                  language === lang.code
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
                {language === lang.code && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 배경 클릭 시 드롭다운 닫기 */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
