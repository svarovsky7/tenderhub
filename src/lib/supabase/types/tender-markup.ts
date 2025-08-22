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
  notes?: string;
  is_active?: boolean;
}

// Значения по умолчанию
export const DEFAULT_MARKUP_PERCENTAGES: Omit<TenderMarkupPercentages, 'id' | 'tender_id' | 'created_at' | 'updated_at'> = {
  works_16_markup: 160,
  mechanization_service: 0.00,
  mbp_gsm: 0.00,
  warranty_period: 0.00,
  works_cost_growth: 5.00,
  materials_cost_growth: 3.00,
  subcontract_works_cost_growth: 7.00,
  subcontract_materials_cost_growth: 4.00,
  contingency_costs: 2.00,
  overhead_own_forces: 8.00,
  overhead_subcontract: 6.00,
  general_costs_without_subcontract: 5.00,
  profit_own_forces: 12.00,
  profit_subcontract: 8.00,
  notes: '',
  is_active: true
};