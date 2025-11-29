class TokenEncryption {
    constructor() {
        this.key = 'GitHubImageSimple2024!';
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
            return null;
        }
    }

    storeToken(token) {
        if (!token) return;
        try {
            const encrypted = this.encrypt(token);
            localStorage.setItem('github_image_token', encrypted);
        } catch (e) {
            console.error('Storage error:', e);
        }
    }

    getToken() {
        try {
            const encrypted = localStorage.getItem('github_image_token');
            if (!encrypted) return null;
            return this.decrypt(encrypted);
        } catch (e) {
            return null;
        }
    }
}