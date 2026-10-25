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

app.get('/', async (c) => {
    const storage = c.get('storage');
    const category = c.req.query('category');

    if (category) {
        const products = await storage.getProductsByCategory(category);
        return c.json(products);
    }

    const products = await storage.getProducts();
    return c.json(products);
});

app.get('/:id', async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));
    const product = await storage.getProduct(id);

    if (!product) {
        return c.json({ message: "Product not found" }, 404);
    }

    return c.json(product);
});

// Create product with image upload
app.post('/', requireAdmin, async (c) => {
    const storage = c.get('storage');

    // Parse body based on content type
    let body: any = {};
    let parsedData: any = {};
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/json')) {
        parsedData = await c.req.json();
    } else if (contentType.includes('multipart/form-data')) {
        body = await c.req.parseBody();
        if (body['productData'] && typeof body['productData'] === 'string') {
            parsedData = JSON.parse(body['productData']);
        }
    }

    const file = body['image'] || body['file']; // Support both keys
    let imageUrl = '';

    // Handle file upload to R2 if present
    if (file && file instanceof File) {
        const fileName = `products/${Date.now()}_${file.name}`;
        imageUrl = await storage.uploadFile('media', fileName, file);
    } else if (typeof body['imageUrl'] === 'string') {
        imageUrl = body['imageUrl'];
    }

    try {

        // Merge parsed data with direct form fields (for backward compatibility)
        // Handle both camelCase from API and snake_case from direct components
        const productData = {
            name: parsedData.name || body['name'] as string,
            nameRu: parsedData.nameRu || parsedData.name_ru || body['nameRu'] as string || body['name_ru'] as string || '',
            nameEn: parsedData.nameEn || parsedData.name_en || body['nameEn'] as string || body['name_en'] as string || '',
            description: parsedData.description || body['description'] as string || '',
            descriptionRu: parsedData.descriptionRu || parsedData.description_ru || body['descriptionRu'] as string || body['description_ru'] as string || '',
            descriptionEn: parsedData.descriptionEn || parsedData.description_en || body['descriptionEn'] as string || body['description_en'] as string || '',
            price: parseFloat(parsedData.price || body['price'] as string || '0'),
            category: parsedData.category || body['category'] as string,
            imageUrl: imageUrl || parsedData.imageUrl || parsedData.image_url || body['imageUrl'] as string || body['image_url'] as string || '',
            thumbnailUrl: parsedData.thumbnailUrl || parsedData.thumbnail_url || body['thumbnailUrl'] as string || body['thumbnail_url'] as string || null,
            stock: parseInt(parsedData.stock || body['stock'] as string || '999'),
            minOrderQuantity: parseFloat(parsedData.minOrderQuantity || parsedData.min_order_quantity || body['minOrderQuantity'] as string || body['min_order_quantity'] as string || '1'),
            storeId: parsedData.storeId ? parseInt(parsedData.storeId) : (parsedData.store_id ? parseInt(parsedData.store_id) : (body['storeId'] ? parseInt(body['storeId'] as string) : (body['store_id'] ? parseInt(body['store_id'] as string) : undefined)))
        };

        console.log("Creating product with data:", JSON.stringify(productData));

        if (!productData.name || !productData.category) {
            return c.json({ message: "Product name and category are required" }, 400);
        }

        const newProduct = await storage.createProduct(productData);
        return c.json(newProduct, 201);
    } catch (error: any) {
        console.error("Error creating product:", error);
        return c.json({
            message: "Error creating product",
            error: error.message,
            stack: error.stack
        }, 500);
    }
});

app.put('/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));

    // Parse body based on content type
    let body: any = {};
    let parsedData: any = {};
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/json')) {
        parsedData = await c.req.json();
    } else if (contentType.includes('multipart/form-data')) {
        body = await c.req.parseBody();
        if (body['productData'] && typeof body['productData'] === 'string') {
            parsedData = JSON.parse(body['productData']);
        }
    }

    const file = body['image'] || body['file'];

    // Build update data from parsed JSON or direct form fields
    const updateData: any = {
        name: parsedData.name || body['name'],
        nameRu: parsedData.nameRu || body['nameRu'] || '',
        nameEn: parsedData.nameEn || body['nameEn'] || '',
        description: parsedData.description || body['description'] || '',
        descriptionRu: parsedData.descriptionRu || body['descriptionRu'] || '',
        descriptionEn: parsedData.descriptionEn || body['descriptionEn'] || '',
        category: parsedData.category || body['category'],
        imageUrl: parsedData.imageUrl || body['imageUrl'] || '',
        thumbnailUrl: parsedData.thumbnailUrl || body['thumbnailUrl'] || null,
    };

    // Clean up types
    if (parsedData.price || body['price']) {
        updateData.price = parseFloat(parsedData.price || body['price'] as string);
    }
    if (parsedData.stock || body['stock']) {
        updateData.stock = parseInt(parsedData.stock || body['stock'] as string);
    }
    if (parsedData.minOrderQuantity || parsedData.min_order_quantity || body['minOrderQuantity'] || body['min_order_quantity']) {
        updateData.minOrderQuantity = parseFloat(parsedData.minOrderQuantity || parsedData.min_order_quantity || body['minOrderQuantity'] as string || body['min_order_quantity'] as string);
    }
    if (parsedData.storeId || parsedData.store_id || body['storeId'] || body['store_id']) {
        updateData.storeId = parseInt(parsedData.storeId || parsedData.store_id || body['storeId'] as string || body['store_id'] as string);
    }

    try {
        if (file && file instanceof File) {
            const fileName = `products/${Date.now()}_${file.name}`;
            updateData.imageUrl = await storage.uploadFile('media', fileName, file);
        }

        const updatedProduct = await storage.updateProduct(id, updateData);

        if (!updatedProduct) {
            return c.json({ message: "Product not found" }, 404);
        }

        return c.json(updatedProduct);
    } catch (error: any) {
        console.error("Error updating product:", error);
        return c.json({
            message: "Error updating product",
            error: error.message,
            stack: error.stack
        }, 500);
    }
});

app.delete('/:id', requireAdmin, async (c) => {
    const storage = c.get('storage');
    const id = parseInt(c.req.param('id'));

    // Omit image deletion from R2 for now to be safe, or implement delete logic
    const success = await storage.deleteProduct(id);

    if (!success) {
        return c.json({ message: "Product not found" }, 404);
    }

    return c.json({ success: true });
});

export default app;
