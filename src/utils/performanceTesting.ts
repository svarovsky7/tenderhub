import { clientPositionsApi } from '../lib/supabase/api';
import type { ClientPositionFilters } from '../lib/supabase/types';

interface PerformanceMetrics {
  operation: string;
  duration: number;
  recordCount: number;
  throughput: number; // records per second
  memory?: number; // MB
  timestamp: Date;
}


// Контроль логирования
const ENABLE_DETAILED_LOGGING = false;
const debugLog = (message: string, ...args: any[]) => {
  if (ENABLE_DETAILED_LOGGING) {
    console.log(message, ...args);
  }
};

export class ClientPositionsPerformanceTester {
  private metrics: PerformanceMetrics[] = [];

  /**
   * Test basic pagination performance
   */
  async testPagination(tenderId: string, pageSize: number = 50): Promise<PerformanceMetrics> {
    debugLog('🧪 Testing pagination performance...');

    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const result = await clientPositionsApi.getByTenderId(
      tenderId,
      {},
      { page: 1, limit: pageSize }
    );

    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const duration = endTime - startTime;
    const recordCount = result.data?.length || 0;
    const memoryUsed = (endMemory - startMemory) / (1024 * 1024); // MB

    const metrics: PerformanceMetrics = {
      operation: `pagination_${pageSize}`,
      duration,
      recordCount,
      throughput: recordCount / (duration / 1000),
      memory: memoryUsed,
      timestamp: new Date()
    };

    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * Test optimized query performance
   */
  async testOptimizedQuery(tenderId: string, pageSize: number = 50): Promise<PerformanceMetrics> {
    debugLog('🧪 Testing optimized query performance...');

    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const result = await clientPositionsApi.getByTenderIdOptimized(
      tenderId,
      {},
      { page: 1, limit: pageSize }
    );

    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const duration = endTime - startTime;
    const recordCount = result.data?.length || 0;
    const memoryUsed = (endMemory - startMemory) / (1024 * 1024); // MB

    const metrics: PerformanceMetrics = {
      operation: `optimized_${pageSize}`,
      duration,
      recordCount,
      throughput: recordCount / (duration / 1000),
      memory: memoryUsed,
      timestamp: new Date()
    };

    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * Test infinite scroll performance
   */
  async testInfiniteScroll(tenderId: string, pageSize: number = 50): Promise<PerformanceMetrics> {
    debugLog('🧪 Testing infinite scroll performance...');

    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const result = await clientPositionsApi.getByTenderIdInfinite(
      tenderId,
      undefined,
      pageSize
    );

    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const duration = endTime - startTime;
    const recordCount = result.data?.length || 0;
    const memoryUsed = (endMemory - startMemory) / (1024 * 1024); // MB

    const metrics: PerformanceMetrics = {
      operation: `infinite_scroll_${pageSize}`,
      duration,
      recordCount,
      throughput: recordCount / (duration / 1000),
      memory: memoryUsed,
      timestamp: new Date()
    };

    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * Test search performance
   */
  async testSearchPerformance(
    tenderId: string,
    searchQuery: string,
    pageSize: number = 50
  ): Promise<PerformanceMetrics> {
    debugLog('🧪 Testing search performance...');

    const filters: ClientPositionFilters = { search: searchQuery };
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const result = await clientPositionsApi.getByTenderId(
      tenderId,
      filters,
      { page: 1, limit: pageSize }
    );

    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const duration = endTime - startTime;
    const recordCount = result.data?.length || 0;
    const memoryUsed = (endMemory - startMemory) / (1024 * 1024); // MB

    const metrics: PerformanceMetrics = {
      operation: `search_${searchQuery.length}chars`,
      duration,
      recordCount,
      throughput: recordCount / (duration / 1000),
      memory: memoryUsed,
      timestamp: new Date()
    };

    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * Run comprehensive performance test suite
   */
  async runComprehensiveTests(tenderId: string): Promise<{
    summary: PerformanceMetrics[];
    recommendations: string[];
  }> {

    this.metrics = []; // Reset metrics

    try {
      // Test different page sizes
      await this.testPagination(tenderId, 20);
      await this.testPagination(tenderId, 50);
      await this.testPagination(tenderId, 100);

      // Test optimized queries
      await this.testOptimizedQuery(tenderId, 20);
      await this.testOptimizedQuery(tenderId, 50);
      await this.testOptimizedQuery(tenderId, 100);

      // Test infinite scroll
      await this.testInfiniteScroll(tenderId, 50);

      // Test search with various queries
      await this.testSearchPerformance(tenderId, 'материал');
      await this.testSearchPerformance(tenderId, 'работа');
      await this.testSearchPerformance(tenderId, 'бетон');

    } catch (error) {
      console.error('❌ Performance testing error:', error);
    }

    return {
      summary: this.metrics,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.length === 0) {
      return ['No metrics available for recommendations'];
    }

    // Analyze pagination performance
    const paginationMetrics = this.metrics.filter(m => m.operation.startsWith('pagination_'));
    const optimizedMetrics = this.metrics.filter(m => m.operation.startsWith('optimized_'));

    if (paginationMetrics.length > 0 && optimizedMetrics.length > 0) {
      const avgPaginationTime = paginationMetrics.reduce((sum, m) => sum + m.duration, 0) / paginationMetrics.length;
      const avgOptimizedTime = optimizedMetrics.reduce((sum, m) => sum + m.duration, 0) / optimizedMetrics.length;

      if (avgOptimizedTime < avgPaginationTime * 0.8) {
        recommendations.push('✅ Optimized queries are performing well - use getByTenderIdOptimized for better performance');
      } else {
        recommendations.push('⚠️ Optimized queries are not significantly faster - check database indexes');
      }
    }

    // Analyze response times
    const avgResponseTime = this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length;
    if (avgResponseTime > 1000) {
      recommendations.push('🐌 Slow response times detected - consider implementing caching or database optimization');
    }

    if (avgResponseTime > 500) {
      recommendations.push('⚡ Consider using smaller page sizes (20-30 items) for better user experience');
    } else {
      recommendations.push('✅ Response times are good - current page sizes are appropriate');
    }

    // Analyze memory usage
    const memoryMetrics = this.metrics.filter(m => m.memory !== undefined);
    if (memoryMetrics.length > 0) {
      const avgMemoryUsage = memoryMetrics.reduce((sum, m) => sum + (m.memory || 0), 0) / memoryMetrics.length;
      if (avgMemoryUsage > 10) {
        recommendations.push('🧠 High memory usage detected - consider implementing virtual scrolling for large lists');
      }
    }

    // Analyze search performance
    const searchMetrics = this.metrics.filter(m => m.operation.startsWith('search_'));
    if (searchMetrics.length > 0) {
      const avgSearchTime = searchMetrics.reduce((sum, m) => sum + m.duration, 0) / searchMetrics.length;
      if (avgSearchTime > 800) {
        recommendations.push('🔍 Search queries are slow - ensure GIN indexes are created for text search');
      } else {
        recommendations.push('✅ Search performance is good');
      }
    }

    // Throughput analysis
    const avgThroughput = this.metrics.reduce((sum, m) => sum + m.throughput, 0) / this.metrics.length;
    if (avgThroughput < 10) {
      recommendations.push('📊 Low query throughput - investigate database connection pooling and query optimization');
    } else if (avgThroughput > 100) {
      recommendations.push('🚀 Excellent query throughput - current optimizations are working well');
    }

    return recommendations;
  }

  /**
   * Export metrics as CSV for analysis
   */
  exportMetricsCSV(): string {
    if (this.metrics.length === 0) {
      return 'No metrics to export';
    }

    const headers = ['Operation', 'Duration (ms)', 'Record Count', 'Throughput (records/sec)', 'Memory (MB)', 'Timestamp'];
    const csvRows = [headers.join(',')];

    this.metrics.forEach(metric => {
      const row = [
        metric.operation,
        metric.duration.toFixed(2),
        metric.recordCount.toString(),
        metric.throughput.toFixed(2),
        (metric.memory || 0).toFixed(2),
        metric.timestamp.toISOString()
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceTester = new ClientPositionsPerformanceTester();

// Utility function for quick performance testing
export async function quickPerformanceTest(tenderId: string): Promise<void> {
  debugLog('⚡ Running quick performance test...');

  const tester = new ClientPositionsPerformanceTester();
  const results = await tester.runComprehensiveTests(tenderId);

  console.table(results.summary);

  debugLog('\n💡 Recommendations:');
  results.recommendations.forEach(rec => debugLog(rec));

  debugLog('\n📝 CSV Export:');
  debugLog(tester.exportMetricsCSV());
}