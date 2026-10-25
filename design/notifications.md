# Meat Mall · Push notifications

Web Push for the website and the home-screen app (PWA). Works without the site being open.

## Who gets what

| Event | To | Title (mn) | Tap opens |
|---|---|---|---|
| New order (checkout) | Admin devices | Шинэ захиалга #ORD-0000 🔔 · name · amount | `/admin/orders?id=…` |
| New order (checkout) | The customer | Захиалга хүлээн авлаа · bank transfer reminder | `/my-page` |
| Status → processing | The customer | Төлбөр баталгаажлаа ✅ | `/my-page` |
| Status → completed | The customer | Захиалга хүргэгдлээ 🚚 · keep the meat refrigerated | `/my-page` |
| Status → cancelled | The customer | Захиалга цуцлагдлаа | `/my-page` |
| "Туршиж үзэх" button | The caller only | Мэдэгдэл амжилттай идэвхжлээ 🔔 | My Page / admin |

Notifications for one order share a tag (`order-<id>`), so a newer status replaces the older one instead of stacking.
Texts live in `worker/push.ts` (`STATUS_NOTICES`) and `worker/api/orders.ts`.

## Where users turn it on

- Customers: the **Захиалгын мэдэгдэл** card on My Page (checkout lands there).
- Admin: **Утасны мэдэгдэл** in the admin menu, under **Дуут мэдэгдэл**. Turning it on sends a test notification.
- Logging out removes that phone's subscription. Logging in as another account moves the phone to that account.

## Devices

| Device | Works |
|---|---|
| Android (Chrome, Samsung Internet) | Yes, in the browser or after "Add to Home Screen" |
| iPhone / iPad (iOS 16.4+) | Only after "Add to Home Screen", opened from the home-screen icon |
| PC Chrome / Edge | Yes |
| Capacitor Android app build | No (would need Firebase Cloud Messaging) |
| In-app browsers (KakaoTalk, Facebook) | No |

## Production setup (once)

1. Generate a VAPID key pair (do not reuse the local one in `.env`):

   ```bash
   node -e "const c=require('crypto');const k=c.generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({format:'jwk'});console.log('VAPID_PUBLIC_KEY='+Buffer.concat([Buffer.from([4]),Buffer.from(k.x,'base64url'),Buffer.from(k.y,'base64url')]).toString('base64url'));console.log('VAPID_PRIVATE_KEY='+k.d)"
   ```

2. Cloudflare dashboard → Pages → the project → Settings → Variables and Secrets: add
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (as a secret) and `VAPID_SUBJECT`
   (`https://www.facebook.com/meatmall.mahnii.delguur` or a `mailto:` address).
3. Deploy. The `push_subscriptions` table is created automatically on first use.

If the keys are missing, push is simply off and orders work as before.
Changing the key pair later invalidates every saved subscription; users must turn notifications on again.

## Files

- `worker/push.ts` – table, send helper, status texts
- `worker/api/push.ts` – `/api/push/public-key`, `subscribe`, `unsubscribe`, `test`
- `client/public/sw.js` – shows the notification, opens the page on tap
- `client/src/lib/push.ts`, `components/push-card.tsx`, `components/admin/push-toggle.tsx`
- `client/public/icons/badge-96.png` – Android status-bar icon (from `design/logo/meat-mall-badge.svg`)
