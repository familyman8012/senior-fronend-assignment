import nock from 'nock';
import { getChatResponce } from './chat.js';
import { createChatStream } from './chat.stream.js';
import { getImageResponce } from './image.js';

const OPEN_AI_BASE_URL = 'https://api.openai.com';
const CHAT_COMPLETIONS_ENDPOINT = '/v1/chat/completions';
const IMAGE_GENERATIONS_ENDPOINT = '/v1/images/generations';
const customScopes = []; // Track custom scopes
/**
 * Mock OpenAI API responses
 * @param {boolean} force - Force mocking regardless of environment
 * @param {Object} options - Additional configuration options
 * @param {boolean} options.includeErrors - Whether to include error scenarios in mocking
 * @param {number} options.latency - Artificial latency in ms to simulate network delay
 * @param {boolean} options.logRequests - Whether to log incoming requests
 * @returns {Object} An object with control methods for the mocks
 */
function mockOpenAIResponse(force = false, options = {}) {
    const {
        includeErrors = false,
        latency = 0,
        logRequests = false
    } = options;

    const env = process.env.NODE_ENV || 'development';

    // Only proceed if in development or forced
    if (env !== 'development' && !force) {
        return { isActive: false, stopMocking };
    }

    // Add delay if latency is specified
    const delayResponse = latency > 0 ?
        nock.defaults({ delayConnection: latency }) : null;

    // Mock chat completions endpoint
    const chatScope = nock(OPEN_AI_BASE_URL)
        .post(CHAT_COMPLETIONS_ENDPOINT)
        .reply(function (uri, requestBody) {
            if (logRequests) {
                console.log(`[openai-api-mock] Chat request:`, JSON.stringify(requestBody, null, 2));
            }

            try {
                // Validate minimal required fields
                if (!requestBody.model || !requestBody.messages || !Array.isArray(requestBody.messages)) {
                    return [400, { error: { message: 'Invalid request. Missing required fields.' } }];
                }

                // Simulate random errors if enabled
                if (includeErrors && Math.random() < 0.05) {
                    return [429, { error: { message: 'Rate limit exceeded' } }];
                }

                const isSteaming = requestBody.stream === true;

                if (isSteaming) {
                    const stream = createChatStream(requestBody);
                    return [200, stream];
                }

                return [200, getChatResponce(requestBody)];
            } catch (error) {
                console.error('[openai-api-mock] Error processing chat request:', error);
                return [500, { error: { message: 'Internal server error in mock' } }];
            }
        });

    // Mock image generations endpoint
    const imageScope = nock(OPEN_AI_BASE_URL)
        .post(IMAGE_GENERATIONS_ENDPOINT)
        .reply(function (uri, requestBody) {
            if (logRequests) {
                console.log(`[openai-api-mock] Image request:`, JSON.stringify(requestBody, null, 2));
            }

            try {
                // Validate minimal required fields
                if (!requestBody.prompt) {
                    return [400, { error: { message: 'Invalid request. Missing prompt.' } }];
                }

                // Simulate random errors if enabled
                if (includeErrors && Math.random() < 0.05) {
                    return [400, { error: { message: 'Your request was rejected as a result of our safety system.' } }];
                }

                return [200, getImageResponce(requestBody)];
            } catch (error) {
                console.error('[openai-api-mock] Error processing image request:', error);
                return [500, { error: { message: 'Internal server error in mock' } }];
            }
        });

    // Enable other network connections
    nock.enableNetConnect(host => host !== "api.openai.com");



    return {
        isActive: true,
        stopMocking,

        /**
         * Adds a custom endpoint mock
         * @param {string} method - HTTP method (e.g., 'GET', 'POST')
         * @param {string} path - Endpoint path (e.g., '/v1/custom')
         * @param {Function} handler - Function returning [statusCode, responseBody]
         */
        addCustomEndpoint(method, path, handler) {
            const methodLower = method.toLowerCase();
            const scope = nock(OPEN_AI_BASE_URL)
            [methodLower](path)
                .reply(handler)
                .persist(); // Keep the mock active indefinitely
            customScopes.push(scope);
        }
    };
}

function stopMocking() {
    nock.cleanAll();
    customScopes.forEach(scope => scope.persist(false)); // Disable persistence
}

export { mockOpenAIResponse, stopMocking };