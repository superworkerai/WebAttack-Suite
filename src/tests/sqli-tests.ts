import { BaseTest, TestContext, TestResult } from '../types.js';

export class SQLiTests extends BaseTest {
  name = 'SQL Injection Tests';
  category = 'Injection';
  description = 'Tests for SQL injection vulnerabilities';

  private sqliPayloads = [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "admin' --",
    "admin' #",
    "admin'/*",
    "' or 1=1--",
    "' or 1=1#",
    "' or 1=1/*",
    "') or '1'='1--",
    "') or ('1'='1--",
    "1' AND '1'='1",
    "1' AND '1'='2",
    "' UNION SELECT NULL--",
    "' UNION SELECT NULL,NULL--",
    "' UNION SELECT NULL,NULL,NULL--",
    "' AND 1=CONVERT(int, (SELECT @@version))--",
    "' WAITFOR DELAY '0:0:5'--",
    "1; DROP TABLE users--",
    "1' ORDER BY 1--",
    "1' ORDER BY 2--",
    "1' ORDER BY 3--",
    "' AND SLEEP(5)--",
    "' AND BENCHMARK(1000000,MD5('A'))--",
    "' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
  ];

  private errorPatterns = [
    /SQL syntax.*?error/i,
    /Warning.*?mysql_/i,
    /valid MySQL result/i,
    /MySqlClient\./i,
    /PostgreSQL.*?ERROR/i,
    /Warning.*?pg_/i,
    /valid PostgreSQL result/i,
    /Npgsql\./i,
    /Driver.*?SQL.*?Server/i,
    /OLE DB.*?SQL Server/i,
    /SQL Server.*?Driver/i,
    /Warning.*?mssql_/i,
    /Warning.*?odbc_/i,
    /Microsoft OLE DB Provider for ODBC Drivers/i,
    /Microsoft OLE DB Provider for SQL Server/i,
    /Unclosed quotation mark/i,
    /quoted string not properly terminated/i,
    /SQLite\/JDBCDriver/i,
    /SQLite.Exception/i,
    /System.Data.SQLite.SQLiteException/i,
    /Warning.*?sqlite_/i,
    /Warning.*?SQLite3::/i,
    /SQLITE_ERROR/i,
    /Oracle error/i,
    /Oracle.*?Driver/i,
    /Warning.*?oci_/i,
    /Warning.*?ora_/i,
  ];

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Error-based SQL injection in URL parameters
    results.push(...await this.testURLParameterSQLi(context));

    // Test 2: Time-based blind SQL injection
    results.push(...await this.testTimeBasedSQLi(context));

    // Test 3: SQL injection in forms
    results.push(...await this.testFormSQLi(context));

