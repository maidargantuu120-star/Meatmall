export function getInstallPlatform(ua: string, platform = '', touchPoints = 0) {
  return {
    isIOS: /iPad|iPhone|iPod/i.test(ua) || (platform === 'MacIntel' && touchPoints > 1),
    isAndroid: /Android/i.test(ua),
    isInApp: /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|KAKAOTALK|Line\/|Twitter|TikTok|Bytedance|Snapchat|; wv\)/i.test(ua),
  };
}

export function getInstallUrl(origin: string) {
  // Do not forward checkout details, OAuth tokens or social tracking parameters.
  return new URL('/?install=1', origin).href;
}

export function getAndroidBrowserIntent(installUrl: string) {
  const url = new URL(installUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid install URL');
  // No package restriction: let Android use an available browser, including Samsung Internet.
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${url.protocol.slice(0, -1)};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(url.href)};end`;
}
