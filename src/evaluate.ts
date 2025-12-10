/**
 * AgentEval Evaluation Framework
 * Validates LLM-powered agent execution traces
 */

import { TraceStep } from './agentRunner.js';
import { runAgent, saveTrace } from './agentRunner.js';
import fs from 'fs';
import path from 'path';

// Expected workflow specification
export interface ExpectedWorkflowSpec {
  requiredTools: string[];
  expectedApiCalls: number;
  validStatusCodes: number[];
  invalidTestIds: number[];
  mustHaveFinalReport: boolean;
}

// Evaluation scores
export interface EvaluationScores {
  stepAccuracy: number;           // Steps follow logical workflow
  toolAccuracy: number;           // Correct tools used
  schemaPassRate: number;         // API responses match schemas
  failureHandling: number;        // 404 errors handled correctly
  finalCorrectness: number;       // Final report matches trace
  overallScore: number;
}

// Evaluation report
export interface EvaluationReport {
  summary: {
    totalSteps: number;
    timestamp: string;
    scores: EvaluationScores;
    agentCompleted: boolean;
  };
  details: {
    workflow: { passed: boolean; message: string; errors: string[] };
    toolUsage: { passed: boolean; message: string; errors: string[] };
    schemaValidation: { passed: boolean; message: string; errors: string[] };
    errorHandling: { passed: boolean; message: string; errors: string[] };
    finalReport: { passed: boolean; message: string; errors: string[] };
  };
  trace: TraceStep[];
}

/**
 * Evaluate LLM agent trace against expected workflow
 */
