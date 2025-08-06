/**
 * Base Database Types
 * Common types and utilities used across all database schemas
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DatabaseSchema = {
  Tables: Record<string, any>;
  Views?: Record<string, any>;
  Functions?: Record<string, any>;
  Enums?: Record<string, any>;
  CompositeTypes?: Record<string, any>;
};