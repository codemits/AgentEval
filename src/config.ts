/**
 * Configuration module for AgentEval
 * Centralizes all configuration values and environment variables
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface Config {
  azure: {
    endpoint: string;
    apiKey: string;
    apiVersion: string;
    deploymentName: string;
    maxTokens: number;
    temperature: number;
  };
  server: {
    port: number;
    baseUrl: string;
  };
  evaluation: {
    maxSteps: number;
    timeoutMs: number;
  };
}

/**
 * Load configuration from environment variables with defaults
 */
export function loadConfig(): Config {
  // Validate required Azure OpenAI environment variables
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  
  if (!endpoint || !apiKey) {
    console.warn('⚠️  Warning: Azure OpenAI credentials not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env');
  }

  return {
    azure: {
      endpoint: endpoint || '',
      apiKey: apiKey || '',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview',
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
      maxTokens: 2000,
      temperature: 1 // Default temperature (some models only support 1)
    },
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3000'
    },
    evaluation: {
      maxSteps: 15, // Maximum steps before stopping agent
      timeoutMs: 5000
    }
  };
}

/**
 * Get the current configuration
 */
export const config = loadConfig();
