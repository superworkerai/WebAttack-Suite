import { BaseTest, TestContext, TestResult } from '../types.js';

export class SecurityHeadersTests extends BaseTest {
  name = 'Security Headers Tests';
  category = 'Security Misconfiguration';
  description = 'Tests for missing or misconfigured security headers';

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const headers = response?.headers() || {};

      // Test Content-Security-Policy
      results.push(this.testCSP(headers));

      // Test X-Frame-Options
      results.push(this.testXFrameOptions(headers));

      // Test Strict-Transport-Security
      results.push(this.testHSTS(headers, baseUrl));

      // Test X-Content-Type-Options
      results.push(this.testXContentTypeOptions(headers));

      // Test Referrer-Policy
      results.push(this.testReferrerPolicy(headers));

      // Test Permissions-Policy
      results.push(this.testPermissionsPolicy(headers));

      // Test X-XSS-Protection
      results.push(this.testXXSSProtection(headers));

      // Test for sensitive information in headers
      results.push(this.testSensitiveHeaders(headers));

    } catch (error) {
      results.push(
        this.createResult(
          'Security Headers',
          this.category,
          'info',
          false,
          `Could not analyze security headers: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private testCSP(headers: Record<string, string>): TestResult {
    const csp = headers['content-security-policy'];

    if (!csp) {
      return this.createResult(
        'Content-Security-Policy',
        this.category,
        'high',
        true,
        'Content-Security-Policy header is missing',
        ['CSP helps prevent XSS and data injection attacks'],
        "Implement a strong CSP header, e.g., \"default-src 'self'; script-src 'self'; object-src 'none'\"",
        { csp: null }
      );
    }

    // Check for unsafe directives
    const unsafePatterns = [
      { pattern: /'unsafe-inline'/, issue: 'unsafe-inline allows inline scripts' },
      { pattern: /'unsafe-eval'/, issue: 'unsafe-eval allows eval()' },
      { pattern: /\*/, issue: 'wildcard (*) allows any source' },
    ];

    const issues: string[] = [];
    unsafePatterns.forEach(({ pattern, issue }) => {
      if (pattern.test(csp)) {
        issues.push(issue);
      }
    });

    if (issues.length > 0) {
      return this.createResult(
        'Content-Security-Policy',
        this.category,
        'medium',
        true,
        'CSP header contains unsafe directives',
        issues,
        'Strengthen CSP by removing unsafe-inline, unsafe-eval, and wildcards. Use nonces or hashes for inline scripts.',
        { csp, issues }
      );
    }

    return this.createResult(
      'Content-Security-Policy',
      this.category,
      'info',
      false,
      'Content-Security-Policy header is present',
      [`CSP: ${csp.substring(0, 100)}...`],
      undefined,
      { csp }
    );
  }

  private testXFrameOptions(headers: Record<string, string>): TestResult {
    const xFrameOptions = headers['x-frame-options'];

    if (!xFrameOptions) {
      return this.createResult(
        'X-Frame-Options',
        this.category,
        'medium',
        true,
        'X-Frame-Options header is missing',
        ['Missing X-Frame-Options makes the site vulnerable to clickjacking'],
        "Add X-Frame-Options: DENY or X-Frame-Options: SAMEORIGIN header",
        { xFrameOptions: null }
      );
    }

    const value = xFrameOptions.toUpperCase();
    if (value !== 'DENY' && value !== 'SAMEORIGIN') {
      return this.createResult(
        'X-Frame-Options',
        this.category,
        'medium',
        true,
        'X-Frame-Options header has weak value',
        [`Value: ${xFrameOptions}`],
        'Use X-Frame-Options: DENY or SAMEORIGIN',
        { xFrameOptions }
      );
    }

    return this.createResult(
      'X-Frame-Options',
      this.category,
      'info',
      false,
      'X-Frame-Options header is properly configured',
      [`Value: ${xFrameOptions}`],
      undefined,
      { xFrameOptions }
    );
  }

  private testHSTS(headers: Record<string, string>, baseUrl: string): TestResult {
    const hsts = headers['strict-transport-security'];

    if (!baseUrl.startsWith('https://')) {
      return this.createResult(
        'Strict-Transport-Security',
        this.category,
        'info',
        false,
        'HSTS not applicable - site not using HTTPS',
        ['Site should be served over HTTPS'],
        'Implement HTTPS for all traffic'
      );
    }

    if (!hsts) {
      return this.createResult(
        'Strict-Transport-Security',
        this.category,
        'medium',
        true,
        'HSTS header is missing',
        ['HSTS prevents protocol downgrade attacks and cookie hijacking'],
        'Add Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
        { hsts: null }
      );
    }

    // Check max-age
    const maxAgeMatch = hsts.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;
    const issues: string[] = [];

    if (maxAge < 31536000) {
      issues.push(`max-age is too short: ${maxAge} seconds (should be at least 31536000 - 1 year)`);
    }

    if (!hsts.includes('includeSubDomains')) {
      issues.push('Missing includeSubDomains directive');
    }

    if (issues.length > 0) {
      return this.createResult(
        'Strict-Transport-Security',
        this.category,
        'low',
        true,
        'HSTS header is weak',
        issues,
        'Use Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
        { hsts, maxAge }
      );
    }

    return this.createResult(
      'Strict-Transport-Security',
      this.category,
      'info',
      false,
      'HSTS header is properly configured',
      [`Value: ${hsts}`],
      undefined,
      { hsts }
    );
  }

  private testXContentTypeOptions(headers: Record<string, string>): TestResult {
    const xContentTypeOptions = headers['x-content-type-options'];

    if (!xContentTypeOptions || xContentTypeOptions.toLowerCase() !== 'nosniff') {
      return this.createResult(
        'X-Content-Type-Options',
        this.category,
        'low',
        true,
        'X-Content-Type-Options header is missing or incorrect',
        ['Missing X-Content-Type-Options allows MIME-type sniffing attacks'],
        'Add X-Content-Type-Options: nosniff header',
        { xContentTypeOptions }
      );
    }

    return this.createResult(
      'X-Content-Type-Options',
      this.category,
      'info',
      false,
      'X-Content-Type-Options header is properly configured',
      [`Value: ${xContentTypeOptions}`],
      undefined,
      { xContentTypeOptions }
    );
  }

  private testReferrerPolicy(headers: Record<string, string>): TestResult {
    const referrerPolicy = headers['referrer-policy'];

    if (!referrerPolicy) {
      return this.createResult(
        'Referrer-Policy',
        this.category,
        'low',
        true,
        'Referrer-Policy header is missing',
        ['Missing Referrer-Policy may leak sensitive information in URLs'],
        'Add Referrer-Policy: no-referrer or strict-origin-when-cross-origin',
        { referrerPolicy: null }
      );
    }

    const weakPolicies = ['unsafe-url', 'no-referrer-when-downgrade'];
    if (weakPolicies.includes(referrerPolicy.toLowerCase())) {
      return this.createResult(
        'Referrer-Policy',
        this.category,
        'low',
        true,
        'Referrer-Policy is weak',
        [`Value: ${referrerPolicy}`],
        'Use stricter policy like no-referrer or strict-origin-when-cross-origin',
        { referrerPolicy }
      );
    }

    return this.createResult(
      'Referrer-Policy',
      this.category,
      'info',
      false,
      'Referrer-Policy header is configured',
      [`Value: ${referrerPolicy}`],
      undefined,
      { referrerPolicy }
    );
  }

  private testPermissionsPolicy(headers: Record<string, string>): TestResult {
    const permissionsPolicy = headers['permissions-policy'] || headers['feature-policy'];

    if (!permissionsPolicy) {
      return this.createResult(
        'Permissions-Policy',
        this.category,
        'low',
        true,
        'Permissions-Policy header is missing',
        ['Permissions-Policy controls browser features and APIs'],
        'Add Permissions-Policy header to restrict dangerous features, e.g., "geolocation=(), microphone=(), camera=()"',
        { permissionsPolicy: null }
      );
    }

    return this.createResult(
      'Permissions-Policy',
      this.category,
      'info',
      false,
      'Permissions-Policy header is present',
      [`Value: ${permissionsPolicy.substring(0, 100)}...`],
      undefined,
      { permissionsPolicy }
    );
  }

  private testXXSSProtection(headers: Record<string, string>): TestResult {
    const xssProtection = headers['x-xss-protection'];

    // Note: This header is deprecated but still good to check
    if (!xssProtection) {
      return this.createResult(
        'X-XSS-Protection',
        this.category,
        'info',
        false,
        'X-XSS-Protection header is missing (deprecated, but still recommended)',
        ['CSP is the modern replacement for X-XSS-Protection'],
        'Add X-XSS-Protection: 1; mode=block (but prioritize implementing CSP)',
        { xssProtection: null }
      );
    }

    if (xssProtection === '0') {
      return this.createResult(
        'X-XSS-Protection',
        this.category,
        'low',
        true,
        'X-XSS-Protection is explicitly disabled',
        [`Value: ${xssProtection}`],
        'Enable X-XSS-Protection: 1; mode=block',
        { xssProtection }
      );
    }

    return this.createResult(
      'X-XSS-Protection',
      this.category,
      'info',
      false,
      'X-XSS-Protection header is set',
      [`Value: ${xssProtection}`],
      undefined,
      { xssProtection }
    );
  }

  private testSensitiveHeaders(headers: Record<string, string>): TestResult {
    const sensitiveHeaders = ['server', 'x-powered-by', 'x-aspnet-version', 'x-aspnetmvc-version'];
    const found: string[] = [];

    sensitiveHeaders.forEach(header => {
      if (headers[header]) {
        found.push(`${header}: ${headers[header]}`);
      }
    });

    if (found.length > 0) {
      return this.createResult(
        'Information Disclosure in Headers',
        this.category,
        'low',
        true,
        'Server is disclosing version information in headers',
        found,
        'Remove or obfuscate headers that reveal server technology and version information',
        { headers: found }
      );
    }

    return this.createResult(
      'Information Disclosure in Headers',
      this.category,
      'info',
      false,
      'No obvious version disclosure in headers',
      []
    );
  }
}
