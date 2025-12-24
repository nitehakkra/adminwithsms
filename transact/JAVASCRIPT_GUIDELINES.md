# JavaScript Guidelines for Payment System

## 🚨 Common Errors to Avoid

This document outlines common JavaScript errors that have occurred in this project and how to prevent them.

---

## 1. Extra Closing Braces

### ❌ Wrong:
```javascript
function handlePayment() {
    if (condition) {
        // do something
    }
}
}  // ❌ Extra closing brace!
```

### ✅ Correct:
```javascript
function handlePayment() {
    if (condition) {
        // do something
    }
}
```

### Prevention:
- Use a code editor with brace matching (VS Code, WebStorm, etc.)
- Run the validation script before committing: `.\validate_javascript.ps1`
- Use proper indentation to visually track braces

---

## 2. Using Event Object Without Parameter

### ❌ Wrong:
```javascript
function showSection(name) {  // ❌ Missing 'event' parameter
    event.currentTarget.classList.add('active');  // Will cause error
}
```

### ✅ Correct:
```javascript
function showSection(name, event) {  // ✅ Event parameter declared
    event.currentTarget.classList.add('active');
}
```

### Prevention:
- Always declare `event` as a parameter if you use it in the function
- In onclick handlers, always pass `event`: `onclick="showSection('card', event)"`
- Search for `event.` in your function and ensure event is in parameters

---

## 3. Onclick Handlers Not Passing Event

### ❌ Wrong:
```html
<div onclick="showSection('card')">  <!-- ❌ Missing event -->
```

### ✅ Correct:
```html
<div onclick="showSection('card', event)">  <!-- ✅ Event passed -->
```

### Prevention:
- When adding onclick handlers, always check if the function needs event
- Use template: `onclick="functionName(params, event)"`
- Run validation script to check all onclick handlers

---

## 4. Unclosed Functions or Blocks

### ❌ Wrong:
```javascript
function handlePayment() {
    if (condition) {
        doSomething();
    // ❌ Missing closing brace for function
```

### ✅ Correct:
```javascript
function handlePayment() {
    if (condition) {
        doSomething();
    }
}  // ✅ Function properly closed
```

---

## 5. Syntax Errors in Function Calls

### ❌ Wrong:
```javascript
// Missing comma
socket.emit('event' {
    data: value
});
```

### ✅ Correct:
```javascript
socket.emit('event', {
    data: value
});
```

---

## 🛠️ Tools and Scripts

### 1. Validation Script
Run before every commit:
```powershell
cd Downloads/poom/transact
.\validate_javascript.ps1
```

### 2. Browser Console
- Open Developer Tools (F12)
- Check Console tab for errors
- Fix any red errors immediately

### 3. VS Code Extensions
Install these extensions:
- **ESLint** - JavaScript linting
- **Bracket Pair Colorizer** - Visual brace matching
- **Error Lens** - Inline error display

---

## 📋 Pre-Commit Checklist

Before committing any JavaScript changes:

- [ ] Run `validate_javascript.ps1` script
- [ ] Check browser console for errors
- [ ] Test all onclick handlers
- [ ] Verify all functions have proper parameters
- [ ] Check brace matching with editor
- [ ] Test each payment method (Card, UPI, BHIM, QR)

---

## 🔍 Testing Procedure

### After Making JavaScript Changes:

1. **Syntax Check**
   ```powershell
   .\validate_javascript.ps1
   ```

2. **Browser Test**
   - Open the page in browser
   - Open DevTools Console (F12)
   - Click through all payment options
   - Verify no console errors

3. **Functionality Test**
   - Card section: Test card input and brand detection
   - UPI section: Test UPI ID input and validation
   - BHIM section: Test BHIM input and suffixes
   - QR section: Test QR modal open/close
   - Test all buttons and forms

---

## 🚀 Quick Fixes for Common Issues

### Issue: "showSection is not defined"
**Cause:** Function not defined or in wrong scope  
**Fix:** Ensure function is in `<script>` tag and not inside another function

### Issue: "event is not defined"
**Cause:** Using event without declaring it as parameter  
**Fix:** Add `event` parameter to function definition

### Issue: "Unexpected token '}'"
**Cause:** Extra closing brace or mismatched braces  
**Fix:** Count opening and closing braces, remove extras

### Issue: "Cannot read property 'currentTarget' of undefined"
**Cause:** Event not passed to function  
**Fix:** Add `event` to onclick handler: `onclick="func(param, event)"`

---

## 📝 Code Review Guidelines

When reviewing JavaScript changes:

1. ✅ Check all function definitions have correct parameters
2. ✅ Verify onclick handlers pass required parameters
3. ✅ Count braces match (use editor's brace matching)
4. ✅ Run validation script
5. ✅ Test in browser console
6. ✅ Check for console errors/warnings

---

## 🔧 Automated Testing (Future Enhancement)

Consider adding:
- Pre-commit hooks to run validation
- Jest/Mocha unit tests for functions
- Selenium/Playwright for UI testing
- CI/CD pipeline with automated checks

---

## 📞 Support

If you encounter JavaScript errors:

1. Run `validate_javascript.ps1`
2. Check browser console
3. Review this guide
4. Check git history for recent changes
5. Restore from backup if needed

---

## 📚 Additional Resources

- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [JavaScript Event Reference](https://developer.mozilla.org/en-US/docs/Web/Events)
- [ESLint Documentation](https://eslint.org/docs/latest/)

---

**Last Updated:** December 23, 2025  
**Maintained By:** Development Team
