/**
 * 이미지 URL을 올바른 형식으로 변환하는 유틸리티 함수
 * - 상대 경로를 절대 경로로 변환
 * - Data URL은 그대로 유지
 * - 절대 URL은 그대로 유지
 * - 캐시 방지용 타임스탬프 추가
 */
export function getFullImageUrl(src: string | null | undefined): string {
  if (!src) return "";

  // 이미 절대 URL이거나 데이터 URL인 경우 그대로 반환
  if (src.startsWith("data:") || src.startsWith("http")) {
    return src;
  }

  // API 베이스 URL이 있으면 사용, 아니면 현재 오리진 사용
  // 상대 경로인 경우 브라우저가 현재 도메인을 기준으로 요청함
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

  // 경로 정리: /로 시작하도록 보장
  const cleanPath = src.startsWith("/") ? src : `/${src}`;

  // URL 인코딩 처리 (공백 및 특수문자 대응)
  const encodedPath = encodeURI(cleanPath);

  // apiBaseUrl이 절대 경로인 경우를 위해 결합
  const fullUrl = `${apiBaseUrl}${encodedPath}`;

  // 절대 URL이 아니면 현재 오리진을 붙여줌 (SSR 대응 보다는 안정성 위함)
  if (!fullUrl.startsWith("http") && !fullUrl.startsWith("//")) {
    return `${window.location.origin}${fullUrl.startsWith("/") ? "" : "/"}${fullUrl}`;
  }

  return fullUrl;
}

/**
 * 이미지 에러 처리 함수
 * @param event 이미지 로드 오류 이벤트
 * @param originalSrc 원본 이미지 URL (로깅용)
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  originalSrc?: string,
) {
  const currentSrc = event.currentTarget.src;

  // 브라우저에서 제공하는 오류 세부 정보 로깅 (가능한 경우)
  console.error("Image failing to load details:", {
    timestamp: new Date().toISOString(),
    originalSrc: originalSrc,
    resolvedSrc: currentSrc,
    windowLocation: window.location.href,
    origin: window.location.origin,
  });

  // 몽골어로 기본 이미지 텍스트 변경 및 명확한 아이콘 사용
  const fallbackUrl =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjQ1JSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+0JfRg9GA0LDQsyDQsNC70LPQsDwvdGV4dD48cGF0aCBmaWxsPSIjNTU1IiBkPSJNNjUgNzBjMC04LjI4NCA2LjcxNi0xNSAxNS0xNSA4LjI4NCAwIDE1IDYuNzE2IDE1IDE1IDAgOC4yODQtNi43MTYgMTUtMTUgMTUtOC4yODQgMC0xNS02LjcxNi0xNS0xNXptNSAwYzAgNS41MjMgNC40NzcgMTAgMTAgMTAgNS41MjMgMCAxMC00LjQ3NyAxMC0xMCAwLTUuNTIzLTQuNDc3LTEwLTEwLTEwLTUuNTIzIDAtMTAgNC40NzctMTAgMTB6Ii8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNTU1IiBzdHJva2Utd2lkdGg9IjQiIGQ9Ik01NSA5MGMwLTEzLjgwNyAxMS4xOTMtMjUgMjUtMjVzMjUgMTEuMTkzIDI1IDI1djEwSDU1VjkweiIvPjwvc3ZnPg==";

  if (currentSrc !== fallbackUrl) {
    event.currentTarget.src = fallbackUrl;
  }
}

/**
 * 제품 카테고리에 따른 색상화된 대체 이미지 생성
 * @param name 제품 이름
 * @param category 제품 카테고리
 * @returns SVG 데이터 URL
 */
export function getCategoryFallbackImage(
  name: string,
  category?: string,
): string {
  const colorMap: Record<string, string> = {
    "Үхрийн мах": "#FF6B6B", // 소고기 - 빨강계열
    "Хонины мах": "#4ECDC4", // 양고기 - 청록계열
    "Ямааны мах": "#FFD166", // 염소고기 - 노랑계열
    "Гахайн мах": "#F9A8D4", // 돼지고기 - 분홍계열
    "Тахианы мах": "#A78BFA", // 닭고기 - 보라계열
    "Загасны мах": "#60A5FA", // 생선 - 파란계열
    Бусад: "#D1D5DB", // 기타 - 회색계열
  };

  const color =
    category && colorMap[category] ? colorMap[category] : colorMap["Бусад"];

  // 제품명이 너무 길면 자르기
  const displayName = name.length > 20 ? name.substring(0, 20) + "..." : name;
  const displayCategory = category || "Бүтээ그дэхүүн"; // 카테고리가 없으면 '제품'으로 표시

  // Base64 인코딩 전에 SVG 문자열 생성
  const svgContent = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="${color}" />
    <text x="400" y="280" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle">${displayName}</text>
    <text x="400" y="340" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">${displayCategory}</text>
  </svg>`;

  // SVG를 Base64로 인코딩하여 데이터 URL 반환
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
}

/**
 * 이미지 URL에 타임스탬프 추가하여 캐시 방지
 * @param url 원본 이미지 URL
 * @returns 타임스탬프가 추가된 URL
 */
export function addTimestampToUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  const timestamp = new Date().getTime();
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${timestamp}`;
}

