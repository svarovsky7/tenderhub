import type { TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import type { 
  TenderWithSummary, 
  TenderInsert, 
  TenderUpdate, 
  TenderFilters,
  TenderStatus 
} from '../../lib/supabase/types';

// Page state interfaces
export interface TendersPageState {
  tenders: TenderWithSummary[];
  loading: boolean;
  pagination: TablePaginationConfig;
  filters: TenderFilters;
  selectedRowKeys: string[];
  createModalVisible: boolean;
  editModalVisible: boolean;
  editingTender: TenderWithSummary | null;
}

// Statistics interface  
export interface TenderStatistics {
  total: number;
  active: number;
  submitted: number;
  won: number;
  totalValue: number;
}

// Constants
export const statusColors = {
  draft: 'default',
  active: 'processing',
  submitted: 'warning',
  awarded: 'success',
  closed: 'default'
} as const;

export const statusLabels = {
  draft: 'Черновик',
  active: 'Активный',
  submitted: 'Подан',
  awarded: 'Выигран',
  closed: 'Закрыт'
} as const;

// Component props interfaces
export interface TenderStatsProps {
  stats: TenderStatistics;
  loading?: boolean;
}

export interface TenderFiltersProps {
  filters: TenderFilters;
  onSearch: (value: string) => void;
  onStatusFilter: (status: TenderStatus[]) => void;
  onDateFilter: (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => void;
  onFiltersChange: (filters: Partial<TenderFilters>) => void;
}

export interface TenderTableProps {
  tenders: TenderWithSummary[];
  loading: boolean;
  pagination: TablePaginationConfig;
  onTableChange: (pagination: TablePaginationConfig) => void;
  onViewTender: (tender: TenderWithSummary) => void;
  onEditTender: (tender: TenderWithSummary) => void;
  onDeleteTender: (tenderId: string) => void;
  onExcelUpload: (tenderId: string, file: File) => Promise<void>;
  onUpdateBOQCurrencyRates?: (tenderId: string) => Promise<void>;
}

export interface CreateTenderModalProps {
  visible: boolean;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (values: TenderInsert) => Promise<void>;
}

export interface EditTenderModalProps {
  visible: boolean;
  loading: boolean;
  editingTender: TenderWithSummary | null;
  onCancel: () => void;
  onSubmit: (values: TenderUpdate) => Promise<void>;
}

export interface DeleteTenderModalProps {
  visible: boolean;
  loading: boolean;
  tenderToDelete: TenderWithSummary | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export interface ExcelUploadProps {
  tenderId: string;
  onUpload: (file: File) => Promise<void>;
}

// Re-export commonly used types
export type {
  TenderWithSummary,
  TenderInsert,
  TenderUpdate,
  TenderFilters,
  TenderStatus
};