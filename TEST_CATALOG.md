# 📋 Complete Test Catalog

This document lists all security tests included in the WebAttack Suite.

## Test Modules Overview

| # | Module | Category | Tests | Severity Range |
|---|--------|----------|-------|----------------|
| 1 | XSS Tests | Injection | 4 | High - Info |
| 2 | SQL Injection | Injection | 3 | Critical - Info |
| 3 | Authentication | Authentication | 5 | Critical - Info |
| 4 | Security Headers | Security Misconfiguration | 8 | High - Info |
| 5 | CSRF Protection | Broken Access Control | 3 | High - Info |
| 6 | Input Validation | Injection | 6 | Critical - Info |
| 7 | Information Disclosure | Security Misconfiguration | 5 | High - Info |
| 8 | Business Logic | Business Logic | 4 | Medium - Info |
| 9 | SSL/TLS Security | Cryptographic Failures | 3 | Critical - Info |

---

## 1. XSS Vulnerability Tests

**Category:** Injection
**Total Tests:** 4

### 1.1 Reflected XSS
- **Severity:** High
- **Payloads:** 20+ variations
- **Tests:**
  - Script tag injection
  - Event handler injection
  - SVG-based XSS
  - Encoded payload variants
  - Template injection patterns

### 1.2 DOM-Based XSS Risk
- **Severity:** Medium
- **Checks:**
  - Dangerous innerHTML usage
  - document.write() calls
  - eval() usage
  - Unsafe location manipulation
  - setTimeout/setInterval with user input

### 1.3 Form XSS
- **Severity:** High
- **Tests:**
  - Input field XSS injection
  - Textarea XSS
  - Search field exploitation
  - Dialog/alert triggering

### 1.4 XSS Protection Header
- **Severity:** Low
- **Validates:** X-XSS-Protection header presence and configuration

---

## 2. SQL Injection Tests

**Category:** Injection
**Total Tests:** 3

### 2.1 Error-Based SQL Injection
- **Severity:** Critical
- **Payloads:** 25+ SQL injection patterns
- **Targets:**
  - URL parameters (id, user, search, etc.)
  - Common SQL error patterns
  - MySQL, PostgreSQL, SQL Server, SQLite detection

### 2.2 Time-Based Blind SQL Injection
- **Severity:** Critical
- **Techniques:**
  - SLEEP() injection (MySQL)
  - WAITFOR DELAY (SQL Server)
  - Response time analysis
  - Timeout detection

### 2.3 Form SQL Injection
- **Severity:** Critical
- **Tests:**
  - Login form SQL injection
  - Search form injection
  - Error message disclosure

---

## 3. Authentication Tests

**Category:** Authentication
**Total Tests:** 5

### 3.1 Weak Password Policy
- **Severity:** Medium
- **Checks:**
  - Password strength indicators
  - Minimum length requirements
  - Complexity requirements

### 3.2 Brute Force Protection
- **Severity:** High
- **Tests:**
  - Rate limiting presence
  - Account lockout
  - CAPTCHA implementation
  - Failed login tracking

### 3.3 Session Management
- **Severity:** High
- **Validates:**
  - HttpOnly flag
  - Secure flag (HTTPS)
  - SameSite attribute
  - Session cookie configuration

### 3.4 Password Reset Mechanism
- **Severity:** Info
- **Identifies:**
  - Password reset functionality
  - Potential token issues
  - Account enumeration risks

### 3.5 Default Credentials
- **Severity:** Critical
- **Tests:**
  - admin/admin
  - admin/password
  - administrator/administrator
  - Common default credentials

---

## 4. Security Headers Tests

**Category:** Security Misconfiguration
**Total Tests:** 8

### 4.1 Content-Security-Policy
- **Severity:** High
- **Checks:**
  - CSP header presence
  - unsafe-inline usage
  - unsafe-eval usage
  - Wildcard sources

### 4.2 X-Frame-Options
- **Severity:** Medium
- **Validates:** Clickjacking protection (DENY/SAMEORIGIN)

### 4.3 Strict-Transport-Security
- **Severity:** Medium
- **Checks:**
  - HSTS header presence
  - max-age value
  - includeSubDomains directive
  - preload directive

### 4.4 X-Content-Type-Options
- **Severity:** Low
- **Validates:** nosniff directive

### 4.5 Referrer-Policy
- **Severity:** Low
- **Checks:** Referrer leakage protection

### 4.6 Permissions-Policy
- **Severity:** Low
- **Validates:** Feature policy configuration

### 4.7 X-XSS-Protection
- **Severity:** Low
- **Checks:** XSS filter configuration

### 4.8 Information Disclosure in Headers
- **Severity:** Low
- **Detects:**
  - Server version disclosure
  - X-Powered-By header
  - Framework version leakage

---

## 5. CSRF Protection Tests

**Category:** Broken Access Control
**Total Tests:** 3

### 5.1 CSRF Token Protection
- **Severity:** High
- **Validates:**
  - Token presence in POST forms
  - Token length and randomness
  - Common token field names

### 5.2 SameSite Cookie Attribute
- **Severity:** Medium
- **Checks:** SameSite attribute on session cookies

### 5.3 State-Changing GET Requests
- **Severity:** Medium
- **Detects:**
  - Delete operations via GET
  - Update operations via GET
  - Logout via GET

---

## 6. Input Validation Tests

**Category:** Injection
**Total Tests:** 6

