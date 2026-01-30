/**
 * ⚡ CONTINUUM RELIABILITY ENGINE - CIRCUIT BREAKER
 * 
 * Protects against cascading failures with:
 * - Automatic failure detection
 * - Graceful degradation
 * - Self-healing with half-open state
 * - Configurable thresholds
 * - Event callbacks for monitoring
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before trying again (entering half-open) */
  resetTimeout: number;
  /** Number of successful calls in half-open to close circuit */
  successThreshold: number;
  /** Time window in ms to count failures */
  failureWindow: number;
  /** Callback when circuit opens */
  onOpen?: (failures: number) => void;
  /** Callback when circuit closes */
  onClose?: () => void;
  /** Callback when circuit enters half-open */
  onHalfOpen?: () => void;
  /** Callback when call succeeds */
  onSuccess?: () => void;
  /** Callback when call fails */
  onFailure?: (error: unknown) => void;
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
}

// Default configuration
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000,
  successThreshold: 3,
  failureWindow: 60000,
};

/**
 * Circuit Breaker implementation for protecting against cascading failures
 * 
 * States:
 * - CLOSED: Normal operation, calls pass through
 * - OPEN: Too many failures, calls fail fast
 * - HALF_OPEN: Testing if service recovered
 * 
 * @example
 * ```ts
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeout: 30000,
 * });
 * 
 * const result = await breaker.execute(
 *   () => fetch('/api/external-service'),
 *   () => ({ fallback: true }) // Optional fallback
 * );
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  private failureTimestamps: number[] = [];
  
  // Stats tracking
  private totalCalls: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailureTime,
      lastSuccess: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Check if circuit allows calls
   */
  isOpen(): boolean {
    return this.state === 'OPEN';
  }

  /**
   * Manually reset circuit to closed state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * Execute an operation through the circuit breaker
   * 
   * @param operation - The async operation to execute
   * @param fallback - Optional fallback function when circuit is open
   * @returns Promise with operation result or fallback
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    this.totalCalls++;
    
    // Check circuit state
    if (this.state === 'OPEN') {
      // Check if reset timeout has passed
      if (this.lastFailureTime) {
        const elapsed = Date.now() - this.lastFailureTime.getTime();
        if (elapsed >= this.config.resetTimeout) {
          this.enterHalfOpen();
        }
      }
      
      // If still open, use fallback or throw
      if (this.state === 'OPEN') {
        if (fallback) {
          return fallback();
        }
        throw new CircuitBreakerError('Circuit breaker is OPEN', this.getStats());
      }
    }

    try {
      const result = await operation();
      this.onOperationSuccess();
      return result;
    } catch (error) {
      this.onOperationFailure(error);
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private onOperationSuccess(): void {
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;
    this.config.onSuccess?.();

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.closeCircuit();
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failures = 0;
      this.failureTimestamps = [];
    }
  }

  /**
   * Record a failed operation
   */
  private onOperationFailure(error: unknown): void {
    this.lastFailureTime = new Date();
    this.totalFailures++;
    this.config.onFailure?.(error);

    const now = Date.now();
    this.failureTimestamps.push(now);
    
    // Clean up old failures outside the window
    this.failureTimestamps = this.failureTimestamps.filter(
      ts => now - ts < this.config.failureWindow
    );
    this.failures = this.failureTimestamps.length;

    if (this.state === 'HALF_OPEN') {
      // Single failure in half-open returns to open
      this.openCircuit();
    } else if (this.state === 'CLOSED' && this.failures >= this.config.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit (stop allowing calls)
   */
  private openCircuit(): void {
    this.state = 'OPEN';
    this.successes = 0;
    this.config.onOpen?.(this.failures);
    
    // Schedule reset timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    this.resetTimer = setTimeout(() => {
      this.enterHalfOpen();
    }, this.config.resetTimeout);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[CircuitBreaker] Circuit OPENED after ${this.failures} failures`);
    }
  }

  /**
   * Enter half-open state (allow limited calls to test)
   */
  private enterHalfOpen(): void {
    this.state = 'HALF_OPEN';
    this.successes = 0;
    this.failures = 0;
    this.config.onHalfOpen?.();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[CircuitBreaker] Circuit entered HALF_OPEN state');
    }
  }

  /**
   * Close the circuit (resume normal operation)
   */
  private closeCircuit(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.failureTimestamps = [];
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.config.onClose?.();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[CircuitBreaker] Circuit CLOSED - service recovered');
    }
  }
}

/**
 * Custom error for circuit breaker
 */
export class CircuitBreakerError extends Error {
  public readonly stats: CircuitStats;
  
  constructor(message: string, stats: CircuitStats) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.stats = stats;
  }
}

// Global circuit breakers for common services
export const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a named circuit breaker
 */
export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(config));
  }
  return circuitBreakers.get(name)!;
}

/**
 * Pre-configured circuit breakers for common scenarios
 */
export const CircuitBreakerPresets = {
  /** For external API calls - sensitive to failures */
  EXTERNAL_API: {
    failureThreshold: 3,
    resetTimeout: 60000,
    successThreshold: 2,
    failureWindow: 30000,
  } as Partial<CircuitBreakerConfig>,
  
  /** For internal services - more tolerant */
  INTERNAL_SERVICE: {
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 3,
    failureWindow: 60000,
  } as Partial<CircuitBreakerConfig>,
  
  /** For database operations - critical path */
  DATABASE: {
    failureThreshold: 3,
    resetTimeout: 10000,
    successThreshold: 2,
    failureWindow: 20000,
  } as Partial<CircuitBreakerConfig>,
  
  /** For background tasks - very tolerant */
  BACKGROUND_TASK: {
    failureThreshold: 10,
    resetTimeout: 120000,
    successThreshold: 5,
    failureWindow: 300000,
  } as Partial<CircuitBreakerConfig>,
};
