/**
 * 🔄 CONTINUUM RELIABILITY ENGINE - INDEX
 * 
 * Exports all reliability utilities for easy importing
 */

// Retry utilities
export {
  withRetry,
  fetchWithRetry,
  createRetryOperation,
  RetryStrategies,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  type RetryResult,
} from './retry';

// Circuit breaker
export {
  CircuitBreaker,
  CircuitBreakerError,
  getCircuitBreaker,
  circuitBreakers,
  CircuitBreakerPresets,
  type CircuitBreakerConfig,
  type CircuitState,
  type CircuitStats,
} from './circuit-breaker';

// Fallback utilities
export {
  withFallback,
  createCachedFallback,
  createLocalStorageFallback,
  storeForFallback,
  clearFallbackCache,
  degradedMode,
  useDegradedMode,
  type FallbackOptions,
  type FallbackResult,
} from './fallback';

/**
 * Convenience function combining retry, circuit breaker, and fallback
 * 
 * @example
 * ```ts
 * const result = await resilientFetch('/api/critical-data', {
 *   retry: RetryStrategies.STANDARD,
 *   circuitBreaker: 'api-service',
 *   fallback: { defaultValue: [] },
 * });
 * ```
 */
export async function resilientFetch<T>(
  url: string,
  options?: {
    fetchOptions?: RequestInit;
    retry?: import('./retry').RetryConfig;
    circuitBreaker?: string;
    fallback?: {
      defaultValue?: T;
      cacheKey?: string;
    };
  }
): Promise<T> {
  const { fetchWithRetry } = await import('./retry');
  const { getCircuitBreaker, CircuitBreakerPresets } = await import('./circuit-breaker');
  const { withFallback, storeForFallback } = await import('./fallback');

  // Get or create circuit breaker if specified
  const breaker = options?.circuitBreaker
    ? getCircuitBreaker(options.circuitBreaker, CircuitBreakerPresets.EXTERNAL_API)
    : null;

  // Build the operation
  const operation = async () => {
    if (breaker) {
      return breaker.execute(async () => {
        const result = await fetchWithRetry<T>(
          url,
          options?.fetchOptions,
          options?.retry
        );
        if (!result.success) throw result.error;
        return result.data!;
      });
    } else {
      const result = await fetchWithRetry<T>(
        url,
        options?.fetchOptions,
        options?.retry
      );
      if (!result.success) throw result.error;
      return result.data!;
    }
  };

  // Wrap with fallback if configured
  if (options?.fallback) {
    const result = await withFallback({
      primary: operation,
      defaultValue: options.fallback.defaultValue,
      cacheKey: options.fallback.cacheKey,
      showDegradedNotice: true,
    });

    // Store successful primary results for future fallback
    if (result.source === 'primary' && options.fallback.cacheKey) {
      storeForFallback(options.fallback.cacheKey, result.data);
    }

    return result.data;
  }

  return operation();
}
