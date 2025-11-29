// Simple AES encryption for token storage
class TokenEncryption {
    constructor() {
        this.key = 'PixelHostGitHubTokenKey2024!';
    }

    // Simple XOR encryption (for demo purposes)
    // In production, use Web Crypto API
    encrypt(text) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length));
        }
        return btoa(result);
    }

    decrypt(encryptedText) {
        try {
            const text = atob(encryptedText);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length));
            }
            return result;
        } catch (e) {
            return null;
        }
    }

    // Store encrypted token
    storeToken(token) {
        if (!token) return;
        const encrypted = this.encrypt(token);
        localStorage.setItem('github_token_encrypted', encrypted);
    }

    // Retrieve and decrypt token
    getToken() {
        const encrypted = localStorage.getItem('github_token_encrypted');
        if (!encrypted) return null;
        return this.decrypt(encrypted);
    }

    // Clear stored token
    clearToken() {
        localStorage.removeItem('github_token_encrypted');
    }
}

// Initialize encryption
const tokenCrypto = new TokenEncryption();
