/**
 * 🛡️ CONTINUUM RELIABILITY ENGINE - FALLBACK UTILITIES
 * 
 * Graceful degradation and fallback mechanisms:
 * - Fallback chain execution
 * - Cached fallbacks
 * - Default value providers
 * - Degraded mode indicators
 */

import { toast } from 'sonner';

export interface FallbackOptions<T> {
  /** Primary operation */
  primary: () => Promise<T>;
  /** Fallback operations in order of preference */
  fallbacks?: Array<() => Promise<T>>;
  /** Default value if all operations fail */
  defaultValue?: T;
  /** Whether to show a degraded mode notification */
  showDegradedNotice?: boolean;
  /** Custom degraded mode message */
  degradedMessage?: string;
  /** Cache key for storing successful results */
  cacheKey?: string;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Callback when entering degraded mode */
  onDegraded?: (error: unknown) => void;
}

export interface FallbackResult<T> {
  data: T;
  source: 'primary' | 'fallback' | 'cache' | 'default';
  degraded: boolean;
  error?: unknown;
}

// Simple in-memory cache for fallback values
const fallbackCache = new Map<string, { data: unknown; expiry: number }>();

/**
 * Execute operation with fallback chain
 * 
 * @example
 * ```ts
 * const result = await withFallback({
 *   primary: () => fetchFromAPI('/api/data'),
 *   fallbacks: [
 *     () => fetchFromCDN('/cached/data.json'),
 *     () => fetchFromLocalStorage('data'),
 *   ],
 *   defaultValue: { items: [] },
 *   showDegradedNotice: true,
 * });
 * ```
 */
export async function withFallback<T>(
  options: FallbackOptions<T>
): Promise<FallbackResult<T>> {
  const {
    primary,
    fallbacks = [],
    defaultValue,
    showDegradedNotice = false,
    degradedMessage = 'Some features may be limited',
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    onDegraded,
  } = options;

  // Try primary operation
  try {
    const data = await primary();
    
    // Cache successful result
    if (cacheKey) {
      fallbackCache.set(cacheKey, {
        data,
        expiry: Date.now() + cacheTTL,
      });
    }
    
    return {
      data,
      source: 'primary',
      degraded: false,
    };
  } catch (primaryError) {
    // Try fallbacks in order
    for (let i = 0; i < fallbacks.length; i++) {
      try {
        const data = await fallbacks[i]();
        
        notifyDegraded(showDegradedNotice, degradedMessage);
        onDegraded?.(primaryError);
        
        return {
          data,
          source: 'fallback',
          degraded: true,
          error: primaryError,
        };
      } catch {
        // Continue to next fallback
      }
    }

    // Try cache
    if (cacheKey) {
      const cached = fallbackCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        notifyDegraded(showDegradedNotice, 'Using cached data');
        onDegraded?.(primaryError);
        
        return {
          data: cached.data as T,
          source: 'cache',
          degraded: true,
          error: primaryError,
        };
      }
    }

    // Use default value
    if (defaultValue !== undefined) {
      notifyDegraded(showDegradedNotice, degradedMessage);
      onDegraded?.(primaryError);
      
      return {
        data: defaultValue,
        source: 'default',
        degraded: true,
        error: primaryError,
      };
    }

    // All options exhausted
    throw primaryError;
  }
}

/**
 * Show degraded mode notification
 */
function notifyDegraded(show: boolean, message: string): void {
  if (show && typeof window !== 'undefined') {
    toast.warning(message, {
      description: 'The system is operating in degraded mode',
      duration: 5000,
    });
  }
}

/**
 * Create a cached fallback for expensive operations
 */
export function createCachedFallback<T>(
  operation: () => Promise<T>,
  cacheKey: string,
  ttl: number = 5 * 60 * 1000
): () => Promise<T> {
  return async () => {
    const cached = fallbackCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
    
    const data = await operation();
    fallbackCache.set(cacheKey, {
      data,
      expiry: Date.now() + ttl,
    });
    
    return data;
  };
}

/**
 * Create a localStorage fallback
 */
export function createLocalStorageFallback<T>(
  key: string,
  defaultValue: T
): () => Promise<T> {
  return async () => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored) as T;
      } catch {
        return defaultValue;
      }
    }
    
    return defaultValue;
  };
}

/**
 * Store data to localStorage for fallback use
 */
export function storeForFallback<T>(key: string, data: T): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Storage might be full or disabled
      console.warn(`Failed to store fallback data for key: ${key}`);
    }
  }
}

/**
 * Clear fallback cache
 */
export function clearFallbackCache(key?: string): void {
  if (key) {
    fallbackCache.delete(key);
  } else {
    fallbackCache.clear();
  }
}

/**
 * Degraded mode state management
 */
class DegradedModeManager {
  private degradedFeatures = new Set<string>();
  private listeners = new Set<(features: Set<string>) => void>();

  /**
   * Mark a feature as degraded
   */
  markDegraded(featureId: string): void {
    this.degradedFeatures.add(featureId);
    this.notifyListeners();
  }

  /**
   * Mark a feature as recovered
   */
  markRecovered(featureId: string): void {
    this.degradedFeatures.delete(featureId);
    this.notifyListeners();
  }

  /**
   * Check if a feature is degraded
   */
  isDegraded(featureId: string): boolean {
    return this.degradedFeatures.has(featureId);
  }

  /**
   * Get all degraded features
   */
  getDegradedFeatures(): string[] {
    return Array.from(this.degradedFeatures);
  }

  /**
   * Check if system is in any degraded state
   */
  isSystemDegraded(): boolean {
    return this.degradedFeatures.size > 0;
  }

  /**
   * Subscribe to degraded state changes
   */
  subscribe(listener: (features: Set<string>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear all degraded states
   */
  reset(): void {
    this.degradedFeatures.clear();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.degradedFeatures));
  }
}

// Singleton instance
export const degradedMode = new DegradedModeManager();

/**
 * React hook for degraded mode (to be used in components)
 */
export function useDegradedMode() {
  // This is a placeholder - actual hook implementation would use React state
  return {
    isDegraded: degradedMode.isSystemDegraded(),
    degradedFeatures: degradedMode.getDegradedFeatures(),
    markDegraded: degradedMode.markDegraded.bind(degradedMode),
    markRecovered: degradedMode.markRecovered.bind(degradedMode),
  };
}
