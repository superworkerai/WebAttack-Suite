#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
import { Command } from 'commander';
import { TestRunner } from './test-runner.js';
import { ReportGenerator } from './report-generator.js';
import { TestConfig } from './types.js';

// Load environment variables from .env file
dotenvConfig();

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
import { AISuggestedTests } from './tests/ai-suggested-tests.js';

const program = new Command();

program
  .name('webattack-suite')
  .description('Comprehensive web application security testing suite')
  .version('1.0.0');

program
  .command('scan')
  .description('Run security scan on a target URL')
  .argument('[url]', 'Target URL to scan (or use TARGET_URL env var)')
  .option('-o, --output <dir>', 'Output directory for reports')
  .option('--headless', 'Run browser in headless mode')
  .option('--no-headless', 'Run browser in visible mode')
  .option('-t, --timeout <ms>', 'Timeout for each test in milliseconds')
  .option('--cookie <name=value>', 'Authentication cookie (can be used multiple times)', (value, previous: Array<{name: string; value: string}>) => {
    const cookies = previous || [];
    const [name, ...valueParts] = value.split('=');
    if (name && valueParts.length > 0) {
      cookies.push({ name: name.trim(), value: valueParts.join('=').trim() });
    }
    return cookies;
  }, [] as Array<{name: string; value: string}>)
  .option('--cookie-domain <domain>', 'Cookie domain (optional)')
  .option('--crawl-depth <depth>', 'How deep to crawl for inputs (0 = no crawling)')
  .option('--max-pages <pages>', 'Maximum pages to crawl')
  .option('--include <tests>', 'Comma-separated list of tests to include')
  .option('--exclude <tests>', 'Comma-separated list of tests to exclude')
  .option('--json-only', 'Generate only JSON report (skip HTML)')
  .option('--html-only', 'Generate only HTML report (skip JSON)')
  .action(async (url: string | undefined, options) => {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║         🔒 WebAttack Security Testing Suite 🔒            ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log('⚠️  WARNING: Only use on applications you have permission to test!\n');

    // Get target URL from CLI argument or environment variable
    const targetUrl = url || process.env.TARGET_URL;
    if (!targetUrl) {
      console.error('❌ No target URL provided. Use CLI argument or set TARGET_URL in .env file');
      process.exit(1);
    }

    // Validate URL
    try {
      new URL(targetUrl);
    } catch (error) {
      console.error('❌ Invalid URL provided');
      process.exit(1);
    }

    // Parse environment variables with defaults
    const envCookies = process.env.COOKIES;
    const envTimeout = process.env.TIMEOUT;
    const envHeadless = process.env.HEADLESS;
    const envOutputDir = process.env.OUTPUT_DIR;
    const envCrawlDepth = process.env.CRAWL_DEPTH;
    const envMaxPages = process.env.MAX_PAGES;
    const envIncludeTests = process.env.INCLUDE_TESTS;
    const envExcludeTests = process.env.EXCLUDE_TESTS;
    const envCookieDomain = process.env.COOKIE_DOMAIN;
    const envJsonOnly = process.env.JSON_ONLY;
    const envHtmlOnly = process.env.HTML_ONLY;

    // Build config with environment variable defaults
    const config: TestConfig = {
      targetUrl,
      timeout: options.timeout ? parseInt(options.timeout) : (envTimeout ? parseInt(envTimeout) : 30000),
      headless: options.headless !== undefined ? options.headless : (envHeadless ? envHeadless.toLowerCase() === 'true' : true),
      outputDir: options.output || envOutputDir || './reports',
      crawlDepth: options.crawlDepth ? parseInt(options.crawlDepth) : (envCrawlDepth ? parseInt(envCrawlDepth) : 3),
      maxPages: options.maxPages ? parseInt(options.maxPages) : (envMaxPages ? parseInt(envMaxPages) : 50),
      includeTests: options.include
        ? options.include.split(',').map((t: string) => t.trim())
        : (envIncludeTests ? envIncludeTests.split(',').map((t: string) => t.trim()) : undefined),
      excludeTests: options.exclude
        ? options.exclude.split(',').map((t: string) => t.trim())
        : (envExcludeTests ? envExcludeTests.split(',').map((t: string) => t.trim()) : undefined),
    };

    // Parse cookies from CLI or environment
    const cookies: Array<{ name: string; value: string; domain?: string }> = [];

    // Add CLI cookies
    if (options.cookie && options.cookie.length > 0) {
      cookies.push(...options.cookie.map((cookie: any) => ({
        name: cookie.name,
        value: cookie.value,
        domain: options.cookieDomain || envCookieDomain,
      })));
    }

    // Add environment cookies if no CLI cookies provided
    if (cookies.length === 0 && envCookies) {
      const cookiePairs = envCookies.split(',');
      cookiePairs.forEach(pair => {
        const [name, ...valueParts] = pair.split('=');
        if (name && valueParts.length > 0) {
          cookies.push({
            name: name.trim(),
            value: valueParts.join('=').trim(),
            domain: options.cookieDomain || envCookieDomain,
          });
        }
      });
    }

    if (cookies.length > 0) {
      config.cookies = cookies;
    }

    // Update options for report generation
    if (!options.jsonOnly && envJsonOnly && envJsonOnly.toLowerCase() === 'true') {
      options.jsonOnly = true;
    }
    if (!options.htmlOnly && envHtmlOnly && envHtmlOnly.toLowerCase() === 'true') {
      options.htmlOnly = true;
    }

    // Create test runner
    const runner = new TestRunner(config);

    // Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const enableAITests = process.env.ENABLE_AI_TESTS !== 'false'; // Default to true if API key exists

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

    // Register AI-powered tests if enabled and API key is provided
    if (openaiApiKey && enableAITests) {
      console.log('🤖 AI-powered test suggestions enabled\n');
      runner.registerTest(new AISuggestedTests(openaiApiKey));
    } else if (!openaiApiKey) {
      console.log('ℹ️  AI features disabled (OPENAI_API_KEY not set)\n');
    }

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

    console.log('\n🤖 AI-Powered Test Modules (requires OPENAI_API_KEY):\n');
    console.log('10. AI-Suggested Security Tests');
    console.log('   Category: AI-Powered');
    console.log('   Description: AI-powered security test suggestions based on page analysis');
    console.log('   Note: Set OPENAI_API_KEY in .env to enable\n');
  });

program.parse();
