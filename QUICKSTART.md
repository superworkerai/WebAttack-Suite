# 🚀 Quick Start Guide

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Run Your First Scan

```bash
# Basic scan
npm run dev -- scan https://example.com

# Or if built:
node dist/index.js scan https://example.com
```

## View Results

After the scan completes, you'll find two reports in the `./reports` directory:

1. **JSON Report** - `security-scan-YYYY-MM-DD....json`
2. **HTML Report** - `security-scan-YYYY-MM-DD....html`

Open the HTML report in your browser to see an interactive dashboard!

## Common Commands

```bash
# List all available tests
npm run dev -- list-tests

# Run in visible browser mode
npm run dev -- scan https://example.com --no-headless

# Test only specific modules
npm run dev -- scan https://example.com --include "XSS Vulnerability Tests,SQL Injection Tests"

# Generate only JSON report
npm run dev -- scan https://example.com --json-only
```

## What Gets Tested?

✅ **9 Test Modules** with **45+ Individual Tests**:

1. **XSS Tests** - 20+ payloads for reflected, stored, and DOM-based XSS
2. **SQL Injection** - Error-based and time-based blind SQLi
3. **Authentication** - Password policy, brute force, session security
4. **Security Headers** - CSP, HSTS, X-Frame-Options, and more
5. **CSRF Protection** - Token validation and SameSite cookies
6. **Input Validation** - Command injection, path traversal, file upload
7. **Information Disclosure** - Sensitive files, error messages, comments
8. **Business Logic** - Rate limiting, boundary testing, price manipulation
9. **SSL/TLS** - HTTPS enforcement, mixed content, certificate validation

## Understanding Severity Levels

| Level | Meaning | Action Required |
|-------|---------|----------------|
| 🔴 **Critical** | Immediate exploit risk | Fix immediately |
| 🟠 **High** | Significant vulnerability | High priority fix |
| 🟡 **Medium** | Moderate risk | Should be addressed |
| 🟢 **Low** | Minor issue | Best practice improvement |
| ℹ️ **Info** | No direct risk | Informational only |

## Tips for Effective Testing

1. **Start with a staging environment** - Never test production without permission
2. **Review false positives** - Some findings may not apply to your app
3. **Combine with manual testing** - Automated tools can't catch everything
4. **Run regularly** - Add to CI/CD pipeline for continuous security
5. **Fix high-severity issues first** - Prioritize by risk level

## Troubleshooting

### "Permission denied" errors
- Ensure you have authorization to test the target
- Check if there's a WAF or rate limiting

### "Timeout" errors
- Increase timeout: `--timeout 60000` (60 seconds)
- Check if the site is slow or behind authentication

### "No vulnerabilities found"
- Good news! But verify with manual testing
- Some tests may not apply to all applications
- Consider the site might have good security

## Next Steps

1. ✅ Run your first scan
2. 📊 Review the HTML report
3. 🔍 Investigate vulnerabilities
4. 🛠️ Apply recommended fixes
5. 🔁 Re-scan to verify fixes
6. 🚀 Integrate into CI/CD

## Need Help?

- Check the full README.md for detailed documentation
- Review test modules in `src/tests/` for implementation details
- Examine the HTML report for remediation guidance

---

**Remember:** Only test applications you own or have explicit permission to test!
