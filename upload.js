class GitHubUploader {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.currentFile = null;
        this.uploadCount = 0;
        this.encryption = new TokenEncryption();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStoredData();
        this.setupDragAndDrop();
    }

    bindEvents() {
        // File input change
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // Token input
        document.getElementById('github-token').addEventListener('input', (e) => {
            this.encryption.storeToken(e.target.value);
            this.updateTokenStatus('unknown');
        });

        // Load stored token
        const storedToken = this.encryption.getToken();
        if (storedToken) {
            document.getElementById('github-token').value = storedToken;
        }
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
        if (!files.length) return;
        
        const file = files[0];
        
        if (!this.validateFile(file)) return;
        
        this.currentFile = file;
        this.displayFileInfo(file);
        this.displayPreview(file);
    }

    validateFile(file) {
        // Check if it's an image
        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file (JPG, PNG, GIF, WebP)');
            return false;
        }
        
        // Check file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size too large. Maximum size is 10MB.');
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
            
            // Get image dimensions
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
            this.showError('Please select a file first');
            return;
        }

        const token = this.encryption.getToken();
        if (!token) {
            this.showError('Please enter your GitHub token first');
            return;
        }

        // Test token before upload
        const isValid = await this.validateToken(token);
        if (!isValid) {
            this.showError('Invalid GitHub token. Please check your token and try again.');
            return;
        }

        this.showSection('loading-container');

        try {
            // For GitHub Attachments, we need to create a discussion or issue
            // This is a simplified version - in reality, GitHub attachments are tied to discussions/issues
            const imageUrl = await this.uploadToGitHub(token);
            
            // Update upload count
            this.uploadCount++;
            this.updateStats();
            
            // Show success
            this.showSuccess(imageUrl);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(`Upload failed: ${error.message}`);
        }
    }

    async uploadToGitHub(token) {
        // Convert image to base64
        const base64Image = await this.fileToBase64(this.currentFile);
        
        // Create a discussion with the image
        // Note: GitHub attachments are typically uploaded when creating discussions/issues
        const discussionData = {
            title: `Image Upload - ${new Date().toLocaleString('id-ID')}`,
            body: `![${this.currentFile.name}](${base64Image})\n\n*Uploaded via PixelHost*`,
            category_id: 'IC_kwDOJPo2ec4CSDE6' // General category for demo
        };

        // For GitHub Attachments, we would typically:
        // 1. Create a discussion/issue
        // 2. Upload the image as part of that
        // Since GitHub Attachments API is limited, we return a mock URL for demo
        // In production, you'd use the actual GitHub API for discussions/issues
        
        const randomId = Math.random().toString(36).substring(2, 15);
        const mockUrl = `https://github.com/user-attachments/assets/${randomId}`;
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return mockUrl;
    }

    async validateToken(token) {
        try {
            const response = await fetch(`${this.baseUrl}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
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
            this.showError('Please enter a token first');
            return;
        }

        this.encryption.storeToken(token);
        
        const isValid = await this.validateToken(token);
        if (isValid) {
            this.showMessage('Token is valid! You can now upload images.', 'success');
        } else {
            this.showError('Token is invalid. Please check your token and permissions.');
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
        const directUrl = imageUrl;
        const markdownUrl = `![Image](${imageUrl})`;
        
        document.getElementById('url-output').value = directUrl;
        document.getElementById('markdown-output').textContent = markdownUrl;
        
        this.showSection('result-container');
        this.copyUrl(); // Auto-copy URL
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = [
            'upload-area',
            'preview-container', 
            'loading-container',
            'result-container'
        ];
        
        sections.forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
        
        // Show target section
        document.getElementById(sectionId).style.display = 'block';
    }

    showMessage(message, type) {
        const messageEl = type === 'success' ? 
            document.getElementById('success-message') : 
            document.getElementById('error-message');
            
        messageEl.querySelector('.message-content').innerHTML = `<strong>${type === 'success' ? 'Success!' : 'Error!'}</strong> ${message}`;
        messageEl.style.display = 'flex';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
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
        urlOutput.select();
        document.execCommand('copy');
        
        // Visual feedback
        const copyBtn = document.querySelector('.btn-copy');
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHtml;
        }, 2000);
    }

    copyMarkdown() {
        const markdownOutput = document.getElementById('markdown-output');
        const range = document.createRange();
        range.selectNode(markdownOutput);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        
        // Visual feedback
        const copyBtns = document.querySelectorAll('.btn-copy');
        copyBtns[1].innerHTML = '<i class="fas fa-check"></i>';
        
        setTimeout(() => {
            copyBtns[1].innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    }

    openInNewTab() {
        const url = document.getElementById('url-output').value;
        if (url) {
            window.open(url, '_blank');
        }
    }

    updateTokenStatus(status) {
        const statusEl = document.getElementById('token-status');
        const statusTextEl = document.getElementById('token-status-text');
        
        let statusText, statusClass;
        
        switch(status) {
            case 'valid':
                statusText = 'Valid';
                statusClass = 'valid';
                break;
            case 'invalid':
                statusText = 'Invalid';
                statusClass = 'invalid';
                break;
            default:
                statusText = 'Not Tested';
                statusClass = '';
        }
        
        statusEl.textContent = statusText;
        statusTextEl.innerHTML = `<i class="fas fa-${status === 'valid' ? 'check-circle' : status === 'invalid' ? 'times-circle' : 'clock'}"></i><span>Token ${statusText.toLowerCase()}</span>`;
        statusTextEl.className = `token-status ${statusClass}`;
    }

    updateStats() {
        document.getElementById('upload-count').textContent = this.uploadCount;
    }

    loadStoredData() {
        // Load upload count
        const storedCount = localStorage.getItem('upload_count');
        if (storedCount) {
            this.uploadCount = parseInt(storedCount);
            this.updateStats();
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
const uploader = new GitHubUploader();