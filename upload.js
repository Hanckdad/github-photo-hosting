class GitHubPhotoUploader {
    constructor() {
        this.owner = 'Hanckdad';
        this.repo = 'Database-Foto';
        this.baseUrl = 'https://api.github.com';
        this.currentFile = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadToken();
    }

    bindEvents() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const uploadBtn = document.getElementById('upload-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        const copyBtn = document.getElementById('copy-btn');
        const testBtn = document.getElementById('test-btn');
        const newUploadBtn = document.getElementById('new-upload-btn');
        const testTokenBtn = document.getElementById('test-token-btn');

        // Upload area events
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // Drag and drop
        this.setupDragAndDrop(uploadArea);
        
        // File input
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

        // Buttons
        uploadBtn.addEventListener('click', () => this.uploadImage());
        cancelBtn.addEventListener('click', () => this.resetForm());
        copyBtn.addEventListener('click', () => this.copyUrl());
        testBtn.addEventListener('click', () => this.openInGitHub());
        newUploadBtn.addEventListener('click', () => this.resetForm());
        testTokenBtn.addEventListener('click', () => this.testToken());

        // Token input
        document.getElementById('github-token').addEventListener('input', (e) => {
            this.saveToken(e.target.value);
            this.clearTokenStatus();
        });
    }

    setupDragAndDrop(uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.highlightArea(uploadArea), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.unhighlightArea(uploadArea), false);
        });
        
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlightArea(element) {
        element.classList.add('highlight');
    }

    unhighlightArea(element) {
        element.classList.remove('highlight');
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFileSelect(files);
    }

    handleFileSelect(files) {
        if (!files.length) return;
        
        const file = files[0];
        
        // Validasi file
        if (!this.validateFile(file)) return;
        
        this.currentFile = file;
        this.displayFileInfo(file);
        this.displayPreview(file);
    }

    validateFile(file) {
        // Check file type
        if (!file.type.startsWith('image/')) {
            this.showError('Hanya file gambar yang diizinkan (JPG, PNG, GIF, WebP)');
            return false;
        }
        
        // Check file size (5MB max for GitHub)
        if (file.size > 5 * 1024 * 1024) {
            this.showError('Ukuran file terlalu besar. Maksimal 5MB.');
            return false;
        }
        
        return true;
    }

    displayFileInfo(file) {
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = this.formatFileSize(file.size);
    }

    displayPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('image-preview');
            img.src = e.target.result;
            
            // Get dimensions
            const tempImg = new Image();
            tempImg.onload = () => {
                document.getElementById('file-dimensions').textContent = 
                    `${tempImg.width} × ${tempImg.height} piksel`;
            };
            tempImg.src = e.target.result;
            
            this.showPreview();
        };
        reader.readAsDataURL(file);
    }

    async uploadImage() {
        if (!this.currentFile) {
            this.showError('Pilih file terlebih dahulu');
            return;
        }

        const token = this.getToken();
        if (!token) {
            this.showError('Masukkan GitHub Token terlebih dahulu');
            return;
        }

        this.showLoading();

        try {
            // Test token first
            const isValid = await this.validateToken(token);
            if (!isValid) {
                this.showError('Token tidak valid. Periksa kembali token Anda.');
                return;
            }

            // Upload image
            const issueUrl = await this.createIssueWithImage(token);
            this.showSuccess(issueUrl);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(`Gagal mengunggah: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    async createIssueWithImage(token) {
        // Convert image to base64
        const base64Image = await this.fileToBase64(this.currentFile);
        
        // Create issue content
        const issueData = {
            title: `📸 Photo - ${this.currentFile.name} - ${new Date().toLocaleString('id-ID')}`,
            body: this.generateIssueBody(base64Image),
            labels: ['photo', 'upload', 'automated']
        };

        // Make API request
        const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify(issueData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result.html_url;
    }

    generateIssueBody(base64Image) {
        return `
## 📷 Photo Upload

**File Name:** ${this.currentFile.name}
**File Size:** ${this.formatFileSize(this.currentFile.size)}
**Upload Time:** ${new Date().toLocaleString('id-ID')}
**Uploaded Via:** GitHub Photo Hosting App

![${this.currentFile.name}](${base64Image})

---

*Automatically uploaded via GitHub Photo Hosting*
*Timestamp: ${new Date().toISOString()}*
`;
    }

    async testToken() {
        const token = this.getToken();
        if (!token) {
            this.showTokenStatus('Masukkan token terlebih dahulu', 'invalid');
            return;
        }

        this.showTokenStatus('Memeriksa token...', 'checking');

        try {
            const isValid = await this.validateToken(token);
            if (isValid) {
                this.showTokenStatus('✅ Token valid! Anda bisa mengupload foto.', 'valid');
            } else {
                this.showTokenStatus('❌ Token tidak valid. Periksa token dan permissions.', 'invalid');
            }
        } catch (error) {
            this.showTokenStatus(`❌ Error: ${error.message}`, 'invalid');
        }
    }

    async validateToken(token) {
        try {
            const response = await fetch(`${this.baseUrl}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            if (response.status === 401) return false;
            if (!response.ok) return false;

            const userData = await response.json();
            return !!userData.login;
        } catch (error) {
            return false;
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    getToken() {
        return document.getElementById('github-token').value.trim();
    }

    showPreview() {
        this.hideAll();
        document.getElementById('preview-container').style.display = 'block';
    }

    showLoading() {
        this.hideAll();
        document.getElementById('loading').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showSuccess(url) {
        this.hideAll();
        document.getElementById('url-output').value = url;
        document.getElementById('url-container').style.display = 'block';
        document.getElementById('success-message').style.display = 'block';
        this.copyUrl(); // Auto copy
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = `❌ ${message}`;
        errorEl.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }

    showTokenStatus(message, type) {
        const statusEl = document.getElementById('token-status');
        statusEl.textContent = message;
        statusEl.className = `token-status ${type}`;
    }

    clearTokenStatus() {
        document.getElementById('token-status').textContent = '';
        document.getElementById('token-status').className = 'token-status';
    }

    hideAll() {
        const elements = [
            'preview-container',
            'url-container', 
            'success-message',
            'error-message',
            'loading'
        ];
        
        elements.forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
    }

    resetForm() {
        this.currentFile = null;
        document.getElementById('file-input').value = '';
        this.hideAll();
    }

    copyUrl() {
        const urlOutput = document.getElementById('url-output');
        urlOutput.select();
        document.execCommand('copy');
        
        // Visual feedback
        const copyBtn = document.getElementById('copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Disalin!';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }

    openInGitHub() {
        const url = document.getElementById('url-output').value;
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const units = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + units[i];
    }

    saveToken(token) {
        try {
            localStorage.setItem('github_photo_token', token);
        } catch (e) {
            console.warn('Cannot save token to localStorage:', e);
        }
    }

    loadToken() {
        try {
            const savedToken = localStorage.getItem('github_photo_token');
            if (savedToken) {
                document.getElementById('github-token').value = savedToken;
            }
        } catch (e) {
            console.warn('Cannot load token from localStorage:', e);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new GitHubPhotoUploader();
});

// Handle errors globally
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});
