/**
 * Azure OpenAI Client Wrapper
 * Provides a clean interface for interacting with Azure OpenAI GPT models
 */

import { config } from './config.js';

// Types for Azure OpenAI API
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface LLMResponse {
  message: Message;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Call Azure OpenAI with messages and optional tools
 * @param messages - Conversation history
 * @param tools - Available tools for function calling
 * @returns LLM response with potential tool calls
 */
export async function runLLM(
  messages: Message[],
  tools?: Tool[]
): Promise<LLMResponse> {
  const { endpoint, apiKey, apiVersion, deploymentName, maxTokens, temperature } = config.azure;

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI credentials not configured. Check .env file.');
  }

  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

  const requestBody: any = {
    messages,
    max_completion_tokens: maxTokens,
    temperature
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }

  try {
    const http = await import('https');
    const urlObj = new URL(url);

    const postData = JSON.stringify(requestBody);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`Azure OpenAI API error: ${res.statusCode} - ${data}`));
              return;
            }

            const response = JSON.parse(data);
            const choice = response.choices[0];

            resolve({
              message: choice.message,
              finishReason: choice.finish_reason,
              usage: response.usage ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens
              } : undefined
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse Azure OpenAI response: ${parseError}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Azure OpenAI request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    throw new Error(`Azure OpenAI client error: ${error}`);
  }
}

/**
 * Test Azure OpenAI connection
 * @returns true if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await runLLM([
      {
        role: 'user',
        content: 'Reply with OK'
      }
    ]);
    return response.finishReason === 'stop';
  } catch (error) {
    console.error('Azure OpenAI connection test failed:', error);
    return false;
  }
}
