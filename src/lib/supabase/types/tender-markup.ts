export interface TenderMarkupPercentages {
  id: string;
  tender_id: string;
  
  // Новые типы накруток согласно требованиям
  works_16_markup: number;                      // Работы 1,6
  mechanization_service: number;                // Служба механизации раб (бурильщики, автотехника, электрики)
  mbp_gsm: number;                             // МБП+ГСМ (топливо+масло)
  warranty_period: number;                      // Гарантийный период 5 лет
  works_cost_growth: number;                    // Рост Стоимости Работ
  materials_cost_growth: number;                // Рост стоимости Материалов
  subcontract_works_cost_growth: number;        // Рост стоимости Работ субподряда
  subcontract_materials_cost_growth: number;    // Рост стоимости Материалов Субподряда
  contingency_costs: number;                    // Непредвиденные затраты
  overhead_own_forces: number;                  // ООЗ собств. силы
  overhead_subcontract: number;                 // ООЗ Субподряд
  general_costs_without_subcontract: number;    // ОФЗ (Без субподряда)
  profit_own_forces: number;                    // Прибыль собств. силы
  profit_subcontract: number;                   // Прибыль Субподряд
  
  // Дополнительная информация
  notes?: string;                    // Примечания
  is_active: boolean;                // Активность записи
  template_id?: string;              // Ссылка на шаблон (опционально)

  // Итоговая коммерческая стоимость
  commercial_total_value?: number;              // Рассчитанная итоговая коммерческая стоимость КП
  commercial_total_calculated_at?: string;      // Дата и время последнего расчета

  // Метки времени
  created_at: string;
  updated_at: string;
}

export interface MarkupTemplate {
  id: string;
  
  // Метаданные шаблона
  name: string;                      // Название шаблона
  description?: string;              // Описание шаблона
  is_default: boolean;               // Шаблон по умолчанию
  
  // Проценты накруток
  works_16_markup: number;
  mechanization_service: number;
  mbp_gsm: number;
  warranty_period: number;
  works_cost_growth: number;
  materials_cost_growth: number;
  subcontract_works_cost_growth: number;
  subcontract_materials_cost_growth: number;
  contingency_costs: number;
  overhead_own_forces: number;
  overhead_subcontract: number;
  general_costs_without_subcontract: number;
  profit_own_forces: number;
  profit_subcontract: number;
  
  // Метки времени
  created_at: string;
  updated_at: string;
}

export interface CreateTenderMarkupPercentages {
  tender_id: string;
  works_16_markup?: number;
  mechanization_service?: number;
  mbp_gsm?: number;
  warranty_period?: number;
  works_cost_growth?: number;
  materials_cost_growth?: number;
  subcontract_works_cost_growth?: number;
  subcontract_materials_cost_growth?: number;
  contingency_costs?: number;
  overhead_own_forces?: number;
  overhead_subcontract?: number;
  general_costs_without_subcontract?: number;
  profit_own_forces?: number;
  profit_subcontract?: number;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateTenderMarkupPercentages {
  works_16_markup?: number;
  mechanization_service?: number;
  mbp_gsm?: number;
  warranty_period?: number;
  works_cost_growth?: number;
  materials_cost_growth?: number;
  subcontract_works_cost_growth?: number;
  subcontract_materials_cost_growth?: number;
  contingency_costs?: number;
  overhead_own_forces?: number;
  overhead_subcontract?: number;
  general_costs_without_subcontract?: number;
  profit_own_forces?: number;
  profit_subcontract?: number;
  commercial_total_value?: number;
  commercial_total_calculated_at?: string;
  notes?: string;
  is_active?: boolean;
  template_id?: string;
}

export interface CreateMarkupTemplate {
  name: string;
  description?: string;
  is_default?: boolean;
  works_16_markup?: number;
  mechanization_service?: number;
  mbp_gsm?: number;
  warranty_period?: number;
  works_cost_growth?: number;
  materials_cost_growth?: number;
  subcontract_works_cost_growth?: number;
  subcontract_materials_cost_growth?: number;
  contingency_costs?: number;
  overhead_own_forces?: number;
  overhead_subcontract?: number;
  general_costs_without_subcontract?: number;
  profit_own_forces?: number;
  profit_subcontract?: number;
}

export interface UpdateMarkupTemplate {
  name?: string;
  description?: string;
  is_default?: boolean;
  works_16_markup?: number;
  mechanization_service?: number;
  mbp_gsm?: number;
  warranty_period?: number;
  works_cost_growth?: number;
  materials_cost_growth?: number;
  subcontract_works_cost_growth?: number;
  subcontract_materials_cost_growth?: number;
  contingency_costs?: number;
  overhead_own_forces?: number;
  overhead_subcontract?: number;
  general_costs_without_subcontract?: number;
  profit_own_forces?: number;
  profit_subcontract?: number;
}

// Значения по умолчанию
export const DEFAULT_MARKUP_PERCENTAGES: Omit<TenderMarkupPercentages, 'id' | 'tender_id' | 'created_at' | 'updated_at'> = {
  works_16_markup: 60,                          // Работы 1,6 - 60%
  mechanization_service: 0.00,
  mbp_gsm: 0.00,
  warranty_period: 0.00,
  works_cost_growth: 10.00,                     // Рост стоимости работ - 10%
  materials_cost_growth: 10.00,                 // Рост стоимости материалов - 10%
  subcontract_works_cost_growth: 10.00,         // Рост стоимости работ субподряда - 10%
  subcontract_materials_cost_growth: 10.00,     // Рост стоимости материалов субподряда - 10%
  contingency_costs: 3.00,                      // Непредвиденные затраты - 3%
  overhead_own_forces: 10.00,                   // ООЗ собств. силы - 10%
  overhead_subcontract: 10.00,                  // ООЗ субподряд - 10%
  general_costs_without_subcontract: 20.00,     // ОФЗ (без субподряда) - 20%
  profit_own_forces: 10.00,                     // Прибыль собств. силы - 10%
  profit_subcontract: 16.00,                    // Прибыль субподряд - 16%
  notes: '',
  is_active: true
};