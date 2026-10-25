import { addDays, format, isSameDay, setHours, setMinutes } from "date-fns";
import { ko } from "date-fns/locale";

export interface DeliverySettings {
  cutoffHour: number;
  cutoffMinute: number;
  processingDays: number;
}

export interface NonDeliveryDay {
  id: number;
  date: string;
  reason: string;
  isRecurringYearly: boolean;
}

export function calculateDeliveryDate(
  settings: DeliverySettings,
  nonDeliveryDays: NonDeliveryDay[],
  currentTime: Date = new Date(),
): Date {
  const { cutoffHour, cutoffMinute, processingDays } = settings;

  let effectiveTime = new Date(currentTime);

  // If order is placed on a weekend, treat it as if it was placed on Monday before cutoff
  // so that it ships out on Monday.
  if (effectiveTime.getDay() === 6) { // Saturday
    effectiveTime = addDays(effectiveTime, 2);
    effectiveTime = setHours(effectiveTime, cutoffHour - 1);
  } else if (effectiveTime.getDay() === 0) { // Sunday
    effectiveTime = addDays(effectiveTime, 1);
    effectiveTime = setHours(effectiveTime, cutoffHour - 1);
  }

  const cutoffTime = setMinutes(
    setHours(effectiveTime, cutoffHour),
    cutoffMinute,
  );

  let deliveryDate: Date;

  if (effectiveTime < cutoffTime) {
    deliveryDate = addDays(effectiveTime, processingDays);
  } else {
    deliveryDate = addDays(effectiveTime, processingDays + 1);
  }

  while (isNonDeliveryDay(deliveryDate, nonDeliveryDays)) {
    deliveryDate = addDays(deliveryDate, 1);
  }

  return deliveryDate;
}

function isNonDeliveryDay(
  date: Date,
  nonDeliveryDays: NonDeliveryDay[],
): boolean {
  return nonDeliveryDays.some((day) => {
    const dayDate = new Date(day.date);
    if (day.isRecurringYearly) {
      return (
        dayDate.getMonth() === date.getMonth() &&
        dayDate.getDate() === date.getDate()
      );
    }
    return isSameDay(dayDate, date);
  });
}

export function formatDeliveryDate(
  date: Date,
  language: string = "mn",
): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const weekDays: Record<string, string[]> = {
    mn: ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"],
    ko: ["일", "월", "화", "수", "목", "금", "토"],
    ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  };

  const monthNames: Record<string, string> = {
    mn: "сар",
    ko: "월",
    ru: "",
    en: "",
  };

  const dayOfWeek =
    weekDays[language]?.[date.getDay()] || weekDays["mn"][date.getDay()];
  const monthSuffix = monthNames[language] || "сар";

  if (language === "ko") {
    return `${month}${monthSuffix}/${day}(${dayOfWeek})`;
  } else if (language === "en") {
    return `${month}/${day}(${dayOfWeek})`;
  } else if (language === "ru") {
    return `${day}.${month}(${dayOfWeek})`;
  }

  return `${month} ${monthSuffix}/${day}(${dayOfWeek})`;
}

export function getDeliveryMessage(language: string = "mn"): string {
  const messages: Record<string, string> = {
    mn: "хүргэгдэнэ",
    ko: "배송",
    ru: "доставка",
    en: "delivery",
  };

  return messages[language] || messages["mn"];
}
