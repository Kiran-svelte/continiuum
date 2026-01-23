/**
 * Safe API Utility - Handles external API calls with:
 * - Timeouts (AbortController)
 * - Retry with exponential backoff
 * - Graceful error handling
 * - Fallback values
 */

interface SafeFetchOptions {
    timeout?: number;           // Default: 10000ms (10s)
    retries?: number;           // Default: 3
    retryDelay?: number;        // Default: 1000ms (exponential backoff)
    fallbackValue?: any;        // Value to return on complete failure
    onRetry?: (attempt: number, error: Error) => void;
}

export class ApiTimeoutError extends Error {
    constructor(url: string, timeout: number) {
        super(`Request to ${url} timed out after ${timeout}ms`);
        this.name = 'ApiTimeoutError';
    }
}

export class ApiRetryExhaustedError extends Error {
    constructor(url: string, attempts: number, lastError: Error) {
        super(`Request to ${url} failed after ${attempts} attempts. Last error: ${lastError.message}`);
        this.name = 'ApiRetryExhaustedError';
    }
}

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = 10000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new ApiTimeoutError(url, timeout);
        }
        throw error;
    }
}

/**
 * Fetch with automatic retry and exponential backoff
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    fetchOptions: SafeFetchOptions = {}
): Promise<Response> {
    const {
        timeout = 10000,
        retries = 3,
        retryDelay = 1000,
        onRetry,
    } = fetchOptions;

    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options, timeout);
            
            // If response is not ok and we have retries left, retry
            if (!response.ok && attempt < retries) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error: any) {
            lastError = error;
            
            // Don't retry on timeout or if we're out of retries
            if (error instanceof ApiTimeoutError || attempt >= retries) {
                break;
            }
            
            // Call onRetry callback
            onRetry?.(attempt, error);
            
            // Exponential backoff
            const delay = retryDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new ApiRetryExhaustedError(url, retries, lastError);
}

/**
 * Safe fetch that never throws - returns fallback on error
 */
export async function safeFetch<T>(
    url: string,
    options: RequestInit = {},
    fetchOptions: SafeFetchOptions = {}
): Promise<{ success: true; data: T } | { success: false; error: string; fallbackUsed?: boolean }> {
    const { fallbackValue } = fetchOptions;

    try {
        const response = await fetchWithRetry(url, options, fetchOptions);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            return {
                success: false,
                error: `Server returned ${response.status}: ${errorText}`,
            };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        console.error(`[safeFetch] Error fetching ${url}:`, error);

        // Return fallback if provided
        if (fallbackValue !== undefined) {
            return {
                success: true,
                data: fallbackValue,
                fallbackUsed: true,
            } as any;
        }

        // Return user-friendly error message
        if (error instanceof ApiTimeoutError) {
            return {
                success: false,
                error: 'The request timed out. Please try again.',
            };
        }

        if (error instanceof ApiRetryExhaustedError) {
            return {
                success: false,
                error: 'Service temporarily unavailable. Please try again later.',
            };
        }

        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
        };
    }
}

/**
 * Wrap any async function with timeout
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    timeoutMessage: string = 'Operation timed out'
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(timeoutMessage)), timeout)
        ),
    ]);
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        retries?: number;
        delay?: number;
        onRetry?: (attempt: number, error: Error) => void;
    } = {}
): Promise<T> {
    const { retries = 3, delay = 1000, onRetry } = options;
    
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            
            if (attempt >= retries) {
                break;
            }
            
            onRetry?.(attempt, error);
            
            const backoffDelay = delay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
    }
    
    throw lastError;
}
