/**
 * LLM-Powered Agent Runner
 * Uses Azure OpenAI with tool calling to test the API
 */

import { runLLM, Message, ToolCall } from './azure-client.js';
import { getToolDefinitions, executeTool } from './tools.js';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';

// Type definitions
export interface TraceStep {
  step: number;
  llmMessage: Message;
  action: string;
  args: Record<string, any>;
  result: any;
}

/**
 * Run the LLM-powered agent with a given prompt
 * The agent uses Azure OpenAI tool calling to:
 * 1. Plan which tools to call
 * 2. Execute tools
 * 3. Process results
 * 4. Generate final report
 * 
 * @param prompt User prompt describing the task
 * @returns Array of trace steps
 */
export async function runAgent(prompt: string): Promise<TraceStep[]> {
  const trace: TraceStep[] = [];
  const tools = getToolDefinitions();
  const baseUrl = config.server.baseUrl;
  
  console.log(`\n🤖 Starting LLM-powered agent`);
  console.log(`📝 Task: ${prompt}`);
  console.log(`🔧 Available tools: ${tools.map(t => t.function.name).join(', ')}`);
  console.log('');

  // Initialize conversation with system prompt and user task
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an API testing agent. Your task is to systematically test the user API endpoint.

Available API: GET /users/:id at ${baseUrl}
- Returns 200 with {id, name, email} for IDs 1-100
- Returns 404 with {error: string} for other IDs

Your workflow:
1. Call generateTestIds to get test cases
2. For each test ID, call the API using callApi
3. Validate responses match expected schemas
4. Test both success (200) and error (404) cases
5. When complete, call final_report with a summary

Be systematic and thorough. Test both valid and invalid cases.`
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  let stepCount = 0;
  let finalReportReceived = false;

  // Agent loop - continue until final_report is called or max steps reached
  while (!finalReportReceived && stepCount < config.evaluation.maxSteps) {
    stepCount++;
    console.log(`\n━━━ Step ${stepCount} ━━━`);

    try {
      // Call LLM with current conversation and available tools
      const response = await runLLM(messages, tools);
      const { message, finishReason } = response;

      // Add assistant message to conversation
      messages.push(message);

      // Check if LLM wants to call tools
      if (finishReason === 'tool_calls' && message.tool_calls) {
        console.log(`🔧 LLM requested ${message.tool_calls.length} tool call(s)`);

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          console.log(`  → ${functionName}(${JSON.stringify(args).substring(0, 100)}${JSON.stringify(args).length > 100 ? '...' : ''})`);

          // Execute the tool
          const result = await executeTool(functionName, args);

          // Record in trace
          trace.push({
            step: stepCount,
            llmMessage: message,
            action: functionName,
            args,
            result
          });

          // Add tool result to conversation
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: JSON.stringify(result)
          });

          // Check if final report
          if (functionName === 'final_report') {
            console.log(`\n✅ Final report received`);
            console.log(`   Summary: ${result.summary}`);
            console.log(`   Total tests: ${result.totalTests}`);
            console.log(`   Successful: ${result.successCount}`);
            console.log(`   Errors handled: ${result.errorCount}`);
            finalReportReceived = true;
          } else {
            // Log result preview
            const resultStr = JSON.stringify(result);
            console.log(`  ✓ Result: ${resultStr.substring(0, 100)}${resultStr.length > 100 ? '...' : ''}`);
          }
        }
      } else if (finishReason === 'stop') {
        // LLM finished without tool calls
        console.log(`💬 LLM: ${message.content?.substring(0, 200)}`);
        
        // If no more tool calls and no final report, we're done
        if (!finalReportReceived) {
          console.log(`\n⚠️  Agent finished without final_report`);
          break;
        }
      } else {
        console.log(`\n⚠️  Unexpected finish reason: ${finishReason}`);
        break;
      }

    } catch (error) {
      console.error(`\n❌ Error in step ${stepCount}:`, error);
      trace.push({
        step: stepCount,
        llmMessage: { role: 'assistant', content: '' },
        action: 'error',
        args: {},
        result: { error: String(error) }
      });
      break;
    }
  }

  if (stepCount >= config.evaluation.maxSteps) {
    console.log(`\n⚠️  Reached maximum steps (${config.evaluation.maxSteps})`);
  }

  console.log(`\n🎯 Agent execution completed: ${trace.length} actions performed\n`);
  return trace;
}

/**
 * Save trace to a JSON file
 * @param trace Trace steps to save
 * @param filename Output filename
 */
export function saveTrace(trace: TraceStep[], filename: string = 'trace.json'): void {
  const outputPath = path.join(process.cwd(), filename);
  fs.writeFileSync(outputPath, JSON.stringify(trace, null, 2));
  console.log(`📝 Trace saved to ${outputPath}`);
}

// Main execution when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const prompt = 'Test the user API endpoint with various IDs including valid and invalid cases. Validate all responses match expected schemas.';
    const trace = await runAgent(prompt);
    saveTrace(trace);
  })();
}
