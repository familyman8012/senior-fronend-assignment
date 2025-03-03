# OpenAI API Mock

This is a Node.js module for mocking OpenAI API responses in a development environment.

[![Tests](https://github.com/chihebnabil/openai-api-mock/actions/workflows/test.yml/badge.svg)](https://github.com/chihebnabil/openai-api-mock/actions/workflows/test.yml)

It's useful for testing and development purposes when you don't want to make actual API calls.

The module supports the following OpenAI API endpoints:
- chat completions
- chat completions with streaming
- chat completions with functions
- image generations

> This module is powering the sandbox mode for [Aipify](https://aipify.co).

## Installation

You can install this module using npm as a dev dependency :

```sh
npm install -D openai-api-mock
```

## Usage
```js
import { mockOpenAIResponse } from 'openai-api-mock';
```

Then, call the mockOpenAIResponse function to set up the mock response:

```js
// Basic usage
mockOpenAIResponse();

// Force mocking regardless of environment
mockOpenAIResponse(true);

// With configuration options
mockOpenAIResponse(false, {
    includeErrors: true,    // Simulate random API errors
    latency: 1000,         // Add 1 second delay to responses
    logRequests: true      // Log incoming requests to console
});
```

The function accepts two parameters:
- `force` (boolean): Determines whether the mock response should be used regardless of the environment. If false or not provided, mocking only occurs in development environment.
- `options` (object): Additional configuration options
  - `includeErrors` (boolean): When true, randomly simulates API errors
  - `latency` (number): Adds artificial delay to responses in milliseconds
  - `logRequests` (boolean): Logs incoming requests to console for debugging

The function returns an object with control methods:
```js
const mock = mockOpenAIResponse();

// Check if mocking is active
console.log(mock.isActive);

// Stop all mocks
mock.stopMocking();

// Add custom endpoint mock (uses api.openai.com as base url)
mock.addCustomEndpoint('POST', '/v1/custom', (uri, body) => {
    return [200, { custom: 'response' }];
});
```

### Example responses

```js
// Call the mockOpenAIResponse function once to set up the mock
mockOpenAIResponse() 

// Now, when you call the OpenAI API, it will return a mock response
const response = await openai.chat.completions.create({
                model: "gpt-3.5",
                messages: [
                    { role: 'system', content: "You're an expert chef" },
                    { role: 'user', content: "Suggest at least 5 recipes" },
                ]
});
 ```
In this example, the `response` constant will contain mock data, simulating a response from the OpenAI API:

```javascript
{
    choices: [
        {
          finish_reason: 'stop',
          index: 0,
          message: [Object],
          logprobs: null
        }
      ],
      created: 1707040459,
      id: 'chatcmpl-tggOnwW8Lp2XiwQ8dmHHAcNYJ8CfzR',
      model: 'gpt-3.5-mock',
      object: 'chat.completion',
      usage: { completion_tokens: 17, prompt_tokens: 57, total_tokens: 74 }
}
```
The library also supports mocking `stream` responses

```js
// Call the mockOpenAIResponse function once to set up the mock
mockOpenAIResponse() 
// Now, when you call the OpenAI API, it will return a mock response
const response = await openai.chat.completions.create({
                model: "gpt-3.5",
                stream : true,
                messages: [
                    { role: 'system', content: "You're an expert chef" },
                    { role: 'user', content: "Suggest at least 5 recipes" },
                ]
});

// then read it 
for await (const part of response) {
    console.log(part.choices[0]?.delta?.content || '')
}
```

## Intercepted URLs

This module uses the `nock` library to intercept HTTP calls to the following OpenAI API endpoints:

- `https://api.openai.com/v1/chat/completions`: This endpoint is used for generating chat completions.
- `https://api.openai.com/v1/images/generations`: This endpoint is used for generating images.


## Dependencies
This module depends on the following npm packages:

- nock : For intercepting HTTP calls.
- @faker-js/faker : For generating fake data.

## License
This project is licensed under the MIT License.