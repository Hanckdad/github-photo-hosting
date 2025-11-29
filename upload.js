class GitHubUploader {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.owner = 'Hanckdad';
        this.repo = 'Database-Foto';
        this.currentFile = null;
        this.uploadCount = 0;
        this.encryption = new TokenEncryption();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStoredData();
        this.setupDragAndDrop();
        
        // Set default token
        const defaultToken = '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';
        this.encryption.storeToken(defaultToken);
        document.getElementById('github-token').value = defaultToken;
    }

    bindEvents() {
        const fileInput = document.getElementById('file-input');
        const tokenInput = document.getElementById('github-token');

        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        tokenInput.addEventListener('input', (e) => {
            this.encryption.storeToken(e.target.value);
            this.updateTokenStatus('unknown');
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('upload-area');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.highlightArea(), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => this.unhighlightArea(), false);
        });
        
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlightArea() {
        document.getElementById('upload-area').classList.add('highlight');
    }

    unhighlightArea() {
        document.getElementById('upload-area').classList.remove('highlight');
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFileSelect(files);
    }

    handleFileSelect(files) {
        if (!files || !files.length) return;
        
        const file = files[0];
        
        if (!this.validateFile(file)) return;
        
        this.currentFile = file;
        this.displayFileInfo(file);
        this.displayPreview(file);
    }

    validateFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showError('Hanya file gambar yang diizinkan (JPG, PNG, GIF, WebP)');
            return false;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            this.showError('Ukuran file terlalu besar. Maksimal 10MB.');
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
            
            const tempImg = new Image();
            tempImg.onload = () => {
                document.getElementById('file-dimensions').textContent = 
                    `${tempImg.width} × ${tempImg.height}`;
            };
            tempImg.src = e.target.result;
            
            this.showSection('preview-container');
        };
        reader.readAsDataURL(file);
    }

    async uploadImage() {
        if (!this.currentFile) {
            this.showError('Pilih file terlebih dahulu');
            return;
        }

        const token = this.encryption.getToken();
        if (!token) {
            this.showError('Masukkan GitHub token terlebih dahulu');
            return;
        }

        const isValid = await this.validateToken(token);
        if (!isValid) {
            this.showError('Token GitHub tidak valid.');
            return;
        }

        this.showSection('loading-container');

        try {
            // Upload gambar ke GitHub Releases sebagai attachment
            const imageUrl = await this.uploadToGitHubReleases(token);
            
            this.uploadCount++;
            localStorage.setItem('upload_count', this.uploadCount.toString());
            
            this.showSuccess(imageUrl);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(`Upload gagal: ${error.message}`);
        }
    }

    async uploadToGitHubReleases(token) {
        // Buat release baru untuk upload gambar
        const releaseData = {
            tag_name: `image-${Date.now()}`,
            name: `Image Upload - ${new Date().toLocaleString('id-ID')}`,
            body: 'Automated image upload via GitHub Image Host',
            draft: false,
            prerelease: false
        };

        // Buat release
        const releaseResponse = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/releases`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(releaseData)
        });

        if (!releaseResponse.ok) {
            throw new Error(`Gagal membuat release: ${releaseResponse.status}`);
        }

        const release = await releaseResponse.json();
        const uploadUrl = release.upload_url.replace('{?name,label}', '');

        // Upload gambar sebagai asset
        const formData = new FormData();
        formData.append('file', this.currentFile);

        const uploadResponse = await fetch(`${uploadUrl}?name=${this.currentFile.name}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
            },
            body: this.currentFile
        });

        if (!uploadResponse.ok) {
            throw new Error(`Gagal upload gambar: ${uploadResponse.status}`);
        }

        const asset = await uploadResponse.json();
        
        // Kembalikan URL gambar (browser_download_url)
        return asset.browser_download_url;
    }

    async createIssueWithImage(token) {
        // Fallback method: buat issue dengan gambar embedded
        const base64Image = await this.fileToBase64(this.currentFile);
        
        const issueData = {
            title: `Foto-${Date.now()}`,
            body: `![](${base64Image})`
        };

        const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(issueData)
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const result = await response.json();
        return result.html_url;
    }

    async validateToken(token) {
        try {
            const response = await fetch(`${this.baseUrl}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                }
            });

            if (response.status === 401) {
                this.updateTokenStatus('invalid');
                return false;
            }

            if (!response.ok) {
                this.updateTokenStatus('invalid');
                return false;
            }

            this.updateTokenStatus('valid');
            return true;
            
        } catch (error) {
            this.updateTokenStatus('invalid');
            return false;
        }
    }

    async testToken() {
        const token = document.getElementById('github-token').value.trim();
        if (!token) {
            this.showError('Masukkan token terlebih dahulu');
            return;
        }

        this.encryption.storeToken(token);
        
        const isValid = await this.validateToken(token);
        if (isValid) {
            this.showMessage('Token valid!', 'success');
        } else {
            this.showError('Token tidak valid.');
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

    showSuccess(imageUrl) {
        // Format markdown dengan URL asli GitHub
        const markdownText = `![${this.currentFile.name}](${imageUrl})`;
        
        document.getElementById('url-output').value = imageUrl;
        document.getElementById('markdown-output').textContent = markdownText;
        
        this.showSection('result-container');
        this.copyUrl();
    }

    showSection(sectionId) {
        const sections = [
            'upload-area',
            'preview-container', 
            'loading-container',
            'result-container'
        ];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
    }

    showMessage(message, type) {
        const messageEl = type === 'success' ? 
            document.getElementById('success-message') : 
            document.getElementById('error-message');
            
        if (messageEl) {
            messageEl.querySelector('.message-content').innerHTML = 
                `<strong>${type === 'success' ? 'Berhasil!' : 'Error!'}</strong> ${message}`;
            messageEl.style.display = 'flex';
            
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
        this.showSection('preview-container');
    }

    resetForm() {
        this.currentFile = null;
        document.getElementById('file-input').value = '';
        this.showSection('upload-area');
    }

    uploadNew() {
        this.resetForm();
    }

    copyUrl() {
        const urlOutput = document.getElementById('url-output');
        if (urlOutput) {
            urlOutput.select();
            document.execCommand('copy');
            
            const copyBtn = document.querySelector('.btn-copy');
            if (copyBtn) {
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            }
        }
    }

    copyMarkdown() {
        const markdownOutput = document.getElementById('markdown-output');
        if (markdownOutput) {
            const range = document.createRange();
            range.selectNode(markdownOutput);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            
            const copyBtns = document.querySelectorAll('.btn-copy');
            if (copyBtns[1]) {
                copyBtns[1].innerHTML = '<i class="fas fa-check"></i>';
                
                setTimeout(() => {
                    copyBtns[1].innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            }
        }
    }

    openInNewTab() {
        const url = document.getElementById('url-output');
        if (url && url.value) {
            window.open(url.value, '_blank');
        }
    }

    updateTokenStatus(status) {
        const statusTextEl = document.getElementById('token-status-text');
        
        if (!statusTextEl) return;
        
        let statusText, statusClass, icon;
        
        switch(status) {
            case 'valid':
                statusText = 'Token valid';
                statusClass = 'valid';
                icon = 'check-circle';
                break;
            case 'invalid':
                statusText = 'Token invalid';
                statusClass = 'invalid';
                icon = 'times-circle';
                break;
            default:
                statusText = 'Token belum di-test';
                statusClass = '';
                icon = 'clock';
        }
        
        statusTextEl.innerHTML = `<i class="fas fa-${icon}"></i><span>${statusText}</span>`;
        statusTextEl.className = `token-status ${statusClass}`;
    }

    loadStoredData() {
        try {
            const storedCount = localStorage.getItem('upload_count');
            if (storedCount) {
                this.uploadCount = parseInt(storedCount) || 0;
            }
        } catch (e) {}
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize uploader
document.addEventListener('DOMContentLoaded', () => {
    window.uploader = new GitHubUploader();
});