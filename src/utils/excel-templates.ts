import * as XLSX from 'xlsx';

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