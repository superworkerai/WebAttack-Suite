import { BaseTest, TestContext, TestResult } from '../types.js';

export class InformationDisclosureTests extends BaseTest {
  name = 'Information Disclosure Tests';
  category = 'Security Misconfiguration';
  description = 'Tests for information leakage and disclosure vulnerabilities';

  private sensitiveFiles = [
    'robots.txt',
    '.env',
    '.git/config',
    '.git/HEAD',
    'config.php',
    'web.config',
    '.htaccess',
    'composer.json',
    'package.json',
    'phpinfo.php',
    'info.php',
    'test.php',
    'backup.sql',
    'database.sql',
    '.env.backup',
    '.env.old',
    'config.yml',
    'config.json',
    '.DS_Store',
    'debug.log',
    'error.log',
    'access.log',
  ];

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Sensitive file exposure
    results.push(...await this.testSensitiveFiles(context));

    // Test 2: Directory listing
    results.push(...await this.testDirectoryListing(context));

    // Test 3: Error message disclosure
    results.push(...await this.testErrorDisclosure(context));

    // Test 4: Comments with sensitive information
    results.push(...await this.testSensitiveComments(context));

    // Test 5: Source code disclosure
    results.push(...await this.testSourceCodeDisclosure(context));

    return results;
  }

  private async testSensitiveFiles(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    const foundFiles: string[] = [];

    for (const file of this.sensitiveFiles) {
      try {
        const url = new URL(baseUrl);
        const testUrl = `${url.protocol}//${url.host}/${file}`;

        const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
        const status = response?.status() || 0;

        if (status === 200) {
          const content = await page.content();
          // Make sure it's not a custom 404 page
          if (!/<title>.*?(404|not found).*?<\/title>/i.test(content)) {
            foundFiles.push(file);
          }
        }
      } catch (error) {
        // File not accessible, continue
      }
    }

    if (foundFiles.length > 0) {
      const severity = foundFiles.some(f => f.includes('.env') || f.includes('config') || f.includes('.git')) ? 'critical' : 'high';

      results.push(
        this.createResult(
          'Sensitive File Exposure',
          this.category,
          severity,
          true,
          `${foundFiles.length} sensitive file(s) publicly accessible`,
          foundFiles.map(f => `/${f}`),
          'Remove or restrict access to sensitive files. Use .htaccess or web server configuration to deny access.',
          { foundFiles }
        )
      );
    } else {
      results.push(
        this.createResult(
          'Sensitive File Exposure',
          this.category,
          'info',
          false,
          `No common sensitive files found accessible (tested ${this.sensitiveFiles.length} files)`,
          []
        )
      );
    }

    return results;
  }

  private async testDirectoryListing(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    const commonDirs = [
      '/uploads/',
      '/images/',
      '/assets/',
      '/static/',
      '/files/',
      '/documents/',
      '/backup/',
      '/admin/',
    ];

    const vulnerableDirs: string[] = [];

    for (const dir of commonDirs) {
      try {
        const url = new URL(baseUrl);
        const testUrl = `${url.protocol}//${url.host}${dir}`;

        const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
        const content = await page.content();

        // Check for directory listing indicators
        if (
          /Index of/i.test(content) ||
          /Directory listing for/i.test(content) ||
          /<title>Index of/i.test(content) ||
          /Parent Directory/i.test(content)
        ) {
          vulnerableDirs.push(dir);
        }
      } catch (error) {
        // Directory not accessible or error
      }
    }

    if (vulnerableDirs.length > 0) {
      results.push(
        this.createResult(
          'Directory Listing',
          this.category,
          'medium',
          true,
          'Directory listing is enabled on some directories',
          vulnerableDirs,
          'Disable directory listing in web server configuration (e.g., Options -Indexes in Apache)',
          { vulnerableDirs }
        )
      );
    } else {
      results.push(
        this.createResult(
          'Directory Listing',
          this.category,
          'info',
          false,
          'No directory listing vulnerabilities detected',
          []
        )
      );
    }

    return results;
  }

  private async testErrorDisclosure(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      // Trigger errors with invalid parameters
      const errorTests = [
        '?id=abc',
        '?id=9999999999',
        '/nonexistent/path/to/trigger/error',
        "?id='",
      ];

      const disclosures: string[] = [];

      for (const test of errorTests) {
        try {
          const testUrl = `${baseUrl}${test}`;
          await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
          const content = await page.content();

          // Check for stack traces and error details
          if (
            /stack trace/i.test(content) ||
            /line \d+ of/i.test(content) ||
            /in \/.*?\.php/i.test(content) ||
            /in \/.*?\.py/i.test(content) ||
            /Exception in/i.test(content) ||
            /Fatal error/i.test(content) ||
            /Warning:/i.test(content) ||
            /Notice:/i.test(content) ||
            /Traceback \(most recent call last\)/i.test(content) ||
            /at .*?\.js:\d+/i.test(content)
          ) {
            disclosures.push(test);
            break; // Found one, that's enough
          }
        } catch (error) {
          // Continue testing
        }
      }

      if (disclosures.length > 0) {
        results.push(
          this.createResult(
            'Error Message Disclosure',
            this.category,
            'medium',
            true,
            'Detailed error messages or stack traces exposed',
            disclosures.map(t => `Test: ${t}`),
            'Disable detailed error messages in production. Log errors server-side and show generic error pages to users.',
            { disclosures }
          )
        );
      } else {
        results.push(
          this.createResult(
            'Error Message Disclosure',
            this.category,
            'info',
            false,
            'No detailed error messages detected',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Error Message Disclosure',
          this.category,
          'info',
          false,
          `Could not test error disclosure: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testSensitiveComments(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const content = await page.content();

      // Extract HTML comments
      const commentRegex = /<!--([\s\S]*?)-->/g;
      const comments = content.match(commentRegex) || [];

      const sensitiveComments: string[] = [];

      const sensitivePatterns = [
        /password/i,
        /todo/i,
        /fixme/i,
        /hack/i,
        /bug/i,
        /username/i,
        /admin/i,
        /api[_\s]?key/i,
        /secret/i,
        /token/i,
        /credential/i,
        /database/i,
        /connection/i,
        /mysql/i,
        /postgres/i,
      ];

      comments.forEach(comment => {
        sensitivePatterns.forEach(pattern => {
          if (pattern.test(comment)) {
            sensitiveComments.push(comment.substring(0, 100));
          }
        });
      });

      if (sensitiveComments.length > 0) {
        results.push(
          this.createResult(
            'Sensitive Information in Comments',
            this.category,
            'low',
            true,
            'HTML comments contain potentially sensitive information',
            sensitiveComments.slice(0, 5),
            'Remove sensitive comments from production code. Use build tools to strip comments.',
            { count: sensitiveComments.length }
          )
        );
      } else if (comments.length > 0) {
        results.push(
          this.createResult(
            'Sensitive Information in Comments',
            this.category,
            'info',
            false,
            `Found ${comments.length} HTML comment(s) but no obvious sensitive information`,
            []
          )
        );
      } else {
        results.push(
          this.createResult(
            'Sensitive Information in Comments',
            this.category,
            'info',
            false,
            'No HTML comments found',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Sensitive Information in Comments',
          this.category,
          'info',
          false,
          `Could not test sensitive comments: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testSourceCodeDisclosure(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      // Test for source code files
      const sourceFiles = [
        'index.php.bak',
        'index.php~',
        'index.php.old',
        'app.js.map',
        'bundle.js.map',
        'main.js.map',
      ];

      const foundSourceFiles: string[] = [];

      for (const file of sourceFiles) {
        try {
          const url = new URL(baseUrl);
          const testUrl = `${url.protocol}//${url.host}/${file}`;

          const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
          const status = response?.status() || 0;

          if (status === 200) {
            foundSourceFiles.push(file);
          }
        } catch (error) {
          // File not accessible
        }
      }

      if (foundSourceFiles.length > 0) {
        results.push(
          this.createResult(
            'Source Code Disclosure',
            this.category,
            'high',
            true,
            'Source code or backup files are publicly accessible',
            foundSourceFiles,
            'Remove backup files and source maps from production. Configure web server to deny access to these file types.',
            { foundSourceFiles }
          )
        );
      } else {
        results.push(
          this.createResult(
            'Source Code Disclosure',
            this.category,
            'info',
            false,
            'No source code files found publicly accessible',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Source Code Disclosure',
          this.category,
          'info',
          false,
          `Could not test source code disclosure: ${error}`,
          []
        )
      );
    }

    return results;
  }
}
