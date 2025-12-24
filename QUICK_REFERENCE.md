# Quick Reference Guide - Payment System

## 🚀 Daily Workflow

### Before Making Changes
```bash
# 1. Pull latest changes
git pull origin main

# 2. Create a new branch
git checkout -b feature/your-feature-name
```

### While Coding
```bash
# Run validation frequently
cd Downloads/poom/transact
.\validate_javascript.ps1
```

### Before Committing
```bash
# 1. Run validation
cd Downloads/poom/transact
.\validate_javascript.ps1

# 2. Test in browser (Open DevTools - F12)
# - Check Console for errors
# - Test all payment methods
# - Verify no red errors

# 3. Commit changes
git add .
git commit -m "fix: clear description of what you fixed"
git push origin your-branch-name
```

---

## 🔧 Common Commands

### Start Server
```powershell
cd Downloads/poom/server
npm start
```

### Stop Server
```powershell
# Press Ctrl+C in the terminal where server is running
# Or kill the process:
taskkill /F /IM node.exe
```

### Check What's Running on Port 3000
```powershell
netstat -ano | findstr :3000
```

### Kill Process on Port 3000
```powershell
# Find PID first
netstat -ano | findstr :3000
# Then kill it (replace PID with actual number)
taskkill /F /PID <PID>
```

### Validate JavaScript
```powershell
cd Downloads/poom/transact
.\validate_javascript.ps1
```

---

## 🐛 Common Errors and Fixes

### Error: "showSection is not defined"
**Fix:** Function missing or not in scope
```javascript
// Ensure function is defined in <script> tag:
function showSection(name, event) {
    // function code
}
```

### Error: "event is not defined"
**Fix:** Add event parameter
```javascript
// Wrong:
function showSection(name) {
    event.currentTarget.classList.add('active');
}

// Correct:
function showSection(name, event) {
    event.currentTarget.classList.add('active');
}
```

### Error: "Unexpected token '}'"
**Fix:** Extra closing brace
- Run validation script to find it
- Check brace matching in editor
- Remove extra }

### Error: "Cannot read property 'currentTarget' of undefined"
**Fix:** Pass event in onclick
```html
<!-- Wrong: -->
<div onclick="showSection('card')">

<!-- Correct: -->
<div onclick="showSection('card', event)">
```

---

## 📁 Important Files

### Frontend (transact/)
- `billdesk_payment.html` - Main payment page
- `upi_processing.html` - UPI payment processing
- `payment_success.html` - Success page
- `validate_javascript.ps1` - Validation script

### Backend (server/)
- `server.js` - Main server file
- `config/database.js` - Database configuration
- `data/payments.json` - Payment data storage
- `.env` - Environment variables

### Documentation
- `JAVASCRIPT_GUIDELINES.md` - Detailed JS guidelines
- `PRE_COMMIT_CHECKLIST.md` - Commit checklist
- `QUICK_REFERENCE.md` - This file

---

## 🧪 Testing Checklist

### After Every Change:
- [ ] Run validation script
- [ ] Check browser console
- [ ] Test card payment
- [ ] Test UPI payment
- [ ] Test BHIM payment
- [ ] Test QR code
- [ ] Test all buttons
- [ ] Check responsive design

---

## 📞 Emergency Procedures

### Rollback Last Commit
```bash
git revert HEAD
git push
```

### Restore Specific File
```bash
git checkout HEAD~1 -- path/to/file
git commit -m "Restore file"
git push
```

### Server Won't Start
```powershell
# 1. Check if port is in use
netstat -ano | findstr :3000

# 2. Kill existing process
taskkill /F /PID <PID>

# 3. Restart server
cd Downloads/poom/server
npm start
```

### Page Shows Blank
1. Check browser console (F12)
2. Look for JavaScript errors
3. Run validation script
4. Check if server is running

---

## 🎯 Best Practices

### DO:
✅ Run validation before committing  
✅ Test in browser after changes  
✅ Write clear commit messages  
✅ Keep commits small and focused  
✅ Comment complex code  
✅ Back up before major changes  

### DON'T:
❌ Commit without testing  
❌ Ignore console warnings  
❌ Skip validation script  
❌ Make huge multi-file changes  
❌ Commit with errors  
❌ Push directly to main  

---

## 🔑 Keyboard Shortcuts

### Browser DevTools:
- `F12` - Open/close DevTools
- `Ctrl+Shift+C` - Inspect element
- `Ctrl+Shift+J` - Open Console
- `Ctrl+R` - Refresh page
- `Ctrl+Shift+R` - Hard refresh

### VS Code:
- `Ctrl+S` - Save
- `Ctrl+F` - Find
- `Ctrl+H` - Find and replace
- `Ctrl+/` - Toggle comment
- `Ctrl+Shift+F` - Find in all files

---

## 📊 File Structure

```
Downloads/poom/
├── transact/               # Frontend files
│   ├── billdesk_payment.html
│   ├── upi_processing.html
│   ├── payment_success.html
│   ├── validate_javascript.ps1
│   └── JAVASCRIPT_GUIDELINES.md
├── server/                 # Backend files
│   ├── server.js
│   ├── config/
│   ├── data/
│   └── package.json
├── admin/                  # Admin panel
├── images/                 # Images
└── README.md
```

---

## 💡 Tips

1. **Always validate before committing** - Saves hours of debugging
2. **Use browser console** - Your best friend for debugging
3. **Test incrementally** - Don't make too many changes at once
4. **Read error messages** - They tell you exactly what's wrong
5. **Keep backups** - Copy files before major changes

---

## 📚 Resources

- JavaScript Guidelines: `JAVASCRIPT_GUIDELINES.md`
- Pre-Commit Checklist: `PRE_COMMIT_CHECKLIST.md`
- Validation Script: `transact/validate_javascript.ps1`

---

**Last Updated:** December 23, 2025  
**Version:** 1.0
