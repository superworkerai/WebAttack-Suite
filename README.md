# 🔒 WebAttack Security Testing Suite

A comprehensive, modular security testing framework built with Playwright for automated web application penetration testing. This tool simulates various attack vectors that a hacker might use to compromise a website.

## ⚠️ LEGAL DISCLAIMER

**This tool is for authorized security testing ONLY.**

- Only use on applications you own or have explicit written permission to test
- Unauthorized testing is illegal and may violate computer fraud and abuse laws
- The authors are not responsible for misuse of this tool
- Always obtain proper authorization before conducting security assessments

## 🚀 New Features

### 🔐 Cookie-Based Authentication
Test authenticated areas of your application by providing session cookies:
```bash
npm run dev -- scan https://app.example.com/dashboard \
  --cookie "session=abc123xyz" \
  --cookie "csrf_token=xyz789"
```

### 🕷️ Deep Web Crawling
Automatically discover and test inputs across your entire application (up to 3 levels deep by default):
```bash
npm run dev -- scan https://example.com \
  --crawl-depth 3 \
  --max-pages 50
```

The crawler automatically:
- Follows links recursively
- Discovers all input fields and forms
- Tests each discovered input for vulnerabilities
- Maps your entire application's attack surface

### 🎯 Combined Power
```bash
# Test an authenticated application comprehensively
npm run dev -- scan https://app.example.com \
  --cookie "session=your_token" \
  --crawl-depth 3 \
  --max-pages 50
```

**Result:** Instead of testing just one page, the tool now:
1. Sets your authentication cookies
2. Crawls your entire application (up to 50 pages, 3 levels deep)
3. Tests **every discovered input field** for XSS, SQLi, and other vulnerabilities
4. Reports findings with the exact URL and field that's vulnerable

📖 **See [AUTHENTICATION_CRAWLING.md](AUTHENTICATION_CRAWLING.md) for the complete guide**
📋 **See [EXAMPLES.md](EXAMPLES.md) for common usage patterns**

## 🎯 Features

### Comprehensive Test Coverage

- **Injection Attacks**
  - Cross-Site Scripting (XSS) - Reflected, Stored, DOM-based
  - SQL Injection - Error-based, Time-based blind
  - Command Injection
  - Path Traversal
  - XXE (XML External Entity)
  - LDAP Injection
  - CRLF Injection

- **Authentication & Authorization**
  - Weak password policy testing
  - Brute force protection testing
  - Session management security
  - Default credentials testing
  - Password reset vulnerabilities
  - CSRF protection

- **Security Configuration**
  - Security headers analysis (CSP, HSTS, X-Frame-Options, etc.)
  - SSL/TLS configuration
  - Mixed content detection
  - Information disclosure
  - Sensitive file exposure
  - Directory listing

- **Business Logic**
  - Rate limiting tests
  - Input boundary validation
  - Price manipulation detection
  - Negative value handling

### Key Capabilities

- **Modular Architecture** - Easy to add/remove test modules
- **Beautiful Reports** - Interactive HTML reports with filtering
- **JSON Export** - Machine-readable results for CI/CD integration
- **Configurable** - Fine-tune timeouts, headless mode, test selection
- **Detailed Evidence** - Captures proof of vulnerabilities
- **Actionable Recommendations** - Provides remediation guidance

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd webattack-suite

# Install dependencies
npm install

# Build the project
npm run build
```

## 🚀 Usage

### Basic Scan

```bash
# Scan a website
npm run dev -- scan https://example.com

# Or after building
node dist/index.js scan https://example.com
```

### Advanced Options

```bash
# Run in visible browser mode (not headless)
node dist/index.js scan https://example.com --no-headless

# Specify custom output directory
node dist/index.js scan https://example.com -o ./my-reports

# Set custom timeout (in milliseconds)
node dist/index.js scan https://example.com -t 60000

# Include only specific tests
node dist/index.js scan https://example.com --include "XSS Vulnerability Tests,SQL Injection Tests"

# Exclude specific tests
node dist/index.js scan https://example.com --exclude "Business Logic Tests"

# Generate only JSON report
node dist/index.js scan https://example.com --json-only

# Generate only HTML report
node dist/index.js scan https://example.com --html-only
```

### List Available Tests

```bash
node dist/index.js list-tests
```

## 📊 Reports

The tool generates two types of reports:

### 1. JSON Report

Machine-readable format perfect for:
- CI/CD integration
- Automated processing
- Historical tracking
- Custom analysis

Example output: `reports/security-scan-2024-01-15T10-30-45-123Z.json`

### 2. HTML Report

Interactive web-based report featuring:
- Executive summary with vulnerability counts
- Filterable results by severity
- Detailed evidence for each finding
- Remediation recommendations
- Color-coded severity indicators

Example output: `reports/security-scan-2024-01-15T10-30-45-123Z.html`

## 🏗️ Architecture

```
src/
├── index.ts                          # CLI entry point
├── types.ts                          # TypeScript interfaces
├── test-runner.ts                    # Test orchestration
├── report-generator.ts               # Report generation
└── tests/                            # Test modules
    ├── xss-tests.ts                  # XSS testing
    ├── sqli-tests.ts                 # SQL injection
    ├── auth-tests.ts                 # Authentication
    ├── security-headers-tests.ts     # HTTP headers
    ├── csrf-tests.ts                 # CSRF protection
    ├── input-validation-tests.ts     # Input validation
    ├── information-disclosure-tests.ts
    ├── business-logic-tests.ts
    └── ssl-tls-tests.ts              # SSL/TLS config
