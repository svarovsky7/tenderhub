/**
 * TypeScript типы для перераспределения коммерческих стоимостей работ
 */

// Конфигурация категории для wizard (расширенная структура)
export interface CategoryConfig {
  cost_category_id: string;
  cost_category_name?: string;
  detail_cost_category_ids?: string[];
  detail_cost_category_names?: string[];
  percent?: number; // Только для исходных категорий
}

// Основная таблица перераспределений
export interface CostRedistribution {
  id: string;
  tender_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_active: boolean;
  source_config?: CategoryConfig[] | null; // Конфигурация исходных категорий
  target_config?: CategoryConfig[] | null; // Конфигурация целевых категорий
}

// Детали перераспределения (изменения для каждого BOQ item)
export interface CostRedistributionDetail {
  id: string;
  redistribution_id: string;
  boq_item_id: string;
  original_commercial_cost: number;
  redistributed_commercial_cost: number;
  adjustment_amount: number; // Может быть + или -
  created_at: string;
}

// Для создания нового перераспределения
export interface CostRedistributionInsert {
  tender_id: string;
  name: string;
  description?: string | null;
  created_by?: string | null;
  is_active?: boolean;
}

// Вычитание из исходной категории
export interface SourceWithdrawal {
  detail_cost_category_id: string;
  percent: number; // Процент вычитания (0-100)
}

// Параметры для функции перераспределения
export interface RedistributeWorkCostsParams {
  tender_id: string;
  redistribution_name: string;
  description?: string;
  source_withdrawals: SourceWithdrawal[];
  target_categories: string[]; // Массив UUID категорий-получателей
  source_config?: CategoryConfig[] | null; // Конфигурация для восстановления в wizard
  target_config?: CategoryConfig[] | null; // Конфигурация для восстановления в wizard
}

// Статистика категории для предпросмотра
export interface CategoryPreviewStats {
  detail_cost_category_id: string;
  category_name: string;
  current_works_cost: number;
  adjustment_amount: number; // + или -
  new_works_cost: number;
  items_count: number;
}

// Расширенная информация о перераспределении с деталями
export interface CostRedistributionWithDetails extends CostRedistribution {
  details: CostRedistributionDetail[];
}
