import { BaseTest, TestContext, TestResult } from '../types.js';

export class BusinessLogicTests extends BaseTest {
  name = 'Business Logic Tests';
  category = 'Business Logic';
  description = 'Tests for business logic flaws including rate limiting, input boundaries, and workflow issues';

  async run(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Rate limiting
    results.push(...await this.testRateLimiting(context));

    // Test 2: Input boundary testing
    results.push(...await this.testInputBoundaries(context));

    // Test 3: Price manipulation
    results.push(...await this.testPriceManipulation(context));

    // Test 4: Negative values
    results.push(...await this.testNegativeValues(context));

    return results;
  }

  private async testRateLimiting(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      // Make rapid requests to test rate limiting
      const requests = 20;
      let blockedCount = 0;
      let successCount = 0;

      for (let i = 0; i < requests; i++) {
        try {
          const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
          const status = response?.status() || 0;

          if (status === 429 || status === 503) {
            blockedCount++;
          } else if (status === 200) {
            successCount++;
          }
        } catch (error) {
          // Continue
        }
      }

      if (blockedCount === 0) {
        results.push(
          this.createResult(
            'Rate Limiting',
            this.category,
            'medium',
            true,
            `No rate limiting detected after ${requests} rapid requests`,
            [`All ${successCount} requests succeeded without throttling`],
            'Implement rate limiting to prevent abuse. Use algorithms like token bucket or sliding window.',
            { requests, successCount, blockedCount }
          )
        );
      } else {
        results.push(
          this.createResult(
            'Rate Limiting',
            this.category,
            'info',
            false,
            'Rate limiting appears to be implemented',
            [`${blockedCount} out of ${requests} requests were rate-limited`],
            undefined,
            { requests, successCount, blockedCount }
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Rate Limiting',
          this.category,
          'info',
          false,
          `Could not test rate limiting: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testInputBoundaries(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Find numeric input fields
      const numericInputs = await page.$$('input[type="number"], input[type="tel"]');

      if (numericInputs.length === 0) {
        results.push(
          this.createResult(
            'Input Boundary Validation',
            this.category,
            'info',
            false,
            'No numeric input fields found to test',
            []
          )
        );
        return results;
      }

      // Test boundary values
      const boundaryTests = [
        { value: '0', description: 'zero' },
        { value: '-1', description: 'negative' },
        { value: '999999999', description: 'very large number' },
        { value: '2147483647', description: 'max int32' },
        { value: '2147483648', description: 'max int32 + 1' },
      ];

      const issues: string[] = [];

      for (const input of numericInputs.slice(0, 2)) {
        for (const test of boundaryTests) {
          try {
            await input.fill(test.value);
            const actualValue = await input.inputValue();

            // Check if the value was accepted
            if (actualValue === test.value) {
              // Value accepted, check if it causes errors
              await page.keyboard.press('Tab');
              await page.waitForTimeout(200);

              const content = await page.content();
              if (!/invalid|error|out of range/i.test(content)) {
                issues.push(`${test.description} value (${test.value}) accepted without validation warning`);
              }
            }
          } catch (error) {
            // Continue testing
          }
        }
      }

      if (issues.length > 0) {
        results.push(
          this.createResult(
            'Input Boundary Validation',
            this.category,
            'low',
            true,
            'Weak input boundary validation detected',
            issues.slice(0, 5),
            'Implement proper boundary checks for all numeric inputs. Validate ranges on both client and server side.',
            { issues: issues.length }
          )
        );
      } else {
        results.push(
          this.createResult(
            'Input Boundary Validation',
            this.category,
            'info',
            false,
            'Input boundary validation appears adequate',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Input Boundary Validation',
          this.category,
          'info',
          false,
          `Could not test input boundaries: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testPriceManipulation(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Look for price-related fields
      const content = await page.content();
      const inputs = await page.$$('input');

      const priceFields: any[] = [];

      for (const input of inputs) {
        const name = await input.getAttribute('name');
        const id = await input.getAttribute('id');
        const type = await input.getAttribute('type');

        if (
          name && (/price|cost|amount|total/i.test(name)) ||
          id && (/price|cost|amount|total/i.test(id))
        ) {
          priceFields.push({ name, id, type });
        }
      }

      if (priceFields.length === 0) {
        results.push(
          this.createResult(
            'Price Manipulation',
            this.category,
            'info',
            false,
            'No obvious price fields found',
            []
          )
        );
        return results;
      }

      // Check if price fields are client-side modifiable
      const modifiableFields = priceFields.filter(f =>
        f.type !== 'hidden' && f.type !== 'readonly'
      );

      if (modifiableFields.length > 0) {
        results.push(
          this.createResult(
            'Price Manipulation',
            this.category,
            'high',
            true,
            'Price fields appear to be client-side modifiable',
            modifiableFields.map(f => `Field: ${f.name || f.id} (type: ${f.type})`),
            'Always validate and calculate prices server-side. Never trust client-provided prices.',
            { modifiableFields: modifiableFields.length }
          )
        );
      } else {
        results.push(
          this.createResult(
            'Price Manipulation',
            this.category,
            'info',
            false,
            'Price fields appear to be protected (hidden/readonly)',
            [`Found ${priceFields.length} price field(s)`],
            'Ensure server-side validation is also in place'
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Price Manipulation',
          this.category,
          'info',
          false,
          `Could not test price manipulation: ${error}`,
          []
        )
      );
    }

    return results;
  }

  private async testNegativeValues(context: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const { page, baseUrl } = context;

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Find quantity/amount fields
      const inputs = await page.$$('input[type="number"]');

      if (inputs.length === 0) {
        results.push(
          this.createResult(
            'Negative Value Validation',
            this.category,
            'info',
            false,
            'No number input fields found to test',
            []
          )
        );
        return results;
      }

      const issues: string[] = [];

      for (const input of inputs.slice(0, 3)) {
        try {
          const name = await input.getAttribute('name');
          const min = await input.getAttribute('min');

          // Try to enter negative value
          await input.fill('-1');
          const value = await input.inputValue();

          if (value === '-1' && !min) {
            issues.push(`Field ${name || 'unknown'} accepts negative values without min attribute`);
          }
        } catch (error) {
          // Continue
        }
      }

      if (issues.length > 0) {
        results.push(
          this.createResult(
            'Negative Value Validation',
            this.category,
            'low',
            true,
            'Some numeric fields accept negative values',
            issues,
            'Set min attribute on numeric inputs and validate server-side to prevent negative quantities/amounts.',
            { issues: issues.length }
          )
        );
      } else {
        results.push(
          this.createResult(
            'Negative Value Validation',
            this.category,
            'info',
            false,
            'Numeric fields appear to have proper validation',
            []
          )
        );
      }
    } catch (error) {
      results.push(
        this.createResult(
          'Negative Value Validation',
          this.category,
          'info',
          false,
          `Could not test negative values: ${error}`,
          []
        )
      );
    }

    return results;
  }
}
