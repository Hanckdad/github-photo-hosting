class GitHubPhotoUploader {
    constructor() {
        this.owner = 'Hanckdad';
        this.repo = 'Database-Foto';
        this.baseUrl = 'https://api.github.com';
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
        const tokenInput = document.getElementById('github-token');

        // Upload area events
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // Drag and drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.highlight(uploadArea), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.unhighlight(uploadArea), false);
        });
        
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);

        // File input change
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Button events
        uploadBtn.addEventListener('click', () => this.uploadToGitHub());
        cancelBtn.addEventListener('click', () => this.resetForm());
        copyBtn.addEventListener('click', () => this.copyUrl());
        testBtn.addEventListener('click', () => this.openInGitHub());
        newUploadBtn.addEventListener('click', () => this.resetForm());

        // Token input event
        tokenInput.addEventListener('input', (e) => this.saveToken(e.target.value));
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(element) {
        element.classList.add('highlight');
    }

    unhighlight(element) {
        element.classList.remove('highlight');
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }

    handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        this.currentFile = file;
        
        // Validate file type
        if (!file.type.match('image.*')) {
            this.showError('Silakan unggah file gambar (JPG, PNG, GIF, WebP)');
            return;
        }
        
        // Validate file size (max 5MB for GitHub)
        if (file.size > 5 * 1024 * 1024) {
            this.showError('Ukuran file terlalu besar. Maksimal 5MB untuk GitHub.');
            return;
        }
        
        // Show file info
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = this.formatFileSize(file.size);
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-preview').src = e.target.result;
            
            // Get image dimensions
            const img = new Image();
            img.onload = () => {
                document.getElementById('file-dimensions').textContent = `${img.width} x ${img.height} piksel`;
            };
            img.src = e.target.result;
            
            this.showPreview();
        };
        reader.readAsDataURL(file);
    }

    async uploadToGitHub() {
        if (!this.currentFile) return;
        
        const token = document.getElementById('github-token').value.trim();
        if (!token) {
            this.showError('Harap masukkan GitHub Token terlebih dahulu');
            return;
        }

        this.showLoading();
        
        try {
            // Convert image to base64
            const base64Image = await this.fileToBase64(this.currentFile);
            
            // Create GitHub issue with image
            const issueUrl = await this.createGitHubIssue(token, base64Image);
            
            // Show success
            this.showSuccess(issueUrl);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(`Gagal mengunggah: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    async createGitHubIssue(token, base64Image) {
        const timestamp = new Date().toISOString();
        const randomId = Math.random().toString(36).substring(2, 15);
        const fileName = `photo_${timestamp}_${randomId}.jpg`;
        
        // Create issue title and body
        const issueTitle = `📸 Photo Upload - ${new Date().toLocaleString('id-ID')}`;
        const issueBody = `
## 📷 Photo Upload

**File:** ${this.currentFile.name}
**Size:** ${this.formatFileSize(this.currentFile.size)}
**Uploaded:** ${new Date().toLocaleString('id-ID')}
**Uploader:** GitHub Photo Hosting

![${this.currentFile.name}](${base64Image})

---

*Uploaded via GitHub Photo Hosting*
`;

        // GitHub API request
        const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: issueTitle,
                body: issueBody,
                labels: ['photo', 'upload']
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `GitHub API error: ${response.status}`);
        }

        const issueData = await response.json();
        return issueData.html_url;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
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
        
        // Auto copy to clipboard
        this.copyUrl();
    }

    showError(message) {
        document.getElementById('error-message').textContent = `❌ ${message}`;
        document.getElementById('error-message').style.display = 'block';
    }

    hideAll() {
        document.getElementById('preview-container').style.display = 'none';
        document.getElementById('url-container').style.display = 'none';
        document.getElementById('success-message').style.display = 'none';
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('loading').style.display = 'none';
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
        
        const copyBtn = document.getElementById('copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ URL Disalin!';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }

    openInGitHub() {
        const url = document.getElementById('url-output').value;
        if (url) {
            window.open(url, '_blank');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    saveToken(token) {
        localStorage.setItem('github_photo_token', token);
    }

    loadToken() {
        const savedToken = localStorage.getItem('github_photo_token');
        if (savedToken) {
            document.getElementById('github-token').value = savedToken;
        }
    }
}

// Initialize the uploader when page loads
document.addEventListener('DOMContentLoaded', () => {
    new GitHubPhotoUploader();
});