export function evaluateTrace(
  trace: TraceStep[],
  expectedSpec: ExpectedWorkflowSpec
): EvaluationReport {
  console.log('\n📊 AgentEval: Evaluating LLM agent trace...\n');

  const report: EvaluationReport = {
    summary: {
      totalSteps: trace.length,
      timestamp: new Date().toISOString(),
      scores: {
        stepAccuracy: 0,
        toolAccuracy: 0,
        schemaPassRate: 0,
        failureHandling: 0,
        finalCorrectness: 0,
        overallScore: 0
      },
      agentCompleted: false
    },
    details: {
      workflow: { passed: false, message: '', errors: [] },
      toolUsage: { passed: false, message: '', errors: [] },
      schemaValidation: { passed: false, message: '', errors: [] },
      errorHandling: { passed: false, message: '', errors: [] },
      finalReport: { passed: false, message: '', errors: [] }
    },
    trace
  };

  // 1. Validate workflow correctness
  console.log('1️⃣  Validating workflow...');
  const workflowResult = validateWorkflow(trace, expectedSpec);
  report.details.workflow = workflowResult;
  report.summary.scores.stepAccuracy = workflowResult.passed ? 100 : 50;
  console.log(`   ${workflowResult.passed ? '✓' : '✗'} ${workflowResult.message}`);
  workflowResult.errors.forEach(err => console.log(`     - ${err}`));

  // 2. Validate tool usage
  console.log('\n2️⃣  Validating tool usage...');
  const toolResult = validateToolUsage(trace, expectedSpec);
  report.details.toolUsage = toolResult;
  report.summary.scores.toolAccuracy = calculateToolAccuracy(trace, expectedSpec);
  console.log(`   ${toolResult.passed ? '✓' : '✗'} ${toolResult.message}`);
  toolResult.errors.forEach(err => console.log(`     - ${err}`));

  // 3. Validate schema correctness
  console.log('\n3️⃣  Validating API response schemas...');
  const schemaResult = validateSchemas(trace);
  report.details.schemaValidation = schemaResult;
  report.summary.scores.schemaPassRate = calculateSchemaPassRate(trace);
  console.log(`   ${schemaResult.passed ? '✓' : '✗'} ${schemaResult.message}`);
  schemaResult.errors.forEach(err => console.log(`     - ${err}`));

  // 4. Validate error handling
  console.log('\n4️⃣  Validating failure handling...');
  const errorResult = validateErrorHandling(trace, expectedSpec);
  report.details.errorHandling = errorResult;
  report.summary.scores.failureHandling = calculateFailureHandling(trace, expectedSpec);
  console.log(`   ${errorResult.passed ? '✓' : '✗'} ${errorResult.message}`);
  errorResult.errors.forEach(err => console.log(`     - ${err}`));

  // 5. Validate final report
  console.log('\n5️⃣  Validating final report...');
  const finalResult = validateFinalReport(trace);
  report.details.finalReport = finalResult;
  report.summary.scores.finalCorrectness = finalResult.passed ? 100 : 0;
  report.summary.agentCompleted = finalResult.passed;
  console.log(`   ${finalResult.passed ? '✓' : '✗'} ${finalResult.message}`);
  finalResult.errors.forEach(err => console.log(`     - ${err}`));

  // Calculate overall score
  const scores = report.summary.scores;
  scores.overallScore = (
    scores.stepAccuracy +
    scores.toolAccuracy +
    scores.schemaPassRate +
    scores.failureHandling +
    scores.finalCorrectness
  ) / 5;

  console.log('\n' + '='.repeat(60));
  console.log('📈 EVALUATION RESULTS:');
  console.log('='.repeat(60));
  console.log(`Step Accuracy:      ${scores.stepAccuracy.toFixed(1)}%`);
  console.log(`Tool Accuracy:      ${scores.toolAccuracy.toFixed(1)}%`);
  console.log(`Schema Pass Rate:   ${scores.schemaPassRate.toFixed(1)}%`);
  console.log(`Failure Handling:   ${scores.failureHandling.toFixed(1)}%`);
  console.log(`Final Correctness:  ${scores.finalCorrectness.toFixed(1)}%`);
  console.log('-'.repeat(60));
  console.log(`Overall Score:      ${scores.overallScore.toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');

  return report;
}

/**
 * Validate workflow follows expected pattern
 */
function validateWorkflow(
  trace: TraceStep[],
  spec: ExpectedWorkflowSpec
): { passed: boolean; message: string; errors: string[] } {
  const errors: string[] = [];
  
  if (trace.length === 0) {
    return {
      passed: false,
      message: 'No steps in trace',
      errors: ['Trace is empty']
    };
  }

  // Check if required tools were used
  const toolsUsed = new Set(trace.map(step => step.action));
  const missingTools = spec.requiredTools.filter(tool => !toolsUsed.has(tool));
  
  if (missingTools.length > 0) {
    errors.push(`Missing required tools: ${missingTools.join(', ')}`);
  }

  // Check if final_report was called
  const hasFinalReport = trace.some(step => step.action === 'final_report');
  if (spec.mustHaveFinalReport && !hasFinalReport) {
    errors.push('Agent did not submit final_report');
  }

  return {
    passed: errors.length === 0,
    message: errors.length === 0 
      ? `Workflow complete: ${trace.length} steps, all required tools used`
      : `Workflow issues found`,
    errors
  };
}

/**
 * Validate tool usage correctness
 */
function validateToolUsage(
  trace: TraceStep[],
  spec: ExpectedWorkflowSpec
): { passed: boolean; message: string; errors: string[] } {
  const errors: string[] = [];
  const validTools = [...spec.requiredTools, 'final_report'];

  for (const step of trace) {
    if (!validTools.includes(step.action)) {
      errors.push(`Step ${step.step}: Unknown tool '${step.action}'`);
    }

    // Validate callApi has required args
    if (step.action === 'callApi') {
      if (!step.args.method || !step.args.url) {
        errors.push(`Step ${step.step}: callApi missing method or url`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    message: errors.length === 0
      ? 'All tools used correctly'
      : `Found ${errors.length} tool usage error(s)`,
    errors
  };
}

/**
 * Validate API response schemas
 */
function validateSchemas(
  trace: TraceStep[]
): { passed: boolean; message: string; errors: string[] } {
  const errors: string[] = [];
  let totalApiCalls = 0;
  let validSchemas = 0;

  for (const step of trace) {
    if (step.action === 'callApi') {
      totalApiCalls++;
      const result = step.result;
      
      if (result.schemaValid) {
        validSchemas++;
      } else {
        const url = step.args.url || 'unknown';
        errors.push(`Step ${step.step}: Invalid schema for ${url} (status ${result.status})`);
      }
    }
  }

  return {
    passed: errors.length === 0 && totalApiCalls > 0,
    message: totalApiCalls === 0
      ? 'No API calls found'
      : `${validSchemas}/${totalApiCalls} API responses have valid schemas`,
    errors
  };
}

/**
 * Validate error handling (404 responses)
 */
function validateErrorHandling(
  trace: TraceStep[],
  spec: ExpectedWorkflowSpec
): { passed: boolean; message: string; errors: string[] } {
  const errors: string[] = [];
  let errorTestsFound = 0;
  let errorTestsPassed = 0;

  for (const step of trace) {
    if (step.action === 'callApi') {
      const url = step.args.url;
      const urlMatch = url?.match(/\/users\/(-?\d+)/);
      
      if (urlMatch) {
        const id = parseInt(urlMatch[1], 10);
        
        if (spec.invalidTestIds.includes(id)) {
          errorTestsFound++;
          const result = step.result;
          
          if (result.status === 404 && result.schemaValid) {
            errorTestsPassed++;
          } else {
            errors.push(`Step ${step.step}: Invalid ID ${id} not handled correctly (status: ${result.status}, schema valid: ${result.schemaValid})`);
          }
        }
      }
    }
  }

  return {
    passed: errorTestsFound > 0 && errors.length === 0,
    message: errorTestsFound === 0
      ? 'No error test cases found'
      : `${errorTestsPassed}/${errorTestsFound} error cases handled correctly`,
    errors
  };
}

/**
 * Validate final report consistency
 */
function validateFinalReport(
  trace: TraceStep[]
): { passed: boolean; message: string; errors: string[] } {
  const errors: string[] = [];
  
  const finalStep = trace.find(step => step.action === 'final_report');
  
  if (!finalStep) {
    return {
      passed: false,
      message: 'No final_report submitted',
      errors: ['Agent did not call final_report']
    };
  }

  const report = finalStep.result;
  
  // Count actual API calls
  const apiCalls = trace.filter(step => step.action === 'callApi');
  const successCalls = apiCalls.filter(step => step.result.status === 200);
  const errorCalls = apiCalls.filter(step => step.result.status === 404);

  // Validate report numbers
  if (report.totalTests !== apiCalls.length) {
    errors.push(`Report totalTests (${report.totalTests}) doesn't match actual API calls (${apiCalls.length})`);
  }

  if (report.successCount !== successCalls.length) {
    errors.push(`Report successCount (${report.successCount}) doesn't match actual successes (${successCalls.length})`);
  }

  if (report.errorCount !== errorCalls.length) {
    errors.push(`Report errorCount (${report.errorCount}) doesn't match actual errors (${errorCalls.length})`);
  }

  return {
    passed: errors.length === 0,
    message: errors.length === 0
      ? `Final report matches trace: ${report.totalTests} tests, ${report.successCount} success, ${report.errorCount} errors`
      : 'Final report has inconsistencies',
    errors
  };
}

