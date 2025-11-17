import { BaseTest, TestContext, TestResult } from '../types.js';
import { AIAutonomousTester, AITestResult } from '../ai-autonomous-tester.js';

export class AIAutonomousTests extends BaseTest {
  name = 'AI Autonomous Security Tests';
  category = 'AI-Powered';
  description = 'AI-driven autonomous penetration testing that adapts based on application behavior';

  private aiTester: AIAutonomousTester;

  constructor(apiKey?: string) {
    super();
    this.aiTester = new AIAutonomousTester(apiKey);
  }

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (!this.aiTester.isEnabled()) {
      console.log('    [AI Autonomous] Skipping - OpenAI API key not provided');
      return results;
    }

    const { page, baseUrl, crawlResults } = context;

    console.log('    [AI Autonomous] Starting autonomous penetration testing...');
    console.log('    [AI Autonomous] AI will analyze the page, generate attacks, and adapt based on responses');

    // Run autonomous tests on the base URL
    const autonomousResults = await this.aiTester.runAutonomousTests(page, baseUrl);

    for (const aiResult of autonomousResults) {
      const testResult = this.convertAIResultToTestResult(aiResult, baseUrl);
      results.push(testResult);
    }

    // Test additional pages from crawl results
    if (crawlResults && crawlResults.length > 0) {
      const pagesToTest = crawlResults.slice(0, 2); // Test up to 2 additional pages

      for (const crawlResult of pagesToTest) {
        console.log(`    [AI Autonomous] Testing ${crawlResult.url}...`);

        try {
          const pageResults = await this.aiTester.runAutonomousTests(page, crawlResult.url);

          for (const aiResult of pageResults) {
            const testResult = this.convertAIResultToTestResult(aiResult, crawlResult.url);
            results.push(testResult);
          }
        } catch (error) {
          console.log(`    [AI Autonomous] Error testing ${crawlResult.url}: ${error}`);
        }
      }
    }

    console.log(`    [AI Autonomous] Completed ${results.length} autonomous test scenarios`);

    return results;
  }

  private convertAIResultToTestResult(aiResult: AITestResult, url: string): TestResult {
    const severity = this.determineSeverity(aiResult);

    const result = this.createResult(
      aiResult.scenarioName,
      aiResult.attackType,
      severity,
      aiResult.success,
      aiResult.impact,
      aiResult.evidence,
      aiResult.success
        ? 'Review the vulnerability and implement proper security controls'
        : 'Continued monitoring recommended',
      {
        executed: aiResult.executed,
        aiResponse: aiResult.response,
        needsMoreTesting: aiResult.needsMoreTesting,
      }
    );

    // Mark as AI-suggested
    result.aiSuggested = true;
    result.aiReasoning = aiResult.reasoning;
    result.url = url;

    // Add remediation steps based on attack type
    if (aiResult.success) {
      result.remediationSteps = this.getRemediationSteps(aiResult.attackType);
      result.codeExample = this.getCodeExample(aiResult.attackType);
    }

    return result;
  }

  private determineSeverity(aiResult: AITestResult): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    if (!aiResult.success) {
      return 'info';
    }

    const attackType = aiResult.attackType.toLowerCase();

    // Critical: Authentication bypass, RCE, SQL injection with data access
    if (attackType.includes('auth') || attackType.includes('rce') || attackType.includes('sql injection')) {
      return 'critical';
    }

    // High: XSS, CSRF, information disclosure with sensitive data
    if (attackType.includes('xss') || attackType.includes('csrf') || attackType.includes('disclosure')) {
      return 'high';
    }

    // Medium: Business logic, DoS, session issues
    if (attackType.includes('business logic') || attackType.includes('dos') || attackType.includes('session')) {
      return 'medium';
    }

    return 'medium';
  }

  private getRemediationSteps(attackType: string): string[] {
    const type = attackType.toLowerCase();

    if (type.includes('sql')) {
      return [
        'Immediately switch to parameterized queries/prepared statements',
        'Never concatenate user input into SQL queries',
        'Implement input validation and whitelist allowed characters',
        'Use an ORM that handles SQL escaping automatically',
        'Apply principle of least privilege to database accounts',
        'Enable database query logging and monitoring'
      ];
    }

    if (type.includes('auth')) {
      return [
        'Review authentication logic and session management',
        'Implement proper access controls and authorization checks',
        'Use secure session tokens (HttpOnly, Secure, SameSite flags)',
        'Add multi-factor authentication for sensitive operations',
        'Implement rate limiting on authentication endpoints',
        'Log and monitor authentication attempts'
      ];
    }

    if (type.includes('business logic')) {
      return [
        'Review the business logic flow and identify assumptions',
        'Add server-side validation for all business rules',
        'Implement transaction integrity checks',
        'Add audit logging for all critical operations',
        'Consider race condition protection (locking, atomic operations)',
        'Test edge cases and boundary conditions'
      ];
    }

    if (type.includes('dos')) {
      return [
        'Implement rate limiting on all endpoints',
        'Add input size validation and limits',
        'Use request throttling and queuing',
        'Implement timeout protections',
        'Monitor resource usage and set alerts',
        'Consider using a CDN or DDoS protection service'
      ];
    }

    return [
      'Analyze the specific vulnerability identified by the AI',
      'Implement input validation and sanitization',
      'Follow OWASP security guidelines for this vulnerability type',
      'Add comprehensive logging and monitoring',
      'Conduct a security code review',
      'Implement automated security testing in CI/CD'
    ];
  }

  private getCodeExample(attackType: string): string {
    const type = attackType.toLowerCase();

    if (type.includes('sql')) {
      return `// UNSAFE - Vulnerable to SQL Injection
const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
db.query(query);

// SAFE - Using parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// SAFE - Using ORM
const user = await User.findByPk(userId);

// SAFE - Using Prisma
const user = await prisma.user.findUnique({
  where: { id: userId }
});`;
    }

    if (type.includes('auth')) {
      return `// UNSAFE - No authorization check
app.get('/admin/users', (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

// SAFE - With proper authorization
app.get('/admin/users', requireAuth, requireRole('admin'), (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

// SAFE - Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000
  }
}));`;
    }

    if (type.includes('business logic')) {
      return `// UNSAFE - Race condition vulnerability
app.post('/transfer', async (req, res) => {
  const { from, to, amount } = req.body;
  const balance = await getBalance(from);

  if (balance >= amount) {
    await deduct(from, amount);
    await credit(to, amount);
  }
});

// SAFE - Using database transaction
app.post('/transfer', async (req, res) => {
  const { from, to, amount } = req.body;

  await db.transaction(async (trx) => {
    const balance = await getBalance(from, { trx, lock: true });

    if (balance < amount) {
      throw new Error('Insufficient funds');
    }

    await deduct(from, amount, { trx });
    await credit(to, amount, { trx });
  });
});`;
    }

    return `// AI-detected vulnerability in ${attackType}
// Review the specific attack scenario and implement appropriate controls
// Consult OWASP guidelines for detailed remediation steps`;
  }
}
