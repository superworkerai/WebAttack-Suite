import OpenAI from 'openai';
import { Page } from 'playwright';

export interface AITestAction {
  type: 'fill' | 'click' | 'navigate' | 'wait' | 'select' | 'evaluate';
  selector?: string;
  value?: string;
  code?: string;
  url?: string;
  timeout?: number;
  description: string;
}

export interface AITestScenario {
  scenarioName: string;
  attackType: string;
  reasoning: string;
  expectedImpact: string;
  actions: AITestAction[];
}

export interface AITestResult {
  scenarioName: string;
  attackType: string;
  reasoning: string;
  executed: boolean;
  success: boolean;
  impact: string;
  evidence: string[];
  response: string;
  needsMoreTesting: boolean;
  followUpScenario?: AITestScenario;
}

export class AIAutonomousTester {
  private openai: OpenAI | null = null;
  private enabled: boolean = false;
  private maxIterations: number = 2;

  constructor(apiKey?: string) {
    if (apiKey && apiKey.trim().length > 0) {
      this.openai = new OpenAI({ apiKey });
      this.enabled = true;
      console.log('[AI Autonomous] AI-driven autonomous testing enabled');
    } else {
      console.log('[AI Autonomous] OpenAI API key not provided, autonomous testing disabled');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async analyzePage(page: Page, url: string): Promise<AITestScenario[]> {
    if (!this.enabled || !this.openai) {
      return [];
    }

    try {
      console.log(`[AI Autonomous] Analyzing ${url} for attack vectors...`);

      const pageContent = await page.content();
      const pageText = await page.evaluate(() => document.body.innerText);

      // Get interactive elements
      const interactiveElements = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action,
          method: form.method,
          fields: Array.from(form.querySelectorAll('input, textarea, select')).map((el: any) => ({
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }))
        }));

        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]')).map((btn: any) => ({
          text: btn.textContent?.trim(),
          type: btn.type,
          id: btn.id,
          name: btn.name
        }));

        const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 20).map((a: any) => ({
          text: a.textContent?.trim(),
          href: a.href
        }));

        return { forms, buttons, links };
      });

      const truncatedHTML = pageContent.length > 8000
        ? pageContent.substring(0, 8000) + '...[truncated]'
        : pageContent;

      const prompt = `You are an expert penetration tester analyzing a web application to find vulnerabilities that could break or compromise it.

URL: ${url}

Interactive Elements:
${JSON.stringify(interactiveElements, null, 2)}

Page HTML (truncated):
${truncatedHTML}

Visible Text:
${pageText.substring(0, 1500)}

Your goal is to think like a real user AND an attacker. Analyze:
1. How would legitimate users interact with this page?
2. What business logic exists here?
3. What could go wrong if inputs are malicious?
4. What attacks could BREAK the application (not just test for XSS)?

Focus on attacks that could:
- Crash the application or database
- Bypass authentication/authorization
- Exploit business logic flaws
- Cause denial of service
- Manipulate data in dangerous ways
- Exploit race conditions
- Break session management

Generate 2-3 SPECIFIC attack scenarios with step-by-step Playwright actions.

For each scenario, provide:
1. Scenario name
2. Attack type (SQL Injection, Business Logic, DoS, Auth Bypass, etc.)
3. Why this specific page is vulnerable to this attack
4. Expected impact (what breaks?)
5. Exact step-by-step actions to execute

Return ONLY valid JSON in this format:
{
  "scenarios": [
    {
      "scenarioName": "Short descriptive name",
      "attackType": "Attack category",
      "reasoning": "Why THIS page is vulnerable to THIS attack",
      "expectedImpact": "What will break or be compromised",
      "actions": [
        {
          "type": "fill|click|navigate|select|wait|evaluate",
          "selector": "CSS selector (for fill/click/select)",
          "value": "Value to enter (for fill/select)",
          "url": "URL (for navigate)",
          "timeout": 5000,
          "code": "JavaScript code (for evaluate)",
          "description": "What this action does"
        }
      ]
    }
  ]
}

Be creative and think about:
- Submitting forms with extreme values (negative numbers, huge strings, special chars)
- Bypassing client-side validation
- Manipulating hidden fields
- Exploiting race conditions (submit multiple times rapidly)
- Testing authorization (accessing resources without proper auth)
- Breaking session handling
- Exploiting file uploads
- Testing rate limiting`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert penetration tester. Return only valid JSON with no markdown or additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.log('[AI Autonomous] No response from OpenAI');
        return [];
      }

      let parsed;
      try {
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.log('[AI Autonomous] Failed to parse OpenAI response:', parseError);
        return [];
      }

      const scenarios: AITestScenario[] = parsed.scenarios || [];
      console.log(`[AI Autonomous] Generated ${scenarios.length} attack scenarios`);

      return scenarios;

    } catch (error) {
      console.log(`[AI Autonomous] Error analyzing page: ${error}`);
      return [];
    }
  }

  async executeScenario(page: Page, scenario: AITestScenario, url: string): Promise<AITestResult> {
    console.log(`[AI Autonomous] Executing: ${scenario.scenarioName}`);

    const evidence: string[] = [];
    let success = false;
    let responseDescription = '';

    try {
      // Navigate to the page if needed
      if (page.url() !== url) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }

      // Execute each action in the scenario
      for (const action of scenario.actions) {
        try {
          evidence.push(`Action: ${action.description}`);

          switch (action.type) {
            case 'fill':
              if (action.selector && action.value) {
                const element = await page.$(action.selector);
                if (element) {
                  await element.fill(action.value);
                  evidence.push(`✓ Filled ${action.selector} with: ${action.value.substring(0, 100)}`);
                } else {
                  evidence.push(`✗ Element not found: ${action.selector}`);
                }
              }
              break;

            case 'click':
              if (action.selector) {
                const element = await page.$(action.selector);
                if (element) {
                  await element.click();
                  evidence.push(`✓ Clicked: ${action.selector}`);

                  // Wait for navigation or response
                  await page.waitForTimeout(action.timeout || 2000);
                } else {
                  evidence.push(`✗ Element not found: ${action.selector}`);
                }
              }
              break;

            case 'select':
              if (action.selector && action.value) {
                await page.selectOption(action.selector, action.value);
                evidence.push(`✓ Selected ${action.value} in ${action.selector}`);
              }
              break;

            case 'navigate':
              if (action.url) {
                await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                evidence.push(`✓ Navigated to: ${action.url}`);
              }
              break;

            case 'wait':
              await page.waitForTimeout(action.timeout || 1000);
              evidence.push(`✓ Waited ${action.timeout}ms`);
              break;

            case 'evaluate':
              if (action.code) {
                const result = await page.evaluate(action.code);
                evidence.push(`✓ Executed JS: ${result}`);
              }
              break;
          }
        } catch (actionError) {
          evidence.push(`✗ Error: ${actionError}`);
        }
      }

      // Capture the final state
      const finalContent = await page.content();
      const finalUrl = page.url();
      const statusCode = await page.evaluate(() => {
        return (window.performance.getEntries().find(e => e.entryType === 'navigation') as any)?.responseStatus || 200;
      });

      evidence.push(`Final URL: ${finalUrl}`);
      evidence.push(`Status: ${statusCode}`);

      // Check for common vulnerability indicators
      const indicators = {
        sqlError: /SQL syntax|mysql_|PostgreSQL|SQLite|Oracle error|ODBC/i.test(finalContent),
        stackTrace: /Exception|Error:|at.*\(.*:\d+:\d+\)|Traceback/i.test(finalContent),
        serverError: statusCode >= 500,
        unexpectedRedirect: finalUrl !== url && !scenario.actions.some(a => a.type === 'navigate'),
        sessionIssue: /unauthorized|forbidden|access denied/i.test(finalContent),
      };

      if (indicators.sqlError) {
        success = true;
        responseDescription = 'SQL error detected - potential SQL injection vulnerability';
        evidence.push('🚨 SQL error messages found in response');
      } else if (indicators.stackTrace) {
        success = true;
        responseDescription = 'Stack trace exposed - information disclosure vulnerability';
        evidence.push('🚨 Stack trace or error details exposed');
      } else if (indicators.serverError) {
        success = true;
        responseDescription = 'Server error triggered - potential DoS or crash vulnerability';
        evidence.push('🚨 Server returned 500 error');
      } else if (indicators.unexpectedRedirect) {
        success = true;
        responseDescription = 'Unexpected redirect - potential authentication bypass or logic flaw';
        evidence.push('🚨 Unexpected redirect occurred');
      } else {
        responseDescription = 'Attack executed but no obvious vulnerability detected';
        evidence.push('ℹ️ No obvious vulnerability indicators found');
      }

      // Send results to AI for analysis
      const aiAnalysis = await this.analyzeResults(scenario, evidence, finalContent, url);

      return {
        scenarioName: scenario.scenarioName,
        attackType: scenario.attackType,
        reasoning: scenario.reasoning,
        executed: true,
        success: aiAnalysis.vulnerable,
        impact: aiAnalysis.impact,
        evidence: evidence,
        response: responseDescription,
        needsMoreTesting: aiAnalysis.needsMoreTesting,
        followUpScenario: aiAnalysis.followUpScenario,
      };

    } catch (error) {
      evidence.push(`Execution failed: ${error}`);

      return {
        scenarioName: scenario.scenarioName,
        attackType: scenario.attackType,
        reasoning: scenario.reasoning,
        executed: false,
        success: false,
        impact: 'Test execution failed',
        evidence: evidence,
        response: `Error: ${error}`,
        needsMoreTesting: false,
      };
    }
  }

  private async analyzeResults(
    scenario: AITestScenario,
    evidence: string[],
    responseContent: string,
    originalUrl: string
  ): Promise<{
    vulnerable: boolean;
    impact: string;
    needsMoreTesting: boolean;
    followUpScenario?: AITestScenario;
  }> {
    if (!this.enabled || !this.openai) {
      return { vulnerable: false, impact: 'Unknown', needsMoreTesting: false };
    }

    try {
      const truncatedResponse = responseContent.length > 5000
        ? responseContent.substring(0, 5000) + '...[truncated]'
        : responseContent;

      const prompt = `You are analyzing the results of a penetration test attack.

Original Attack:
- Scenario: ${scenario.scenarioName}
- Attack Type: ${scenario.attackType}
- Expected Impact: ${scenario.expectedImpact}
- Actions Taken: ${scenario.actions.map(a => a.description).join(', ')}

Execution Evidence:
${evidence.join('\n')}

Server Response (truncated):
${truncatedResponse}

Analyze the results and determine:
1. Was the attack successful? Did we find a vulnerability?
2. What is the actual impact/severity?
3. Should we do more testing? (we can do 1 more round max)
4. If yes, what specific follow-up attack should we try?

Return ONLY valid JSON:
{
  "vulnerable": true/false,
  "impact": "Description of what was compromised or broken",
  "confidence": "high/medium/low",
  "needsMoreTesting": true/false,
  "followUpScenario": {
    "scenarioName": "Name",
    "attackType": "Type",
    "reasoning": "Why try this next",
    "expectedImpact": "What we expect",
    "actions": [...]
  }
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a penetration testing analyst. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { vulnerable: false, impact: 'Analysis failed', needsMoreTesting: false };
      }

      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedContent);

      return {
        vulnerable: parsed.vulnerable || false,
        impact: parsed.impact || 'Unknown',
        needsMoreTesting: parsed.needsMoreTesting || false,
        followUpScenario: parsed.followUpScenario,
      };

    } catch (error) {
      console.log(`[AI Autonomous] Error analyzing results: ${error}`);
      return { vulnerable: false, impact: 'Analysis error', needsMoreTesting: false };
    }
  }

  async runAutonomousTests(page: Page, url: string): Promise<AITestResult[]> {
    if (!this.enabled) {
      return [];
    }

    const allResults: AITestResult[] = [];

    // Get initial attack scenarios
    const initialScenarios = await this.analyzePage(page, url);

    for (const scenario of initialScenarios) {
      let result = await this.executeScenario(page, scenario, url);
      allResults.push(result);

      // If AI thinks we need more testing and we haven't hit max iterations
      if (result.needsMoreTesting && result.followUpScenario && allResults.length < this.maxIterations * initialScenarios.length) {
        console.log(`[AI Autonomous] AI requested follow-up test: ${result.followUpScenario.scenarioName}`);

        const followUpResult = await this.executeScenario(page, result.followUpScenario, url);
        allResults.push(followUpResult);
      }
    }

    return allResults;
  }
}
