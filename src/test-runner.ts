import { chromium, Browser, Page } from 'playwright';
import { BaseTest, TestConfig, TestContext, TestReport, TestResult } from './types.js';

export class TestRunner {
  private tests: BaseTest[] = [];
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = {
      maxConcurrency: 5,
      timeout: 30000,
      headless: true,
      outputDir: './reports',
      ...config,
    };
  }

  registerTest(test: BaseTest): void {
    this.tests.push(test);
  }

  registerTests(tests: BaseTest[]): void {
    this.tests.push(...tests);
  }

  async run(): Promise<TestReport> {
    const startTime = Date.now();
    const scanStartTime = new Date().toISOString();

    console.log(`[*] Starting security scan on ${this.config.targetUrl}`);
    console.log(`[*] Registered ${this.tests.length} test modules\n`);

    let browser: Browser | null = null;
    let page: Page | null = null;
    const allResults: TestResult[] = [];

    try {
      // Launch browser
      browser = await chromium.launch({
        headless: this.config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage({
        userAgent: this.config.userAgent,
        extraHTTPHeaders: this.config.customHeaders,
      });

      page.setDefaultTimeout(this.config.timeout!);

      const context: TestContext = {
        page,
        browser,
        config: this.config,
        baseUrl: this.config.targetUrl,
      };

      // Filter tests based on config
      const testsToRun = this.tests.filter(test => {
        if (this.config.includeTests && this.config.includeTests.length > 0) {
          return this.config.includeTests.includes(test.name);
        }
        if (this.config.excludeTests && this.config.excludeTests.length > 0) {
          return !this.config.excludeTests.includes(test.name);
        }
        return true;
      });

      // Run tests sequentially (can be parallelized in future)
      for (const test of testsToRun) {
        console.log(`[+] Running: ${test.name} (${test.category})`);
        const testStartTime = Date.now();

        try {
          const results = await test.run(context);
          const testDuration = Date.now() - testStartTime;

          // Update duration for each result
          results.forEach(result => {
            result.duration = testDuration;
          });

          allResults.push(...results);

          const vulnerableCount = results.filter(r => r.vulnerable).length;
          if (vulnerableCount > 0) {
            console.log(`  ⚠️  Found ${vulnerableCount} vulnerability(ies)`);
          } else {
            console.log(`  ✓ No vulnerabilities detected`);
          }
        } catch (error) {
          console.log(`  ✗ Error running test: ${error}`);
          allResults.push({
            testName: test.name,
            category: test.category,
            severity: 'info',
            passed: false,
            vulnerable: false,
            description: `Test failed to execute: ${error}`,
            timestamp: new Date().toISOString(),
            duration: Date.now() - testStartTime,
          });
        }
      }

    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }

    const scanEndTime = new Date().toISOString();
    const totalDuration = Date.now() - startTime;

    // Generate summary
    const summary = {
      total: allResults.length,
      passed: allResults.filter(r => r.passed).length,
      failed: allResults.filter(r => !r.passed).length,
      critical: allResults.filter(r => r.severity === 'critical').length,
      high: allResults.filter(r => r.severity === 'high').length,
      medium: allResults.filter(r => r.severity === 'medium').length,
      low: allResults.filter(r => r.severity === 'low').length,
      info: allResults.filter(r => r.severity === 'info').length,
    };

    console.log(`\n[*] Scan completed in ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`[*] Vulnerabilities found: ${summary.critical + summary.high + summary.medium + summary.low}`);
    console.log(`    Critical: ${summary.critical}, High: ${summary.high}, Medium: ${summary.medium}, Low: ${summary.low}\n`);

    return {
      targetUrl: this.config.targetUrl,
      scanStartTime,
      scanEndTime,
      totalDuration,
      testResults: allResults,
      summary,
    };
  }
}
