/**
 * Database Types Module Index
 * Combines all database schema components into the complete Database type
 */

import type { Json } from './base';
import type { DatabaseTables } from './tables';
import type { DatabaseViews } from './views';
import type { DatabaseFunctions } from './functions';
import type { DatabaseEnums } from './enums';

// Main Database type that matches the original structure
export type Database = {
  public: {
    Tables: DatabaseTables;
    Views: DatabaseViews;
    Functions: DatabaseFunctions;
    Enums: DatabaseEnums;
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Re-export all constituent types
export type { Json } from './base';
export type { DatabaseTables } from './tables';
export type { DatabaseViews } from './views';
export type { DatabaseFunctions } from './functions';
export type { DatabaseEnums, UserRole, TenderStatus, BOQItemType, ClientPositionStatus, AuditAction } from './enums';

// Additional helper types for backward compatibility
export type { UserRole, TenderStatus, BOQItemType, ClientPositionStatus } from './enums';