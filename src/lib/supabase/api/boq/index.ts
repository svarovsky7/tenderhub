/**
 * BOQ API Module Index
 * Exports all BOQ-related API functions in a modular structure
 */

// Import all BOQ API modules
import { boqCrudApi } from './crud';
import { boqQueryApi } from './queries';
import { boqBulkApi } from './bulk';
import { boqHierarchyApi } from './hierarchy';
import { boqAnalyticsApi } from './analytics';
import { boqCurrencyApi } from './currency';
import { boqBatchApi } from './batch';

// Main BOQ API object that combines all modules
export const boqApi = {
  // CRUD operations
  ...boqCrudApi,
  
  // Query operations
  getByTenderId: boqQueryApi.getByTenderId,
  getByClientPositionId: boqQueryApi.getByClientPositionId,
  getByTender: boqQueryApi.getByTender,
  getByPosition: boqQueryApi.getByPosition,
  getHierarchicalByPosition: boqQueryApi.getHierarchicalByPosition,
  
  // Bulk operations
  bulkCreate: boqBulkApi.bulkCreate,
  bulkCreateInPosition: boqBulkApi.bulkCreateInPosition,
  bulkUpdate: boqBulkApi.bulkUpdate,
  bulkDelete: boqBulkApi.bulkDelete,
  
  // Hierarchy operations
  moveToPosition: boqHierarchyApi.moveToPosition,
  batchMove: boqHierarchyApi.batchMove,
  reorderInPosition: boqHierarchyApi.reorderInPosition,
  getHierarchyStats: boqHierarchyApi.getHierarchyStats,
  
  // Analytics operations
  getSummary: boqAnalyticsApi.getSummary,
  getCategoryAnalytics: boqAnalyticsApi.getCategoryAnalytics,
  getCostDistribution: boqAnalyticsApi.getCostDistribution,
  getCompletionStats: boqAnalyticsApi.getCompletionStats,
  
  // Currency operations
  updateCurrencyRatesForTender: boqCurrencyApi.updateCurrencyRatesForTender,
  getCurrencyStatsForTender: boqCurrencyApi.getCurrencyStatsForTender,

  // Batch operations for performance
  getAllByTenderId: boqBatchApi.getAllByTenderId,
  getAllWorkLinksByTenderId: boqBatchApi.getAllWorkLinksByTenderId,
  getPositionsWithItemsBatch: boqBatchApi.getPositionsWithItemsBatch,
};

// Legacy compatibility API (maintains backward compatibility)
export const boqItemsApi = {
  getByPosition: boqQueryApi.getByPosition,
  getByTender: boqQueryApi.getByTender,
  getById: boqCrudApi.getById,
  create: boqCrudApi.create,
  update: boqCrudApi.update,
  delete: (itemId: string) => boqCrudApi.delete(itemId).then(result => ({
    ...result,
    data: result.error ? false : true // Convert null to boolean for legacy compatibility
  })),
};

// Export individual modules for direct access if needed
export { boqCrudApi } from './crud';
export { boqQueryApi, type BOQItemWithLinkedMaterials } from './queries';
export { boqBulkApi } from './bulk';
export { boqHierarchyApi } from './hierarchy';
export { boqAnalyticsApi } from './analytics';
export { boqCurrencyApi, type CurrencyUpdateResult } from './currency';
export { boqBatchApi } from './batch';