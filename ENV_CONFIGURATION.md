# 📝 Environment Configuration Guide

Use `.env` files to simplify configuration and avoid typing long commands every time.

## 🚀 Quick Start

### 1. Create Your `.env` File

```bash
# Copy the example file
cp .env.example .env

# Edit with your configuration
nano .env
# or
code .env
```

### 2. Configure Your Settings

```bash
# .env
TARGET_URL=https://app.example.com/dashboard
COOKIES=session=abc123xyz789,csrf_token=token456
CRAWL_DEPTH=3
MAX_PAGES=50
```

### 3. Run Without Arguments!

```bash
# Just run scan - it reads everything from .env
npm run dev -- scan

# Or after building:
npm run build
node dist/index.js scan
```

That's it! No need to type the URL or cookies every time.

## 📋 All Available Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `TARGET_URL` | URL to scan | *required* | `https://example.com` |
| `COOKIES` | Session cookies (comma-separated) | none | `session=abc,token=xyz` |
| `COOKIE_DOMAIN` | Cookie domain | auto-detected | `.example.com` |
| `CRAWL_DEPTH` | Crawl depth (0-5) | `3` | `4` |
| `MAX_PAGES` | Max pages to crawl | `50` | `100` |
| `TIMEOUT` | Request timeout (ms) | `30000` | `60000` |
| `HEADLESS` | Run headless | `true` | `false` |
| `OUTPUT_DIR` | Report directory | `./reports` | `./my-reports` |
| `INCLUDE_TESTS` | Tests to run only | all | `XSS Vulnerability Tests,SQL Injection Tests` |
| `EXCLUDE_TESTS` | Tests to skip | none | `Business Logic Tests` |
| `JSON_ONLY` | Generate only JSON | `false` | `true` |
| `HTML_ONLY` | Generate only HTML | `false` | `true` |

## 💡 Usage Examples

### Example 1: Basic Authenticated Scan

**.env**
```bash
TARGET_URL=https://app.example.com
COOKIES=session_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123
CRAWL_DEPTH=3
MAX_PAGES=50
```

**Run:**
```bash
npm run dev -- scan
```

### Example 2: Deep Scan with Multiple Cookies

**.env**
```bash
TARGET_URL=https://app.example.com/dashboard
COOKIES=session=abc123,csrf_token=xyz789,user_id=12345
COOKIE_DOMAIN=.example.com
CRAWL_DEPTH=4
MAX_PAGES=75
TIMEOUT=60000
HEADLESS=false
```

**Run:**
```bash
npm run dev -- scan
```

### Example 3: Fast Shallow Scan

**.env**
```bash
TARGET_URL=https://example.com
CRAWL_DEPTH=1
MAX_PAGES=10
TIMEOUT=15000
JSON_ONLY=true
OUTPUT_DIR=./quick-reports
```

**Run:**
```bash
npm run dev -- scan
```

### Example 4: Specific Tests Only

**.env**
```bash
TARGET_URL=https://example.com
COOKIES=session=abc123
INCLUDE_TESTS=XSS Vulnerability Tests,SQL Injection Tests,CSRF Protection Tests
CRAWL_DEPTH=2
```

**Run:**
```bash
npm run dev -- scan
```

### Example 5: CI/CD Configuration

**.env**
```bash
TARGET_URL=https://staging.example.com
COOKIES=ci_session=automated_test_token
CRAWL_DEPTH=2
MAX_PAGES=30
TIMEOUT=45000
JSON_ONLY=true
OUTPUT_DIR=./ci-reports
```

**Run:**
```bash
npm run build
node dist/index.js scan
```

## 🔄 Overriding Environment Variables

Command-line arguments **always override** environment variables:

**.env**
```bash
TARGET_URL=https://example.com
CRAWL_DEPTH=3
```

**Command:**
```bash
# This will scan https://other-site.com with depth 5
npm run dev -- scan https://other-site.com --crawl-depth 5
```

**Precedence Order (highest to lowest):**
1. Command-line arguments
2. Environment variables from `.env`
3. Built-in defaults

## 🍪 Cookie Configuration

### Simple Cookie

```bash
COOKIES=session=abc123
```

### Multiple Cookies

```bash
# Format: name1=value1,name2=value2,name3=value3
COOKIES=session=abc123,csrf_token=xyz789,user_id=12345
```

### Cookies with Special Characters

If your cookie value contains commas, you need to be careful:

```bash
# This works:
COOKIES=jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.xyz

# Multiple cookies with complex values:
COOKIES=jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.xyz,session=simple123
```

### Custom Cookie Domain

```bash
COOKIES=session=abc123
COOKIE_DOMAIN=.example.com
```

This sets the cookie for all subdomains of example.com.

## 🔒 Security Best Practices

### 1. Never Commit `.env` Files

The `.gitignore` already excludes `.env` files, but double-check:

```bash
# .gitignore should have:
.env
.env.local
.env.*.local
```

### 2. Use Different `.env` Files for Different Environments

```bash
.env.staging      # For staging environment
.env.production   # For production (use with caution!)
.env.local        # For local testing
```

Load different files:

