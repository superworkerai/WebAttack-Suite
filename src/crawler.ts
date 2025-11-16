import { Page } from 'playwright';
import { CrawlResult, InputField, FormInfo } from './types.js';

export class Crawler {
  private visited = new Set<string>();
  private crawlResults: CrawlResult[] = [];
  private baseUrl: string;
  private maxDepth: number;
  private maxPages: number;

  constructor(baseUrl: string, maxDepth: number = 3, maxPages: number = 50) {
    this.baseUrl = baseUrl;
    this.maxDepth = maxDepth;
    this.maxPages = maxPages;
  }

  async crawl(page: Page): Promise<CrawlResult[]> {
    console.log(`\n[*] Starting deep crawl (max depth: ${this.maxDepth}, max pages: ${this.maxPages})`);

    try {
      await this.crawlPage(page, this.baseUrl, 0);
    } catch (error) {
      console.log(`[!] Crawl error: ${error}`);
    }

    console.log(`[+] Crawl complete! Discovered ${this.crawlResults.length} pages with ${this.getTotalInputs()} input fields\n`);

    return this.crawlResults;
  }

  private async crawlPage(page: Page, url: string, depth: number): Promise<void> {
    // Stop conditions
    if (depth > this.maxDepth) return;
    if (this.visited.size >= this.maxPages) return;
    if (this.visited.has(url)) return;

    // Only crawl URLs from the same domain
    if (!this.isSameDomain(url)) return;

    this.visited.add(url);
    console.log(`  [${'→'.repeat(depth + 1)}] Crawling (depth ${depth}): ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(500); // Let dynamic content load

      // Extract inputs and forms
      const pageData = await this.extractPageData(page, url);
      this.crawlResults.push(pageData);

      console.log(`      Found: ${pageData.inputs.length} inputs, ${pageData.forms.length} forms, ${pageData.links.length} links`);

      // If we haven't reached max depth, follow links
      if (depth < this.maxDepth && this.visited.size < this.maxPages) {
        for (const link of pageData.links) {
          if (this.visited.size >= this.maxPages) break;
          await this.crawlPage(page, link, depth + 1);
        }
      }
    } catch (error) {
      console.log(`      ✗ Error crawling ${url}: ${error}`);
    }
  }

  private async extractPageData(page: Page, url: string): Promise<CrawlResult> {
    const data = await page.evaluate((currentUrl) => {
      const inputs: any[] = [];
      const forms: any[] = [];
      const links: string[] = [];

      // Extract all input fields
      const inputElements = document.querySelectorAll('input, textarea, select');
      inputElements.forEach((input, index) => {
        const element = input as HTMLInputElement;
        inputs.push({
          url: currentUrl,
          type: element.type || element.tagName.toLowerCase(),
          name: element.name || `unnamed_${index}`,
          id: element.id || undefined,
          selector: element.name
            ? `[name="${element.name}"]`
            : element.id
              ? `#${element.id}`
              : `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`
        });
      });

      // Extract all forms
      const formElements = document.querySelectorAll('form');
      formElements.forEach((form) => {
        const formInputs: any[] = [];
        const formInputElements = form.querySelectorAll('input, textarea, select');

        formInputElements.forEach((input, index) => {
          const element = input as HTMLInputElement;
          formInputs.push({
            url: currentUrl,
            type: element.type || element.tagName.toLowerCase(),
            name: element.name || `unnamed_${index}`,
            id: element.id || undefined,
            selector: element.name
              ? `[name="${element.name}"]`
              : element.id
                ? `#${element.id}`
                : `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`
          });
        });

        forms.push({
          url: currentUrl,
          action: form.action || undefined,
          method: form.method || 'get',
          inputs: formInputs
        });
      });

      // Extract all links
      const linkElements = document.querySelectorAll('a[href]');
      linkElements.forEach((link) => {
        const href = (link as HTMLAnchorElement).href;
        if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('#')) {
          links.push(href);
        }
      });

      return { inputs, forms, links };
    }, url);

    // Filter and normalize links
    const uniqueLinks = Array.from(new Set(data.links))
      .filter(link => this.isSameDomain(link))
      .filter(link => !link.match(/\.(pdf|zip|jpg|jpeg|png|gif|svg|css|js|xml|json)$/i))
      .slice(0, 20); // Limit links per page

    return {
      url,
      inputs: data.inputs as InputField[],
      forms: data.forms as FormInfo[],
      links: uniqueLinks
    };
  }

  private isSameDomain(url: string): boolean {
    try {
      const base = new URL(this.baseUrl);
      const target = new URL(url, this.baseUrl);
      return base.hostname === target.hostname;
    } catch {
      return false;
    }
  }

  private getTotalInputs(): number {
    return this.crawlResults.reduce((sum, result) => sum + result.inputs.length, 0);
  }

  getDiscoveredInputs(): InputField[] {
    const allInputs: InputField[] = [];
    this.crawlResults.forEach(result => {
      allInputs.push(...result.inputs);
    });
    return allInputs;
  }

  getDiscoveredForms(): FormInfo[] {
    const allForms: FormInfo[] = [];
    this.crawlResults.forEach(result => {
      allForms.push(...result.forms);
    });
    return allForms;
  }

  getStats(): { pages: number; inputs: number; forms: number; totalLinks: number } {
    const totalLinks = this.crawlResults.reduce((sum, r) => sum + r.links.length, 0);
    const totalForms = this.crawlResults.reduce((sum, r) => sum + r.forms.length, 0);

    return {
      pages: this.crawlResults.length,
      inputs: this.getTotalInputs(),
      forms: totalForms,
      totalLinks
    };
  }
}
