# AgentEval

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-realistic TypeScript framework that evaluates LLM-powered AI agents using **Azure OpenAI** with tool calling (function calling).

## Features

- 🤖 **Azure OpenAI Integration** - Uses GPT-4o/GPT-4.1 with function calling
- 🧠 **LLM-Powered Agent** - Autonomous decision-making with conversation loop
- 🔧 **Tool Calling** - Agent uses generateTestIds, callApi, validateSchema, final_report
- 📊 **Comprehensive Evaluation** - 5 metrics: workflow, tool usage, schemas, errors, final report
- 🎯 **JSON Schema Validation** - Powered by Ajv
- 📈 **Beautiful HTML Reports** - Visual scoring and detailed analysis
- 🔍 **Full Trace Capture** - Records LLM messages, tool calls, and results

## Quick Start

### Prerequisites

You need an **Azure OpenAI** account with:
- GPT-4o or GPT-4.1 deployment
- API endpoint and API key

### Setup

```bash
# Install dependencies
npm install

# Configure Azure OpenAI
cp .env.example .env
# Edit .env and add your credentials:
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
# AZURE_OPENAI_API_KEY=your-api-key
# AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Run complete evaluation (starts mock server + agent + evaluation)
npm test

# Or run agent only
npm run agent
```

## Project Structure

```
src/
├── config.ts           # Configuration + Azure OpenAI settings
├── azure-client.ts     # Azure OpenAI client wrapper
├── mock-server.ts      # Mock API server
├── tools.ts            # Agent tools with function definitions
├── agentRunner.ts      # LLM-powered agent with tool calling
└── evaluate.ts         # Evaluation framework for LLM traces
```

## How It Works

### 1. Mock API Server
Express server simulating a user API:
- `GET /users/:id` → 200 for IDs 1-100, 404 otherwise
- Returns JSON with user data or error messages

### 2. LLM-Powered Agent
Azure OpenAI GPT-4o agent with tool calling:
- **Task**: "Test the user API with various IDs including valid and invalid cases"
- **Tools Available**: generateTestIds, callApi, validateSchema, final_report
- **Execution**: LLM decides which tools to call and when
- **Trace**: Captures LLM messages, tool calls, arguments, and results

### 3. Evaluation Framework
Validates LLM agent traces with 5 comprehensive metrics:
- ✅ **Step Accuracy (100%)** - Workflow follows logical pattern, all required tools used
- ✅ **Tool Accuracy (0-100%)** - Percentage of correct tool usage
- ✅ **Schema Pass Rate (0-100%)** - API responses match expected schemas
- ✅ **Failure Handling (0-100%)** - Error cases (404) handled correctly
- ✅ **Final Correctness (100%)** - Final report numbers match actual trace
- 📊 **Overall Score** - Average of all 5 metrics

## Configuration

Create a `.env` file with your Azure OpenAI credentials:

```env
# Mock Server
PORT=3000
API_BASE_URL=http://localhost:3000

# Azure OpenAI (REQUIRED)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
```

## Scripts

```bash
npm run build         # Compile TypeScript
npm run start:mock    # Start mock API server
npm run agent         # Run LLM agent only
npm run start         # Run LLM agent (alias)
npm run evaluate      # Run full evaluation (agent + metrics)
npm test              # Complete test: mock server + agent + evaluation
npm run lint          # Type check with TypeScript
npm run clean         # Remove dist/ folder
npm run dev:mock      # Start server with auto-reload
```

## Output Files

- **trace.json** - Complete execution trace with LLM messages and tool calls
- **report.json** - Detailed evaluation metrics (JSON format)
- **report.html** - Beautiful HTML dashboard with visual scores and charts

## Example Evaluation

```
📈 EVALUATION RESULTS:
============================================================
Step Accuracy:      100.0%
Tool Accuracy:      100.0%
Schema Pass Rate:   100.0%
Failure Handling:   100.0%
Final Correctness:  100.0%
------------------------------------------------------------
Overall Score:      100.0%
============================================================
```

## Architecture

**AgentEval** uses a production-realistic architecture:

1. **Azure OpenAI Client** (`azure-client.ts`) - Handles GPT-4o API requests with tool calling
2. **Tool System** (`tools.ts`) - Defines 4 tools with JSON schemas for function calling
3. **Agent Loop** (`agentRunner.ts`) - Implements conversation loop: LLM → tool_calls → execute → repeat
4. **Trace Capture** - Records every LLM message, tool call, and result
5. **Multi-Metric Evaluation** - Validates workflow, tools, schemas, error handling, final report

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

**Quick Steps:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Security Note:** Never commit `.env` file or Azure OpenAI credentials. Report security issues via GitHub issues.

## Technology Stack

- **TypeScript 5.3** - Type-safe development
- **Azure OpenAI** - GPT-4o/GPT-4.1 with function calling
- **Express** - Mock API server
- **Ajv** - JSON schema validation
- **Node.js** - Runtime environment

## License

[MIT](LICENSE) - See LICENSE file for details

## Roadmap

- [ ] Support for multiple HTTP methods
- [ ] Plugin system for custom validators
- [ ] CLI interface
- [ ] Parallel test execution
- [ ] Advanced reporting options

---

**Built with ❤️ by the AgentEval team**
