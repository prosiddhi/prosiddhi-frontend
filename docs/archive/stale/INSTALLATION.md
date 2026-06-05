# 📦 Installation Instructions for Windows

This guide will walk you through setting up the Job Portal project on a Windows machine.

## ✅ MILLION-USER SCALE AWARENESS

I understand this architecture must support **1,000,000+ active users** with enterprise-grade performance, security, and scalability requirements.

## 📋 Prerequisites

### Required Software

1. **Node.js (v18.17.0 or higher)**
   - Download: https://nodejs.org/
   - Choose LTS version
   - Installation verification:
     ```powershell
     node --version
     # Should output: v18.17.0 or higher
     ```

2. **pnpm (v8.0.0 or higher)**
   ```powershell
   npm install -g pnpm
   pnpm --version
   # Should output: 8.0.0 or higher
   ```

3. **Git**
   - Download: https://git-scm.com/download/win
   - Use default installation options
   - Verification:
     ```powershell
     git --version
     # Should output: git version 2.x.x
     ```

4. **Visual Studio Code (Recommended)**
   - Download: https://code.visualstudio.com/
   - Install recommended extensions:
     - ESLint
     - Prettier
     - TypeScript and JavaScript Language Features

---

## 🚀 Installation Steps

### Step 1: Clone the Repository

Open PowerShell or Command Prompt and navigate to your desired directory:

```powershell
# Navigate to your projects folder
cd C:\Users\YourUsername\Documents\GitHub

# Clone the repository
git clone https://github.com/yourusername/Job_Portal.git

# Navigate into the project
cd Job_Portal
```

### Step 2: Install Dependencies

```powershell
# Install all workspace dependencies
pnpm install
```

This command will:
- Install root workspace dependencies
- Install all dependencies for `apps/web`
- Set up the monorepo structure
- Create necessary lock files

**Expected output:**
```
Progress: resolved XXX, reused XXX, downloaded XX, added XXX
Done in XXs
```

### Step 3: Set Up Environment Variables

```powershell
# Navigate to the web app directory
cd apps\web

# Copy the example environment file
copy .env.example .env.local

# Open in VS Code to edit
code .env.local
```

**Minimum configuration for development:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Verify Installation

```powershell
# From the root directory
cd ..\..

# Check if all packages are properly linked
pnpm list --depth=0

# Run type checking
pnpm type-check

# Run linting
pnpm lint
```

### Step 5: Start Development Server

```powershell
# Start the Next.js development server
pnpm dev
```

**Expected output:**
```
▲ Next.js 14.2.18
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in XXXms
```

### Step 6: Verify Application

1. Open your browser
2. Navigate to `http://localhost:3000`
3. You should see the Job Portal homepage

---

## 🔧 Troubleshooting

### Issue: Port 3000 Already in Use

**Solution:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
$env:PORT=3001; pnpm dev
```

### Issue: pnpm Command Not Found

**Solution:**
```powershell
# Reinstall pnpm globally
npm uninstall -g pnpm
npm install -g pnpm

# Restart PowerShell/Command Prompt
```

### Issue: Permission Denied Errors

**Solution:**
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell -> Run as Administrator

# Then execute installation commands
```

### Issue: Node Modules Errors

**Solution:**
```powershell
# Clean all node_modules and lock files
pnpm clean

# Remove pnpm lock file
del pnpm-lock.yaml

# Reinstall dependencies
pnpm install
```

### Issue: TypeScript Errors

**Solution:**
```powershell
# Navigate to web app
cd apps\web

# Remove TypeScript cache
del tsconfig.tsbuildinfo

# Rebuild
pnpm type-check
```

---

## 🏗️ Project Structure

After successful installation, your project structure should look like this:

```
Job_Portal/
├── apps/
│   └── web/                    # Next.js application
│       ├── src/
│       │   ├── app/           # Pages and layouts
│       │   ├── components/    # React components
│       │   ├── lib/          # Utilities
│       │   └── styles/       # CSS files
│       ├── public/           # Static files
│       ├── .env.local        # Environment variables (created)
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                      # Documentation
├── INPUT-FILES/              # Job data files
├── node_modules/             # Dependencies (created)
├── package.json              # Root config
├── pnpm-lock.yaml           # Lock file (created)
└── pnpm-workspace.yaml      # Workspace config
```

---

## 📚 Next Steps

1. ✅ **Installation Complete**
2. 🔄 **Explore the Codebase**
   - Check `apps/web/src/app/page.tsx` for the homepage
   - Review `apps/web/src/components/ui/` for UI components
   - Look at `Job_Portal.md` for business flows

3. 🔄 **Start Development**
   - Read [CONTRIBUTING.md](./CONTRIBUTING.md)
   - Review [QUICK_START.md](./QUICK_START.md)
   - Check [README.md](./README.md) for full documentation

4. 🔄 **Build Features**
   - Implement authentication
   - Create job listing pages
   - Add search functionality
   - Integrate with backend API

---

## 🛠️ Development Tools

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Recommended VS Code Settings

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 📞 Getting Help

If you encounter issues:

1. **Check Existing Documentation**
   - README.md
   - QUICK_START.md
   - CONTRIBUTING.md

2. **Search for Issues**
   - GitHub Issues
   - Stack Overflow

3. **Create a New Issue**
   - Include error messages
   - Provide system information
   - Share steps to reproduce

4. **Contact Support**
   - Email: support@jobportal.com
   - GitHub Discussions

---

## ✅ Installation Checklist

- [ ] Node.js v18.17.0+ installed
- [ ] pnpm v8.0.0+ installed
- [ ] Git installed
- [ ] Repository cloned
- [ ] Dependencies installed (`pnpm install`)
- [ ] Environment variables configured
- [ ] Development server running
- [ ] Application accessible at http://localhost:3000

**Congratulations! You're ready to develop! 🎉**
