# 🔐 Authentication & Deep Crawling Guide

This guide explains how to use the advanced authentication and crawling features to test authenticated areas of your web application.

## 🍪 Cookie-Based Authentication

Test authenticated pages by providing session cookies. This allows the security suite to test areas that require login.

### Basic Usage

```bash
# Single cookie
npm run dev -- scan https://example.com \
  --cookie "session=abc123xyz"

# Multiple cookies
npm run dev -- scan https://example.com \
  --cookie "session=abc123xyz" \
  --cookie "user_id=12345"

# With custom cookie domain
npm run dev -- scan https://example.com \
  --cookie "session=abc123xyz" \
  --cookie-domain ".example.com"
```

### How to Get Your Session Cookie

#### Method 1: Browser DevTools (Chrome/Firefox)

1. Log into the web application in your browser
2. Open DevTools (F12 or Right-click → Inspect)
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Click on **Cookies** in the left sidebar
5. Find your authentication cookie (usually named `session`, `auth_token`, `PHPSESSID`, etc.)
6. Copy the **Name** and **Value**

#### Method 2: Export with Browser Extension

Install a cookie export extension like "EditThisCookie" or "Cookie-Editor", then export your cookies.

#### Method 3: Using cURL

```bash
# Login and capture cookies
curl -c cookies.txt -X POST https://example.com/login \
  -d "username=your_user&password=your_pass"

# View the cookies
cat cookies.txt
```

### Example: Testing an Authenticated Application

```bash
# 1. Get your session cookie after logging in
# Cookie name: "session_token"
# Cookie value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Run security scan as authenticated user
npm run dev -- scan https://app.example.com/dashboard \
  --cookie "session_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --crawl-depth 3

# 3. The tool will now test all authenticated pages it can find
```

## 🕷️ Deep Crawling

The tool automatically discovers links, forms, and input fields across your application by crawling up to N levels deep.

### Crawl Configuration

```bash
# Default: 3 levels deep, max 50 pages
npm run dev -- scan https://example.com

# Custom crawl depth (0 = no crawling, just test the main page)
npm run dev -- scan https://example.com --crawl-depth 5

# Limit maximum pages to crawl
npm run dev -- scan https://example.com --max-pages 100

# Disable crawling entirely
npm run dev -- scan https://example.com --crawl-depth 0
```

### What Gets Discovered

The crawler automatically finds:

- ✅ **Links** - All `<a href>` tags pointing to same-domain pages
- ✅ **Input Fields** - Text inputs, textareas, select boxes
- ✅ **Forms** - Form actions, methods, and all form inputs
- ✅ **Pages** - Following links recursively up to the specified depth

### Crawl Example

```
Starting page: https://example.com/
└─ Depth 1: /about, /products, /login, /dashboard
   └─ Depth 2: /products/1, /products/2, /dashboard/settings
      └─ Depth 3: /dashboard/settings/profile, /dashboard/settings/security
```

### Smart Crawling Features

**Same-Domain Only**
- Only crawls pages on the same domain
- Ignores external links automatically

**File Type Filtering**
- Skips binary files (PDF, images, ZIP, etc.)
- Focuses on HTML pages with testable content

**Deduplication**
- Visits each URL only once
- Prevents infinite loops

**Respectful Limits**
- Configurable max pages
- Configurable max depth
- Prevents excessive requests

## 🚀 Complete Example: Testing an Authenticated SaaS Application

```bash
# Scenario: Testing a SaaS dashboard with authentication

# Step 1: Login and get your session cookie
# (Use browser DevTools as described above)

# Step 2: Run comprehensive authenticated scan
npm run dev -- scan https://app.mycompany.com/dashboard \
  --cookie "session=abc123xyz456" \
  --cookie "csrf_token=token789" \
  --crawl-depth 4 \
  --max-pages 75 \
  --timeout 45000 \
  --no-headless

# What happens:
# 1. Tool sets your session cookies
# 2. Starts crawling from /dashboard
# 3. Discovers all accessible pages (settings, profile, admin, etc.)
# 4. Finds all input fields across all discovered pages
# 5. Tests each input for XSS, SQLi, and other vulnerabilities
# 6. Generates report with findings across the entire application
```

## 📊 Crawl Output

### During Scan

```
[*] Setting 2 authentication cookie(s)
[+] Cookies set successfully

[*] Starting deep crawl (max depth: 3, max pages: 50)
  [→] Crawling (depth 0): https://example.com/
      Found: 5 inputs, 2 forms, 10 links
  [→→] Crawling (depth 1): https://example.com/products
      Found: 3 inputs, 1 forms, 8 links
  [→→→] Crawling (depth 2): https://example.com/products/search
      Found: 7 inputs, 2 forms, 5 links
[+] Crawl complete! Discovered 15 pages with 42 input fields

[*] Crawl Statistics:
    Pages crawled: 15
    Input fields found: 42
    Forms found: 12
    Links discovered: 156
```