```bash
# Load specific env file
cp .env.staging .env
npm run dev -- scan
```

### 3. Rotate Cookies Regularly

Session cookies expire. Update your `.env` file with fresh cookies:

```bash
# Get fresh session cookie from browser
# Update .env file
COOKIES=session=NEW_FRESH_TOKEN
```

### 4. Store Sensitive `.env` Files Securely

- Don't share via email or Slack
- Use password managers or secret vaults
- Encrypt if storing in cloud storage

## 🔧 Troubleshooting

### Error: "No target URL provided"

**Problem:** Neither CLI argument nor `TARGET_URL` is set.

**Solution:**
```bash
# Option 1: Add to .env
echo "TARGET_URL=https://example.com" >> .env

# Option 2: Pass via CLI
npm run dev -- scan https://example.com
```

### Cookies Not Working

**Problem:** Authentication fails even with cookies set.

**Check:**
1. Cookie format is correct: `name=value,name2=value2`
2. Cookie hasn't expired (get a fresh one)
3. Cookie domain matches the target site
4. No extra spaces in the cookie string

```bash
# ✅ Correct
COOKIES=session=abc123,token=xyz789

# ❌ Wrong (spaces around =)
COOKIES=session = abc123, token = xyz789

# ❌ Wrong (quotes)
COOKIES="session=abc123"
```

### Environment Variables Not Loading

**Problem:** `.env` file exists but values aren't used.

**Check:**
1. File is named exactly `.env` (not `.env.txt`)
2. File is in the project root directory
3. Rebuild after changing `.env`:
   ```bash
   npm run build
   ```

### Value Not Being Used

**Remember:** CLI arguments override `.env` values.

```bash
# .env has CRAWL_DEPTH=3
# But this command uses depth 5:
npm run dev -- scan --crawl-depth 5
```

## 📦 Multiple Configuration Profiles

Create different `.env` files for different scenarios:

### .env.quick (Fast scan)
```bash
TARGET_URL=https://example.com
CRAWL_DEPTH=1
MAX_PAGES=10
TIMEOUT=15000
```

### .env.deep (Comprehensive scan)
```bash
TARGET_URL=https://example.com
CRAWL_DEPTH=5
MAX_PAGES=100
TIMEOUT=90000
```

### .env.authenticated (With auth)
```bash
TARGET_URL=https://app.example.com/dashboard
COOKIES=session=your_session_here
CRAWL_DEPTH=3
MAX_PAGES=50
```

**Switch between profiles:**
```bash
# Use quick scan
cp .env.quick .env
npm run dev -- scan

# Use deep scan
cp .env.deep .env
npm run dev -- scan

# Use authenticated scan
cp .env.authenticated .env
npm run dev -- scan
```

## 🤖 CI/CD Integration

### GitHub Actions

```yaml
- name: Run Security Scan
  env:
    TARGET_URL: https://staging.example.com
    COOKIES: ${{ secrets.TEST_SESSION_COOKIE }}
    CRAWL_DEPTH: 2
    MAX_PAGES: 30
    JSON_ONLY: true
  run: |
    npm run build
    node dist/index.js scan
```

### GitLab CI

```yaml
security_scan:
  script:
    - export TARGET_URL=https://staging.example.com
    - export COOKIES=$TEST_SESSION_COOKIE
    - export CRAWL_DEPTH=2
    - export JSON_ONLY=true
    - npm run build
    - node dist/index.js scan
```

### Docker

```bash
# Run with .env file
docker run -v $(pwd)/.env:/app/.env webattack-suite scan

# Or pass env vars
docker run \
  -e TARGET_URL=https://example.com \
  -e COOKIES=session=abc123 \
  -e CRAWL_DEPTH=3 \
  webattack-suite scan
```

## 📝 Template for Copy-Paste

Here's a ready-to-use template:

```bash
# ============================================
# WebAttack Security Suite Configuration
# ============================================

# Required: Target URL
TARGET_URL=https://your-app.com

# Authentication (get from browser DevTools → Application → Cookies)
COOKIES=session=your_session_token_here

# Optional: Cookie domain
# COOKIE_DOMAIN=.your-app.com

# Crawling Configuration
CRAWL_DEPTH=3
MAX_PAGES=50

# Performance
TIMEOUT=30000
HEADLESS=true

# Output
OUTPUT_DIR=./reports

# Test Selection (uncomment to use)
# INCLUDE_TESTS=XSS Vulnerability Tests,SQL Injection Tests
# EXCLUDE_TESTS=Business Logic Tests

# Report Format (uncomment to use)
# JSON_ONLY=true
# HTML_ONLY=false
```

## 🎯 Benefits of Using `.env`

✅ **Convenience** - No need to type long commands
✅ **Reproducibility** - Same config every time
✅ **Security** - Keep cookies out of command history
✅ **Team Collaboration** - Share `.env.example`, not actual cookies
✅ **CI/CD Ready** - Easy to automate
✅ **Multiple Profiles** - Switch between configs easily

---

**Pro Tip:** Keep `.env.example` updated as a template for your team, but never commit actual `.env` files with real credentials!
