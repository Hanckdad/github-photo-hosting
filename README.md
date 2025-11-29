# GitHub Photo Hosting

Website untuk mengupload foto ke GitHub Issues dan mendapatkan URL langsung.

## Fitur

- 📸 Upload foto ke GitHub Issues
- 🔗 Dapatkan URL langsung ke issue
- 🚀 Tanpa backend - langsung ke GitHub API
- 💾 Penyimpanan permanen di GitHub
- 🎨 Drag & drop support
- 📱 Responsive design

## Cara Setup

1. **Buat Repository** di GitHub dengan nama `Database-Foto`
2. **Generate Token** di GitHub Settings → Developer settings → Personal access tokens
   - Beri permissions: `repo`, `write:discussion`
3. **Upload Files** ke hosting atau GitHub Pages
4. **Masukkan Token** di website

## GitHub Token Permissions

Token membutuhkan permissions:
- `repo` (Full control of private repositories)
- `write:discussion` (Write discussion)

## Cara Kerja

1. User upload foto melalui website
2. Foto dikonversi ke base64
3. Membuat GitHub issue baru dengan foto di body
4. Mengembalikan URL issue kepada user

## Deployment

Bisa di-deploy di:
- GitHub Pages
- Netlify
- Vercel
- Hosting static biasa

## Contoh URL Hasil