```

## 🔧 Adding Custom Tests

The modular architecture makes it easy to add custom tests:

```typescript
// src/tests/my-custom-test.ts
import { BaseTest, TestContext, TestResult } from '../types.js';

export class MyCustomTest extends BaseTest {
  name = 'My Custom Security Test';
  category = 'Custom';
  description = 'Tests for custom vulnerabilities';

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    // Your test logic here
    await page.goto(baseUrl);

    results.push(
      this.createResult(
        'Test Name',
        this.category,
        'high',           // severity: critical, high, medium, low, info
        true,             // vulnerable: true/false
        'Description of the finding',
        ['Evidence 1', 'Evidence 2'],
        'Recommendation for fixing'
      )
    );

    return results;
  }
}
```

Then register it in `src/index.ts`:

```typescript
import { MyCustomTest } from './tests/my-custom-test.js';

runner.registerTests([
  // ... existing tests
  new MyCustomTest(),
]);
```

## 🎨 Test Categories

| Category | Description |
|----------|-------------|
| Injection | SQL, XSS, Command Injection, Path Traversal |
| Authentication | Login security, session management |
| Broken Access Control | CSRF, authorization issues |
| Security Misconfiguration | Headers, information disclosure |
| Cryptographic Failures | SSL/TLS issues |
| Business Logic | Rate limiting, input validation |

## 📈 Severity Levels

- **Critical** - Immediate risk, exploitable remotely, data breach potential
- **High** - Significant risk, requires attention
- **Medium** - Moderate risk, should be fixed
- **Low** - Minor risk, best practice improvement
- **Info** - Informational finding, no direct security impact

## 🔍 What Gets Tested

### Injection Tests
- 20+ XSS payloads (script tags, event handlers, encoded variants)
- 25+ SQL injection patterns (error-based, blind, time-based)
- 10+ command injection payloads
- 7+ path traversal techniques
- XXE and LDAP injection detection

### Authentication Tests
- Password strength requirements
- Brute force protection (rate limiting)
- Session cookie security (HttpOnly, Secure, SameSite)
- Default credential testing
- Password reset mechanism analysis

### Configuration Tests
- 8 security headers (CSP, HSTS, X-Frame-Options, etc.)
- 20+ sensitive file exposure checks
- Directory listing vulnerabilities
- Error message disclosure
- Source code leakage

### Business Logic Tests
- Rate limiting (20 rapid requests)
- Boundary value testing
- Price manipulation detection
- Negative value handling

## 🛠️ Configuration Options

```typescript
interface TestConfig {
  targetUrl: string;           // Target URL to scan
  maxConcurrency?: number;     // Concurrent test execution (default: 5)
  timeout?: number;            // Test timeout in ms (default: 30000)
  headless?: boolean;          // Headless browser mode (default: true)
  userAgent?: string;          // Custom user agent
  customHeaders?: Record<string, string>;  // Custom HTTP headers
  excludeTests?: string[];     // Tests to exclude
  includeTests?: string[];     // Tests to include
  outputDir?: string;          // Report output directory
}
```

## 📝 Example Output

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         🔒 WebAttack Security Testing Suite 🔒            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

⚠️  WARNING: Only use on applications you have permission to test!

[*] Starting security scan on https://example.com
[*] Registered 9 test modules

[+] Running: XSS Vulnerability Tests (Injection)
  ⚠️  Found 1 vulnerability(ies)
[+] Running: SQL Injection Tests (Injection)
  ✓ No vulnerabilities detected
[+] Running: Authentication Tests (Authentication)
  ⚠️  Found 2 vulnerability(ies)

...

[*] Scan completed in 45.32s
[*] Vulnerabilities found: 5
    Critical: 1, High: 2, Medium: 2, Low: 0

[+] JSON report saved to: ./reports/security-scan-2024-01-15T10-30-45.json
[+] HTML report saved to: ./reports/security-scan-2024-01-15T10-30-45.html

═══════════════════════════════════════════════════════════
                    SCAN SUMMARY
═══════════════════════════════════════════════════════════
Target:      https://example.com
Total Tests: 45
Passed:      40
Failed:      5
───────────────────────────────────────────────────────────
Critical:    1
High:        2
Medium:      2
Low:         0
═══════════════════════════════════════════════════════════
```

## 🤝 Contributing

Contributions are welcome! To add a new test module:

1. Create a new file in `src/tests/`
2. Extend the `BaseTest` class
3. Implement the `run()` method
4. Register the test in `src/index.ts`
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with [Playwright](https://playwright.dev/)
- Inspired by OWASP Top 10 and common penetration testing methodologies
- Test payloads derived from industry-standard security testing tools

## 🔗 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Web Security Academy](https://portswigger.net/web-security)

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Review existing test modules for examples
- Check the documentation in the code

---

**Remember: Use responsibly and only on authorized targets!**
