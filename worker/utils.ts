
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    // We actually just need the derived bits or exported key for storage
    // Let's use exportKey
    const exportedKey = await crypto.subtle.exportKey("raw", key);

    const hashHex = Array.from(new Uint8Array(exportedKey)).map(b => b.toString(16).padStart(2, '0')).join('');
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

    return `${hashHex}.${saltHex}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
    try {
        if (!stored || !stored.includes('.')) return false;

        const [storedHash, storedSaltHex] = stored.split(".");
        if (!storedHash || !storedSaltHex) return false;

        const salt = new Uint8Array(storedSaltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const encoder = new TextEncoder();

        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(supplied),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        const exportedKey = await crypto.subtle.exportKey("raw", key);
        const derivedHashHex = Array.from(new Uint8Array(exportedKey)).map(b => b.toString(16).padStart(2, '0')).join('');

        return derivedHashHex === storedHash;
    } catch (error) {
        console.error("Error comparing passwords:", error);
        return false;
    }
}
