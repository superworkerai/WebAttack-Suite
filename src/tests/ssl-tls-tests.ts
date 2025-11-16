import { BaseTest, TestContext, TestResult } from '../types.js';

export class SSLTLSTests extends BaseTest {
  name = 'SSL/TLS Security Tests';
  category = 'Cryptographic Failures';
  description = 'Tests for SSL/TLS configuration and HTTPS implementation';

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: HTTPS enforcement
    results.push(...await this.testHTTPSEnforcement(context));

    // Test 2: Mixed content
    results.push(...await this.testMixedContent(context));

    // Test 3: Certificate validation (basic)
    results.push(...await this.testCertificate(context));

    return results;
  }

  private async testHTTPSEnforcement(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      const url = new URL(baseUrl);

      // Check if site is using HTTPS
      if (url.protocol !== 'https:') {
        results.push(
          this.createResult(
            'HTTPS Not Used',
            this.category,
            'high',
            true,
            'Website is not using HTTPS',
            [`Current protocol: ${url.protocol}`],
            'Implement HTTPS for all pages. Obtain an SSL/TLS certificate from a trusted CA.',
            { protocol: url.protocol }
          )
        );
        return results;
      }

      // Try to access HTTP version
      const httpUrl = baseUrl.replace('https://', 'http://');
      try {
        const response = await page.goto(httpUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
        const finalUrl = page.url();

        if (!finalUrl.startsWith('https://')) {
          results.push(
            this.createResult(
              'HTTPS Redirect',
              this.category,
              'medium',
              true,
              'HTTP traffic is not redirected to HTTPS',
              [`HTTP URL is accessible: ${httpUrl}`],
              'Configure web server to redirect all HTTP traffic to HTTPS using 301 redirects.',
              { httpUrl, finalUrl }
            )
          );
        } else {
          results.push(
            this.createResult(
              'HTTPS Redirect',
              this.category,
              'info',
              false,
              'HTTP traffic is properly redirected to HTTPS',
              [`${httpUrl} -> ${finalUrl}`]
            )
          );
        }
      } catch (error) {
        // HTTP version not accessible - good
        results.push(
          this.createResult(
            'HTTPS Redirect',
            this.category,
            'info',
            false,
            'HTTP version not accessible or redirects to HTTPS',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'HTTPS Enforcement',
          this.category,
          'info',
          false,
          `Could not test HTTPS enforcement: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testMixedContent(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      if (!baseUrl.startsWith('https://')) {
        results.push(
          this.createResult(
            'Mixed Content',
            this.category,
            'info',
            false,
            'Site not using HTTPS - mixed content test not applicable',
            []
          )
        );
        return results;
      }

      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Check for mixed content
      const mixedContent = await page.evaluate(() => {
        const issues: string[] = [];

        // Check scripts
        const scripts = Array.from(document.getElementsByTagName('script'));
        scripts.forEach(script => {
          if (script.src && script.src.startsWith('http://')) {
            issues.push(`Script: ${script.src}`);
          }
        });

        // Check stylesheets
        const links = Array.from(document.getElementsByTagName('link'));
        links.forEach(link => {
          if (link.href && link.href.startsWith('http://') && link.rel === 'stylesheet') {
            issues.push(`Stylesheet: ${link.href}`);
          }
        });

        // Check images
        const images = Array.from(document.getElementsByTagName('img'));
        images.slice(0, 10).forEach(img => {
          if (img.src && img.src.startsWith('http://')) {
            issues.push(`Image: ${img.src}`);
          }
        });

        // Check iframes
        const iframes = Array.from(document.getElementsByTagName('iframe'));
        iframes.forEach(iframe => {
          if (iframe.src && iframe.src.startsWith('http://')) {
            issues.push(`Iframe: ${iframe.src}`);
          }
        });

        return issues;
      });

      if (mixedContent.length > 0) {
        const hasActiveContent = mixedContent.some(item =>
          item.startsWith('Script:') || item.startsWith('Stylesheet:') || item.startsWith('Iframe:')
        );

        const severity = hasActiveContent ? 'high' : 'medium';

        results.push(
          this.createResult(
            'Mixed Content',
            this.category,
            severity,
            true,
            `Mixed content detected: ${mixedContent.length} HTTP resource(s) on HTTPS page`,
            mixedContent.slice(0, 10),
            'Update all resource URLs to use HTTPS or protocol-relative URLs (//). Mixed content degrades security.',
            { mixedContent: mixedContent.length, hasActiveContent }
          )
        );
      } else {
        results.push(
          this.createResult(
            'Mixed Content',
            this.category,
            'info',
            false,
            'No mixed content detected',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Mixed Content',
          this.category,
          'info',
          false,
          `Could not test mixed content: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testCertificate(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      if (!baseUrl.startsWith('https://')) {
        results.push(
          this.createResult(
            'SSL Certificate',
            this.category,
            'info',
            false,
            'Site not using HTTPS - certificate test not applicable',
            []
          )
        );
        return results;
      }

      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // In Playwright, certificate errors would cause navigation to fail
      // If we got here, the certificate is at least valid enough for the browser
      results.push(
        this.createResult(
          'SSL Certificate',
          this.category,
          'info',
          false,
          'SSL certificate appears to be valid (basic check)',
          ['Browser accepted the certificate without errors'],
          'For comprehensive certificate testing, use tools like SSL Labs SSL Test'
        )
      );
    } catch (error) {
      if (error instanceof Error && /certificate/i.test(error.message)) {
        results.push(
          this.createResult(
            'SSL Certificate',
            this.category,
            'critical',
            true,
            'SSL certificate error detected',
            [error.message],
            'Fix SSL certificate issues. Ensure certificate is valid, not expired, and from a trusted CA.',
            { error: error.message }
          )
        );
      } else {
        results.push(
          this.createResult(
            'SSL Certificate',
            this.category,
            'info',
            false,
            `Could not test certificate: ${error}`,
            []
          )
        );
      }
    }

    return results;
  }
}
