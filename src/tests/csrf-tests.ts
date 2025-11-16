import { BaseTest, TestContext, TestResult } from '../types.js';

export class CSRFTests extends BaseTest {
  name = 'CSRF Protection Tests';
  category = 'Broken Access Control';
  description = 'Tests for Cross-Site Request Forgery vulnerabilities';

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: CSRF tokens in forms
    results.push(...await this.testFormCSRFTokens(context));

    // Test 2: SameSite cookie attribute
    results.push(...await this.testSameSiteCookies(context));

    // Test 3: State-changing GET requests
    results.push(...await this.testStateChangingGET(context));

    return results;
  }

  private async testFormCSRFTokens(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Find all forms
      const forms = await page.$$('form');

      if (forms.length === 0) {
        results.push(
          this.createResult(
            'CSRF Token Protection',
            this.category,
            'info',
            false,
            'No forms found to test',
            []
          )
        );
        return results;
      }

      // Check each form for CSRF tokens
      const formsWithoutToken = [];
      const commonCSRFNames = ['csrf', 'csrf_token', '_csrf', 'token', 'authenticity_token', '_token'];

      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        const method = (await form.getAttribute('method') || 'get').toLowerCase();

        // Only check POST forms (GET shouldn't change state)
        if (method !== 'post') continue;

        // Look for CSRF token fields
        let hasCSRFToken = false;

        for (const tokenName of commonCSRFNames) {
          const tokenInput = await form.$(`input[name*="${tokenName}"]`);
          if (tokenInput) {
            const value = await tokenInput.getAttribute('value');
            if (value && value.length > 10) {
              hasCSRFToken = true;
              break;
            }
          }
        }

        if (!hasCSRFToken) {
          formsWithoutToken.push(i);
        }
      }

      if (formsWithoutToken.length > 0) {
        results.push(
          this.createResult(
            'CSRF Token Protection',
            this.category,
            'high',
            true,
            `${formsWithoutToken.length} POST form(s) missing CSRF tokens`,
            [`Forms without CSRF protection: ${formsWithoutToken.join(', ')}`],
            'Implement CSRF tokens in all state-changing forms. Use synchronizer token pattern or double-submit cookie pattern.',
            { formsWithoutToken, totalForms: forms.length }
          )
        );
      } else {
        results.push(
          this.createResult(
            'CSRF Token Protection',
            this.category,
            'info',
            false,
            `CSRF tokens appear to be present in ${forms.length} form(s)`,
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'CSRF Token Protection',
          this.category,
          'info',
          false,
          `Could not test CSRF tokens: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testSameSiteCookies(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      const cookies = await page.context().cookies();
      const sessionCookies = cookies.filter(c =>
        c.name.toLowerCase().includes('session') ||
        c.name.toLowerCase().includes('auth') ||
        c.name.toLowerCase().includes('token')
      );

      if (sessionCookies.length === 0) {
        results.push(
          this.createResult(
            'SameSite Cookie Attribute',
            this.category,
            'info',
            false,
            'No session cookies found to analyze',
            []
          )
        );
        return results;
      }

      const cookiesWithoutSameSite = sessionCookies.filter(c => !c.sameSite || c.sameSite === 'None');

      if (cookiesWithoutSameSite.length > 0) {
        results.push(
          this.createResult(
            'SameSite Cookie Attribute',
            this.category,
            'medium',
            true,
            'Session cookies missing SameSite attribute',
            cookiesWithoutSameSite.map(c => `${c.name}: SameSite=${c.sameSite || 'not set'}`),
            'Set SameSite=Lax or SameSite=Strict on all session cookies to prevent CSRF attacks.',
            { cookiesWithoutSameSite: cookiesWithoutSameSite.map(c => c.name) }
          )
        );
      } else {
        results.push(
          this.createResult(
            'SameSite Cookie Attribute',
            this.category,
            'info',
            false,
            'Session cookies have SameSite attribute configured',
            sessionCookies.map(c => `${c.name}: SameSite=${c.sameSite}`)
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'SameSite Cookie Attribute',
          this.category,
          'info',
          false,
          `Could not test SameSite cookies: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testStateChangingGET(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Look for suspicious links that might change state
      const links = await page.$$('a');
      const suspiciousLinks: string[] = [];

      for (const link of links.slice(0, 50)) {
        const href = await link.getAttribute('href');
        const text = (await link.textContent() || '').toLowerCase();

        if (href && (
          /delete/i.test(href) ||
          /remove/i.test(href) ||
          /logout/i.test(href) ||
          /update/i.test(href) ||
          /edit/i.test(href) ||
          /action=/i.test(href)
        )) {
          suspiciousLinks.push(href);
        }
      }

      if (suspiciousLinks.length > 0) {
        results.push(
          this.createResult(
            'State-Changing GET Requests',
            this.category,
            'medium',
            true,
            'Potential state-changing actions via GET requests',
            suspiciousLinks.slice(0, 5).map(href => `Link: ${href}`),
            'Use POST requests for all state-changing operations. GET requests should be read-only.',
            { suspiciousLinks: suspiciousLinks.slice(0, 10) }
          )
        );
      } else {
        results.push(
          this.createResult(
            'State-Changing GET Requests',
            this.category,
            'info',
            false,
            'No obvious state-changing GET requests detected',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'State-Changing GET Requests',
          this.category,
          'info',
          false,
          `Could not test state-changing GET: ${error}`,
          []
        )
      );
    }

    return results;
  }
}
