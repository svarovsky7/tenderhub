/**
 * UI and Component Utility Types
 * Contains common UI component types, form handlers, and interaction patterns
 */

import * as React from 'react';

// Common UI utility types
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface LoadingState {
  loading: boolean;
  error?: string | null;
}

export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

// Form utility types
export interface FormFieldRule {
  required?: boolean;
  message?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export interface SelectOption<T = any> {
  label: string;
  value: T;
  disabled?: boolean;
}

// Component event handler types
export interface TableChangeHandler {
  (pagination: PaginationState, filters?: Record<string, any>, sorter?: any): void;
}

export interface SearchHandler {
  (value: string): void;
}

export interface FilterChangeHandler<T = any> {
  (filters: T): void;
}

// Drag and drop types
export interface DragEndHandler {
  (event: { active: { id: string }; over: { id: string } | null }): void;
}

// Modal and dialog types
export interface ModalProps extends BaseComponentProps {
  visible: boolean;
  onClose: () => void;
  onCancel?: () => void;
  title?: React.ReactNode;
  width?: number | string;
}

export interface ConfirmationModalProps extends ModalProps {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

// Form submission types
export interface FormSubmitHandler<T = any> {
  (values: T): Promise<void> | void;
}

export interface FormValidationHandler {
  (rule: any, value: any): Promise<void>;
}

// Selection and multi-selection types
export interface SelectionState {
  selectedKeys: string[];
  selectedItems: any[];
}

export interface SelectionHandler {
  (keys: string[], items?: any[]): void;
}

// Route and navigation types
export interface RouteParams {
  [key: string]: string | undefined;
}

export interface NavigationHandler {
  (path: string, params?: RouteParams): void;
}