const XLSX = require('xlsx');
const path = require('path');

// Читаем файл
const workbook = XLSX.readFile('BOQ.xlsx');

console.log('=== АНАЛИЗ ФАЙЛА BOQ.xlsx ===\n');

// Список листов
console.log('Листы в файле:');
workbook.SheetNames.forEach(name => console.log('  -', name));
console.log('');

// Анализ первого листа
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

// Заголовки колонок (первая строка)
console.log('Колонки в первом листе:');
if (data.length > 0) {
  data[0].forEach((col, idx) => {
    if (col) console.log(`  ${idx + 1}. ${col}`);
  });
}

console.log('\nВсего строк данных:', data.length - 1);

// Анализ форматирования
const range = XLSX.utils.decode_range(firstSheet['!ref']);
console.log('\nДиапазон данных:', firstSheet['!ref']);
console.log('Строк:', range.e.r + 1);
console.log('Колонок:', range.e.c + 1);

// Проверка ширины колонок
if (firstSheet['!cols']) {
  console.log('\nШирина колонок установлена:', firstSheet['!cols'].length, 'колонок');
  firstSheet['!cols'].forEach((col, idx) => {
    if (col && col.wch) {
      console.log(`  Колонка ${idx + 1}: ${col.wch} символов`);
    }
  });
}

// Проверка объединенных ячеек
if (firstSheet['!merges']) {
  console.log('\nОбъединенные ячейки:', firstSheet['!merges'].length);
}

// Анализ первых 5 строк данных
console.log('\n=== ПРИМЕРЫ ДАННЫХ (первые 5 строк) ===\n');
for (let i = 1; i <= Math.min(5, data.length - 1); i++) {
  const row = data[i];
  console.log(`Строка ${i}:`);
  row.forEach((cell, idx) => {
    if (cell !== undefined && cell !== '') {
      const header = data[0][idx] || `Колонка ${idx + 1}`;
      console.log(`  ${header}: ${cell}`);
    }
  });
  console.log('');
}

// Анализ стилей (если есть)
let hasStyles = false;
for (let cell in firstSheet) {
  if (cell[0] !== '!' && firstSheet[cell].s) {
    hasStyles = true;
    break;
  }
}
console.log('Стили ячеек:', hasStyles ? 'Присутствуют' : 'Отсутствуют');

// Проверка на заморозку строк
if (firstSheet['!freeze']) {
  console.log('Заморожены строки/колонки:', JSON.stringify(firstSheet['!freeze']));
}

