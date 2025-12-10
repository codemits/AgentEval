/**
 * Tools Module
 * Provides utility functions for the LLM-powered agent
 * These tools are exposed to Azure OpenAI for function calling
 */

import Ajv, { JSONSchemaType } from 'ajv';
import { Tool } from './azure-client.js';

// User schema definition
interface User {
  id: number;
  name: string;
  email: string;
}

const userSchema: JSONSchemaType<User> = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    email: { type: 'string' }
  },
  required: ['id', 'name', 'email'],
  additionalProperties: false
};

// Error response schema
interface ErrorResponse {
  error: string;
}

const errorSchema: JSONSchemaType<ErrorResponse> = {
  type: 'object',
  properties: {
    error: { type: 'string' }
  },
  required: ['error'],
  additionalProperties: true
};

const ajv = new Ajv();
const validateUser = ajv.compile(userSchema);
const validateError = ajv.compile(errorSchema);

/**
 * Generate a deterministic list of test IDs
 * @returns Array of test IDs including valid and invalid cases
 */
export function generateTestIds(): number[] {
  return [1, 50, 100, -1, 999];
}

/**
 * Call the API with the specified method and URL
 * @param method HTTP method (GET, POST, etc.)
 * @param url Full URL to call
 * @returns Response object with status, data, and validation result
 */
export async function callApi(
  method: string,
  url: string
): Promise<{
  status: number;
  data: any;
  schemaValid: boolean;
  schemaErrors?: any;
}> {
  try {
    // Use dynamic import for node:http to make HTTP requests
    const http = await import('http');
    
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            let schemaValid = false;
            let schemaErrors = undefined;

            // Validate schema based on status code
            if (res.statusCode === 200) {
              schemaValid = validateUser(jsonData);
              schemaErrors = validateUser.errors;
            } else if (res.statusCode === 404) {
              schemaValid = validateError(jsonData);
              schemaErrors = validateError.errors;
            }

            resolve({
              status: res.statusCode || 0,
              data: jsonData,
              schemaValid,
              schemaErrors
            });
          } catch (parseError) {
            resolve({
              status: res.statusCode || 0,
              data: { error: 'Failed to parse response' },
              schemaValid: false,
              schemaErrors: [{ message: String(parseError) }]
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          status: 0,
          data: { error: String(error) },
          schemaValid: false,
          schemaErrors: [{ message: 'Network error or server not running' }]
        });
      });

      req.end();
    });
  } catch (error) {
    return {
      status: 0,
      data: { error: String(error) },
      schemaValid: false,
      schemaErrors: [{ message: 'Network error or server not running' }]
    };
  }
}

/**
 * Validate JSON data against schema
 * @param data Data to validate
 * @param expectedType Expected schema type ('user' or 'error')
 * @returns Validation result
 */
export function validateSchema(
  data: any,
  expectedType: 'user' | 'error'
): { valid: boolean; errors?: any } {
  const validator = expectedType === 'user' ? validateUser : validateError;
  const valid = validator(data);
  return {
    valid,
    errors: validator.errors
  };
}

/**
 * Get tool definitions for Azure OpenAI function calling
 * These define the tools available to the LLM agent
 */
export function getToolDefinitions(): Tool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'generateTestIds',
        description: 'Generate a list of test IDs to use for API testing. Returns valid IDs (1-100) and invalid IDs to test error handling.',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'callApi',
        description: 'Call the user API endpoint with a specific HTTP method and URL. Returns the status code, response data, and schema validation result.',
        parameters: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              description: 'HTTP method to use (GET, POST, etc.)',
              enum: ['GET', 'POST', 'PUT', 'DELETE']
            },
            url: {
              type: 'string',
              description: 'Full URL to call (e.g., http://localhost:3000/users/1)'
            }
          },
          required: ['method', 'url']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'validateSchema',
        description: 'Validate that response data matches the expected JSON schema (user or error response).',
        parameters: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'The response data to validate'
            },
            expectedType: {
              type: 'string',
              description: 'Expected schema type',
              enum: ['user', 'error']
            }
          },
          required: ['data', 'expectedType']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'final_report',
        description: 'Submit the final test report summarizing all API tests performed. Call this when all testing is complete.',
        parameters: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Overall summary of the testing results'
            },
            totalTests: {
              type: 'number',
              description: 'Total number of API calls made'
            },
            successCount: {
              type: 'number',
              description: 'Number of successful tests (200 responses with valid schema)'
            },
            errorCount: {
              type: 'number',
              description: 'Number of expected error cases (404 responses with valid error schema)'
            },
            failures: {
              type: 'array',
              description: 'List of any unexpected failures or schema validation errors',
              items: { type: 'string' }
            }
          },
          required: ['summary', 'totalTests', 'successCount', 'errorCount']
        }
      }
    }
  ];
}

/**
 * Execute a tool based on function name and arguments
 * @param functionName Name of the tool to execute
 * @param args Arguments for the tool
 * @returns Tool execution result
 */
export async function executeTool(functionName: string, args: any): Promise<any> {
  switch (functionName) {
    case 'generateTestIds':
      return generateTestIds();
    
    case 'callApi':
      return await callApi(args.method, args.url);
    
    case 'validateSchema':
      return validateSchema(args.data, args.expectedType);
    
    case 'final_report':
      // Final report doesn't execute anything, just returns the args
      return args;
    
    default:
      throw new Error(`Unknown tool: ${functionName}`);
  }
}

export { User, ErrorResponse, userSchema, errorSchema };
