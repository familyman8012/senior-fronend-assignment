import { toast } from '@/store/toastStore';
import { useChatStore } from '@/store/chatStore';

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
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
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

export class ErrorHandler {
  private static instance: ErrorHandler;
  
  private constructor() {}
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }
  
  handle(error: unknown, context?: string): void {
    const appError = parseError(error);
    
    // Centralized logging
    console.error(`[${context || 'Error'}]`, {
      type: appError.type,
      message: appError.message,
      retryable: appError.retryable,
      statusCode: appError.statusCode,
      originalError: error,
    });
    
    // Don't show UI for abort errors
    if (appError.message.includes('취소')) {
      return;
    }
    
    // Error type specific handling
    switch (appError.type) {
      case ErrorType.RATE_LIMIT:
        toast.warning(appError.message, 5000);
        break;
        
      case ErrorType.NETWORK:
        // Store for persistent display (in ErrorAlert)
        useChatStore.getState().setError(appError.message);
        break;
        
      case ErrorType.AUTHENTICATION:
        toast.error(appError.message, 0); // No auto-dismiss for auth errors
        break;
        
      case ErrorType.VALIDATION:
        toast.warning(appError.message);
        break;
        
      default:
        // For unknown errors, show toast for transient errors
        // and store for persistent display for serious errors
        if (appError.retryable) {
          toast.error(appError.message);
        } else {
          useChatStore.getState().setError(appError.message);
        }
    }
  }
  
  // Method to clear all errors
  clearAll(): void {
    useChatStore.getState().setError(null);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();