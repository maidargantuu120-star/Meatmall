import { Hono } from 'hono';
import { Bindings } from '../types';
import { requireAdmin } from '../middleware';
import { UserWithNullablePhone } from '@shared/schema';
import { D1Storage, IStorage } from '../storage';

type Env = {
    Bindings: Bindings;
    Variables: {
        user: UserWithNullablePhone | null;
        storage: IStorage;
    };
};

const app = new Hono<Env>();

// Site Content
app.get('/site-content', async (c) => {
    const storage = c.get('storage');
    const content = await storage.getSiteContents();
    return c.json(content);
});

app.get('/site-content/:key', async (c) => {
    const storage = c.get('storage');
    const key = c.req.param('key');
    const content = await storage.getSiteContentByKey(key);
    if (!content) return c.json({ message: "Content not found" }, 404);
    return c.json(content);
});

app.post('/site-content', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const body = await c.req.json();
    const content = await storage.createSiteContent(body);
    return c.json(content, 201);
});

app.patch('/site-content/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const content = await storage.updateSiteContent(id, body);
    if (!content) return c.json({ message: "Content not found" }, 404);
    return c.json(content);
});

app.delete('/site-content/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const success = await storage.deleteSiteContent(id);
    if (!success) return c.json({ message: "Content not found" }, 404);
    return c.json({ success: true });
});

// Navigation info
app.get('/navigation', async (c) => {
    const storage = c.get('storage');
    const items = await storage.getNavigationItemsTree();
    return c.json(items);
});

app.post('/navigation', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const body = await c.req.json();
    const item = await storage.createNavigationItem(body);
    return c.json(item, 201);
});

app.patch('/navigation/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const item = await storage.updateNavigationItem(id, body);
    if (!item) return c.json({ message: "Item not found" }, 404);
    return c.json(item);
});

app.delete('/navigation/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const success = await storage.deleteNavigationItem(id);
    if (!success) return c.json({ message: "Item not found" }, 404);
    return c.json({ success: true });
});

app.post('/navigation/reorder', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const { ids } = await c.req.json();
    const success = await storage.updateNavigationItemsOrder(ids);
    return c.json({ success });
});

// Site Settings
app.get('/site-settings', async (c) => {
    const storage = c.get('storage');
    const settings = await storage.getSiteSettings();
    return c.json(settings);
});

app.get('/site-settings/:key', async (c) => {
    const storage = c.get('storage');
    const key = c.req.param('key');
    const setting = await storage.getSiteSettingByKey(key);
    if (!setting) return c.json({ message: "Setting not found" }, 404);
    return c.json(setting);
});

app.post('/site-settings', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const body = await c.req.json();
    const setting = await storage.createSiteSetting(body);
    return c.json(setting, 201);
});

app.patch('/site-settings/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const setting = await storage.updateSiteSetting(id, body);
    if (!setting) return c.json({ message: "Setting not found" }, 404);
    return c.json(setting);
});

// Footer Settings
app.get('/settings/footer', async (c) => {
    const storage = c.get('storage');
    const settings = await storage.getFooterSettings();
    return c.json(settings || {});
});

app.put('/settings/footer', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const body = await c.req.json();
    const settings = await storage.updateFooterSettings(body);
    return c.json(settings);
});

// Site Name Settings
app.get('/settings/site-name', async (c) => {
    const storage = c.get('storage');
    const setting = await storage.getSiteSettingByKey('site_name');

    if (!setting) {
        return c.json({ siteName: "Nice Meat махны дэлгүүр" }); // Default
    }

    return c.json({ siteName: setting.value });
});

app.put('/settings/site-name', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const body = await c.req.json();
    const { siteName } = body;

    const existing = await storage.getSiteSettingByKey('site_name');

    if (existing) {
        await storage.updateSiteSettingByKey('site_name', siteName);
    } else {
        await storage.createSiteSetting({ key: 'site_name', value: siteName });
    }

    return c.json({ siteName });
});


// Shipping Fee Settings
app.get('/settings/shipping-fee', async (c) => {
    const storage = c.get('storage');
    const setting = await storage.getSiteSettingByKey('shipping_fee');

    if (!setting) {
        return c.json({ value: "0" }); // Default to 0 if not set
    }

    return c.json({ value: setting.value });
});

app.put('/settings/shipping-fee', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const body = await c.req.json();
    const { value } = body;

    const existing = await storage.getSiteSettingByKey('shipping_fee');

    if (existing) {
        await storage.updateSiteSettingByKey('shipping_fee', value);
    } else {
        await storage.createSiteSetting({
            key: 'shipping_fee',
            value: value,
            description: '배송비 설정'
        });
    }

    return c.json({ value });
});


