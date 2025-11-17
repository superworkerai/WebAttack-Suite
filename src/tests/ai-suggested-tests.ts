import { BaseTest, TestContext, TestResult, Severity } from '../types.js';
import { AIAnalyzer, AITestSuggestion } from '../ai-analyzer.js';

export class AISuggestedTests extends BaseTest {
  name = 'AI-Suggested Security Tests';
  category = 'AI-Powered';
  description = 'AI-powered security test suggestions based on page analysis';

  private aiAnalyzer: AIAnalyzer;

  constructor(apiKey?: string) {
    super();
    this.aiAnalyzer = new AIAnalyzer(apiKey);
  }

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (!this.aiAnalyzer.isEnabled()) {
      console.log('    [AI] Skipping AI tests - OpenAI API key not provided');
      return results;
    }

    const { page, baseUrl, crawlResults } = context;

    // Analyze the base URL
    console.log('    [AI] Analyzing pages with OpenAI...');
    const suggestions = await this.aiAnalyzer.analyzePage(page, baseUrl);

    if (suggestions.length === 0) {
      console.log('    [AI] No test suggestions generated');
      return results;
    }

    console.log(`    [AI] Received ${suggestions.length} test suggestions`);

    // Execute each AI-suggested test
    for (const suggestion of suggestions) {
      try {
        const testResult = await this.executeSuggestion(context, suggestion, baseUrl);
        results.push(testResult);
      } catch (error) {
        console.log(`    [AI] Error executing suggestion: ${error}`);
      }
    }

    // If we have crawl results, analyze a few more pages
    if (crawlResults && crawlResults.length > 0) {
      const pagesToAnalyze = crawlResults.slice(0, 3); // Analyze up to 3 additional pages

      for (const crawlResult of pagesToAnalyze) {
        try {
          await page.goto(crawlResult.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
          const moreSuggestions = await this.aiAnalyzer.analyzePage(page, crawlResult.url);

          console.log(`    [AI] Received ${moreSuggestions.length} suggestions for ${crawlResult.url}`);

          for (const suggestion of moreSuggestions.slice(0, 2)) { // Execute top 2 per page
            try {
              const testResult = await this.executeSuggestion(context, suggestion, crawlResult.url);
              results.push(testResult);
            } catch (error) {
              console.log(`    [AI] Error executing suggestion: ${error}`);
            }
          }
        } catch (error) {
          console.log(`    [AI] Error analyzing ${crawlResult.url}: ${error}`);
        }
      }
    }

    return results;
  }

  private async executeSuggestion(
    context: TestContext,
    suggestion: AITestSuggestion,
    pageUrl: string
  ): Promise<TestResult> {
    const { page } = context;

    console.log(`    [AI] Executing: ${suggestion.testName}`);

    try {
      // Navigate to the page if needed
      if (page.url() !== pageUrl) {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      }

      let vulnerable = false;
      const evidence: string[] = [];

      // Try to execute the test based on target elements and payloads
      for (const selector of suggestion.targetElements.slice(0, 2)) {
        try {
          const element = await page.$(selector);
          if (!element) {
            evidence.push(`Element not found: ${selector}`);
            continue;
          }

          // Test with the provided payloads
          for (const payload of suggestion.testPayloads.slice(0, 2)) {
            try {
              // Set up dialog handler for XSS detection
              let dialogDetected = false;
              page.once('dialog', async dialog => {
                dialogDetected = true;
                await dialog.dismiss();
              });

              // Fill the element with the payload
              const tagName = await element.evaluate(el => el.tagName.toLowerCase());
              if (tagName === 'input' || tagName === 'textarea') {
                await element.fill(payload);
                await element.press('Enter');
              }

              await page.waitForTimeout(500);

              // Check for vulnerability indicators
              const content = await page.content();
              const isReflected = content.includes(payload);

              if (dialogDetected || isReflected) {
                vulnerable = true;
                evidence.push(`Payload "${payload}" triggered vulnerability in ${selector}`);
                evidence.push(`Dialog triggered: ${dialogDetected}, Reflected: ${isReflected}`);
                break;
              }
            } catch (error) {
              // Continue with next payload
            }
          }

          if (vulnerable) break;
        } catch (error) {
          evidence.push(`Could not test ${selector}: ${error}`);
        }
      }

      // If no elements found or tested, mark as informational
      if (evidence.length === 0) {
        evidence.push('Test executed but no vulnerability detected');
        evidence.push(`AI reasoning: ${suggestion.reasoning}`);
      }

      // Determine severity based on category
      let severity: Severity = 'medium';
      const categoryLower = suggestion.category.toLowerCase();
      if (categoryLower.includes('xss') || categoryLower.includes('sql') || categoryLower.includes('injection')) {
        severity = vulnerable ? 'high' : 'info';
      } else if (categoryLower.includes('authentication') || categoryLower.includes('authorization')) {
        severity = vulnerable ? 'critical' : 'info';
      } else {
        severity = vulnerable ? 'medium' : 'info';
      }

      const result = this.createResult(
        suggestion.testName,
        suggestion.category,
        severity,
        vulnerable,
        suggestion.expectedVulnerability,
        evidence,
        vulnerable
          ? 'Review and fix the vulnerability based on OWASP guidelines'
          : 'No immediate issues detected, but manual review recommended',
        {
          aiSuggestion: true,
          targetElements: suggestion.targetElements,
          payloads: suggestion.testPayloads,
        }
      );

      // Mark as AI-suggested
      result.aiSuggested = true;
      result.aiReasoning = suggestion.reasoning;
      result.url = pageUrl;

      if (vulnerable && suggestion.targetElements.length > 0) {
        result.vulnerableParameter = suggestion.targetElements[0];
      }

      // Add remediation steps if vulnerable
      if (vulnerable) {
        result.remediationSteps = [
          'Review the AI analysis and validate the vulnerability manually',
          'Implement input validation and sanitization for affected fields',
          'Follow OWASP guidelines for the specific vulnerability type',
          'Consider using security libraries and frameworks',
          'Perform penetration testing to confirm the fix'
        ];

        result.codeExample = `// AI-detected vulnerability
// Review the following:
// - Target elements: ${suggestion.targetElements.join(', ')}
// - Vulnerability type: ${suggestion.expectedVulnerability}
// - AI reasoning: ${suggestion.reasoning}

// Apply appropriate fixes based on the vulnerability type
// Consult OWASP guidelines for specific remediation steps`;
      }

      return result;

    } catch (error) {
      // Return error result
      const result = this.createResult(
        suggestion.testName,
        suggestion.category,
        'info',
        false,
        `Failed to execute AI-suggested test: ${error}`,
        [`Error: ${error}`],
        'Manual investigation required',
        { aiSuggestion: true, error: String(error) }
      );

      result.aiSuggested = true;
      result.aiReasoning = suggestion.reasoning;
      result.url = pageUrl;

      return result;
    }
  }
}
