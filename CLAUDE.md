# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a senior frontend developer assignment for implementing an AI chat interface. The project uses a pnpm monorepo structure with a pre-built OpenAI API mock library.

## Essential Commands

### Initial Setup
```bash
# Install dependencies
pnpm install

# Build the mock library (required before use)
cd packages/openai-api-mock
pnpm build
```

### Development Commands
```bash
# Run tests for all packages
pnpm test

# Run tests for a specific package
pnpm --filter openai-api-mock test

# Build all packages
pnpm build

# Run dev server (when web-ui package exists)
pnpm dev
```

### Testing the Mock Library
```bash
# Run all tests with coverage
cd packages/openai-api-mock
npm test

# Run a specific test file
npm test -- integration.test.js

# Run tests with coverage report
npm run coverage
```

## Architecture & Key Concepts

### Content Type Detection
The mock library automatically detects content types based on keywords in messages:
- "markdown" or "md" → Returns markdown formatted content
- "html" → Returns HTML content with inline styles
- "json" → Returns structured JSON data
- Default → Plain text responses

### Mock Library Usage Pattern
```javascript
import { mockOpenAIResponse } from "./packages/openai-api-mock/dist/index.js";
import OpenAI from "openai";

// Enable mocking with options
mockOpenAIResponse(true, {
    seed: 12345,           // For consistent responses in tests
    includeErrors: true,   // Simulate random API errors
    latency: 1000,        // Add artificial delay
    logRequests: true     // Debug API calls
});

// Use OpenAI client normally
const openai = new OpenAI({
    apiKey: "test-key",
    dangerouslyAllowBrowser: true
});
```

### Streaming Implementation
The mock supports real-time streaming for chat completions:
```javascript
const stream = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    stream: true,
    messages: [{ role: "user", content: "Hello" }]
});

for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    // Update UI with each chunk
}
```

## Assignment Requirements Summary

1. **Chat UI**: Implement distinct message bubbles for user/AI with auto-scroll to latest
2. **Streaming**: Real-time character-by-character rendering with cancel functionality
3. **Content Rendering**: Handle Markdown, HTML (with XSS protection), JSON, and plain text
4. **Error Handling**: Network errors, retry mechanisms, and graceful degradation

## Important Notes

- The project currently only contains the mock library package
- A new package needs to be created for the web UI implementation
- The mock library must be built before it can be imported
- No linting or formatting rules are currently configured
- The assignment emphasizes UX and problem-solving over perfect implementation