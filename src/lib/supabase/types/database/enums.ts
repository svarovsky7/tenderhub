/**
 * Database Enums Type Definitions
 * All enum types used across the database schema
 */

export type DatabaseEnums = {
  audit_action: 'INSERT' | 'UPDATE' | 'DELETE';
  boq_item_type: 'work' | 'material' | 'sub_work' | 'sub_material';
  client_position_status: 'active' | 'inactive' | 'completed';
  tender_status: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed';
  user_role: 'Administrator' | 'Engineer' | 'View-only';
  delivery_price_type: 'included' | 'not_included' | 'amount';
};

// Helper types for better developer experience and backward compatibility
export type UserRole = DatabaseEnums['user_role'];
export type TenderStatus = DatabaseEnums['tender_status'];
export type BOQItemType = DatabaseEnums['boq_item_type'];
export type ClientPositionStatus = DatabaseEnums['client_position_status'];
export type AuditAction = DatabaseEnums['audit_action'];
export type DeliveryPriceType = DatabaseEnums['delivery_price_type'];