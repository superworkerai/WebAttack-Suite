import OpenAI from 'openai';
import { Page } from 'playwright';

export interface AITestSuggestion {
  testName: string;
  category: string;
  reasoning: string;
  targetElements: string[];
  testPayloads: string[];
  expectedVulnerability: string;
}

export class AIAnalyzer {
  private openai: OpenAI | null = null;
  private enabled: boolean = false;

  constructor(apiKey?: string) {
    if (apiKey && apiKey.trim().length > 0) {
      this.openai = new OpenAI({ apiKey });
      this.enabled = true;
      console.log('[AI] OpenAI integration enabled');
    } else {
      console.log('[AI] OpenAI API key not provided, AI features disabled');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async analyzePage(page: Page, url: string): Promise<AITestSuggestion[]> {
    if (!this.enabled || !this.openai) {
      return [];
    }

    try {
      console.log(`[AI] Analyzing page: ${url}`);

      // Get page HTML and visible text
      const pageContent = await page.content();
      const pageText = await page.evaluate(() => document.body.innerText);

      // Truncate if too long (OpenAI has token limits)
      const maxContentLength = 15000;
      const truncatedHTML = pageContent.length > maxContentLength
        ? pageContent.substring(0, maxContentLength) + '...[truncated]'
        : pageContent;

      const prompt = `You are a security testing expert analyzing a web page for vulnerabilities.

URL: ${url}

Page HTML (truncated):
${truncatedHTML}

Visible Text:
${pageText.substring(0, 2000)}

Based on this page structure, suggest 3-5 specific security tests that should be performed. Focus on:
1. Input validation vulnerabilities (XSS, SQL injection, command injection)
2. Authentication and authorization issues
3. Business logic flaws
4. API endpoint security
5. Client-side security issues

For each test suggestion, provide:
- Test name (concise, specific)
- Category (e.g., "XSS", "Authentication", "Business Logic")
- Reasoning (why this test is relevant for THIS specific page)
- Target elements (CSS selectors or element descriptions)
- Test payloads (specific attack strings to try)
- Expected vulnerability type

Return ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "testName": "Test Name",
      "category": "Category",
      "reasoning": "Why this test matters for this page",
      "targetElements": ["#element-id", ".class-name"],
      "testPayloads": ["payload1", "payload2"],
      "expectedVulnerability": "vulnerability description"
    }
  ]
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a security testing expert. Return only valid JSON responses with no additional text or markdown.'
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
        console.log('[AI] No response from OpenAI');
        return [];
      }

      // Parse JSON response
      let parsed;
      try {
        // Remove markdown code blocks if present
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.log('[AI] Failed to parse OpenAI response as JSON:', parseError);
        console.log('[AI] Raw response:', content);
        return [];
      }

      const suggestions: AITestSuggestion[] = parsed.suggestions || [];
      console.log(`[AI] Generated ${suggestions.length} test suggestions for ${url}`);

      return suggestions;

    } catch (error) {
      console.log(`[AI] Error analyzing page: ${error}`);
      return [];
    }
  }

  async analyzeMultiplePages(pages: Array<{ page: Page; url: string }>): Promise<Map<string, AITestSuggestion[]>> {
    const results = new Map<string, AITestSuggestion[]>();

    for (const { page, url } of pages) {
      const suggestions = await this.analyzePage(page, url);
      if (suggestions.length > 0) {
        results.set(url, suggestions);
      }

      // Rate limiting - wait a bit between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }
}
