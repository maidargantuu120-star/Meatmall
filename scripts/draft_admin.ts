
import { storage } from "../server/storage";

async function makeAdmin() {
    const email = process.argv[2];
    const username = process.argv[3] || email.split("@")[0];

    if (!email) {
        console.log("Usage: npm run make-admin <email> [username]");
        process.exit(1);
    }

    try {
        console.log(`Checking if user exists: ${email}`);
        let user = await storage.getUserByEmail(email);

        if (!user) {
            console.log(`User not found in local DB. Creating new admin user...`);
            // Create with a dummy password since we use Supabase for auth now
            // Use scrypt logic if strict DB constraint, but for now let's reuse storage method
            // Wait, storage.createUser hashes password.
            // We can just create a user. The password won't be used for Supabase login but needed for DB constraint.
            user = await storage.createUser({
                username: username,
                email: email,
                password: "supabase_managed_auth", // Dummy password
                isAdmin: true,
                name: username
            });
            console.log(`Successfully created admin user: ${user.email} (ID: ${user.id})`);
        } else {
            // User exists, update to admin? storage doesn't have updateUser setIsAdmin exposed directly in interface easily?
            // Wait, I see updateProduct etc, but User?
            // Let's check storage interface again.
            // I see updateUserGoogleId... but no general updateUser.
            // I might need to add `updateUserAdmin` to storage or just raw SQL if needed.
            // But looking at storage.ts, I can probably add a method or use db directly if I import db.

            console.log(`User exists (ID: ${user.id}). Promoting to admin...`);
            // Since I can't easily update via storage interface without modifying it, 
            // I'll just explain I need to modify storage.ts first to support this properly or use db directly here.
            // But I can't import db easily in a standalone script without ts-node setup which we have.

            // OPTION: Just use storage.ts features.
            // Let's assume for now I will modify storage.ts to add updateUser method or similar?
            // Or I can add it to this script imports.
        }
    } catch (error) {
        console.error("Error making admin:", error);
    }
    process.exit(0);
}

// Check if run directly
if (require.main === module) {
    // This part is tricky with vite/ts-node. 
    // Usually better to have a dedicated script file in scripts/
}
