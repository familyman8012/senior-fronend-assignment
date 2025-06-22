
export interface MockOptions {
  /**
   * When true, randomly simulates API errors
   */
  includeErrors?: boolean;
  /**
   * Adds artificial delay to responses in milliseconds
   */
  latency?: number;
  /**
   * Logs incoming requests to console for debugging
   */
  logRequests?: boolean;
}

export interface MockControl {
  /**
   * Indicates if mocking is currently active
   */
  isActive: boolean;
  /**
   * Stops all active mocks
   */
  stopMocking: () => void;
  /**
   * Adds a custom endpoint mock
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - Endpoint path (will be appended to api.openai.com)
   * @param handler - Function to handle the request and return response
   */
  addCustomEndpoint: (
    method: string,
    path: string,
    handler: (uri: string, body: any) => [number, any] | Promise<[number, any]>
  ) => void;
}

/**
 * Sets up mocking for OpenAI API responses
 * @param force - If true, forces mocking regardless of environment. If false, only mocks in development
 * @param options - Configuration options for the mock behavior
 * @returns Object with control methods for the mock
 */
export function mockOpenAIResponse(force?: boolean, options?: MockOptions): MockControl;