/**
 * Compresses an image file by resizing and converting to WebP
 * @param file Original file
 * @param maxWidth Maximum width (default: 1920)
 * @param quality Quality (0-1) (default: 0.8)
 * @returns Compressed File object
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.8,
): Promise<File> {
  if (!file.size || (!file.type.startsWith('image/') && !/\.(jpe?g|png|gif|webp)$/i.test(file.name))) {
    throw new Error('JPG, PNG, GIF эсвэл WebP зургийн файл сонгоно уу.');
  }
  const limit = Math.max(1, Math.min(4096, Number.isFinite(maxWidth) ? maxWidth : 1920));
  const normalizedQuality = Math.max(0, Math.min(1, Number.isFinite(quality) ? quality : 0.8));
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  let canvas: HTMLCanvasElement | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Зургийг нээж чадсангүй. Өөр JPG эсвэл PNG зураг сонгоно уу.'));
      img.src = objectUrl;
    });
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) throw new Error('Зургийн хэмжээ буруу байна. Өөр зураг сонгоно уу.');
    // Avoid re-encoding an already optimized result when another upload path reuses it.
    if (Math.max(width, height) <= limit && await isOptimizedWebp(file)) return file;
    const scale = Math.min(1, limit / Math.max(width, height));
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Зураг боловсруулах санах ой хүрэлцэхгүй байна. Жижиг зураг сонгоод дахин оролдоно уу.');
    try { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); }
    catch { throw new Error('Зургийг боловсруулж чадсангүй. Жижиг JPG эсвэл PNG зураг сонгоно уу.'); }

    let blob = await new Promise<Blob | null>(resolve => {
      try { canvas!.toBlob(resolve, 'image/webp', normalizedQuality); }
      catch { resolve(null); }
    });
    if (!blob || !await isOptimizedWebp(blob)) {
      // Unsupported canvas types silently return PNG in Safari. Encode actual WebP
      // locally instead of relabelling PNG bytes or relaxing server validation.
      try {
        const { encodeWebpPixels } = await import('./webp-encoder');
        blob = await encodeWebpPixels(ctx.getImageData(0, 0, canvas.width, canvas.height), normalizedQuality);
      } catch {
        throw new Error('Зургийг боловсруулж чадсангүй. Интернэт холболтоо шалгаад дахин оролдох эсвэл жижиг JPG/PNG зураг сонгоно уу.');
      }
    }
    if (!await isOptimizedWebp(blob)) throw new Error('Зургийн файл буруу эсвэл 5 MB-ээс их байна. Жижиг зураг сонгоно уу.');
    return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', { type: 'image/webp', lastModified: Date.now() });
  } finally {
    img.onload = null;
    img.onerror = null;
    URL.revokeObjectURL(objectUrl);
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

async function isOptimizedWebp(blob: Blob): Promise<boolean> {
  if (blob.type !== 'image/webp' || !blob.size || blob.size > 5 * 1024 * 1024) return false;
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return bytes.length === 12 && String.fromCharCode(...Array.from(bytes.slice(0, 4))) === 'RIFF'
    && String.fromCharCode(...Array.from(bytes.slice(8, 12))) === 'WEBP';
}

/**
 * Generates a thumbnail version of an image
 * @param file Original file
 * @param size Thumbnail size (default: 300px)
 * @returns Thumbnail File object
 */
export async function generateThumbnail(file: File, size = 300): Promise<File> {
  return compressImage(file, size, 0.7);
}

/**
 * Uploads a file to the media library
 * @param file File to upload
 * @returns Promise with uploaded media item data
 */
export async function uploadMedia(
  file: File,
  options: { optimized?: boolean } = {},
): Promise<{ url: string; id?: number }> {
  try {
    const formData = new FormData();
    if (options.optimized && !await isOptimizedWebp(file)) throw new Error('Боловсруулсан WebP зургийн файл буруу байна.');
    formData.append("file", options.optimized ? file : await compressImage(file));

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const response = await fetch(`${apiBaseUrl}/api/media`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}
