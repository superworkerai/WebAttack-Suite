import { chromium, Browser, Page } from 'playwright';
import { BaseTest, TestConfig, TestContext, TestReport, TestResult, CrawlResult, InputField, FormInfo } from './types.js';
import { Crawler } from './crawler.js';

export class TestRunner {
  private tests: BaseTest[] = [];
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = {
      maxConcurrency: 5,
      timeout: 30000,
      headless: true,
      outputDir: './reports',
      crawlDepth: 3,
      maxPages: 50,
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

      // Set authentication cookies if provided
      if (this.config.cookies && this.config.cookies.length > 0) {
        console.log(`[*] Setting ${this.config.cookies.length} authentication cookie(s)`);
        const url = new URL(this.config.targetUrl);
        const cookiesToSet = this.config.cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || url.hostname,
          path: cookie.path || '/',
          url: this.config.targetUrl,
        }));
        await page.context().addCookies(cookiesToSet);
        console.log(`[+] Cookies set successfully\n`);
      }

      // Run crawler if depth > 0
      let crawlResults: CrawlResult[] = [];
      let discoveredInputs: InputField[] = [];
      let discoveredForms: FormInfo[] = [];

      if (this.config.crawlDepth && this.config.crawlDepth > 0) {
        const crawler = new Crawler(
          this.config.targetUrl,
          this.config.crawlDepth,
          this.config.maxPages
        );
        crawlResults = await crawler.crawl(page);
        discoveredInputs = crawler.getDiscoveredInputs();
        discoveredForms = crawler.getDiscoveredForms();

        const stats = crawler.getStats();
        console.log(`[*] Crawl Statistics:`);
        console.log(`    Pages crawled: ${stats.pages}`);
        console.log(`    Input fields found: ${stats.inputs}`);
        console.log(`    Forms found: ${stats.forms}`);
        console.log(`    Links discovered: ${stats.totalLinks}\n`);
      }

      const context: TestContext = {
        page,
        browser,
        config: this.config,
        baseUrl: this.config.targetUrl,
        crawlResults,
        discoveredInputs,
        discoveredForms,
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
