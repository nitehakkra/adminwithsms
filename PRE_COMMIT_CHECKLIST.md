# Pre-Commit Checklist for Payment System

## 🎯 Purpose
This checklist ensures code quality and prevents common errors before committing changes.

---

## ✅ JavaScript Changes Checklist

If you modified any `.html` or `.js` files:

### 1. Run Validation Script
```powershell
cd Downloads/poom/transact
.\validate_javascript.ps1
```
- [ ] No errors reported
- [ ] All warnings reviewed and addressed

### 2. Browser Console Check
- [ ] Opened page in browser (Chrome/Firefox/Edge)
- [ ] Pressed F12 to open DevTools
- [ ] Checked Console tab - no red errors
- [ ] Checked for yellow warnings

### 3. Function Testing
- [ ] Tested all modified functions
- [ ] Verified onclick handlers work
- [ ] Checked event parameters are passed correctly
- [ ] Tested all payment method sections

### 4. Code Review
- [ ] All functions have proper parameters
- [ ] Braces are balanced and properly indented
- [ ] No duplicate code
- [ ] Comments are clear and helpful
- [ ] Variable names are descriptive

---

## ✅ Server Changes Checklist

If you modified `server.js` or backend files:

### 1. Syntax Check
- [ ] No syntax errors
- [ ] All required modules installed
- [ ] Environment variables configured

### 2. Start Server
```powershell
cd Downloads/poom/server
npm start
```
- [ ] Server starts without errors
- [ ] WebSocket connection established
- [ ] Database connection successful

### 3. Test Endpoints
- [ ] Tested all modified API endpoints
- [ ] WebSocket events working correctly
- [ ] Error handling in place

---

## ✅ Frontend Changes Checklist

If you modified HTML/CSS:

### 1. Visual Check
- [ ] Page loads correctly
- [ ] Layout is responsive
- [ ] No broken images or links
- [ ] All sections display properly

### 2. Cross-Browser Testing
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Edge
- [ ] Mobile view checked

---

## ✅ Database Changes Checklist

If you modified database structure:

- [ ] Backup created before changes
- [ ] Migration script tested
- [ ] Data integrity verified
- [ ] Rollback plan ready

---

## ✅ Documentation Checklist

- [ ] README updated if needed
- [ ] Code comments added for complex logic
- [ ] API documentation updated
- [ ] Changelog entry added

---

## ✅ Security Checklist

- [ ] No sensitive data in code (passwords, keys)
- [ ] Input validation implemented
- [ ] SQL injection prevention in place
- [ ] XSS protection implemented
- [ ] CORS properly configured

---

## ✅ Performance Checklist

- [ ] No unnecessary console.logs in production
- [ ] Large files optimized
- [ ] Database queries optimized
- [ ] No memory leaks

---

## 🚀 Final Steps

Before committing:

1. **Stage Changes**
   ```bash
   git add .
   ```

2. **Review Changes**
   ```bash
   git diff --staged
   ```

3. **Commit with Clear Message**
   ```bash
   git commit -m "type: clear description of changes"
   ```
   
   Types:
   - `fix:` Bug fixes
   - `feat:` New features
   - `refactor:` Code refactoring
   - `docs:` Documentation
   - `style:` Formatting changes
   - `test:` Test changes

4. **Push Changes**
   ```bash
   git push origin branch-name
   ```

---

## 🔄 Rollback Plan

If issues occur after commit:

### Quick Rollback
```bash
git revert HEAD
git push
```

### Restore Specific File
```bash
git checkout HEAD~1 -- path/to/file
git commit -m "Restore file to previous version"
git push
```

### Full Reset (Use with Caution)
```bash
git reset --hard HEAD~1
git push --force
```

---

## 📊 Quality Gates

All checkboxes must be ✅ before committing:

- Minimum Quality Score: 8/10
- Test Coverage: >80%
- No Critical Errors
- Documentation Updated

---

## 🐛 Known Issues to Avoid

### Previously Fixed Issues:
1. ✅ Extra closing braces in `billdesk_payment.html`
2. ✅ Missing event parameter in `showSection()` function
3. ✅ Onclick handlers not passing event

### Watch Out For:
- Brace matching errors
- Event handling issues
- WebSocket connection problems
- Timer interval leaks

---

## 📞 Emergency Contacts

If something goes wrong:
1. Check this checklist first
2. Review `JAVASCRIPT_GUIDELINES.md`
3. Run validation script
4. Check git history for recent changes
5. Restore from backup if needed

---

## 🎓 Best Practices

1. **Commit Often, Push Daily**
   - Small commits are easier to review
   - Easier to rollback if needed

2. **Write Clear Commit Messages**
   - Explain what and why, not how
   - Reference issue numbers

3. **Test Locally First**
   - Never commit untested code
   - Verify in browser console

4. **Keep It Simple**
   - Don't overcomplicate
   - Follow existing patterns

5. **Ask for Review**
   - Get second opinion on complex changes
   - Learn from feedback

---

**Remember:** Taking 5 minutes to check now saves hours of debugging later! 🎯

---

**Last Updated:** December 23, 2025
