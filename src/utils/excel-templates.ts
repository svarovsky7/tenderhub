import * as XLSX from 'xlsx';
import { getDetailCategoryDisplay } from '../lib/supabase/api/construction-costs';

/**
 * Generate Excel template for construction costs import
 */
export const generateConstructionCostsTemplate = () => {
  console.log('🚀 [generateConstructionCostsTemplate] Creating template');

  // Sample data for template
  const sampleData = [
    {
      'Код': 'MAT-001',
      'Наименование': 'Бетон М300',
      'Единица': 'м³',
      'Базовая цена': 4500,
      'Рыночная цена': 4800,
      'Категория': 'Материалы',
      'Поставщик': 'ООО "СтройПоставка"',
      'Описание': 'Бетон марки М300 для фундамента',
      'Теги': 'бетон, фундамент, м300'
    },
    {
      'Код': 'MAT-002',
      'Наименование': 'Арматура А500С d12',
      'Единица': 'тн',
      'Базовая цена': 85000,
      'Рыночная цена': 87000,
      'Категория': 'Материалы',
      'Поставщик': 'ООО "МеталлТрейд"',
      'Описание': 'Арматура класса А500С диаметр 12мм',
      'Теги': 'арматура, металл, а500с'
    },
    {
      'Код': 'WORK-001',
      'Наименование': 'Монтаж опалубки',
      'Единица': 'м²',
      'Базовая цена': 800,
      'Рыночная цена': null,
      'Категория': 'Работы',
      'Поставщик': null,
      'Описание': 'Монтаж щитовой опалубки для фундамента',
      'Теги': 'опалубка, монтаж, фундамент'
    },
    {
      'Код': 'WORK-002',
      'Наименование': 'Укладка бетона',
      'Единица': 'м³',
      'Базовая цена': 1200,
      'Рыночная цена': null,
      'Категория': 'Работы',
      'Поставщик': null,
      'Описание': 'Укладка бетона с виброуплотнением',
      'Теги': 'бетон, укладка, вибрирование'
    },
    {
      'Код': 'TECH-001',
      'Наименование': 'Аренда крана 25т',
      'Единица': 'смена',
      'Базовая цена': 45000,
      'Рыночная цена': 48000,
      'Категория': 'Техника и оборудование',
      'Поставщик': 'ООО "СпецТехника"',
      'Описание': 'Аренда автокрана грузоподъемностью 25 тонн',
      'Теги': 'кран, аренда, техника'
    }
  ];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  const colWidths = [
    { wch: 12 }, // Код
    { wch: 30 }, // Наименование
    { wch: 10 }, // Единица
    { wch: 15 }, // Базовая цена
    { wch: 15 }, // Рыночная цена
    { wch: 20 }, // Категория
    { wch: 25 }, // Поставщик
    { wch: 40 }, // Описание
    { wch: 30 }  // Теги
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Затраты на строительство');

  // Create instructions sheet
  const instructions = [
    ['ИНСТРУКЦИЯ ПО ЗАПОЛНЕНИЮ'],
    [''],
    ['Обязательные поля:'],
    ['• Код - уникальный код затрат (например: MAT-001, WORK-002)'],
    ['• Наименование - название затрат'],
    ['• Единица - единица измерения (шт, м², м³, кг, тн, час, смена)'],
    ['• Базовая цена - основная цена за единицу (число)'],
    [''],
    ['Опциональные поля:'],
    ['• Рыночная цена - текущая рыночная цена (число)'],
    ['• Категория - название категории из справочника'],
    ['• Поставщик - название поставщика'],
    ['• Описание - подробное описание затрат'],
    ['• Теги - ключевые слова через запятую для поиска'],
    [''],
    ['Примечания:'],
    ['1. Не изменяйте названия колонок'],
    ['2. Цены указывайте числами без символа валюты'],
    ['3. Для пустых значений оставьте ячейку пустой'],
    ['4. Теги разделяйте запятыми'],
    ['5. Удалите примеры перед импортом или добавьте свои данные ниже']
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Инструкция');

  // Write file
  XLSX.writeFile(wb, 'Шаблон_затраты_на_строительство.xlsx');
  
  console.log('✅ [generateConstructionCostsTemplate] Template created');
};

/**
 * Export client positions with commercial costs to Excel
 */
export const exportCommercialCostsToExcel = (positions: any[], tenderName = '', fileName = 'commercial_costs.xlsx') => {
  console.log('🚀 [exportCommercialCostsToExcel] Exporting positions:', positions.length);

  const exportData = positions.map(position => ({
    '№ п/п': position.position_number || '',
    'Тип позиции': position.position_type || 'executable',
    'Наименование работ': position.work_name || '',
    'Ед. изм.': position.unit || '',
    'Кол-во Заказчика': position.client_quantity || position.volume || '',
    'Кол-во ГП': position.gp_quantity || position.manual_volume || '',
    'Примечание заказчика': position.client_note || '',
    'Базовая стоимость, ₽': position.base_total_cost ? Math.round(position.base_total_cost) : '',
    'Коммерческая стоимость, ₽': position.commercial_total_cost ? Math.round(position.commercial_total_cost) : '',
    'Наценка, ₽': position.base_total_cost && position.commercial_total_cost 
      ? Math.round(position.commercial_total_cost - position.base_total_cost) : '',
    'Наценка, %': position.markup_percentage ? `${position.markup_percentage.toFixed(1)}%` : '',
    'Работы (коммерческая), ₽': position.works_total_cost ? Math.round(position.works_total_cost) : '',
    'Материалы (коммерческая), ₽': position.materials_total_cost ? Math.round(position.materials_total_cost) : '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = [
    { wch: 8 },  // № п/п
    { wch: 15 }, // Тип позиции
    { wch: 40 }, // Наименование работ
    { wch: 10 }, // Ед. изм.
    { wch: 15 }, // Кол-во Заказчика
    { wch: 12 }, // Кол-во ГП
    { wch: 30 }, // Примечание заказчика
    { wch: 18 }, // Базовая стоимость
    { wch: 20 }, // Коммерческая стоимость
    { wch: 15 }, // Наценка, ₽
    { wch: 12 }, // Наценка, %
    { wch: 20 }, // Работы (коммерческая)
    { wch: 22 }, // Материалы (коммерческая)
  ];
  ws['!cols'] = colWidths;

  // Add title and tender info
  const sheetName = tenderName ? `Коммерческие стоимости - ${tenderName}` : 'Коммерческие стоимости';
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Excel sheet name limit

  XLSX.writeFile(wb, fileName);

  console.log('✅ [exportCommercialCostsToExcel] Export completed');
};

/**
 * Export construction costs to Excel
 */
export const exportConstructionCostsToExcel = (costs: any[], fileName = 'construction_costs.xlsx') => {
  console.log('🚀 [exportConstructionCostsToExcel] Exporting costs:', costs.length);

  const exportData = costs.map(cost => ({
    'Код': cost.code,
    'Наименование': cost.name,
    'Категория': cost.category?.name || '',
    'Единица': cost.unit,
    'Базовая цена': cost.base_price,
    'Рыночная цена': cost.market_price || '',
    'Поставщик': cost.supplier || '',
    'Описание': cost.description || '',
    'Теги': cost.tags?.join(', ') || '',
    'Статус': cost.is_active ? 'Активно' : 'Неактивно',
    'Дата создания': new Date(cost.created_at).toLocaleDateString('ru-RU'),
    'Дата обновления': new Date(cost.updated_at).toLocaleDateString('ru-RU')
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = [
    { wch: 12 }, // Код
    { wch: 30 }, // Наименование
    { wch: 20 }, // Категория
    { wch: 10 }, // Единица
    { wch: 15 }, // Базовая цена
    { wch: 15 }, // Рыночная цена
    { wch: 25 }, // Поставщик
    { wch: 40 }, // Описание
    { wch: 30 }, // Теги
    { wch: 12 }, // Статус
    { wch: 15 }, // Дата создания
    { wch: 15 }  // Дата обновления
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Затраты');
  XLSX.writeFile(wb, fileName);

  console.log('✅ [exportConstructionCostsToExcel] Export completed');
};

/**
 * Export all tenders to Excel with comprehensive information
 */
export const exportTendersToExcel = (tenders: any[], fileName = 'all_tenders.xlsx') => {
  console.log('🚀 [exportTendersToExcel] Exporting tenders:', tenders.length);

  const exportData = tenders.map((tender, index) => {
    // Format submission deadline
    const submissionDeadline = tender.submission_deadline
      ? new Date(tender.submission_deadline).toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '';

    // Format creation date
    const createdAt = new Date(tender.created_at).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // Calculate deadline status
    const getDeadlineStatus = () => {
      if (!tender.submission_deadline) return 'Не указан';

      const now = new Date();
      const deadline = new Date(tender.submission_deadline);
      const diffTime = deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'Завершен';
      if (diffDays === 0) return 'Сегодня';
      if (diffDays <= 3) return `${diffDays} дн. (критично)`;
      if (diffDays <= 7) return `${diffDays} дн. (близко)`;
      return `${diffDays} дн.`;
    };

    return {
      '№': index + 1,
      'ID': tender.id || '',
      'Номер тендера': tender.tender_number || '',
      'Название': tender.title || '',
      'Заказчик': tender.client_name || '',
      'Версия': tender.version || 1,
      'Описание': tender.description || '',
      'Дедлайн подачи': submissionDeadline,
      'Статус дедлайна': getDeadlineStatus(),
      'Площадь по СП (м²)': tender.area_sp || '',
      'Площадь клиента (м²)': tender.area_client || '',
      'Курс USD': tender.usd_rate || '',
      'Курс EUR': tender.eur_rate || '',
      'Курс CNY': tender.cny_rate || '',
      'Итоговая стоимость КП (₽)': tender.commercial_total_value
        ? tender.commercial_total_value.toLocaleString('ru-RU')
        : 'Не рассчитано',
      'Стоимость за м² (₽/м²)': (tender.commercial_total_value && tender.area_sp)
        ? Math.round(tender.commercial_total_value / tender.area_sp).toLocaleString('ru-RU')
        : '',
      'Создан': createdAt,
      'Обновлен': new Date(tender.updated_at).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 5 },   // №
    { wch: 36 },  // ID
    { wch: 15 },  // Номер тендера
    { wch: 40 },  // Название
    { wch: 30 },  // Заказчик
    { wch: 8 },   // Версия
    { wch: 50 },  // Описание
    { wch: 18 },  // Дедлайн подачи
    { wch: 18 },  // Статус дедлайна
    { wch: 15 },  // Площадь по СП
    { wch: 15 },  // Площадь клиента
    { wch: 12 },  // Курс USD
    { wch: 12 },  // Курс EUR
    { wch: 12 },  // Курс CNY
    { wch: 20 },  // Итоговая стоимость КП
    { wch: 18 },  // Стоимость за м²
    { wch: 12 },  // Создан
    { wch: 12 }   // Обновлен
  ];
  ws['!cols'] = colWidths;

  // Add some styling to headers (freeze first row)
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, 'Тендеры');
  XLSX.writeFile(wb, fileName);

  console.log('✅ [exportTendersToExcel] Export completed:', fileName);
};

/**
 * Export BOQ positions with items to Excel in hierarchical structure
 */
export const exportBOQToExcel = async (
  positions: any[],
  boqItemsMap: Map<string, any[]>,
  tenderName: string
) => {
  console.log('🚀 [exportBOQToExcel] Starting export with', positions.length, 'positions');

  const exportData: any[] = [];
  const rowStyles: any[] = []; // Store styles for each row

  // Helper functions for translation
  const translateItemType = (type: string): string => {
    const types: Record<string, string> = {
      'work': 'Работа',
      'material': 'Материал',
      'sub_work': 'Суб-раб',
      'sub_material': 'Суб-мат'
    };
    return types[type] || type || '';
  };

  const translateMaterialType = (type: string): string => {
    const types: Record<string, string> = {
      'main': 'Основной',
      'auxiliary': 'Вспомогательный',
      'consumable': 'Расходный',
      'tool': 'Инструмент',
      'equipment': 'Оборудование'
    };
    return types[type] || type || '';
  };

  const translateDeliveryType = (type: string): string => {
    const types: Record<string, string> = {
      'included': 'В цене',
      'not_included': 'Не в цене',
      'amount': 'Фиксированная'
    };
    return types[type] || type || '';
  };

  // Recursive function to add position with its items and additional positions
  const addPositionWithItems = (position: any, level: number = 0) => {
    // Add client position row
    exportData.push({
      'Номер позиции': position.item_no || '',
      '№ п/п': position.position_number || '',
      'Категория затрат': '', // Empty for client positions
      'Тип элемента': '',
      'Тип материала': '',
      'Наименование': position.work_name, // No indentation
      'Ед. изм.': position.unit || '',
      'Количество заказчика': position.volume || '',
      'Коэфф. перевода': '',
      'Коэфф. расхода': '',
      'Количество ГП': position.manual_volume || '',
      'Валюта': '',
      'Тип доставки': '',
      'Стоимость доставки': '',
      'Цена за единицу': '',
      'Итоговая сумма': Math.round((position.total_materials_cost || 0) + (position.total_works_cost || 0)),
      'Ссылка на КП': '',
      'Примечание заказчика': position.client_note || '',
      'Примечание ГП': position.manual_note || ''
    });

    // Get and sort BOQ items for this position
    const items = boqItemsMap.get(position.id) || [];
    const sortedItems = [...items].sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return (a.item_number || '').localeCompare(b.item_number || '');
    });

    // Add each BOQ item
    sortedItems.forEach(item => {
      // For work and sub_work types, material_type should be empty
      const materialType = (item.item_type === 'work' || item.item_type === 'sub_work')
        ? ''
        : translateMaterialType(item.material_type);

      // Track row index and type for styling
      const rowIndex = exportData.length;
      rowStyles[rowIndex] = item.item_type;

      exportData.push({
        'Номер позиции': '',
        '№ п/п': '',
        'Категория затрат': '', // Will be filled after export data is complete
        'Тип элемента': translateItemType(item.item_type),
        'Тип материала': materialType,
        'Наименование': item.description, // No indentation
        'Ед. изм.': item.unit,
        'Количество заказчика': '', // Empty for BOQ items
        'Коэфф. перевода': item.conversion_coefficient || '',
        'Коэфф. расхода': item.consumption_coefficient || '',
        'Количество ГП': item.quantity,
        'Валюта': item.currency_type || 'RUB',
        'Тип доставки': translateDeliveryType(item.delivery_price_type),
        'Стоимость доставки': Math.round(item.delivery_amount || 0),
        'Цена за единицу': Math.round(item.unit_rate || 0),
        'Итоговая сумма': Math.round(item.total_amount || 0),
        'Ссылка на КП': item.quote_link || '',
        'Примечание заказчика': '', // Empty for BOQ items
        'Примечание ГП': item.note || ''
      });
    });

    // Add additional positions (ДОП) from the position's additional_works property
    // This handles ДОП positions for all position types, not just executable
    if (position.additional_works && Array.isArray(position.additional_works)) {
      const sortedAdditional = [...position.additional_works].sort((a, b) => a.position_number - b.position_number);

      sortedAdditional.forEach(addPos => {
        // Mark as ДОП position by modifying the item_no
        const dopPosition = {
          ...addPos,
          item_no: `${position.item_no || ''}.ДОП.${addPos.position_number - position.position_number}`
        };
        addPositionWithItems(dopPosition, level + 1);
      });
    }

    // Also check for additional positions in the main positions list (for fallback compatibility)
    // This ensures we don't miss any ДОП positions if data structure is different
    const additionalPositions = positions.filter(p =>
      p.parent_position_id === position.id &&
      p.is_additional === true
    );

    if (additionalPositions.length > 0) {
      const sortedAdditional = [...additionalPositions].sort((a, b) => a.position_number - b.position_number);

      sortedAdditional.forEach(addPos => {
        // Skip if already processed from additional_works
        if (position.additional_works && position.additional_works.some(aw => aw.id === addPos.id)) {
          return;
        }

        // Mark as ДОП position by modifying the item_no
        const dopPosition = {
          ...addPos,
          item_no: `${position.item_no || ''}.ДОП.${addPos.position_number - position.position_number}`
        };
        addPositionWithItems(dopPosition, level + 1);
      });
    }
  };

  // Process only main positions (without parent_position_id)
  const mainPositions = positions
    .filter(p => !p.parent_position_id)
    .sort((a, b) => a.position_number - b.position_number);

  console.log('📊 [exportBOQToExcel] Processing', mainPositions.length, 'main positions');

  mainPositions.forEach(position => {
    addPositionWithItems(position, 0);
  });

  // Load cost categories for all BOQ items
  console.log('🔄 [exportBOQToExcel] Loading cost categories...');
  const categoryPromises: Promise<void>[] = [];
  const categoryCache = new Map<string, string>();

  exportData.forEach((row, index) => {
    // Check if this row has a BOQ item with detail_cost_category_id
    const boqItem = Array.from(boqItemsMap.values())
      .flat()
      .find(item => item.description === row['Наименование']?.trim());

    if (boqItem?.detail_cost_category_id) {
      if (!categoryCache.has(boqItem.detail_cost_category_id)) {
        categoryPromises.push(
          getDetailCategoryDisplay(boqItem.detail_cost_category_id).then(result => {
            if (result.data) {
              categoryCache.set(boqItem.detail_cost_category_id, result.data);
            }
          })
        );
      }
    }
  });

  await Promise.all(categoryPromises);

  // Update export data with categories
  exportData.forEach((row, index) => {
    const boqItem = Array.from(boqItemsMap.values())
      .flat()
      .find(item => item.description === row['Наименование']?.trim());

    if (boqItem?.detail_cost_category_id && categoryCache.has(boqItem.detail_cost_category_id)) {
      row['Категория затрат'] = categoryCache.get(boqItem.detail_cost_category_id) || '';
    }
  });

  // Create Excel workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Apply color styling based on item type
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // Define colors for each item type (matching the UI)
  const itemTypeColors = {
    'work': { rgb: 'FED7AA' },       // Orange
    'material': { rgb: 'BFDBFE' },   // Blue
    'sub_work': { rgb: 'E9D5FF' },   // Purple
    'sub_material': { rgb: 'BBF7D0' } // Green
  };

  // Apply styles to rows based on BOQ item type
  for (let row = 1; row <= range.e.r; row++) { // Skip header row
    const itemType = rowStyles[row - 1]; // Adjust for header offset

    if (itemType && itemTypeColors[itemType]) {
      const bgColor = itemTypeColors[itemType];

      // Apply style to all cells in the row
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[cellAddress];

        if (cell) {
          if (!cell.s) cell.s = {};
          cell.s.fill = {
            fgColor: bgColor,
            patternType: 'solid'
          };
        }
      }
    }
  }

  // Set column widths according to new order
  ws['!cols'] = [
    { wch: 12 },  // Номер позиции
    { wch: 8 },   // № п/п
    { wch: 25 },  // Категория затрат
    { wch: 15 },  // Тип элемента
    { wch: 15 },  // Тип материала
    { wch: 50 },  // Наименование
    { wch: 10 },  // Ед. изм.
    { wch: 15 },  // Количество заказчика
    { wch: 12 },  // Коэфф. перевода
    { wch: 12 },  // Коэфф. расхода
    { wch: 15 },  // Количество ГП
    { wch: 8 },   // Валюта
    { wch: 15 },  // Тип доставки
    { wch: 15 },  // Стоимость доставки
    { wch: 15 },  // Цена за единицу
    { wch: 15 },  // Итоговая сумма
    { wch: 30 },  // Ссылка на КП
    { wch: 25 },  // Примечание заказчика
    { wch: 25 }   // Примечание ГП
  ];

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'BOQ');

  // Generate filename
  const safeFileName = tenderName.replace(/[^а-яА-Яa-zA-Z0-9\s]/g, '_').trim();
  const fileName = `BOQ_${safeFileName}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Write file
  XLSX.writeFile(wb, fileName);

  console.log('✅ [exportBOQToExcel] Export completed:', fileName);
  console.log('📊 [exportBOQToExcel] Exported', exportData.length, 'rows total');
};