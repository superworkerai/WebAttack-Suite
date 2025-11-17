import * as fs from 'fs';
import * as path from 'path';
import { TestReport } from './types.js';

export class ReportGenerator {
  private outputDir: string;

  constructor(outputDir: string = './reports') {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  generateJSONReport(report: TestReport): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `security-scan-${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    console.log(`[+] JSON report saved to: ${filepath}`);
    return filepath;
  }

  generateHTMLReport(report: TestReport): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `security-scan-${timestamp}.html`;
    const filepath = path.join(this.outputDir, filename);

    const html = this.createHTML(report);
    fs.writeFileSync(filepath, html);

    console.log(`[+] HTML report saved to: ${filepath}`);
    return filepath;
  }

  private createHTML(report: TestReport): string {
    const vulnerabilities = report.testResults.filter(r => r.vulnerable);
    const criticalVulns = vulnerabilities.filter(r => r.severity === 'critical');
    const highVulns = vulnerabilities.filter(r => r.severity === 'high');
    const mediumVulns = vulnerabilities.filter(r => r.severity === 'medium');
    const lowVulns = vulnerabilities.filter(r => r.severity === 'low');

    // Separate regular and AI-suggested tests
    const regularTests = report.testResults.filter(r => !r.aiSuggested);
    const aiSuggestedTests = report.testResults.filter(r => r.aiSuggested);

    // HTML escape function to prevent XSS in reports
    const escapeHtml = (text: string): string => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    };

    const getSeverityColor = (severity: string): string => {
      switch (severity) {
        case 'critical': return '#dc2626';
        case 'high': return '#ea580c';
        case 'medium': return '#f59e0b';
        case 'low': return '#eab308';
        default: return '#6b7280';
      }
    };

    const getSeverityBg = (severity: string): string => {
      switch (severity) {
        case 'critical': return '#fee2e2';
        case 'high': return '#ffedd5';
        case 'medium': return '#fef3c7';
        case 'low': return '#fef9c3';
        default: return '#f3f4f6';
      }
    };

    const renderTestResult = (result: any) => `
      <div class="test-result ${result.vulnerable ? 'vulnerable' : 'passed'} ${result.severity}"
           data-severity="${result.severity}"
           data-vulnerable="${result.vulnerable}"
           data-ai="${result.aiSuggested || false}">
          <div class="test-header">
              <div>
                  <div class="test-title">${escapeHtml(result.testName)}</div>
                  <div class="category">${escapeHtml(result.category)}</div>
                  ${result.aiSuggested ? '<span class="ai-badge">🤖 AI-Suggested</span>' : ''}
              </div>
              <span class="severity-badge" style="background: ${getSeverityBg(result.severity)}; color: ${getSeverityColor(result.severity)}">
                  ${escapeHtml(result.severity)}
              </span>
          </div>
          <div class="description">${escapeHtml(result.description)}</div>
          ${result.url ? `
              <div class="evidence">
                  <h4>🔗 URL:</h4>
                  <div class="evidence-item">${escapeHtml(result.url)}</div>
              </div>
          ` : ''}
          ${result.vulnerableParameter ? `
              <div class="evidence">
                  <h4>⚡ Vulnerable Parameter:</h4>
                  <div class="evidence-item">${escapeHtml(result.vulnerableParameter)}</div>
              </div>
          ` : ''}
          ${result.aiReasoning ? `
              <div class="evidence" style="background: #ede9fe; border-color: #c4b5fd;">
                  <h4>🤖 AI Analysis:</h4>
                  <div class="evidence-item">${escapeHtml(result.aiReasoning)}</div>
              </div>
          ` : ''}
          ${result.evidence && result.evidence.length > 0 ? `
              <div class="evidence">
                  <h4>Evidence:</h4>
                  ${result.evidence.map((e: string) => `<div class="evidence-item">• ${escapeHtml(e)}</div>`).join('')}
              </div>
          ` : ''}
          ${result.remediationSteps && result.remediationSteps.length > 0 ? `
              <div class="recommendation" style="background: #dbeafe; border-left-color: #3b82f6;">
                  <h4 style="color: #1e40af;">🔧 Remediation Steps:</h4>
                  <ol style="margin-left: 20px; color: #1e3a8a;">
                      ${result.remediationSteps.map((step: string) => `<li style="margin: 5px 0;">${escapeHtml(step)}</li>`).join('')}
                  </ol>
              </div>
          ` : ''}
          ${result.codeExample ? `
              <div class="evidence" style="background: #f0fdf4; border-color: #86efac;">
                  <h4 style="color: #15803d;">💻 Code Example:</h4>
                  <pre class="evidence-item" style="white-space: pre-wrap; font-size: 0.85em; background: #f9fafb; padding: 10px; border-radius: 4px;">${escapeHtml(result.codeExample)}</pre>
              </div>
          ` : ''}
          ${result.details ? `
              <div class="evidence">
                  <h4>Details:</h4>
                  <pre class="evidence-item" style="white-space: pre-wrap;">${escapeHtml(JSON.stringify(result.details, null, 2))}</pre>
              </div>
          ` : ''}
          ${result.recommendation && !result.remediationSteps ? `
              <div class="recommendation">
                  <h4>💡 Recommendation:</h4>
                  <p>${escapeHtml(result.recommendation)}</p>
              </div>
          ` : ''}
          <div class="stats">
              <span>⏱️ ${result.duration}ms</span>
              <span>🕐 ${new Date(result.timestamp).toLocaleTimeString()}</span>
          </div>
      </div>
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Scan Report - ${report.targetUrl}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: #f9fafb;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .subtitle {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #667eea;
        }

