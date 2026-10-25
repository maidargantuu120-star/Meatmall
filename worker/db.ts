import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../shared/schema';

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(d1: D1Database) {
    return drizzle(d1, { schema });
}