### In Test Results

When crawling is enabled, tests will report:

```
[+] Running: XSS Vulnerability Tests (Injection)
    Testing 10 discovered input fields
  ⚠️  Found 1 vulnerability(ies)

  Finding: XSS vulnerability detected in input field
  URL: https://example.com/search
  Field: search_query
  Evidence: Dialog triggered: true
```

## ⚙️ Configuration File Example

Create `auth-config.json`:

```json
{
  "targetUrl": "https://app.example.com/dashboard",
  "cookies": [
    {
      "name": "session",
      "value": "your_session_token_here",
      "domain": ".example.com",
      "path": "/"
    },
    {
      "name": "csrf_token",
      "value": "your_csrf_token"
    }
  ],
  "crawlDepth": 4,
  "maxPages": 100,
  "timeout": 45000,
  "headless": true,
  "outputDir": "./authenticated-reports"
}
```

Then run:

```bash
node dist/index.js scan https://app.example.com --config auth-config.json
```

## 🎯 Best Practices

### Authentication

1. **Use a Test Account**
   - Don't use production user credentials
   - Create a dedicated security testing account
   - Ensure it has appropriate permissions

2. **Session Management**
   - Cookies may expire during long scans
   - Use `--timeout` to adjust for slow pages
   - Get fresh cookies if scan fails midway

3. **Multiple Roles**
   - Test with different user roles (admin, user, guest)
   - Use different cookies for each role
   - Compare results across permission levels

### Crawling

1. **Start Small**
   ```bash
   # First test: shallow crawl
   --crawl-depth 1 --max-pages 10

   # Once confident: deeper crawl
   --crawl-depth 3 --max-pages 50
   ```

2. **Staging Environment**
   - Always test on staging first
   - Never run deep crawls on production
   - Monitor server load

3. **Crawl Depth Guidelines**
   - **Depth 1**: Homepage + direct links (fast, ~10-20 pages)
   - **Depth 2**: Good for small/medium sites (~20-40 pages)
   - **Depth 3**: Comprehensive coverage (~40-80 pages)
   - **Depth 4+**: Very large sites (use with max-pages limit)

## 🔒 Security Considerations

**Cookie Safety**
- Never commit cookies to version control
- Use environment variables or secure vaults
- Rotate cookies after security testing
- Don't share cookie values

**Testing Authorization**
- Tool respects authentication boundaries
- Only tests pages the cookie can access
- Won't try to bypass access controls
- Reports on accessible attack surface

**Rate Limiting**
- Crawling may trigger rate limits
- Use `--max-pages` to control request volume
- Consider adding delays between requests
- Whitelist your IP if testing your own app

## 🐛 Troubleshooting

### Cookies Not Working

```bash
# Check cookie format
--cookie "name=value"  # ✅ Correct
--cookie name=value    # ❌ Needs quotes

# Check domain
--cookie "session=abc" --cookie-domain ".example.com"

# Verify cookie hasn't expired
# Get fresh cookies from browser
```

### Crawler Not Finding Pages

```bash
# Increase depth
--crawl-depth 4

# Increase page limit
--max-pages 100

# Check if JavaScript is required for navigation
# (Crawler works with rendered pages but may miss some JS-heavy navigation)
```

### Authentication Timing Out

```bash
# Increase timeout
--timeout 60000

# Check if session cookies expire quickly
# May need to refresh cookies mid-scan
```

## 📈 Advanced Scenarios

### Testing Multi-Tenant Applications

```bash
# Test Tenant A
npm run dev -- scan https://tenant-a.app.com \
  --cookie "tenant_session=token_a" \
  --crawl-depth 3 \
  -o ./reports/tenant-a

# Test Tenant B
npm run dev -- scan https://tenant-b.app.com \
  --cookie "tenant_session=token_b" \
  --crawl-depth 3 \
  -o ./reports/tenant-b
```

### Testing Different Permission Levels

```bash
# Admin user
npm run dev -- scan https://app.com \
  --cookie "session=admin_token" \
  -o ./reports/admin-scan

# Regular user
npm run dev -- scan https://app.com \
  --cookie "session=user_token" \
  -o ./reports/user-scan

# Compare reports to find privilege escalation issues
```

### CI/CD Integration

```bash
#!/bin/bash
# Example CI script

# Get session cookie from secure vault
SESSION_COOKIE=$(vault read secret/test-session)

# Run scan
npm run dev -- scan https://staging.app.com \
  --cookie "session=$SESSION_COOKIE" \
  --crawl-depth 2 \
  --max-pages 30 \
  --json-only

# Check exit code (non-zero if critical/high vulns found)
if [ $? -ne 0 ]; then
  echo "Security vulnerabilities found!"
  exit 1
fi
```

---

**Remember:** Always get permission before testing any application, even with authentication!
