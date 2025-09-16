/**
 * Performance monitoring utility for identifying bottlenecks
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  dataVolume?: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}


// Контроль логирования
const ENABLE_DETAILED_LOGGING = false;
const debugLog = (message: string, ...args: any[]) => {
  if (ENABLE_DETAILED_LOGGING) {
    console.log(message, ...args);
  }
};

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private sessionStartTime: number = 0;

  startSession(sessionName: string = 'default') {
    this.sessionStartTime = performance.now();
  }

  start(operationName: string, dataVolume?: number): void {
    const metric: PerformanceMetric = {
      name: operationName,
      startTime: performance.now(),
      status: 'running',
      dataVolume
    };

    this.metrics.set(operationName, metric);
    debugLog(`🚀 [Performance] Starting: ${operationName}${dataVolume ? ` (${dataVolume} items)` : ''}`);
  }

  end(operationName: string, dataVolume?: number): number {
    const metric = this.metrics.get(operationName);
    if (!metric) {
      console.warn(`⚠️ [Performance] No metric found for: ${operationName}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.status = 'completed';
    if (dataVolume !== undefined) {
      metric.dataVolume = dataVolume;
    }

    // Log warning for slow operations
    if (duration > 500) {
      console.warn(`⚠️ [Performance] SLOW OPERATION: ${operationName} took ${duration.toFixed(2)}ms${metric.dataVolume ? ` for ${metric.dataVolume} items` : ''}`);
    } else {
      debugLog(`✅ [Performance] ${operationName}: ${duration.toFixed(2)}ms${metric.dataVolume ? ` (${metric.dataVolume} items)` : ''}`);
    }

    return duration;
  }

  fail(operationName: string, error: string): void {
    const metric = this.metrics.get(operationName);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.status = 'failed';
      metric.error = error;
    }
    console.error(`❌ [Performance] Failed: ${operationName} - ${error}`);
  }

  getSummary(): {
    totalTime: number;
    operations: Array<{
      name: string;
      duration: number;
      dataVolume?: number;
      status: string;
      error?: string;
    }>;
    bottlenecks: Array<{
      name: string;
      duration: number;
      percentage: number;
    }>;
    cacheStats: {
      hitRate?: number;
      missRate?: number;
    };
  } {
    const sessionDuration = performance.now() - this.sessionStartTime;
    const operations = Array.from(this.metrics.values())
      .map(metric => ({
        name: metric.name,
        duration: metric.duration || 0,
        dataVolume: metric.dataVolume,
        status: metric.status,
        error: metric.error
      }))
      .sort((a, b) => b.duration - a.duration);

    const bottlenecks = operations
      .filter(op => op.duration > 0)
      .slice(0, 5)
      .map(op => ({
        name: op.name,
        duration: op.duration,
        percentage: (op.duration / sessionDuration) * 100
      }));

    return {
      totalTime: sessionDuration,
      operations,
      bottlenecks,
      cacheStats: {}
    };
  }

  logSummary(): void {
    const summary = this.getSummary();

    console.group('📊 [Performance Summary]');
    debugLog(`Total session time: ${summary.totalTime.toFixed(2)}ms`);

    console.group('🔥 Top Bottlenecks:');
    summary.bottlenecks.forEach((bottleneck, index) => {
      debugLog(`${index + 1}. ${bottleneck.name}: ${bottleneck.duration.toFixed(2)}ms (${bottleneck.percentage.toFixed(1)}%)`);
    });
    console.groupEnd();

    console.group('📋 All Operations:');
    summary.operations.forEach(op => {
      const status = op.status === 'completed' ? '✅' : op.status === 'failed' ? '❌' : '⏳';
      const dataInfo = op.dataVolume ? ` | ${op.dataVolume} items` : '';
      const errorInfo = op.error ? ` | Error: ${op.error}` : '';
      debugLog(`${status} ${op.name}: ${op.duration.toFixed(2)}ms${dataInfo}${errorInfo}`);
    });
    console.groupEnd();

    // Identify bottleneck categories
    const networkOps = summary.operations.filter(op =>
      op.name.includes('API') || op.name.includes('fetch') || op.name.includes('query')
    );
    const processingOps = summary.operations.filter(op =>
      op.name.includes('process') || op.name.includes('calculate') || op.name.includes('transform')
    );
    const renderingOps = summary.operations.filter(op =>
      op.name.includes('render') || op.name.includes('mount') || op.name.includes('update')
    );

    console.group('🎯 Bottleneck Analysis:');
    if (networkOps.length > 0) {
      const networkTime = networkOps.reduce((sum, op) => sum + op.duration, 0);
      debugLog(`Network Operations: ${networkTime.toFixed(2)}ms (${((networkTime / summary.totalTime) * 100).toFixed(1)}%)`);
    }
    if (processingOps.length > 0) {
      const processingTime = processingOps.reduce((sum, op) => sum + op.duration, 0);
      debugLog(`Data Processing: ${processingTime.toFixed(2)}ms (${((processingTime / summary.totalTime) * 100).toFixed(1)}%)`);
    }
    if (renderingOps.length > 0) {
      const renderingTime = renderingOps.reduce((sum, op) => sum + op.duration, 0);
      debugLog(`Rendering: ${renderingTime.toFixed(2)}ms (${((renderingTime / summary.totalTime) * 100).toFixed(1)}%)`);
    }
    console.groupEnd();

    console.groupEnd();
  }

  clear(): void {
    this.metrics.clear();
    this.sessionStartTime = 0;
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for React Query cache monitoring
export const monitorQueryCache = (queryKey: string, cacheHit: boolean) => {
  const cacheStatus = cacheHit ? 'HIT' : 'MISS';
  debugLog(`💾 [Cache] ${cacheStatus}: ${queryKey}`);
};

// Helper for measuring React component render time
export const measureRender = (componentName: string) => {
  const startTime = performance.now();
  return () => {
    const duration = performance.now() - startTime;
    if (duration > 100) {
      console.warn(`⚠️ [Render] SLOW RENDER: ${componentName} took ${duration.toFixed(2)}ms`);
    } else {
      debugLog(`🎨 [Render] ${componentName}: ${duration.toFixed(2)}ms`);
    }
  };
};

// Helper for measuring data processing
export const measureDataProcessing = (operationName: string, dataSize: number) => {
  performanceMonitor.start(`process-${operationName}`, dataSize);
  return (resultSize?: number) => {
    performanceMonitor.end(`process-${operationName}`, resultSize || dataSize);
  };
};