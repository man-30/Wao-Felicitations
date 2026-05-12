# AUTO-START SETUP INSTRUCTIONS

## Quick Setup (Recommended - 1 minute)

### Step 1: Open the Setup Script

Right-click on this file:
```
c:\Wao Felicitations\setup-autostart-ADMIN.bat
```

Select: **"Run as administrator"**

### Step 2: Confirm Installation

When the window closes, the task is created. Your backend will now:
- ✅ Auto-start every time Windows boots
- ✅ Run automatically in the background
- ✅ Auto-restart if it crashes

That's it! No more manual starts needed.

---

## Alternative: Manual Command Line Setup

If you prefer using Command Prompt:

1. **Open Command Prompt as Administrator:**
   - Press `Win + R`
   - Type: `cmd`
   - Press `Ctrl + Shift + Enter`

2. **Run these commands:**

```cmd
cd /d "c:\Wao Felicitations"
schtasks /delete /tn "Wao-Felicitations-Backend" /f
schtasks /create /tn "Wao-Felicitations-Backend" /tr "c:\Wao Felicitations\start-backend.bat" /sc onstart /ru SYSTEM /rl HIGHEST /f
```

3. **Verify task was created:**

```cmd
schtasks /query /tn "Wao-Felicitations-Backend" /v
```

---

## Verify the Setup Works

To test if auto-start is configured:

1. **Check if task exists:**
   ```cmd
   schtasks /query /tn "Wao-Felicitations-Backend" /v
   ```

2. **Restart Windows and verify backend started:**
   - After reboot, open browser: http://localhost:3001/api/auth/login
   - Should work without manual start

---

## Management

### View detailed task info:
```powershell
Get-ScheduledTask -TaskName "Wao-Felicitations-Backend" | Select-Object -Property *
```

### Remove task (if needed):
```cmd
schtasks /delete /tn "Wao-Felicitations-Backend" /f
```

### Check if backend is running:
```cmd
tasklist | findstr backend
netstat -ano | findstr :3001
```

---

## Troubleshooting

**Q: Setup script did nothing?**
A: You must run as Administrator. Right-click and select "Run as administrator"

**Q: Task shows but backend doesn't start?**
A: Check that start-backend.bat exists and .env.backend has valid credentials

**Q: Want to verify it works now?**
A: Run the batch file manually: 
   ```cmd
   cd /d "c:\Wao Felicitations"
   start-backend.bat
   ```

**Q: Backend still doesn't auto-start after reboot?**
A: Contact admin - may need to check Windows Task Scheduler permissions

---

## Files Used

- `setup-autostart-ADMIN.bat` - Main setup script (run this as admin)
- `start-backend.bat` - Backend startup script (runs automatically)
- `.env.backend` - Configuration file
- `backend-express-complete.ts` - Backend code

---

**Status**: 🔄 Ready for auto-start configuration
**Action Required**: Run `setup-autostart-ADMIN.bat` as Administrator
