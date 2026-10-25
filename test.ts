import { db } from './server/db'; import { products } from '@shared/schema'; async function run() { const res = await db.select().from(products); console.log(res); process.exit(0); } run();  
