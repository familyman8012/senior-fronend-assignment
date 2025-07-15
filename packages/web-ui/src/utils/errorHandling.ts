export enum ErrorType {
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError extends Error {
  type: ErrorType;
  retryable: boolean;
  statusCode?: number;
}

export function createAppError(
  message: string,
  type: ErrorType,
  retryable = false,
  statusCode?: number
): AppError {
  const error = new Error(message) as AppError;
  error.type = type;
  error.retryable = retryable;
  error.statusCode = statusCode;
  return error;
}

export function parseError(error: unknown): AppError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return createAppError(
        '네트워크 연결을 확인해주세요.',
        ErrorType.NETWORK,
        true
      );
    }
    
    // Rate limit errors
    if (message.includes('429') || message.includes('rate limit')) {
      return createAppError(
        '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        ErrorType.RATE_LIMIT,
        true,
        429
      );
    }
    
    // Authentication errors
    if (message.includes('401') || message.includes('unauthorized')) {
      return createAppError(
        '인증에 실패했습니다. API 키를 확인해주세요.',
        ErrorType.AUTHENTICATION,
        false,
        401
      );
    }
    
    // Validation errors
    if (message.includes('400') || message.includes('bad request')) {
      return createAppError(
        '잘못된 요청입니다. 입력 내용을 확인해주세요.',
        ErrorType.VALIDATION,
        false,
        400
      );
    }
    
    // Abort errors (not actual errors)
    if (message.includes('abort')) {
      return createAppError(
        '요청이 취소되었습니다.',
        ErrorType.UNKNOWN,
        false
      );
    }
    
    // Default error
    return createAppError(
      error.message || '알 수 없는 오류가 발생했습니다.',
      ErrorType.UNKNOWN,
      true
    );
  }
  
  return createAppError(
    '알 수 없는 오류가 발생했습니다.',
    ErrorType.UNKNOWN,
    true
  );
}

export function shouldRetry(error: unknown): boolean {
  const appError = parseError(error);
  return appError.retryable && appError.type !== ErrorType.UNKNOWN;
}