    return results;
  }

  private async testURLParameterSQLi(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    // Test common parameter names
    const commonParams = ['id', 'user', 'q', 'search', 'name', 'page', 'category'];

    for (const param of commonParams.slice(0, 3)) {
      for (const payload of this.sqliPayloads.slice(0, 5)) {
        try {
          const testUrl = `${baseUrl}?${param}=${encodeURIComponent(payload)}`;
          const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          const content = await page.content();

          // Check for SQL error messages
          for (const pattern of this.errorPatterns) {
            if (pattern.test(content)) {
              const result = this.createResult(
                'Error-based SQL Injection',
                this.category,
                'critical',
                true,
                `SQL injection vulnerability detected via error message`,
                [
                  `URL: ${testUrl}`,
                  `Payload: ${payload}`,
                  `Error pattern matched: ${pattern}`,
                ],
                'Use parameterized queries (prepared statements) for all database operations. Never concatenate user input into SQL queries.',
                { param, payload, url: testUrl }
              );
              result.url = testUrl;
              result.vulnerableParameter = param;
              result.remediationSteps = [
                `Replace string concatenation with parameterized queries for the '${param}' parameter`,
                'Use prepared statements or ORM query builders that automatically handle escaping',
                'Implement input validation to reject special SQL characters if not using parameterized queries',
                'Apply the principle of least privilege to database user accounts',
                'Enable database error logging but avoid exposing detailed errors to users'
              ];
              result.codeExample = `// UNSAFE - Vulnerable to SQL injection
const query = "SELECT * FROM users WHERE id = '" + req.query.${param} + "'";
db.query(query);

// SAFE - Using parameterized queries
// Node.js with mysql2
const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [req.query.${param}]);

// SAFE - Using Sequelize ORM
const user = await User.findOne({
  where: { id: req.query.${param} }
});

// SAFE - Using Prisma
const user = await prisma.user.findUnique({
  where: { id: req.query.${param} }
});`;
              results.push(result);
              return results; // Found vulnerability, stop testing
            }
          }

          // Check for abnormal response
          const status = response?.status() || 0;
          if (status === 500) {
            results.push(
              this.createResult(
                'Potential SQL Injection',
                this.category,
                'medium',
                true,
                `Server error (500) triggered by SQL payload - potential SQLi`,
                [`URL: ${testUrl}`, `Payload: ${payload}`],
                'Investigate the server error. Use parameterized queries.',
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
          'Error-based SQL Injection',
          this.category,
          'info',
          false,
          'No error-based SQL injection vulnerabilities detected in URL parameters',
          []
        )
      );
    }

    return results;
  }

  private async testTimeBasedSQLi(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    // Time-based payloads
    const timePayloads = [
      "1' AND SLEEP(5)--",
      "1' WAITFOR DELAY '0:0:5'--",
      "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
    ];

    try {
      // Test with a parameter
      for (const payload of timePayloads.slice(0, 2)) {
        const testUrl = `${baseUrl}?id=${encodeURIComponent(payload)}`;
        const startTime = Date.now();

        try {
          await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          const duration = Date.now() - startTime;

          // If response took significantly longer (>4 seconds), might be vulnerable
          if (duration > 4000) {
            results.push(
              this.createResult(
                'Time-based Blind SQL Injection',
                this.category,
                'critical',
                true,
                `Time-based blind SQL injection detected - response delayed by ${(duration / 1000).toFixed(1)}s`,
                [`URL: ${testUrl}`, `Payload: ${payload}`, `Duration: ${duration}ms`],
                'Use parameterized queries. Implement timeout controls on database queries.',
                { payload, duration, url: testUrl }
              )
            );
            return results;
          }
        } catch (error) {
          // Timeout might also indicate vulnerability
          if (error instanceof Error && error.message.includes('timeout')) {
            results.push(
              this.createResult(
                'Time-based Blind SQL Injection',
                this.category,
                'high',
                true,
                `Potential time-based blind SQL injection - request timed out`,
                [`URL: ${testUrl}`, `Payload: ${payload}`],
                'Use parameterized queries. Implement timeout controls on database queries.',
                { payload, url: testUrl }
              )
            );
            return results;
          }
        }
      }
    } catch (error) {
      // Error testing
    }

    if (results.length === 0) {
      results.push(
        this.createResult(
          'Time-based Blind SQL Injection',
          this.category,
          'info',
          false,
          'No time-based SQL injection vulnerabilities detected',
          []
        )
      );
    }

    return results;
  }

  private async testFormSQLi(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl, discoveredForms } = context;

    try {
      // Use discovered forms from crawler if available
      if (discoveredForms && discoveredForms.length > 0) {
        console.log(`    Testing ${Math.min(discoveredForms.length, 5)} discovered forms`);

        for (const form of discoveredForms.slice(0, 5)) {
          try {
            await page.goto(form.url, { waitUntil: 'domcontentloaded', timeout: 10000 });

            for (const payload of this.sqliPayloads.slice(0, 3)) {
              try {
                // Fill all form inputs with the payload
                for (const input of form.inputs.slice(0, 2)) {
                  const element = await page.$(input.selector);
                  if (element) {
                    await element.fill(payload);
                  }
                }

                // Try to submit the form
                const submitButton = await page.$('button[type="submit"], input[type="submit"]');
                if (submitButton) {
                  await submitButton.click();
                  await page.waitForTimeout(500);

                  const content = await page.content();

                  // Check for SQL errors
                  for (const pattern of this.errorPatterns) {
                    if (pattern.test(content)) {
                      results.push(
                        this.createResult(
                          'Form SQL Injection',
                          this.category,
                          'critical',
                          true,
                          `SQL injection vulnerability detected in form`,
                          [
                            `URL: ${form.url}`,
                            `Payload: ${payload}`,
                            `Error pattern matched: ${pattern}`
                          ],
                          'Use parameterized queries for all form data processing.',
                          { payload, url: form.url }
                        )
                      );
                      return results;
                    }
                  }
                }
              } catch (error) {
                // Continue testing
              }
            }
          } catch (error) {
            // Continue to next form
          }
        }

        if (results.length === 0) {
          results.push(
            this.createResult(
              'Form SQL Injection',
              this.category,
              'info',
              false,
              `No SQL injection vulnerabilities detected in ${Math.min(discoveredForms.length, 5)} form(s)`,
              []
            )
          );
        }
        return results;
      }

      // Fallback to original method
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Find forms
      const forms = await page.$$('form');

      if (forms.length === 0) {
        results.push(
          this.createResult(
            'Form SQL Injection',
            this.category,
            'info',
            false,
            'No forms found to test',
            []
          )
        );
        return results;
      }

      // Test first form with SQL payloads
      const inputs = await page.$$('input[type="text"], input[type="password"], input[type="email"]');

      if (inputs.length > 0) {
        for (const payload of this.sqliPayloads.slice(0, 3)) {
          try {
            // Fill all inputs with the payload
            for (const input of inputs.slice(0, 2)) {
              await input.fill(payload);
            }

            // Submit the form
            const submitButton = await page.$('button[type="submit"], input[type="submit"]');
            if (submitButton) {
              await submitButton.click();
              await page.waitForTimeout(500);

              const content = await page.content();

              // Check for SQL errors
              for (const pattern of this.errorPatterns) {
                if (pattern.test(content)) {
                  results.push(
                    this.createResult(
                      'Form SQL Injection',
                      this.category,
                      'critical',
                      true,
                      `SQL injection vulnerability detected in form submission`,
                      [`Payload: ${payload}`, `Error pattern matched: ${pattern}`],
                      'Use parameterized queries for all form data processing.',
                      { payload }
                    )
                  );
                  return results;
                }
              }
            }
          } catch (error) {
            // Continue testing
          }
        }
      }

      if (results.length === 0) {
        results.push(
          this.createResult(
            'Form SQL Injection',
            this.category,
            'info',
            false,
            `No SQL injection vulnerabilities detected in ${forms.length} form(s)`,
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Form SQL Injection',
          this.category,
          'info',
          false,
          `Could not test form SQL injection: ${error}`,
          []
        )
      );
    }

    return results;
  }
}
