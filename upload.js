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
            tempImg.onerror = () => {
                document.getElementById('file-dimensions').textContent = 'Unknown';
            };
            tempImg.src = e.target.result;
            
            this.showSection('preview-container');
        };
        reader.onerror = () => {
            this.showError('Gagal membaca file');
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
            this.showError('Token GitHub tidak valid. Periksa token Anda.');
            return;
        }

        this.showSection('loading-container');

        try {
            const issueUrl = await this.createIssueWithImage(token);
            
            this.uploadCount++;
            localStorage.setItem('upload_count', this.uploadCount.toString());
            this.updateStats();
            
            this.showSuccess(issueUrl);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(`Upload gagal: ${error.message}`);
        }
    }

    async createIssueWithImage(token) {
        const base64Image = await this.fileToBase64(this.currentFile);
        
        const issueData = {
            title: `🖼️ Image Upload - ${new Date().toLocaleString('id-ID')}`,
            body: this.generateIssueBody(base64Image),
            labels: ['image-upload', 'automated']
        };

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
            let errorMessage = `GitHub API error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Ignore JSON parse error
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        return result.html_url;
    }

    generateIssueBody(base64Image) {
        return `## 📷 Image Upload

**File Name:** ${this.currentFile.name}
**File Size:** ${this.formatFileSize(this.currentFile.size)}
**Upload Time:** ${new Date().toLocaleString('id-ID')}
**Uploaded Via:** GitHub Image Host

![${this.currentFile.name}](${base64Image})

---

*Automatically uploaded via GitHub Image Host*
*Timestamp: ${new Date().toISOString()}*`;
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

            if (response.status === 401) {
                this.updateTokenStatus('invalid');
                return false;
            }

            if (!response.ok) {
                this.updateTokenStatus('invalid');
                return false;
            }

            const userData = await response.json();
            this.updateTokenStatus('valid');
            return !!userData.login;
            
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
            this.showMessage('Token valid! Anda bisa mengupload gambar.', 'success');
        } else {
            this.showError('Token tidak valid. Periksa token dan permissions.');
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

    showSuccess(issueUrl) {
        const markdownText = `![Image](${issueUrl})`;
        
        document.getElementById('url-output').value = issueUrl;
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
            const contentEl = messageEl.querySelector('.message-content');
            if (contentEl) {
                contentEl.innerHTML = `<strong>${type === 'success' ? 'Berhasil!' : 'Error!'}</strong> ${message}`;
            }
            messageEl.style.display = 'flex';
            
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
        this.showSection('preview-container');
    }

    resetForm() {
        this.currentFile = null;
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.value = '';
        }
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
                const originalHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalHtml;
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
        const statusEl = document.getElementById('token-status');
        const statusTextEl = document.getElementById('token-status-text');
        
        if (!statusEl || !statusTextEl) return;
        
        let statusText, statusClass, icon;
        
        switch(status) {
            case 'valid':
                statusText = 'Valid';
                statusClass = 'valid';
                icon = 'check-circle';
                break;
            case 'invalid':
                statusText = 'Invalid';
                statusClass = 'invalid';
                icon = 'times-circle';
                break;
            default:
                statusText = 'Not Tested';
                statusClass = '';
                icon = 'clock';
        }
        
        statusEl.textContent = statusText;
        statusTextEl.innerHTML = `<i class="fas fa-${icon}"></i><span>Token ${statusText.toLowerCase()}</span>`;
        statusTextEl.className = `token-status ${statusClass}`;
    }

    updateStats() {
        const uploadCountEl = document.getElementById('upload-count');
        if (uploadCountEl) {
            uploadCountEl.textContent = this.uploadCount;
        }
    }

    loadStoredData() {
        try {
            const storedCount = localStorage.getItem('upload_count');
            if (storedCount) {
                this.uploadCount = parseInt(storedCount) || 0;
                this.updateStats();
            }
        } catch (e) {
            console.error('Load data error:', e);
        }
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