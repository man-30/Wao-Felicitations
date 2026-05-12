# Deploy Backend to Fly.io

## 🚀 Deployment Steps (10-15 minutes)

### **Step 1: Install Fly CLI**

Download and install from: https://fly.io/docs/hands-on/install-flyctl/

**On Windows:**
```powershell
# Using Chocolatey (if installed)
choco install flyctl

# Or download directly
# Go to: https://fly.io/docs/hands-on/install-flyctl/
# Download Windows installer
```

Verify installation:
```cmd
flyctl version
```

---

### **Step 2: Login to Fly.io**

```cmd
flyctl auth login
```

This will:
1. Open browser to Fly.io
2. Create account if needed (free)
3. Generate auth token

---

### **Step 3: Launch Backend on Fly.io**

In project directory:
```cmd
cd "c:\Wao Felicitations"
flyctl launch
```

When prompted:
- **App Name**: `wao-felicitations-api`
- **Organization**: (select default)
- **Region**: `cdg` (Europe - Paris, closest to you)
- **Postgres database**: NO (we use Neon)
- **Redis cache**: NO
- **Deploy now**: NO (configure first)

This creates:
- ✅ Fly.io app
- ✅ fly.toml configuration
- ✅ Dockerfile ready

---

### **Step 4: Set Environment Variables**

```cmd
flyctl secrets set DATABASE_URL="postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

flyctl secrets set DATABASE_URL_POOLED="postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

flyctl secrets set JWT_SECRET="dev-secret-key-minimum-32-characters-xxxxxxxxxx"

flyctl secrets set ENCRYPTION_KEY="dev-encryption-key-32chars-xxx"

flyctl secrets set CORS_ORIGIN="https://waooof.com,https://www.waooof.com"

flyctl secrets set NODE_ENV="production"
```

Verify:
```cmd
flyctl secrets list
```

---

### **Step 5: Deploy to Fly.io**

```cmd
flyctl deploy
```

This will:
1. Build Docker image
2. Push to Fly.io registry
3. Deploy to Fly.io servers
4. Start backend service

Takes ~3-5 minutes first time.

**Output will show:**
```
Searching for an existing app with the name [wao-felicitations-api]...
App Deployed
  URL: https://wao-felicitations-api.fly.dev
```

---

### **Step 6: Verify Backend is Running**

```cmd
# Check deployment status
flyctl status

# View logs
flyctl logs

# Test health endpoint
# Open in browser: https://wao-felicitations-api.fly.dev/api/auth/login
```

---

### **Step 7: Connect Frontend to Backend**

Update `src/config/api.ts`:

```typescript
// BEFORE:
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// AFTER:
const API_URL = import.meta.env.VITE_API_URL || 'https://wao-felicitations-api.fly.dev'
```

Or set environment variable in Vercel:
1. Go to Vercel project settings
2. Environment Variables
3. Add: `VITE_API_URL = https://wao-felicitations-api.fly.dev`
4. Redeploy

---

## 📋 Final Status

| Component | URL | Status |
|-----------|-----|--------|
| Frontend | https://waooof.com | ✅ Deployed |
| Backend | https://wao-felicitations-api.fly.dev | ⏳ Deploy now |
| Database | Neon PostgreSQL | ✅ Ready |

---

## 🔧 If Issues Occur

**Backend not deploying:**
```cmd
# Check build logs
flyctl logs --all

# Check Dockerfile
# Ensure Node.js version matches

# Redeploy with verbose
flyctl deploy --verbose
```

**Connection timeout:**
```cmd
# Check if app is running
flyctl status

# Restart app
flyctl restart

# Check resource usage
flyctl status -t resources
```

**Database connection error:**
```cmd
# Verify secrets were set
flyctl secrets list

# Update secret
flyctl secrets set DATABASE_URL="..."
```

---

## 📝 Files Created

- ✅ `Dockerfile` - Container configuration
- ✅ `fly.toml` - Fly.io configuration
- ✅ `.dockerignore` - Files to exclude
- ✅ `.env.production` - Production variables

All ready for deployment!

---

## ✅ Expected Result After Deployment

1. ✅ Backend accessible at: `https://wao-felicitations-api.fly.dev`
2. ✅ Frontend can reach backend
3. ✅ Login works: `dayo.dodzi@waooo.com / Admin2026!`
4. ✅ No "Mode hors ligne" error
5. ✅ Full application functional 24/7

---

**Next**: Follow steps 1-7 above, then test the connection!
