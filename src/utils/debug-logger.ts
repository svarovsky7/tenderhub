/**
 * Debug Logger Utility
 * Provides conditional logging to reduce console overhead in production
 * while maintaining debugging capabilities during development
 */

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV;

// Enable debug logging via localStorage or environment variable
const isDebugEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    // Check localStorage for debug flag
    const debugFlag = localStorage.getItem('DEBUG_BOQ');
    if (debugFlag === 'true') return true;
  }
  // In development, enable by default but allow disabling
  return isDevelopment && localStorage.getItem('DEBUG_BOQ') !== 'false';
};

// Performance tracking
let logCount = 0;
const logFrequency: Map<string, number> = new Map();

// Reset log count periodically to prevent memory issues
setInterval(() => {
  if (logCount > 10000) {
    console.warn(`⚠️ Debug Logger: Cleared after ${logCount} logs to prevent memory issues`);
    logCount = 0;
    logFrequency.clear();
  }
}, 60000); // Every minute

export const debugLog = {
  /**
   * Log general debug information
   */
  log: (prefix: string, ...args: any[]): void => {
    if (!isDebugEnabled()) return;

    logCount++;
    const key = `${prefix}:${args[0]}`;
    logFrequency.set(key, (logFrequency.get(key) || 0) + 1);

    // Throttle frequently repeated logs
    const frequency = logFrequency.get(key) || 0;
    if (frequency > 100 && frequency % 100 !== 0) {
      return; // Skip every log that's not a multiple of 100 after 100 occurrences
    }

    console.log(prefix, ...args);
  },

  /**
   * Log performance-critical operations
   */
  performance: (operation: string, startTime?: number): number => {
    if (!isDebugEnabled()) return performance.now();

    if (startTime) {
      const duration = performance.now() - startTime;
      if (duration > 100) { // Only log slow operations
        console.log(`⏱️ [Performance] ${operation}: ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
    return performance.now();
  },

  /**
   * Log API calls
   */
  api: (method: string, endpoint: string, data?: any): void => {
    if (!isDebugEnabled()) return;
    console.log(`📡 [API] ${method} ${endpoint}`, data);
  },

  /**
   * Log React component lifecycle
   */
  component: (componentName: string, event: string, data?: any): void => {
    if (!isDebugEnabled()) return;

    // Skip frequent render logs
    if (event === 'render' && logCount > 1000) {
      return;
    }

    console.log(`🔄 [${componentName}] ${event}`, data);
  },

  /**
   * Log state changes
   */
  state: (componentName: string, stateName: string, value: any): void => {
    if (!isDebugEnabled()) return;
    console.log(`📊 [${componentName}] ${stateName}:`, value);
  },

  /**
   * Log errors (always enabled)
   */
  error: (prefix: string, error: any, context?: any): void => {
    console.error(`❌ ${prefix}`, error, context);
  },

  /**
   * Log warnings (always enabled in development)
   */
  warn: (prefix: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.warn(`⚠️ ${prefix}`, ...args);
    }
  },

  /**
   * Log success operations
   */
  success: (prefix: string, ...args: any[]): void => {
    if (!isDebugEnabled()) return;
    console.log(`✅ ${prefix}`, ...args);
  },

  /**
   * Enable/disable debug logging
   */
  enable: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('DEBUG_BOQ', 'true');
      console.log('🟢 Debug logging enabled');
    }
  },

  /**
   * Disable debug logging
   */
  disable: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('DEBUG_BOQ', 'false');
      console.log('🔴 Debug logging disabled');
    }
  },

  /**
   * Get current log statistics
   */
  stats: (): { count: number; topFrequent: [string, number][] } => {
    const sorted = Array.from(logFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      count: logCount,
      topFrequent: sorted
    };
  }
};

// Export convenience functions
export const { log, performance: perf, api, component, state, error, warn, success } = debugLog;

// Make debugLog available globally for debugging
if (typeof window !== 'undefined' && isDevelopment) {
  (window as any).debugLog = debugLog;
}