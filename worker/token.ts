// 네이티브 앱용 Bearer 토큰 (HMAC-SHA256 서명).
//
// 쿠키 기반 세션은 앱(origin https://localhost) → API(arvijix.kr) cross-site 환경에서
// WebView가 쿠키를 안정적으로 전달하지 못한다. 그래서 앱은 로그인 시 받은 토큰을
// 저장하고 Authorization: Bearer 헤더로 보낸다. 웹은 기존 쿠키 방식을 그대로 쓴다.
//
// 토큰 형식:  `${userId}.${expMs}.${base64url(HMAC(`${userId}.${expMs}`, SECRET))}`

const encoder = new TextEncoder();

async function hmacBase64Url(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const bytes = new Uint8Array(sigBuf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export async function signToken(
  userId: number,
  secret: string,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<string> {
  const exp = Date.now() + ttlMs;
  const payload = `${userId}.${exp}`;
  const sig = await hmacBase64Url(payload, secret);
  return `${payload}.${sig}`;
}

// 유효하면 userId, 아니면 null 반환
export async function verifyToken(
  token: string,
  secret: string,
): Promise<number | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [uidStr, expStr, sig] = parts;
  const expected = await hmacBase64Url(`${uidStr}.${expStr}`, secret);
  if (sig !== expected) return null;
  const exp = parseInt(expStr, 10);
  if (!exp || Date.now() > exp) return null;
  const uid = parseInt(uidStr, 10);
  return Number.isNaN(uid) ? null : uid;
}
