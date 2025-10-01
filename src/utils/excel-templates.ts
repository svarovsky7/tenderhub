import * as XLSX from 'xlsx-js-style';
import { workMaterialLinksApi } from '../lib/supabase/api/work-material-links';
import { boqBatchApi } from '../lib/supabase/api/boq/batch';
import { getAllCategoriesAndLocations } from '../lib/supabase/api/cost-categories';

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

  // Helper function to translate position types
  const translatePositionType = (type: string): string => {
    const translations: Record<string, string> = {
      'executable': 'Исполняемая',
      'section': 'Раздел',
      'subsection': 'Подраздел',
      'not_executable': 'Неисполняемая',
      'with_materials': 'С материалами',
      'materials_only': 'Только материалы',
      'works_only': 'Только работы',
      'header': 'Заголовок',
      'subheader': 'Подзаголовок'
    };
    return translations[type] || type;
  };

  // Helper function to format numbers with thousand separators
  const formatNumber = (value: number | undefined, decimals: number = 2): string => {
    if (!value && value !== 0) return '';
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const exportData = positions.map(position => ({
    'Номер раздела': position.item_no || '',
    '№ п/п': position.position_number || '',
    'Тип позиции': translatePositionType(position.position_type || 'executable'),
    'Наименование работ': position.work_name || '',
    'Ед. изм.': position.unit || '',
    'Кол-во Заказчика': position.client_quantity || position.volume || '',
    'Кол-во ГП': position.gp_quantity || position.manual_volume || '',
    'Цена материала за единицу': formatNumber(position.materials_unit_price, 2),
    'Цена работы за единицу': formatNumber(position.works_unit_price, 2),
    'Итого материал': position.materials_total_cost ? Math.round(position.materials_total_cost) : '',
    'Итого работа': position.works_total_cost ? Math.round(position.works_total_cost) : '',
    'Сумма (коммерческая стоимость)': position.commercial_total_cost ? Math.round(position.commercial_total_cost) : '',
    'Сумма (базовая стоимость)': position.base_total_cost ? Math.round(position.base_total_cost) : '',
    'Примечание ГП': position.manual_note || '',  // Из поля manual_note таблицы client_positions
    'Примечание заказчика': position.client_note || '', // Из поля client_note таблицы client_positions
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Get worksheet range
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // Define styles
  const borderStyle = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  };

  const centerAlignment = {
    horizontal: "center",
    vertical: "center",
    wrapText: true
  };

  const leftAlignment = {
    horizontal: "left",
    vertical: "center",
    wrapText: true
  };

  const lightRedColor = 'FFCCCC'; // Light red for zero cost rows

  // Define number formats
  const integerFormat = '#,##0'; // Format with thousand separators for integers
  const decimalFormat = '#,##0.00'; // Format with 2 decimal places

  // Updated column indices due to new first column "Номер раздела"
  const integerColumns = [9, 10, 11, 12]; // Итого материал, Итого работа, Сумма (коммерческая), Сумма (базовая)
  const decimalColumns = [7, 8]; // Цена материала за единицу, Цена работы за единицу

  // Apply styles to all cells
  for (let row = 0; row <= range.e.r; row++) {
    // Check if this row has zero commercial cost AND is executable type (row > 0 to skip header)
    const position = row > 0 ? positions[row - 1] : null;
    const hasZeroCost = position &&
      position.position_type === 'executable' &&
      (!position.commercial_total_cost || position.commercial_total_cost === 0);

    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellAddress];

      if (cell) {
        if (!cell.s) cell.s = {};

        // Add borders to all cells
        cell.s.border = borderStyle;

        // Add alignment (column 3 is now "Наименование работ")
        if (col === 3) {
          cell.s.alignment = leftAlignment;
        } else {
          cell.s.alignment = centerAlignment;
        }

        // Add number format for numeric columns (skip header row)
        if (row > 0) {
          if (integerColumns.includes(col)) {
            cell.s.numFmt = integerFormat;
          } else if (decimalColumns.includes(col)) {
            cell.s.numFmt = decimalFormat;
          }
        }

        // Add light red background for executable rows with zero cost
        if (hasZeroCost && row > 0) {
          cell.s.fill = {
            patternType: "solid",
            fgColor: { rgb: lightRedColor }
          };
        }

        // Bold header row
        if (row === 0) {
          cell.s.font = { bold: true };
        }
      }
    }
  }

  // Set column widths
  const colWidths = [
    { wch: 15 }, // Номер раздела
    { wch: 8 },  // № п/п
    { wch: 15 }, // Тип позиции
    { wch: 40 }, // Наименование работ
    { wch: 10 }, // Ед. изм.
    { wch: 15 }, // Кол-во Заказчика
    { wch: 12 }, // Кол-во ГП
    { wch: 20 }, // Цена материала за единицу
    { wch: 20 }, // Цена работы за единицу
    { wch: 15 }, // Итого материал
    { wch: 15 }, // Итого работа
    { wch: 25 }, // Сумма (коммерческая стоимость)
    { wch: 25 }, // Сумма (базовая стоимость)
    { wch: 20 }, // Примечание ГП
    { wch: 30 }, // Примечание заказчика
  ];
  ws['!cols'] = colWidths;

  // Freeze the first row (header)
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

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
  boqItemsMap: Map<string, any[]> | null,  // Now optional - will load internally if not provided
  tenderName: string,
  tenderId?: string
) => {
  console.log('🚀 [exportBOQToExcel] Starting export with', positions.length, 'positions');
  const startTime = performance.now();

  const exportData: any[] = [];
  const rowStyles: Map<number, string> = new Map(); // Store styles for each row with proper indexing
  const unpricedExecutableRows: Set<number> = new Set(); // Track unpriced executable positions
  let workLinksCache = new Map<string, any[]>(); // Cache for work-material links by position
  let boqItemsCache = boqItemsMap || new Map<string, any[]>(); // Use provided map or create new

  // Cache for categories and locations
  let categoriesCache: any = null;

  // Batch load ALL data if tenderId is provided (parallel requests)
  if (tenderId) {
    console.log('🔄 [exportBOQToExcel] Starting batch data loading...');

    const [linksResult, boqResult, categoriesResult] = await Promise.all([
      // 1. Load all work-material links
      workMaterialLinksApi.getLinksByTender(tenderId),
      // 2. Load ALL BOQ items if not provided
      !boqItemsMap ? boqBatchApi.getAllByTenderId(tenderId) : Promise.resolve({ data: null }),
      // 3. Load all categories and locations
      getAllCategoriesAndLocations()
    ]);

    // Process work-material links
    if (!linksResult.error && linksResult.data) {
      workLinksCache = linksResult.data;
      console.log(`✅ [exportBOQToExcel] Loaded links for ${linksResult.data.size} positions`);
    } else if (linksResult.error) {
      console.error('❌ [exportBOQToExcel] Failed to load links:', linksResult.error);
    }

    // Process BOQ items if loaded
    if (!boqItemsMap && boqResult.data) {
      // Group BOQ items by client_position_id
      console.log(`📦 [exportBOQToExcel] Grouping ${boqResult.data.length} BOQ items by position...`);
      boqItemsCache = new Map();
      for (const item of boqResult.data) {
        const posId = item.client_position_id;
        if (!boqItemsCache.has(posId)) {
          boqItemsCache.set(posId, []);
        }
        const items = boqItemsCache.get(posId);
        if (items) {
          items.push(item);
        }
      }
      console.log(`✅ [exportBOQToExcel] Grouped items into ${boqItemsCache.size} positions`);
    }

    // Store categories cache
    categoriesCache = categoriesResult;
    console.log(`✅ [exportBOQToExcel] Loaded categories cache`);

    const loadTime = performance.now() - startTime;
    console.log(`⚡ [exportBOQToExcel] Batch loading completed in ${loadTime.toFixed(0)}ms`);
  }

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
  const addPositionWithItems = async (position: any, level: number = 0) => {
    // Get BOQ items for this position from cache
    let items = boqItemsCache.get(position.id) || [];

    // Get work-material links from cache (already loaded for entire tender)
    const links = workLinksCache.get(position.id) || [];

    // Process items with link information (same logic as TenderBOQManagerLazy)
    const processedItems = items.map(item => {
      if ((item.item_type === 'material' || item.item_type === 'sub_material') && links && links.length > 0) {
        const materialLinks = links.filter(l =>
          l.material_boq_item_id === item.id ||
          l.sub_material_boq_item_id === item.id
        );

        if (materialLinks.length > 0) {
          return {
            ...item,
            work_links: materialLinks,
            work_link: materialLinks[0]
          };
        }
      } else if ((item.item_type === 'work' || item.item_type === 'sub_work') && links && links.length > 0) {
        const workLinks = links.filter(l =>
          l.work_boq_item_id === item.id ||
          l.sub_work_boq_item_id === item.id
        );

        if (workLinks.length > 0) {
          return {
            ...item,
            linked_materials: workLinks
          };
        }
      }
      return item;
    });

    items = processedItems;

    // Add client position row
    const rowIndex = exportData.length;
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

    // Check if this is an unpriced executable position
    if (position.position_type === 'executable' && items.length === 0) {
      unpricedExecutableRows.add(rowIndex);
    }

    // Sort BOQ items properly - works first, then their linked materials
    const sortedItems: any[] = [];

    // Get all works and sub-works sorted by sub_number
    const works = items
      .filter(item => item.item_type === 'work' || item.item_type === 'sub_work')
      .sort((a, b) => (a.sub_number || 0) - (b.sub_number || 0));

    // Process each work and its linked materials (using work_link data)
    works.forEach(work => {
      // Add the work
      sortedItems.push(work);

      // Find materials linked to this work (using work_link object)
      const linkedMaterials = items.filter(item => {
        // Only check materials and sub-materials
        if (item.item_type !== 'material' && item.item_type !== 'sub_material') {
          return false;
        }

        // Check if material is linked to this work using work_link object
        if (item.work_link) {
          if (work.item_type === 'work') {
            // Regular work - check work_boq_item_id
            return item.work_link.work_boq_item_id === work.id;
          } else if (work.item_type === 'sub_work') {
            // Sub-work - check sub_work_boq_item_id
            return item.work_link.sub_work_boq_item_id === work.id;
          }
        }
        return false;
      }).sort((a, b) => (a.sub_number || 0) - (b.sub_number || 0));

      // Add linked materials after the work
      sortedItems.push(...linkedMaterials);
    });

    // Add unlinked materials at the end (materials without work_link)
    const unlinkedMaterials = items.filter(item =>
      (item.item_type === 'material' || item.item_type === 'sub_material') &&
      !item.work_link
    ).sort((a, b) => (a.sub_number || 0) - (b.sub_number || 0));

    sortedItems.push(...unlinkedMaterials);

    // Add each BOQ item
    sortedItems.forEach(item => {
      // For work and sub_work types, material_type should be empty
      const materialType = (item.item_type === 'work' || item.item_type === 'sub_work')
        ? ''
        : translateMaterialType(item.material_type);

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

      // Track row index and type for styling (use current length - 1 as the row was just added)
      rowStyles.set(exportData.length - 1, item.item_type);
    });

    // Add additional positions (ДОП) from the position's additional_works property
    // This handles ДОП positions for all position types, not just executable
    if (position.additional_works && Array.isArray(position.additional_works)) {
      const sortedAdditional = [...position.additional_works].sort((a, b) => a.position_number - b.position_number);

      for (const addPos of sortedAdditional) {
        // Mark as ДОП position by modifying the item_no
        const dopPosition = {
          ...addPos,
          item_no: `${position.item_no || ''}.ДОП.${addPos.position_number - position.position_number}`
        };
        await addPositionWithItems(dopPosition, level + 1);
      }
    }

    // Also check for additional positions in the main positions list (for fallback compatibility)
    // This ensures we don't miss any ДОП positions if data structure is different
    const additionalPositions = positions.filter(p =>
      p.parent_position_id === position.id &&
      p.is_additional === true
    );

    if (additionalPositions.length > 0) {
      const sortedAdditional = [...additionalPositions].sort((a, b) => a.position_number - b.position_number);

      for (const addPos of sortedAdditional) {
        // Skip if already processed from additional_works
        if (position.additional_works && position.additional_works.some((aw: any) => aw.id === addPos.id)) {
          continue;
        }

        // Mark as ДОП position by modifying the item_no
        const dopPosition = {
          ...addPos,
          item_no: `${position.item_no || ''}.ДОП.${addPos.position_number - position.position_number}`
        };
        await addPositionWithItems(dopPosition, level + 1);
      }
    }
  };

  // Process only main positions (without parent_position_id)
  const mainPositions = positions
    .filter(p => !p.parent_position_id)
    .sort((a, b) => a.position_number - b.position_number);

  console.log('📊 [exportBOQToExcel] Processing', mainPositions.length, 'main positions');

  // Process positions sequentially to ensure proper async handling
  for (const position of mainPositions) {
    await addPositionWithItems(position, 0);
  }

  // Update export data with categories using cache
  console.log('🔄 [exportBOQToExcel] Applying cost categories from cache...');

  if (categoriesCache) {
    exportData.forEach((row) => {
      // Check if this row has a BOQ item with detail_cost_category_id
      const boqItem = Array.from(boqItemsCache.values())
        .flat()
        .find(item => item.description === row['Наименование']?.trim());

      if (boqItem?.detail_cost_category_id) {
        // Get category display using cached data
        const detailCategory = categoriesCache.detailCategoryMap.get(boqItem.detail_cost_category_id);
        const category = detailCategory?.category_id ?
          categoriesCache.categoryMap.get(detailCategory.category_id) : null;
        const location = boqItem.location_id ?
          categoriesCache.locationMap.get(boqItem.location_id) : null;

        // Build display string (matching getDetailCategoryDisplay format)
        let display = '';
        if (category) display += category.name;
        if (detailCategory) {
          if (display) display += ' / ';
          display += detailCategory.name;
        }
        if (location) {
          if (display) display += ' / ';
          display += location.name;
        }

        row['Категория затрат'] = display;
      }
    });
  } else {
    console.log('⚠️ [exportBOQToExcel] No categories cache available, skipping category assignment');
  }

  // Create Excel workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Apply color styling based on item type
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // Define colors for each item type (matching the UI)
  const itemTypeColors = {
    'work': 'FED7AA',       // Orange
    'material': 'BFDBFE',   // Blue
    'sub_work': 'E9D5FF',   // Purple
    'sub_material': 'BBF7D0' // Green
  };

  // Define common styles
  const borderStyle = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  };

  const centerAlignment = {
    horizontal: "center",
    vertical: "center",
    wrapText: true
  };

  const leftAlignment = {
    horizontal: "left",
    vertical: "center",
    wrapText: true
  };

  const unpricedColor = 'FFCCCC'; // Light red for unpriced positions

  // Define number formats for different column types
  const integerFormat = '#,##0'; // Format with thousand separators for integers
  const decimalFormat = '#,##0.00'; // Format with 2 decimal places

  const integerColumns = [
    7,  // Количество заказчика
    13, // Стоимость доставки
    14, // Цена за единицу
    15  // Итоговая сумма
  ];

  const decimalColumns = [
    8,  // Коэфф. перевода
    9,  // Коэфф. расхода
    10  // Количество ГП
  ];

  // Apply styles to all cells
  for (let row = 0; row <= range.e.r; row++) {
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellAddress];

      if (cell) {
        if (!cell.s) cell.s = {};

        // Add borders to all cells
        cell.s.border = borderStyle;

        // Add number format for numeric columns (skip header row)
        if (row > 0) {
          if (integerColumns.includes(col)) {
            cell.s.numFmt = integerFormat;
          } else if (decimalColumns.includes(col)) {
            cell.s.numFmt = decimalFormat;
          }
        }

        // Add alignment based on column (column 5 is "Наименование")
        if (col === 5) {
          // "Наименование" column - left align
          cell.s.alignment = leftAlignment;
        } else {
          // All other columns - center align
          cell.s.alignment = centerAlignment;
        }

        // Apply background colors for data rows (skip header)
        if (row > 0) {
          const dataRowIndex = row - 1; // Adjust for header

          // Check for unpriced executable positions
          if (unpricedExecutableRows.has(dataRowIndex)) {
            cell.s.fill = {
              patternType: 'solid',
              fgColor: { rgb: unpricedColor },
              bgColor: { rgb: unpricedColor }
            };
          }
          // Check for BOQ item types
          else {
            const itemType = rowStyles.get(dataRowIndex);
            if (itemType && (itemTypeColors as any)[itemType]) {
              const bgColor = (itemTypeColors as any)[itemType];
              cell.s.fill = {
                patternType: 'solid',
                fgColor: { rgb: bgColor },
                bgColor: { rgb: bgColor }
              };
            }
          }
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

  // Freeze header row - use both formats for compatibility
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'BOQ');

  // Generate filename (tenderName already includes version in format "Title (Версия X)")
  const safeFileName = tenderName.replace(/[^а-яА-Яa-zA-Z0-9\s()]/g, '_').trim();
  const fileName = `${safeFileName}.xlsx`;

  // Write file
  XLSX.writeFile(wb, fileName);

  console.log('✅ [exportBOQToExcel] Export completed:', fileName);
  console.log('📊 [exportBOQToExcel] Exported', exportData.length, 'rows total');
};