        .summary-card.critical {
            border-left-color: #dc2626;
        }

        .summary-card.high {
            border-left-color: #ea580c;
        }

        .summary-card.medium {
            border-left-color: #f59e0b;
        }

        .summary-card.low {
            border-left-color: #eab308;
        }

        .summary-card h3 {
            font-size: 0.9em;
            color: #6b7280;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .summary-card .value {
            font-size: 2.5em;
            font-weight: bold;
            color: #1f2937;
        }

        .filters {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .filter-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .filter-btn {
            padding: 8px 16px;
            border: 2px solid #e5e7eb;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9em;
            font-weight: 500;
        }

        .filter-btn:hover {
            border-color: #667eea;
            background: #f3f4f6;
        }

        .filter-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        .test-result {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #e5e7eb;
        }

        .test-result.vulnerable {
            border-left-width: 4px;
        }

        .test-result.critical {
            border-left-color: #dc2626;
        }

        .test-result.high {
            border-left-color: #ea580c;
        }

        .test-result.medium {
            border-left-color: #f59e0b;
        }

        .test-result.low {
            border-left-color: #eab308;
        }

        .test-result.passed {
            border-left-color: #10b981;
        }

        .test-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 10px;
        }

        .test-title {
            font-size: 1.2em;
            font-weight: 600;
            color: #1f2937;
        }

