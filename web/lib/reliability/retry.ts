/**
 * 🔄 CONTINUUM RELIABILITY ENGINE - RETRY UTILITIES
 * 
 * Enterprise-grade retry logic with:
 * - Exponential backoff with jitter
 * - Configurable retry strategies
 * - Timeout handling
 * - Error classification
 * - Detailed logging
 */

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelay: number;
  /** Maximum delay cap in milliseconds */
  maxDelay: number;
  /** Backoff multiplier (e.g., 2 for exponential) */
  backoffMultiplier: number;
  /** Add random jitter to prevent thundering herd */
  jitter: boolean;
  /** Operation timeout in milliseconds */
  timeout?: number;
  /** Function to determine if error is retryable */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback fired before each retry */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  /** Callback fired on final failure */
  onFailure?: (error: unknown, attempts: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalTime: number;
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  timeout: 30000,
  shouldRetry: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
        return true;
      }
    }
    // Check for HTTP errors
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status;
      return status >= 500 || status === 429;
    }
    return false;
  },
};

/**
 * Calculate delay for next retry with exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  if (config.jitter) {
    // Add random jitter of ±25%
    const jitterRange = cappedDelay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, cappedDelay + jitter);
  }
  
  return cappedDelay;
}

/**
 * Sleep for specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a timeout promise that rejects after specified duration
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

/**
 * Execute an async operation with retry logic
 * 
 * @param operation - The async function to execute
 * @param config - Retry configuration (optional, uses defaults)
 * @returns RetryResult with success status, data or error, and metadata
 * 
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => fetch('/api/data').then(r => r.json()),
 *   { maxRetries: 5, baseDelay: 500 }
 * );
 * 
 * if (result.success) {
 *   console.log('Data:', result.data);
 * } else {
 *   console.error('Failed after', result.attempts, 'attempts');
 * }
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const mergedConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      // Execute operation with optional timeout
      let result: T;
      if (mergedConfig.timeout) {
        result = await Promise.race([
          operation(),
          createTimeout(mergedConfig.timeout)
        ]);
      } else {
        result = await operation();
      }
      
      return {
        success: true,
        data: result,
        attempts: attempt + 1,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      const shouldRetry = mergedConfig.shouldRetry?.(error, attempt) ?? true;
      const hasRetriesLeft = attempt < mergedConfig.maxRetries;
      
      if (shouldRetry && hasRetriesLeft) {
        const delay = calculateDelay(attempt, mergedConfig);
        mergedConfig.onRetry?.(error, attempt + 1, delay);
        
        // Log retry attempt in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Retry] Attempt ${attempt + 1}/${mergedConfig.maxRetries + 1} failed. Retrying in ${Math.round(delay)}ms...`);
        }
        
        await sleep(delay);
      } else {
        break;
      }
    }
  }
  
  // All retries exhausted
  mergedConfig.onFailure?.(lastError, mergedConfig.maxRetries + 1);
  
  return {
    success: false,
    error: lastError,
    attempts: mergedConfig.maxRetries + 1,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Retry wrapper for fetch requests with automatic error handling
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options?: RequestInit,
  retryConfig?: Partial<RetryConfig>
): Promise<RetryResult<T>> {
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      (error as any).response = response;
      throw error;
    }
    
    return response.json() as Promise<T>;
  }, {
    ...retryConfig,
    shouldRetry: (error) => {
      // Don't retry client errors (4xx except 429)
      if (typeof error === 'object' && error !== null && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status >= 400 && status < 500 && status !== 429) {
          return false;
        }
      }
      return DEFAULT_RETRY_CONFIG.shouldRetry!(error, 0);
    },
  });
}

/**
 * Create a pre-configured retry function for specific use cases
 */
export function createRetryOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig>
) {
  return () => withRetry(operation, config);
}

/**
 * Retry strategies for common scenarios
 */
export const RetryStrategies = {
  /** Fast retry for quick operations (3 retries, 500ms base) */
  FAST: {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitter: true,
  } as Partial<RetryConfig>,
  
  /** Standard retry for API calls (3 retries, 1s base) */
  STANDARD: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    jitter: true,
  } as Partial<RetryConfig>,
  
  /** Patient retry for critical operations (5 retries, 2s base) */
  PATIENT: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    jitter: true,
  } as Partial<RetryConfig>,
  
  /** Aggressive retry for time-sensitive operations (5 retries, 200ms base) */
  AGGRESSIVE: {
    maxRetries: 5,
    baseDelay: 200,
    maxDelay: 3000,
    backoffMultiplier: 1.5,
    jitter: true,
  } as Partial<RetryConfig>,
  
  /** No retry - single attempt only */
  NONE: {
    maxRetries: 0,
  } as Partial<RetryConfig>,
};