/**
 * Calculate tool accuracy percentage
 */
function calculateToolAccuracy(trace: TraceStep[], spec: ExpectedWorkflowSpec): number {
  if (trace.length === 0) return 0;
  
  const validTools = [...spec.requiredTools, 'final_report'];
  const correctUsage = trace.filter(step => validTools.includes(step.action)).length;
  
  return (correctUsage / trace.length) * 100;
}

/**
 * Calculate schema pass rate
 */
function calculateSchemaPassRate(trace: TraceStep[]): number {
  const apiCalls = trace.filter(step => step.action === 'callApi');
  if (apiCalls.length === 0) return 0;
  
  const validSchemas = apiCalls.filter(step => step.result.schemaValid).length;
  return (validSchemas / apiCalls.length) * 100;
}

/**
 * Calculate failure handling rate
 */
function calculateFailureHandling(trace: TraceStep[], spec: ExpectedWorkflowSpec): number {
  const errorTests = trace.filter(step => {
    if (step.action === 'callApi') {
      const url = step.args.url;
      const urlMatch = url?.match(/\/users\/(-?\d+)/);
      if (urlMatch) {
        const id = parseInt(urlMatch[1], 10);
        return spec.invalidTestIds.includes(id);
      }
    }
    return false;
  });

  if (errorTests.length === 0) return 0;
  
  const handledCorrectly = errorTests.filter(step => 
    step.result.status === 404 && step.result.schemaValid
  ).length;
  
  return (handledCorrectly / errorTests.length) * 100;
}

