#!/usr/bin/env node

import { Command } from 'commander';
import { TestRunner } from './test-runner.js';
import { ReportGenerator } from './report-generator.js';
import { TestConfig } from './types.js';

// Import all test modules
import { XSSTests } from './tests/xss-tests.js';
import { SQLiTests } from './tests/sqli-tests.js';
import { AuthTests } from './tests/auth-tests.js';
import { SecurityHeadersTests } from './tests/security-headers-tests.js';
import { CSRFTests } from './tests/csrf-tests.js';
import { InputValidationTests } from './tests/input-validation-tests.js';
import { InformationDisclosureTests } from './tests/information-disclosure-tests.js';
import { BusinessLogicTests } from './tests/business-logic-tests.js';
import { SSLTLSTests } from './tests/ssl-tls-tests.js';

const program = new Command();

program
  .name('webattack-suite')
  .description('Comprehensive web application security testing suite')
  .version('1.0.0');

program
  .command('scan')
  .description('Run security scan on a target URL')
  .argument('<url>', 'Target URL to scan')
  .option('-o, --output <dir>', 'Output directory for reports', './reports')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--no-headless', 'Run browser in visible mode')
  .option('-t, --timeout <ms>', 'Timeout for each test in milliseconds', '30000')
  .option('--cookie <name=value>', 'Authentication cookie (can be used multiple times)', (value, previous) => {
    const cookies = previous || [];
    const [name, ...valueParts] = value.split('=');
    if (name && valueParts.length > 0) {
      cookies.push({ name: name.trim(), value: valueParts.join('=').trim() });
    }
    return cookies;
  }, [])
  .option('--cookie-domain <domain>', 'Cookie domain (optional, defaults to target domain)')
  .option('--crawl-depth <depth>', 'How deep to crawl for inputs (0 = no crawling, default: 3)', '3')
  .option('--max-pages <pages>', 'Maximum pages to crawl (default: 50)', '50')
  .option('--include <tests>', 'Comma-separated list of tests to include')
  .option('--exclude <tests>', 'Comma-separated list of tests to exclude')
  .option('--json-only', 'Generate only JSON report (skip HTML)')
  .option('--html-only', 'Generate only HTML report (skip JSON)')
  .action(async (url: string, options) => {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║         🔒 WebAttack Security Testing Suite 🔒            ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log('⚠️  WARNING: Only use on applications you have permission to test!\n');

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      console.error('❌ Invalid URL provided');
      process.exit(1);
    }

    // Build config
    const config: TestConfig = {
      targetUrl: url,
      timeout: parseInt(options.timeout),
      headless: options.headless,
      outputDir: options.output,
      crawlDepth: parseInt(options.crawlDepth),
      maxPages: parseInt(options.maxPages),
      includeTests: options.include ? options.include.split(',').map((t: string) => t.trim()) : undefined,
      excludeTests: options.exclude ? options.exclude.split(',').map((t: string) => t.trim()) : undefined,
    };

    // Add cookies if provided
    if (options.cookie && options.cookie.length > 0) {
      config.cookies = options.cookie.map((cookie: any) => ({
        name: cookie.name,
        value: cookie.value,
        domain: options.cookieDomain,
      }));
    }

    // Create test runner
    const runner = new TestRunner(config);

    // Register all test modules
    runner.registerTests([
      new XSSTests(),
      new SQLiTests(),
      new AuthTests(),
      new SecurityHeadersTests(),
      new CSRFTests(),
      new InputValidationTests(),
      new InformationDisclosureTests(),
      new BusinessLogicTests(),
      new SSLTLSTests(),
    ]);

    try {
      // Run tests
      const report = await runner.run();

      // Generate reports
      const reportGen = new ReportGenerator(config.outputDir);

      if (!options.htmlOnly) {
        reportGen.generateJSONReport(report);
      }

      if (!options.jsonOnly) {
        const htmlPath = reportGen.generateHTMLReport(report);
        console.log(`\n📊 Open the HTML report in your browser: file://${htmlPath}\n`);
      }

      // Print summary
      console.log('═══════════════════════════════════════════════════════════');
      console.log('                    SCAN SUMMARY');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Target:      ${report.targetUrl}`);
      console.log(`Total Tests: ${report.summary.total}`);
      console.log(`Passed:      ${report.summary.passed}`);
      console.log(`Failed:      ${report.summary.failed}`);
      console.log('───────────────────────────────────────────────────────────');
      console.log(`Critical:    ${report.summary.critical}`);
      console.log(`High:        ${report.summary.high}`);
      console.log(`Medium:      ${report.summary.medium}`);
      console.log(`Low:         ${report.summary.low}`);
      console.log('═══════════════════════════════════════════════════════════\n');

      // Exit with code based on vulnerabilities
      const vulnCount = report.summary.critical + report.summary.high;
      if (vulnCount > 0) {
        console.log(`⚠️  Found ${vulnCount} critical/high severity vulnerabilities!\n`);
        process.exit(1);
      } else {
        console.log('✅ No critical or high severity vulnerabilities found.\n');
        process.exit(0);
      }
    } catch (error) {
      console.error(`\n❌ Error during scan: ${error}\n`);
      process.exit(1);
    }
  });

program
  .command('list-tests')
  .description('List all available test modules')
  .action(() => {
    const tests = [
      new XSSTests(),
      new SQLiTests(),
      new AuthTests(),
      new SecurityHeadersTests(),
      new CSRFTests(),
      new InputValidationTests(),
      new InformationDisclosureTests(),
      new BusinessLogicTests(),
      new SSLTLSTests(),
    ];

    console.log('\n📋 Available Test Modules:\n');
    tests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.name}`);
      console.log(`   Category: ${test.category}`);
      console.log(`   Description: ${test.description}`);
      console.log('');
    });
  });

program.parse();
