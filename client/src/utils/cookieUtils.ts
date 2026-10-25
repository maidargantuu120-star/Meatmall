// Cookie utility functions for mobile compatibility
export const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue || null;
  }
  return null;
};

export const setCookie = (
  name: string,
  value: string,
  days: number = 30,
): void => {
  if (typeof document === "undefined") return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
};

export const deleteCookie = (name: string): void => {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export const getAllCookies = (): Record<string, string> => {
  if (typeof document === "undefined") return {};

  const cookies: Record<string, string> = {};
  document.cookie.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = value;
    }
  });
  return cookies;
};

// Debug function to log all cookies
export const logAllCookies = (): void => {
  console.log("All cookies:", getAllCookies());
  console.log("Raw cookie string:", document.cookie);
};

// Enhanced mobile cookie debugging
export const logMobileCookieDebug = (): void => {
  console.log("=== Mobile Cookie Debug ===");
  console.log("User Agent:", navigator.userAgent);
  console.log("All cookies:", getAllCookies());
  console.log("Raw cookie string:", document.cookie);
  console.log("Session cookie (gerinmah.sid):", getCookie("gerinmah.sid"));
  console.log("Connect.sid cookie:", getCookie("connect.sid"));
  console.log("Cookie string length:", document.cookie.length);
  console.log("Document ready state:", document.readyState);
  console.log(
    "Is mobile browser:",
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ),
  );
  console.log("========================");
};
