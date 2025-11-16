import { BaseTest, TestContext, TestResult } from '../types.js';

export class AuthTests extends BaseTest {
  name = 'Authentication Tests';
  category = 'Authentication';
  description = 'Tests for authentication vulnerabilities including weak passwords, brute force, and session management';

  private commonPasswords = [
    'password', '123456', '12345678', 'admin', 'letmein',
    'welcome', 'monkey', 'qwerty', 'abc123', 'password123'
  ];

  private commonUsernames = [
    'admin', 'administrator', 'root', 'user', 'test',
    'guest', 'demo', 'superuser', 'sysadmin'
  ];

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Weak password acceptance
    results.push(...await this.testWeakPasswords(context));

    // Test 2: Brute force protection
    results.push(...await this.testBruteForceProtection(context));

    // Test 3: Session management
    results.push(...await this.testSessionManagement(context));

    // Test 4: Password reset vulnerabilities
    results.push(...await this.testPasswordReset(context));

    // Test 5: Default credentials
    results.push(...await this.testDefaultCredentials(context));

    return results;
  }

  private async testWeakPasswords(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Look for password input fields
      const passwordInputs = await page.$$('input[type="password"]');

      if (passwordInputs.length === 0) {
        results.push(
          this.createResult(
            'Weak Password Policy',
            this.category,
            'info',
            false,
            'No password fields found to test',
            []
          )
        );
        return results;
      }

      // Check if there's password strength indicator or validation
      const content = await page.content();
      const hasStrengthIndicator = /password.*?strength/i.test(content) ||
                                   /strong.*?password/i.test(content);
      const hasMinLengthReq = /minimum.*?character/i.test(content) ||
                              /at least.*?\d+.*?character/i.test(content);

      if (!hasStrengthIndicator && !hasMinLengthReq) {
        results.push(
          this.createResult(
            'Weak Password Policy',
            this.category,
            'medium',
            true,
            'No visible password strength requirements or validation',
            ['No password strength indicator found', 'No minimum length requirement displayed'],
            'Implement strong password policy: minimum 8 characters, mix of uppercase, lowercase, numbers, and special characters.',
            { hasStrengthIndicator, hasMinLengthReq }
          )
        );
      } else {
        results.push(
          this.createResult(
            'Weak Password Policy',
            this.category,
            'info',
            false,
            'Password strength requirements appear to be present',
            [`Strength indicator: ${hasStrengthIndicator}`, `Length requirement: ${hasMinLengthReq}`]
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Weak Password Policy',
          this.category,
          'info',
          false,
          `Could not test password policy: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testBruteForceProtection(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Find login form
      const usernameInput = await page.$('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[name*="email"]');
      const passwordInput = await page.$('input[type="password"]');
      const submitButton = await page.$('button[type="submit"], input[type="submit"]');

      if (!usernameInput || !passwordInput || !submitButton) {
        results.push(
          this.createResult(
            'Brute Force Protection',
            this.category,
            'info',
            false,
            'No login form found to test',
            []
          )
        );
        return results;
      }

      // Attempt multiple failed logins
      const attempts = 5;
      let blockedOrCaptcha = false;

      for (let i = 0; i < attempts; i++) {
        await usernameInput.fill(`testuser${i}`);
        await passwordInput.fill('wrongpassword');
        await submitButton.click();
        await page.waitForTimeout(500);

        // Check for rate limiting or captcha
        const content = await page.content();
        if (
          /too many attempts/i.test(content) ||
          /rate limit/i.test(content) ||
          /captcha/i.test(content) ||
          /temporarily locked/i.test(content) ||
          /please wait/i.test(content)
        ) {
          blockedOrCaptcha = true;
          break;
        }
      }

      if (!blockedOrCaptcha) {
        results.push(
          this.createResult(
            'Brute Force Protection',
            this.category,
            'high',
            true,
            `No brute force protection detected after ${attempts} failed login attempts`,
            [`Tested ${attempts} consecutive failed logins with no rate limiting`],
            'Implement rate limiting, account lockout after failed attempts, and CAPTCHA for repeated failures.',
            { attempts }
          )
        );
      } else {
        results.push(
          this.createResult(
            'Brute Force Protection',
            this.category,
            'info',
            false,
            'Brute force protection appears to be implemented',
            ['Rate limiting or CAPTCHA detected']
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Brute Force Protection',
          this.category,
          'info',
          false,
          `Could not test brute force protection: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testSessionManagement(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const headers = response?.headers() || {};

      // Get cookies
      const cookies = await page.context().cookies();
      const sessionCookies = cookies.filter(c =>
        c.name.toLowerCase().includes('session') ||
        c.name.toLowerCase().includes('auth') ||
        c.name.toLowerCase().includes('token')
      );

      const issues: string[] = [];

      // Check for HttpOnly flag
      const missingHttpOnly = sessionCookies.filter(c => !c.httpOnly);
      if (missingHttpOnly.length > 0) {
        issues.push(`${missingHttpOnly.length} session cookie(s) missing HttpOnly flag: ${missingHttpOnly.map(c => c.name).join(', ')}`);
      }

      // Check for Secure flag
      const missingSecure = sessionCookies.filter(c => !c.secure && baseUrl.startsWith('https'));
      if (missingSecure.length > 0) {
        issues.push(`${missingSecure.length} session cookie(s) missing Secure flag: ${missingSecure.map(c => c.name).join(', ')}`);
      }

      // Check for SameSite attribute
      const missingSameSite = sessionCookies.filter(c => !c.sameSite || c.sameSite === 'None');
      if (missingSameSite.length > 0) {
        issues.push(`${missingSameSite.length} session cookie(s) missing or weak SameSite: ${missingSameSite.map(c => c.name).join(', ')}`);
      }

      if (issues.length > 0) {
        results.push(
          this.createResult(
            'Insecure Session Management',
            this.category,
            'high',
            true,
            'Session cookies have security configuration issues',
            issues,
            'Set HttpOnly, Secure (for HTTPS), and SameSite=Strict/Lax flags on all session cookies.',
            { cookies: sessionCookies.map(c => ({ name: c.name, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite })) }
          )
        );
      } else if (sessionCookies.length > 0) {
        results.push(
          this.createResult(
            'Insecure Session Management',
            this.category,
            'info',
            false,
            'Session cookies appear to be properly configured',
            [`Found ${sessionCookies.length} session cookie(s) with proper security flags`]
          )
        );
      } else {
        results.push(
          this.createResult(
            'Insecure Session Management',
            this.category,
            'info',
            false,
            'No session cookies found to analyze',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Insecure Session Management',
          this.category,
          'info',
          false,
          `Could not test session management: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testPasswordReset(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Look for password reset links
      const content = await page.content();
      const links = await page.$$('a');

      let foundResetLink = false;
      for (const link of links) {
        const text = await link.textContent();
        const href = await link.getAttribute('href');

        if (
          text && (
            /forgot.*?password/i.test(text) ||
            /reset.*?password/i.test(text)
          ) ||
          href && /reset/i.test(href)
        ) {
          foundResetLink = true;
          break;
        }
      }

      if (foundResetLink) {
        results.push(
          this.createResult(
            'Password Reset Mechanism',
            this.category,
            'info',
            false,
            'Password reset functionality detected - manual testing recommended',
            ['Check for: token predictability, token expiration, account enumeration, lack of rate limiting'],
            'Ensure password reset tokens are cryptographically random, expire quickly, and cannot be used to enumerate accounts.'
          )
        );
      } else {
        results.push(
          this.createResult(
            'Password Reset Mechanism',
            this.category,
            'info',
            false,
            'No password reset functionality found',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Password Reset Mechanism',
          this.category,
          'info',
          false,
          `Could not test password reset: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testDefaultCredentials(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      const usernameInput = await page.$('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"]');
      const passwordInput = await page.$('input[type="password"]');
      const submitButton = await page.$('button[type="submit"], input[type="submit"]');

      if (!usernameInput || !passwordInput || !submitButton) {
        results.push(
          this.createResult(
            'Default Credentials',
            this.category,
            'info',
            false,
            'No login form found to test default credentials',
            []
          )
        );
        return results;
      }

      // Test common default credentials
      const defaultCreds = [
        { username: 'admin', password: 'admin' },
        { username: 'admin', password: 'password' },
        { username: 'administrator', password: 'administrator' },
      ];

      for (const cred of defaultCreds) {
        try {
          await usernameInput.fill(cred.username);
          await passwordInput.fill(cred.password);
          await submitButton.click();
          await page.waitForTimeout(1000);

          const currentUrl = page.url();
          const content = await page.content();

          // Check if login was successful (URL changed or success message)
          if (
            currentUrl !== baseUrl ||
            /dashboard/i.test(currentUrl) ||
            /welcome/i.test(content) ||
            /logout/i.test(content)
          ) {
            results.push(
              this.createResult(
                'Default Credentials',
                this.category,
                'critical',
                true,
                `Default credentials accepted: ${cred.username}/${cred.password}`,
                [`Logged in with username: ${cred.username}`],
                'Change all default credentials immediately. Enforce password changes on first login.',
                { username: cred.username }
              )
            );
            return results;
          }

          // Navigate back for next test
          await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        } catch (error) {
          // Continue testing
        }
      }

      results.push(
        this.createResult(
          'Default Credentials',
          this.category,
          'info',
          false,
          `Common default credentials rejected (tested ${defaultCreds.length} combinations)`,
          []
        )
      );
    } catch (error) {
      results.push(
        this.createResult(
          'Default Credentials',
          this.category,
          'info',
          false,
          `Could not test default credentials: ${error}`,
          []
        )
      );
    }

    return results;
  }
}
