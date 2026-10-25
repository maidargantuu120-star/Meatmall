
import { storage } from "../server/storage";

async function makeAdmin() {
    const email = process.argv[2];
    const username = process.argv[3] || email?.split("@")[0];

    if (!email) {
        console.log("Usage: npm run make-admin <email> [username]");
        console.log("Example: npm run make-admin myadmin@example.com myadmin");
        process.exit(1);
    }

    try {
        console.log(`Checking if user exists locally: ${email}`);
        let user = await storage.getUserByEmail(email);

        if (!user) {
            console.log(`User not found in local DB. Creating user '${username}'...`);
            // Create user. Note: Password is dummy as we rely on Supabase Auth.
            // But we set a hash just in case local strategy is ever tried or required by DB.
            user = await storage.createUser({
                username: username,
                email: email,
                password: "supabase_managed_auth",
                isAdmin: true,
                name: username
            });
            console.log(`✅ Successfully created admin user: ${user.email} (ID: ${user.id})`);
        } else {
            console.log(`User exists (ID: ${user.id}). Promoting to admin...`);
            const updated = await storage.updateUserAdmin(user.id, true);
            if (updated) {
                console.log(`✅ Successfully promoted user ${updated.email} to admin.`);
            } else {
                console.error("❌ Failed to update user.");
            }
        }
    } catch (error) {
        console.error("❌ Error making admin:", error);
    }
    process.exit(0);
}

// We need to execute this function
makeAdmin();