// Media Library (Uploads)
app.get('/media', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const items = await storage.getMediaItems();
    return c.json(items);
});

// Hero Settings
app.get('/settings/hero', async (c) => {
    const storage = c.get('storage');
    const setting = await storage.getSiteSettingByKey('hero_settings');

    if (!setting) {
        // Return blank defaults
        return c.json({
            title: "",
            text: "",
            imageUrl: ""
        });
    }

    try {
        return c.json(JSON.parse(setting.value));
    } catch (e) {
        return c.json({});
    }
});

app.put('/settings/hero', requireAdmin, async (c) => {
    const storage = c.get('storage');

    try {
        const body = await c.req.json();

        // Validate structure (basic check)
        if (!body.slides || !Array.isArray(body.slides)) {
            // Fallback for legacy single object updates if needed, or just enforce new structure
            // For now, let's assume the frontend sends the correct { slides: [] } structure
            // If we want to support legacy calls, we'd check keys. But we are updating frontend too.
        }

        const heroData = {
            slides: body.slides // Array of { title, text, imageUrl }
        };

        const existing = await storage.getSiteSettingByKey('hero_settings');

        if (existing) {
            await storage.updateSiteSettingByKey('hero_settings', JSON.stringify(heroData));
        } else {
            await storage.createSiteSetting({
                key: 'hero_settings',
                value: JSON.stringify(heroData)
            });
        }

        return c.json(heroData);
    } catch (error: any) {
        console.error("Error updating hero settings:", error);
        return c.json({
            message: "Failed to update hero settings",
            error: error.message
        }, 500);
    }
});

app.post('/media', requireAdmin, async (c) => {
    const storage = c.get('storage');
    // Parse body including files
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
        return c.json({ message: "No file uploaded" }, 400);
    }

    const fileName = `media/${Date.now()}_${file.name}`;
    const url = await storage.uploadFile('media', fileName, file);

    const mediaItem = await storage.createMediaItem({
        name: file.name,
        url: url,
        type: file.type,
        size: file.size
    });

    return c.json(mediaItem, 201);
});

app.delete('/media/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    // Should delete from R2 as well, but for now just DB
    const success = await storage.deleteMediaItem(id);
    if (!success) return c.json({ message: "Item not found" }, 404);
    return c.json({ success: true });
});


// Login Background Images Settings
app.get('/settings/login-images', async (c) => {
    const storage = c.get('storage');
    const setting = await storage.getSiteSettingByKey('login_images');

    if (!setting) {
        // Return default images from R2 storage if not set
        return c.json({
            images: [
                "/uploads/제목을_입력해주세요_ (2)/001.png",
                "/uploads/제목을_입력해주세요_ (2)/002.png",
                "/uploads/제목을_입력해주세요_ (2)/003.png",
                "/uploads/제목을_입력해주세요_ (2)/004.png",
                "/uploads/제목을_입력해주세요_ (2)/005.png",
                "/uploads/제목을_입력해주세요_ (2)/006.png",
                "/uploads/제목을_입력해주세요_ (2)/007.png",
                "/uploads/제목을_입력해주세요_ (2)/008.png",
                "/uploads/제목을_입력해주세요_ (2)/009.png",
                "/uploads/제목을_입력해주세요_ (2)/010.png",
            ]
        });
    }

    try {
        return c.json(JSON.parse(setting.value));
    } catch (e) {
        return c.json({ images: [] });
    }
});

app.put('/settings/login-images', requireAdmin, async (c) => {
    const storage = c.get('storage');

    try {
        const body = await c.req.json();

        // Validate structure
        if (!body.images || !Array.isArray(body.images)) {
            return c.json({ message: "Invalid format. 'images' must be an array." }, 400);
        }

        const imageData = {
            images: body.images
        };

        const existing = await storage.getSiteSettingByKey('login_images');

        if (existing) {
            await storage.updateSiteSettingByKey('login_images', JSON.stringify(imageData));
        } else {
            await storage.createSiteSetting({
                key: 'login_images',
                value: JSON.stringify(imageData),
                description: 'Images for login page background'
            });
        }

        return c.json(imageData);
    } catch (error: any) {
        console.error("Error updating login images:", error);
        return c.json({
            message: "Failed to update login images",
            error: error.message
        }, 500);
    }
});

export default app;