/**
 * Generate HTML report
 */
function generateHtmlReport(report: EvaluationReport): string {
  const scores = report.summary.scores;
  const getColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentEval Report - LLM Agent</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    h1 { 
      color: #1f2937; 
      margin-bottom: 0.5rem;
      font-size: 2rem;
    }
    .subtitle {
      color: #6b7280;
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }
    .timestamp { color: #9ca3af; font-size: 0.875rem; }
    .completion-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 999px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-top: 0.5rem;
    }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    
    .scores {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .score-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .score-label {
      color: #6b7280;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .score-value {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .score-bar {
      height: 6px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
    }
    .score-fill {
      height: 100%;
      transition: width 0.3s ease;
      border-radius: 999px;
    }
    
    .details {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .detail-section {
      margin-bottom: 1.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-section:last-child { border-bottom: none; }
    .detail-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .status {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .status-pass { background: #d1fae5; color: #065f46; }
    .status-fail { background: #fee2e2; color: #991b1b; }
    .error-list {
      list-style: none;
      margin-top: 0.5rem;
    }
    .error-item {
      background: #fef3c7;
      padding: 0.75rem;
      border-left: 3px solid #f59e0b;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      border-radius: 4px;
    }
    .overall {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      grid-column: 1 / -1;
    }
    .overall .score-label { color: rgba(255,255,255,0.9); }
    .overall .score-bar { background: rgba(255,255,255,0.3); }
    .overall .score-fill { background: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 AgentEval Report</h1>
      <p class="subtitle">LLM-Powered Agent Evaluation</p>
      <p class="timestamp">Generated: ${report.summary.timestamp}</p>
      <p class="timestamp">Total Steps: ${report.summary.totalSteps}</p>
      <span class="completion-badge ${report.summary.agentCompleted ? 'badge-success' : 'badge-warning'}">
        ${report.summary.agentCompleted ? '✓ Agent Completed' : '⚠ Agent Incomplete'}
      </span>
    </div>

    <div class="scores">
      <div class="score-card">
        <div class="score-label">Step Accuracy</div>
        <div class="score-value" style="color: ${getColor(scores.stepAccuracy)}">
          ${scores.stepAccuracy.toFixed(0)}%
        </div>
        <div class="score-bar">
          <div class="score-fill" style="width: ${scores.stepAccuracy}%; background: ${getColor(scores.stepAccuracy)}"></div>
        </div>
      </div>

      <div class="score-card">
        <div class="score-label">Tool Accuracy</div>
        <div class="score-value" style="color: ${getColor(scores.toolAccuracy)}">
          ${scores.toolAccuracy.toFixed(0)}%
        </div>
        <div class="score-bar">
          <div class="score-fill" style="width: ${scores.toolAccuracy}%; background: ${getColor(scores.toolAccuracy)}"></div>
        </div>
      </div>

      <div class="score-card">
        <div class="score-label">Schema Pass Rate</div>
        <div class="score-value" style="color: ${getColor(scores.schemaPassRate)}">
          ${scores.schemaPassRate.toFixed(0)}%
        </div>
        <div class="score-bar">
          <div class="score-fill" style="width: ${scores.schemaPassRate}%; background: ${getColor(scores.schemaPassRate)}"></div>
        </div>
      </div>

      <div class="score-card">
        <div class="score-label">Failure Handling</div>
        <div class="score-value" style="color: ${getColor(scores.failureHandling)}">
          ${scores.failureHandling.toFixed(0)}%
        </div>
        <div class="score-bar">
          <div class="score-fill" style="width: ${scores.failureHandling}%; background: ${getColor(scores.failureHandling)}"></div>
        </div>
      </div>

      <div class="score-card">
        <div class="score-label">Final Correctness</div>
        <div class="score-value" style="color: ${getColor(scores.finalCorrectness)}">
          ${scores.finalCorrectness.toFixed(0)}%
        </div>
        <div class="score-bar">
          <div class="score-fill" style="width: ${scores.finalCorrectness}%; background: ${getColor(scores.finalCorrectness)}"></div>
        </div>
      </div>

      <div class="score-card overall">
        <div class="score-label">Overall Score</div>
        <div class="score-value">
          ${scores.overallScore.toFixed(1)}%
        </div>
        <div class="score-bar">
          <div class="score-fill" style="width: ${scores.overallScore}%"></div>
        </div>
      </div>
    </div>

    <div class="details">
      <h2 style="margin-bottom: 1.5rem; color: #1f2937;">📋 Evaluation Details</h2>
      
      <div class="detail-section">
        <div class="detail-title">
          <span>1. Workflow Validation</span>
          <span class="status ${report.details.workflow.passed ? 'status-pass' : 'status-fail'}">
            ${report.details.workflow.passed ? '✓ Passed' : '✗ Failed'}
          </span>
        </div>
        <p>${report.details.workflow.message}</p>
        ${report.details.workflow.errors.length > 0 ? `
          <ul class="error-list">
            ${report.details.workflow.errors.map(err => `<li class="error-item">${err}</li>`).join('')}
          </ul>
        ` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-title">
          <span>2. Tool Usage</span>
          <span class="status ${report.details.toolUsage.passed ? 'status-pass' : 'status-fail'}">
            ${report.details.toolUsage.passed ? '✓ Passed' : '✗ Failed'}
          </span>
        </div>
        <p>${report.details.toolUsage.message}</p>
        ${report.details.toolUsage.errors.length > 0 ? `
          <ul class="error-list">
            ${report.details.toolUsage.errors.map(err => `<li class="error-item">${err}</li>`).join('')}
          </ul>
        ` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-title">
          <span>3. Schema Validation</span>
          <span class="status ${report.details.schemaValidation.passed ? 'status-pass' : 'status-fail'}">
            ${report.details.schemaValidation.passed ? '✓ Passed' : '✗ Failed'}
          </span>
        </div>
        <p>${report.details.schemaValidation.message}</p>
        ${report.details.schemaValidation.errors.length > 0 ? `
          <ul class="error-list">
            ${report.details.schemaValidation.errors.map(err => `<li class="error-item">${err}</li>`).join('')}
          </ul>
        ` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-title">
          <span>4. Error Handling</span>
          <span class="status ${report.details.errorHandling.passed ? 'status-pass' : 'status-fail'}">
            ${report.details.errorHandling.passed ? '✓ Passed' : '✗ Failed'}
          </span>
        </div>
        <p>${report.details.errorHandling.message}</p>
        ${report.details.errorHandling.errors.length > 0 ? `
          <ul class="error-list">
            ${report.details.errorHandling.errors.map(err => `<li class="error-item">${err}</li>`).join('')}
          </ul>
        ` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-title">
          <span>5. Final Report</span>
          <span class="status ${report.details.finalReport.passed ? 'status-pass' : 'status-fail'}">
            ${report.details.finalReport.passed ? '✓ Passed' : '✗ Failed'}
          </span>
        </div>
        <p>${report.details.finalReport.message}</p>
        ${report.details.finalReport.errors.length > 0 ? `
          <ul class="error-list">
            ${report.details.finalReport.errors.map(err => `<li class="error-item">${err}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Main evaluation function
 */
async function main() {
  // Define expected workflow specification
  const expectedSpec: ExpectedWorkflowSpec = {
    requiredTools: ['generateTestIds', 'callApi'],
    expectedApiCalls: 5,
    validStatusCodes: [200, 404],
    invalidTestIds: [-1, 999],
    mustHaveFinalReport: true
  };

  // Run the agent
  console.log('🚀 Running LLM-powered agent...');
  const trace = await runAgent(
    'Test the user API endpoint with various IDs including valid and invalid cases. Validate all responses match expected schemas.'
  );
  
  // Save trace
  saveTrace(trace, 'trace.json');

  // Evaluate trace
  const report = evaluateTrace(trace, expectedSpec);

  // Save JSON report
  const reportPath = path.join(process.cwd(), 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 JSON report saved to ${reportPath}`);

  // Generate and save HTML report
  const htmlReport = generateHtmlReport(report);
  const htmlPath = path.join(process.cwd(), 'report.html');
  fs.writeFileSync(htmlPath, htmlReport);
  console.log(`📄 HTML report saved to ${htmlPath}`);
  console.log('\n✅ Evaluation complete!\n');
}

// Run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
