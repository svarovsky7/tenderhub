/**
 * Утилиты для финансовых расчетов
 */

/**
 * Рассчитать долю работ в коммерческой стоимости BOQ элемента
 *
 * Логика (соответствует функции БД calculate_work_portion):
 * - Для работ (work, sub_work): вся commercial_cost
 * - Для основного материала (main): commercial_cost - total_amount (только наценка)
 * - Для вспомогательного материала (auxiliary): вся commercial_cost
 * - По умолчанию: 0
 *
 * @param itemType - Тип BOQ элемента
 * @param materialType - Тип материала (для материалов)
 * @param commercialCost - Коммерческая стоимость
 * @param totalAmount - Общая стоимость (для расчета наценки)
 * @returns Доля работ в коммерческой стоимости
 */
export function calculateWorkPortion(
  itemType: string,
  materialType: string | null | undefined,
  commercialCost: number,
  totalAmount: number
): number {
  // Для работ: вся commercial_cost - это работы
  if (itemType === 'work' || itemType === 'sub_work') {
    return commercialCost;
  }

  // Для материалов: зависит от material_type
  if (itemType === 'material' || itemType === 'sub_material') {
    // Основной материал: работы = commercial_cost - total_amount (наценка)
    if (materialType === 'main') {
      return commercialCost - totalAmount;
    }

    // Вспомогательный материал: вся commercial_cost - это работы
    if (materialType === 'auxiliary') {
      return commercialCost;
    }
  }

  // По умолчанию возвращаем 0
  return 0;
}
