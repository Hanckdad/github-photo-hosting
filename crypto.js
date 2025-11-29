class TokenEncryption {
    constructor() {
        this.key = 'PixelHostGitHubTokenKey2024!';
    }

    encrypt(text) {
        if (!text) return '';
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length));
        }
        return btoa(result);
    }

    decrypt(encryptedText) {
        if (!encryptedText) return null;
        try {
            const text = atob(encryptedText);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length));
            }
            return result;
        } catch (e) {
            console.error('Decryption error:', e);
            return null;
        }
    }

    storeToken(token) {
        if (!token) return;
        try {
            const encrypted = this.encrypt(token);
            localStorage.setItem('github_token_encrypted', encrypted);
        } catch (e) {
            console.error('Storage error:', e);
        }
    }

    getToken() {
        try {
            const encrypted = localStorage.getItem('github_token_encrypted');
            if (!encrypted) return null;
            return this.decrypt(encrypted);
        } catch (e) {
            console.error('Token retrieval error:', e);
            return null;
        }
    }

    clearToken() {
        try {
            localStorage.removeItem('github_token_encrypted');
        } catch (e) {
            console.error('Token clear error:', e);
        }
    }
}