### 6.1 Path Traversal
- **Severity:** Critical
- **Payloads:**
  - ../../../etc/passwd
  - Windows path traversal
  - Encoded traversal sequences
  - Absolute paths

### 6.2 Command Injection
- **Severity:** Critical
- **Tests:**
  - Shell metacharacters
  - Command chaining
  - Backtick execution
  - Time-based detection

### 6.3 XXE (XML External Entity)
- **Severity:** Medium
- **Detects:** XML processing endpoints

### 6.4 LDAP Injection
- **Severity:** Medium
- **Identifies:** LDAP functionality and risks

### 6.5 CRLF Injection
- **Severity:** High
- **Tests:**
  - Header injection
  - Response splitting
  - Cookie injection

### 6.6 File Upload Validation
- **Severity:** Medium
- **Checks:**
  - Accept attribute presence
  - Client-side restrictions
  - File type validation hints

---

## 7. Information Disclosure Tests

**Category:** Security Misconfiguration
**Total Tests:** 5

### 7.1 Sensitive File Exposure
- **Severity:** Critical - High
- **Scans for 20+ files:**
  - .env, .git/config
  - config.php, web.config
  - Database backups
  - Debug logs
  - Source maps

### 7.2 Directory Listing
- **Severity:** Medium
- **Checks:**
  - /uploads/, /images/
  - /backup/, /admin/
  - Directory index exposure

### 7.3 Error Message Disclosure
- **Severity:** Medium
- **Detects:**
  - Stack traces
  - Debug information
  - Database errors
  - Framework errors

### 7.4 Sensitive Information in Comments
- **Severity:** Low
- **Scans for:**
  - Passwords in comments
  - TODO/FIXME notes
  - API keys
  - Database credentials

### 7.5 Source Code Disclosure
- **Severity:** High
- **Checks:**
  - Backup files (.bak, .old)
  - Source maps (.map)
  - Development files

---

## 8. Business Logic Tests

**Category:** Business Logic
**Total Tests:** 4

### 8.1 Rate Limiting
- **Severity:** Medium
- **Tests:** 20 rapid requests to detect throttling

### 8.2 Input Boundary Validation
- **Severity:** Low
- **Tests:**
  - Zero values
  - Negative numbers
  - Maximum integers
  - Overflow values

### 8.3 Price Manipulation
- **Severity:** High
- **Detects:**
  - Client-side modifiable price fields
  - Hidden vs. visible price fields
  - Form tampering risks

### 8.4 Negative Value Validation
- **Severity:** Low
- **Checks:**
  - Negative quantities
  - Min attribute presence
  - Client-side validation

---

## 9. SSL/TLS Security Tests

**Category:** Cryptographic Failures
**Total Tests:** 3

### 9.1 HTTPS Enforcement
- **Severity:** High
- **Validates:**
  - HTTPS usage
  - HTTP to HTTPS redirect
  - Protocol security

### 9.2 Mixed Content
- **Severity:** High - Medium
- **Detects:**
  - HTTP scripts on HTTPS
  - HTTP stylesheets
  - HTTP images
  - HTTP iframes

### 9.3 SSL Certificate Validation
- **Severity:** Critical
- **Checks:**
  - Certificate validity
  - Certificate errors
  - Trust chain

---

## Payload Statistics

| Attack Type | Number of Payloads |
|-------------|-------------------|
| XSS | 20+ |
| SQL Injection | 25+ |
| Command Injection | 10+ |
| Path Traversal | 7+ |
| Default Credentials | 9 combinations |
| Total Unique Payloads | **70+** |

## Test Execution Flow

```
1. Browser Launch (Playwright Chromium)
2. Navigate to Target URL
3. Execute Test Modules:
   ├─ Injection Tests
   ├─ Authentication Tests
   ├─ Configuration Tests
   └─ Business Logic Tests
4. Collect Results
5. Generate Reports (JSON + HTML)
6. Exit with Status Code
```

## Coverage by OWASP Top 10 (2021)

| OWASP Category | Tests Covering This |
|----------------|---------------------|
| A01 - Broken Access Control | CSRF, Authorization |
| A02 - Cryptographic Failures | SSL/TLS, Session Cookies |
| A03 - Injection | XSS, SQLi, Command Injection, Path Traversal |
| A04 - Insecure Design | Business Logic Tests |
| A05 - Security Misconfiguration | Security Headers, Information Disclosure |
| A06 - Vulnerable Components | Header Analysis (version disclosure) |
| A07 - Authentication Failures | Authentication Tests |
| A08 - Software and Data Integrity | File Upload, Input Validation |
| A09 - Logging & Monitoring | Error Disclosure Detection |
| A10 - SSRF | (Not yet implemented) |

## Customization

All tests are modular and can be:
- ✅ Enabled/disabled individually
- ✅ Modified to add more payloads
- ✅ Extended with custom logic
- ✅ Combined for comprehensive testing

## Future Test Ideas

Potential additions for future versions:
- API security testing
- GraphQL injection
- SSRF (Server-Side Request Forgery)
- Deserialization attacks
- Web socket security
- CORS misconfiguration
- JWT token security
- OAuth flow testing
- NoSQL injection
- LDAP injection (expanded)
- XML bomb attacks
- Prototype pollution
- Cache poisoning

---

**Last Updated:** 2024
**Total Test Modules:** 9
**Total Individual Tests:** 41
**Total Attack Payloads:** 70+