        .severity-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }

        .category {
            display: inline-block;
            padding: 4px 10px;
            background: #f3f4f6;
            border-radius: 6px;
            font-size: 0.85em;
            margin-bottom: 10px;
            color: #6b7280;
        }

        .ai-badge {
            display: inline-block;
            padding: 4px 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 6px;
            font-size: 0.75em;
            margin-left: 8px;
            font-weight: 600;
        }

        .section-header {
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin: 30px 0 15px 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #667eea;
        }

        .section-header h2 {
            font-size: 1.5em;
            color: #1f2937;
            margin: 0;
        }

        .section-header.ai-section {
            border-left-color: #764ba2;
            background: linear-gradient(to right, #faf5ff 0%, white 50%);
        }

        .description {
            color: #4b5563;
            margin: 10px 0;
        }

        .evidence {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin: 10px 0;
        }

        .evidence h4 {
            font-size: 0.9em;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        .evidence-item {
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            padding: 4px 0;
            color: #1f2937;
            word-break: break-all;
        }

        .evidence-item pre {
            margin: 0;
            padding: 0;
            background: transparent;
            border: none;
        }

        .recommendation {
            background: #ecfdf5;
            border-left: 3px solid #10b981;
            padding: 12px;
            border-radius: 6px;
            margin-top: 10px;
        }

        .recommendation h4 {
            color: #047857;
            font-size: 0.9em;
            margin-bottom: 6px;
        }

        .recommendation p {
            color: #065f46;
            font-size: 0.95em;
        }

        .stats {
            display: flex;
            gap: 15px;
            margin-top: 10px;
            font-size: 0.85em;
            color: #6b7280;
        }

        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            margin-top: 40px;
        }

        .timestamp {
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔒 Security Scan Report</h1>
            <div class="subtitle">Target: ${escapeHtml(report.targetUrl)}</div>
            <div class="subtitle timestamp">Scan Time: ${new Date(report.scanStartTime).toLocaleString()}</div>
            <div class="subtitle">Duration: ${(report.totalDuration / 1000).toFixed(2)}s</div>
        </header>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${report.summary.total}</div>
            </div>
            <div class="summary-card critical">
                <h3>Critical</h3>
                <div class="value">${report.summary.critical}</div>
            </div>
            <div class="summary-card high">
                <h3>High</h3>
                <div class="value">${report.summary.high}</div>
            </div>
            <div class="summary-card medium">
                <h3>Medium</h3>
                <div class="value">${report.summary.medium}</div>
            </div>
            <div class="summary-card low">
                <h3>Low</h3>
                <div class="value">${report.summary.low}</div>
            </div>
        </div>

        <div class="filters">
            <div class="filter-buttons">
                <button class="filter-btn active" onclick="filterResults('all', this)">All (${report.testResults.length})</button>
                <button class="filter-btn" onclick="filterResults('vulnerable', this)">Vulnerabilities (${vulnerabilities.length})</button>
                <button class="filter-btn" onclick="filterResults('critical', this)">Critical (${report.summary.critical})</button>
                <button class="filter-btn" onclick="filterResults('high', this)">High (${report.summary.high})</button>
                <button class="filter-btn" onclick="filterResults('medium', this)">Medium (${report.summary.medium})</button>
                <button class="filter-btn" onclick="filterResults('low', this)">Low (${report.summary.low})</button>
                <button class="filter-btn" onclick="filterResults('passed', this)">Passed (${report.summary.passed})</button>
                ${aiSuggestedTests.length > 0 ? `<button class="filter-btn" onclick="filterResults('ai', this)">🤖 AI Tests (${aiSuggestedTests.length})</button>` : ''}
            </div>
        </div>

        <div id="results">
            ${regularTests.length > 0 ? `
                <div class="section-header">
                    <h2>🔒 Standard Security Tests</h2>
                </div>
                ${regularTests.map(result => renderTestResult(result)).join('')}
            ` : ''}

            ${aiSuggestedTests.length > 0 ? `
                <div class="section-header ai-section">
                    <h2>🤖 AI-Suggested Security Tests</h2>
                </div>
                ${aiSuggestedTests.map(result => renderTestResult(result)).join('')}
            ` : ''}
        </div>

        <div class="footer">
            <p>Generated by WebAttack Security Suite</p>
            <p class="timestamp">Report generated: ${new Date().toLocaleString()}</p>
        </div>
    </div>

    <script>
        function filterResults(filter, clickedButton) {
            const results = document.querySelectorAll('.test-result');
            const sections = document.querySelectorAll('.section-header');
            const buttons = document.querySelectorAll('.filter-btn');

            // Update active button
            buttons.forEach(btn => btn.classList.remove('active'));
            if (clickedButton) {
                clickedButton.classList.add('active');
            }

            results.forEach(result => {
                const severity = result.dataset.severity;
                const vulnerable = result.dataset.vulnerable === 'true';
                const isAI = result.dataset.ai === 'true';

                let show = false;
                switch(filter) {
                    case 'all':
                        show = true;
                        break;
                    case 'vulnerable':
                        show = vulnerable;
                        break;
                    case 'passed':
                        show = !vulnerable;
                        break;
                    case 'ai':
                        show = isAI;
                        break;
                    case 'critical':
                    case 'high':
                    case 'medium':
                    case 'low':
                        show = severity === filter;
                        break;
                }

                result.style.display = show ? 'block' : 'none';
            });

            // Show/hide section headers based on visible results
            sections.forEach(section => {
                const nextResults = [];
                let currentElement = section.nextElementSibling;
                while (currentElement && currentElement.classList.contains('test-result')) {
                    nextResults.push(currentElement);
                    currentElement = currentElement.nextElementSibling;
                }
                const hasVisibleResults = nextResults.some(r => r.style.display !== 'none');
                section.style.display = hasVisibleResults ? 'block' : 'none';
            });
        }
    </script>
</body>
</html>`;
  }
}
