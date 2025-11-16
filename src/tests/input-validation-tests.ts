import { BaseTest, TestContext, TestResult } from '../types.js';

export class InputValidationTests extends BaseTest {
  name = 'Input Validation Tests';
  category = 'Injection';
  description = 'Tests for various input validation vulnerabilities including command injection, path traversal, XXE, etc.';

  private pathTraversalPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '..%2F..%2F..%2Fetc%2Fpasswd',
    '..%252F..%252F..%252Fetc%252Fpasswd',
    '/etc/passwd',
    'C:\\windows\\system32\\config\\sam',
  ];

  private commandInjectionPayloads = [
    '| whoami',
    '; whoami',
    '& whoami',
    '&& whoami',
    '|| whoami',
    '`whoami`',
    '$(whoami)',
    '| ls',
    '; cat /etc/passwd',
    '| ping -c 1 127.0.0.1',
  ];

  private xxePayloads = [
    '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
    '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///c:/windows/system.ini">]><foo>&xxe;</foo>',
  ];

  private ldapInjectionPayloads = [
    '*',
    '*)(&',
    '*)(uid=*))(|(uid=*',
    'admin*',
    'admin)(&)',
  ];

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Path traversal
    results.push(...await this.testPathTraversal(context));

    // Test 2: Command injection
    results.push(...await this.testCommandInjection(context));

    // Test 3: XXE (XML External Entity)
    results.push(...await this.testXXE(context));

    // Test 4: LDAP injection
    results.push(...await this.testLDAPInjection(context));

    // Test 5: CRLF injection
    results.push(...await this.testCRLFInjection(context));

    // Test 6: File upload validation
    results.push(...await this.testFileUpload(context));

    return results;
  }

  private async testPathTraversal(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    const commonParams = ['file', 'path', 'page', 'document', 'template', 'include'];

    for (const param of commonParams.slice(0, 2)) {
      for (const payload of this.pathTraversalPayloads.slice(0, 4)) {
        try {
          const testUrl = `${baseUrl}?${param}=${encodeURIComponent(payload)}`;
          const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          const content = await page.content();

          // Check for evidence of path traversal
          if (
            /root:.*?:0:0:/i.test(content) || // Unix passwd file
            /\[boot loader\]/i.test(content) || // Windows boot.ini
            /; for 16-bit app support/i.test(content) // Windows system.ini
          ) {
            results.push(
              this.createResult(
                'Path Traversal',
                this.category,
                'critical',
                true,
                `Path traversal vulnerability detected - system files accessible`,
                [`URL: ${testUrl}`, `Payload: ${payload}`],
                'Validate and sanitize all file paths. Use a whitelist of allowed files. Never concatenate user input into file paths.',
                { param, payload, url: testUrl }
              )
            );
            return results;
          }

          // Check for error messages
          if (
            /no such file/i.test(content) ||
            /failed to open/i.test(content) ||
            /file not found/i.test(content) ||
            /invalid.*?path/i.test(content)
          ) {
            results.push(
              this.createResult(
                'Path Traversal',
                this.category,
                'high',
                true,
                `Potential path traversal vulnerability - filesystem errors exposed`,
                [`URL: ${testUrl}`, `Payload: ${payload}`],
                'Validate file paths and suppress error messages that reveal filesystem structure.',
                { param, payload, url: testUrl }
              )
            );
            return results;
          }
        } catch (error) {
          // Continue testing
        }
      }
    }

    if (results.length === 0) {
      results.push(
        this.createResult(
          'Path Traversal',
          this.category,
          'info',
          false,
          'No path traversal vulnerabilities detected',
          []
        )
      );
    }

    return results;
  }

  private async testCommandInjection(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    const commonParams = ['cmd', 'command', 'exec', 'execute', 'ping', 'host', 'ip'];

    for (const param of commonParams.slice(0, 2)) {
      for (const payload of this.commandInjectionPayloads.slice(0, 4)) {
        try {
          const testUrl = `${baseUrl}?${param}=${encodeURIComponent(payload)}`;
          const startTime = Date.now();
          const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          const duration = Date.now() - startTime;
          const content = await page.content();

          // Check for command execution evidence
          if (
            /uid=\d+/i.test(content) || // whoami output
            /root|administrator/i.test(content) ||
            /bin\/bash/i.test(content) ||
            /windows\\system32/i.test(content)
          ) {
            results.push(
              this.createResult(
                'Command Injection',
                this.category,
                'critical',
                true,
                `Command injection vulnerability detected - system commands executing`,
                [`URL: ${testUrl}`, `Payload: ${payload}`],
                'Never pass user input to system commands. Use language-specific APIs instead of shell commands. If unavoidable, use strict input validation and escaping.',
                { param, payload, url: testUrl }
              )
            );
            return results;
          }

          // Check for delayed response (blind command injection with sleep)
          if (duration > 5000) {
            results.push(
              this.createResult(
                'Command Injection',
                this.category,
                'high',
                true,
                `Potential blind command injection - response delayed by ${(duration / 1000).toFixed(1)}s`,
                [`URL: ${testUrl}`, `Payload: ${payload}`],
                'Avoid executing system commands based on user input.',
                { param, payload, url: testUrl, duration }
              )
            );
            return results;
          }
        } catch (error) {
          // Continue testing
        }
      }
    }

    if (results.length === 0) {
      results.push(
        this.createResult(
          'Command Injection',
          this.category,
          'info',
          false,
          'No command injection vulnerabilities detected',
          []
        )
      );
    }

    return results;
  }

  private async testXXE(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Look for XML upload or submission forms
      const forms = await page.$$('form');
      let xmlEndpointFound = false;

      for (const form of forms) {
        const action = await form.getAttribute('action');
        const enctype = await form.getAttribute('enctype');

        if (
          action && /xml/i.test(action) ||
          enctype && /xml/i.test(enctype)
        ) {
          xmlEndpointFound = true;
          break;
        }
      }

      if (xmlEndpointFound) {
        results.push(
          this.createResult(
            'XXE (XML External Entity)',
            this.category,
            'medium',
            true,
            'XML processing endpoint detected - potential XXE vulnerability',
            ['Manual testing recommended for XXE vulnerabilities'],
            'Disable external entity processing in XML parsers. Use secure XML parser configuration.',
            { recommendation: 'Test manually with XXE payloads' }
          )
        );
      } else {
        results.push(
          this.createResult(
            'XXE (XML External Entity)',
            this.category,
            'info',
            false,
            'No obvious XML processing endpoints found',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'XXE (XML External Entity)',
          this.category,
          'info',
          false,
          `Could not test XXE: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testLDAPInjection(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Look for login or search forms that might use LDAP
      const content = await page.content();
      const hasLDAP = /ldap/i.test(content) || /active.*?directory/i.test(content);

      if (hasLDAP) {
        results.push(
          this.createResult(
            'LDAP Injection',
            this.category,
            'medium',
            true,
            'LDAP-related functionality detected - potential LDAP injection risk',
            ['Manual testing recommended with LDAP injection payloads'],
            'Escape all user input used in LDAP queries. Use parameterized LDAP queries if available.',
            { recommendation: 'Test manually with LDAP injection payloads' }
          )
        );
      } else {
        results.push(
          this.createResult(
            'LDAP Injection',
            this.category,
            'info',
            false,
            'No obvious LDAP functionality detected',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'LDAP Injection',
          this.category,
          'info',
          false,
          `Could not test LDAP injection: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testCRLFInjection(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    const crlfPayloads = [
      '%0d%0aSet-Cookie:malicious=true',
      '%0aLocation:http://evil.com',
      '\\r\\nSet-Cookie:test=test',
    ];

    try {
      for (const payload of crlfPayloads.slice(0, 2)) {
        const testUrl = `${baseUrl}?redirect=${payload}`;
        const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        const headers = response?.headers() || {};

        // Check if malicious header was injected
        if (headers['set-cookie'] && /malicious|test/.test(headers['set-cookie'])) {
          results.push(
            this.createResult(
              'CRLF Injection',
              this.category,
              'high',
              true,
              'CRLF injection vulnerability detected - headers can be injected',
              [`URL: ${testUrl}`, `Payload: ${payload}`],
              'Sanitize all user input used in HTTP headers. Remove CR and LF characters.',
              { payload, url: testUrl }
            )
          );
          return results;
        }
      }

      results.push(
        this.createResult(
          'CRLF Injection',
          this.category,
          'info',
          false,
          'No CRLF injection vulnerabilities detected',
          []
        )
      );
    } catch (error) {
      results.push(
        this.createResult(
          'CRLF Injection',
          this.category,
          'info',
          false,
          `Could not test CRLF injection: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testFileUpload(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Find file upload inputs
      const fileInputs = await page.$$('input[type="file"]');

      if (fileInputs.length === 0) {
        results.push(
          this.createResult(
            'File Upload Validation',
            this.category,
            'info',
            false,
            'No file upload functionality found',
            []
          )
        );
        return results;
      }

      // Check for accept attribute
      const inputsWithoutRestriction = [];
      for (const input of fileInputs) {
        const accept = await input.getAttribute('accept');
        if (!accept) {
          inputsWithoutRestriction.push('input without accept attribute');
        }
      }

      if (inputsWithoutRestriction.length > 0) {
        results.push(
          this.createResult(
            'File Upload Validation',
            this.category,
            'medium',
            true,
            'File upload inputs lack client-side restrictions',
            [`Found ${inputsWithoutRestriction.length} file input(s) without accept attribute`],
            'Implement both client-side (accept attribute) and server-side file type validation. Validate file content, not just extension. Store uploads outside web root.',
            { count: inputsWithoutRestriction.length }
          )
        );
      } else {
        results.push(
          this.createResult(
            'File Upload Validation',
            this.category,
            'info',
            false,
            `File upload inputs have accept restrictions (but server-side validation still required)`,
            [`Found ${fileInputs.length} file input(s)`]
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'File Upload Validation',
          this.category,
          'info',
          false,
          `Could not test file upload: ${error}`,
          []
        )
      );
    }

    return results;
  }
}
