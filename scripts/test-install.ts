import assert from 'node:assert/strict';
import { getInstallPlatform, getInstallUrl, getAndroidBrowserIntent } from '../client/src/lib/install';

for (const ua of [
  'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) FBAN/FB4A;FBAV/500',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) [FBAN/MessengerForiOS;FBAV/500]',
  'Mozilla/5.0 (iPhone) Instagram 400',
  'Mozilla/5.0 (Linux; Android 14) KAKAOTALK 25',
  'Mozilla/5.0 (iPhone) Line/14.0',
]) assert.equal(getInstallPlatform(ua).isInApp, true, ua);
assert.equal(getInstallPlatform('Mozilla/5.0 (Android 14) SamsungBrowser/25 Chrome/125').isInApp, false);
assert.equal(getInstallPlatform('Mozilla/5.0 (iPhone) Version/18 Safari/604').isIOS, true);
assert.equal(getInstallPlatform('Mozilla/5.0 (Macintosh)', 'MacIntel', 5).isIOS, true);
assert.equal(getInstallPlatform('Mozilla/5.0 (Windows NT 10.0) Chrome/130').isIOS, false);
const url = getInstallUrl('https://meatmall.pages.dev');
assert.equal(url, 'https://meatmall.pages.dev/?install=1');
const intent = getAndroidBrowserIntent(url);
assert.ok(intent.startsWith('intent://meatmall.pages.dev/?install=1#Intent;scheme=https;'));
assert.ok(intent.includes('category=android.intent.category.BROWSABLE;'));
assert.ok(!intent.includes('package='), 'Must support browsers other than Chrome');
assert.ok(intent.includes(`S.browser_fallback_url=${encodeURIComponent(url)};end`));
assert.throws(() => getAndroidBrowserIntent('javascript:alert(1)'));
console.log('PASS: Facebook/Messenger/Instagram/Kakao/LINE detection, Safari/Samsung/iPad distinction, install continuation URL and Android browser intent.');
