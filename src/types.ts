import { Page, Browser } from 'playwright';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface TestResult {
  testName: string;
  category: string;
  severity: Severity;
  passed: boolean;
  vulnerable: boolean;
  description: string;
  evidence?: string[];
  recommendation?: string;
  timestamp: string;
  duration: number;
  details?: Record<string, any>;
}

export interface TestReport {
  targetUrl: string;
  scanStartTime: string;
  scanEndTime: string;
  totalDuration: number;
  testResults: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export interface TestConfig {
  targetUrl: string;
  maxConcurrency?: number;
  timeout?: number;
  headless?: boolean;
  userAgent?: string;
  credentials?: {
    username: string;
    password: string;
  };
  customHeaders?: Record<string, string>;
  excludeTests?: string[];
  includeTests?: string[];
  outputDir?: string;
}

export interface TestContext {
  page: Page;
  browser: Browser;
  config: TestConfig;
  baseUrl: string;
}

export abstract class BaseTest {
  abstract name: string;
  abstract category: string;
  abstract description: string;

  abstract run(context: TestContext): Promise<TestResult[]>;

  protected createResult(
    testName: string,
    category: string,
    severity: Severity,
    vulnerable: boolean,
    description: string,
    evidence?: string[],
    recommendation?: string,
    details?: Record<string, any>
  ): TestResult {
    return {
      testName,
      category,
      severity,
      passed: !vulnerable,
      vulnerable,
      description,
      evidence,
      recommendation,
      timestamp: new Date().toISOString(),
      duration: 0,
      details,
    };
  }

  protected async safeExecute<T>(
    operation: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return fallback;
    }
  }
}
