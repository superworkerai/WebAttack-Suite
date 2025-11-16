# 🎯 Usage Examples

Quick reference for common use cases.

## Basic Scans

### Simple Scan

```bash
npm run dev -- scan https://example.com
```

### Scan Without Crawling

```bash
npm run dev -- scan https://example.com --crawl-depth 0
```

### Deep Scan (5 levels)

```bash
npm run dev -- scan https://example.com --crawl-depth 5 --max-pages 100
```

## Authentication

### Single Cookie

```bash
npm run dev -- scan https://app.example.com \
  --cookie "session_token=abc123xyz789"
```

### Multiple Cookies

```bash
npm run dev -- scan https://app.example.com \
  --cookie "session=abc123" \
  --cookie "csrf_token=xyz789" \
  --cookie "user_id=12345"
```

### Cookie with Custom Domain

```bash
npm run dev -- scan https://app.example.com \
  --cookie "session=abc123" \
  --cookie-domain ".example.com"
```

## Authenticated + Deep Crawling

### Test Entire Authenticated Application

```bash
npm run dev -- scan https://app.example.com/dashboard \
  --cookie "session=your_session_token" \
  --crawl-depth 3 \
  --max-pages 50
```

### Comprehensive Authenticated Scan

```bash
npm run dev -- scan https://app.example.com \
  --cookie "auth_token=xyz123" \
  --cookie "user_pref=settings" \
  --crawl-depth 4 \
  --max-pages 75 \
  --timeout 60000 \
  --no-headless
```

## Test Selection

### Specific Tests Only

```bash
npm run dev -- scan https://example.com \
  --include "XSS Vulnerability Tests,SQL Injection Tests"
```

### Exclude Tests

```bash
npm run dev -- scan https://example.com \
  --exclude "Business Logic Tests,SSL/TLS Security Tests"
```

## Report Options

### JSON Only

```bash
npm run dev -- scan https://example.com \
  --json-only \
  -o ./my-reports
```

### HTML Only

```bash
npm run dev -- scan https://example.com \
  --html-only \
  -o ./my-reports
```

### Custom Output Directory

```bash
npm run dev -- scan https://example.com \
  -o ./security-reports/$(date +%Y-%m-%d)
```

## Real-World Scenarios

### Testing a Login-Protected Admin Panel

```bash
# Step 1: Login to your app in browser and get session cookie
# Step 2: Run scan with the cookie

npm run dev -- scan https://example.com/admin \
  --cookie "PHPSESSID=abcd1234efgh5678" \
  --crawl-depth 3 \
  --max-pages 40 \
  --timeout 45000
```

### Testing a SaaS Dashboard

```bash
npm run dev -- scan https://app.myservice.com/dashboard \
  --cookie "jwt_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --cookie "refresh_token=refresh_abc123" \
  --crawl-depth 4 \
  --max-pages 60 \
  -o ./reports/saas-scan
```

### Testing E-commerce Checkout

```bash
npm run dev -- scan https://shop.example.com \
  --cookie "cart_session=xyz789" \
  --cookie "customer_id=12345" \
  --crawl-depth 2 \
  --include "XSS Vulnerability Tests,CSRF Protection Tests,Business Logic Tests"
```

### Testing API Documentation Portal

```bash
npm run dev -- scan https://docs.api.example.com \
  --cookie "api_key_session=secret123" \
  --crawl-depth 5 \
  --max-pages 100 \
  --timeout 60000
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Scan

on:
  push:
    branches: [staging]

jobs:
  security-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Run security scan
        env:
          SESSION_COOKIE: ${{ secrets.TEST_SESSION_COOKIE }}
        run: |
          npm run dev -- scan https://staging.example.com \
            --cookie "session=$SESSION_COOKIE" \
            --crawl-depth 2 \
            --max-pages 30 \
            --json-only \
            -o ./reports

      - name: Upload reports
        uses: actions/upload-artifact@v2
        with:
          name: security-reports
          path: ./reports
```

### GitLab CI Example

```yaml
security_scan:
  stage: test
  image: node:18
  script:
    - npm install
    - npm run build
    - |
      npm run dev -- scan https://staging.example.com \
        --cookie "session=$TEST_SESSION_COOKIE" \
        --crawl-depth 2 \
        --max-pages 25 \
        --json-only
  artifacts:
    paths:
      - reports/
    expire_in: 1 week
  only:
    - staging
    - main
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any

    environment {
        SESSION_COOKIE = credentials('test-session-cookie')
    }

    stages {
        stage('Setup') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }

        stage('Security Scan') {
            steps {
                sh """
                    npm run dev -- scan https://staging.example.com \
                      --cookie "session=${SESSION_COOKIE}" \
                      --crawl-depth 2 \
                      --max-pages 30 \
                      --json-only \
                      -o ./reports
                """
            }
        }

        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'reports/*.json', fingerprint: true
            }
        }
    }
}
```

## Debugging

### Visible Browser Mode

```bash
npm run dev -- scan https://example.com \
  --no-headless \
  --timeout 120000
```

### Verbose Output with Limited Crawl

```bash
npm run dev -- scan https://example.com \
  --crawl-depth 1 \
  --max-pages 5 \
  --no-headless
```

## Performance Tuning

### Fast Scan (Shallow)

```bash
npm run dev -- scan https://example.com \
  --crawl-depth 1 \
  --max-pages 10 \
  --timeout 15000
```

### Thorough Scan (Deep)

```bash
npm run dev -- scan https://example.com \
  --crawl-depth 5 \
  --max-pages 150 \
  --timeout 90000
```

### Balanced Scan (Recommended)

```bash
npm run dev -- scan https://example.com \
  --crawl-depth 3 \
  --max-pages 50 \
  --timeout 30000
```

## List Available Tests

```bash
npm run dev -- list-tests
```

Output:
```
📋 Available Test Modules:

1. XSS Vulnerability Tests
   Category: Injection
   Description: Tests for Cross-Site Scripting vulnerabilities...

2. SQL Injection Tests
   Category: Injection
   Description: Tests for SQL injection vulnerabilities...

...
```

## Tips

**Getting Session Cookies:**
1. Login to your app in Chrome/Firefox
2. Press F12 (DevTools)
3. Go to Application → Cookies
4. Copy the session cookie value
5. Use with `--cookie "name=value"`

**Crawl Depth Guidelines:**
- Depth 1: ~10-20 pages (2-5 min)
- Depth 2: ~20-40 pages (5-10 min)
- Depth 3: ~40-80 pages (10-20 min)
- Depth 4+: Use with `--max-pages` limit

**Performance:**
- Use `--headless` for faster scans
- Increase `--timeout` for slow sites
- Use `--max-pages` to limit scope
- Run on staging, not production

---

For more details, see:
- README.md - Full documentation
- AUTHENTICATION_CRAWLING.md - Auth & crawling guide
- QUICKSTART.md - Quick start guide
- TEST_CATALOG.md - Complete test list
