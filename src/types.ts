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
  // Enhanced details for better reporting
  url?: string;  // Exact URL where the issue was found
  vulnerableParameter?: string;  // The specific parameter/field that's vulnerable
  remediationSteps?: string[];  // Step-by-step fix instructions
  codeExample?: string;  // Code example for fix
  aiSuggested?: boolean;  // Whether this test was suggested by AI
  aiReasoning?: string;  // Why AI suggested this test
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

export interface CrawlResult {
  url: string;
  inputs: InputField[];
  forms: FormInfo[];
  links: string[];
}

export interface InputField {
  url: string;
  type: string;
  name: string;
  id?: string;
  selector: string;
}

export interface FormInfo {
  url: string;
  action?: string;
  method: string;
  inputs: InputField[];
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
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
  }>;
  customHeaders?: Record<string, string>;
  excludeTests?: string[];
  includeTests?: string[];
  outputDir?: string;
  crawlDepth?: number;
  maxPages?: number;
}

export interface TestContext {
  page: Page;
  browser: Browser;
  config: TestConfig;
  baseUrl: string;
  crawlResults: CrawlResult[];
  discoveredInputs: InputField[];
  discoveredForms: FormInfo[];
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
