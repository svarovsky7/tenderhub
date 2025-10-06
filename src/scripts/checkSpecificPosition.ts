/**
 * Script to check specific position calculation by ID
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPosition(positionId: string) {
  console.log(`\n🔍 Проверка позиции с ID: ${positionId}`);
  console.log('═════════════════════════════════════════════════════════════════\n');

  // Получаем данные позиции
  const { data: position, error: posError } = await supabase
    .from('client_positions')
    .select('*')
    .eq('id', positionId)
    .single();

  if (posError) {
    console.error('❌ Ошибка получения позиции:', posError);
    return;
  }

  if (!position) {
    console.error('❌ Позиция не найдена');
    return;
  }

  console.log('📋 Информация о позиции:');
  console.log(`   Номер позиции: ${position.position_number}`);
  console.log(`   Наименование: ${position.work_name}`);
  console.log(`   Тендер ID: ${position.tender_id}\n`);

  console.log('🔹 Базовые стоимости (ПЗ):');
  console.log(`   Материалы: ${parseFloat(position.total_materials_cost || '0').toLocaleString('ru-RU')} ₽`);
  console.log(`   Работы: ${parseFloat(position.total_works_cost || '0').toLocaleString('ru-RU')} ₽`);
  console.log(`   ИТОГО ПЗ: ${(parseFloat(position.total_materials_cost || '0') + parseFloat(position.total_works_cost || '0')).toLocaleString('ru-RU')} ₽\n`);

  console.log('🔹 Коммерческие стоимости (в БД):');
  console.log(`   Материалы КП: ${parseFloat(position.total_commercial_materials_cost || '0').toLocaleString('ru-RU')} ₽`);
  console.log(`   Работы КП: ${parseFloat(position.total_commercial_works_cost || '0').toLocaleString('ru-RU')} ₽`);
  console.log(`   ИТОГО КП: ${(parseFloat(position.total_commercial_materials_cost || '0') + parseFloat(position.total_commercial_works_cost || '0')).toLocaleString('ru-RU')} ₽\n`);

  // Получаем проценты накруток для этого тендера
  const { data: markup, error: markupError } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', position.tender_id)
    .eq('is_active', true)
    .single();

  if (markupError) {
    console.error('❌ Ошибка получения процентов накруток:', markupError);
    return;
  }

  console.log('📊 Проценты накруток (активные):');
  console.log(`   Работы 1.6: ${markup.works_16_markup}%`);
  console.log(`   Механизация: ${markup.mechanization_service}%`);
  console.log(`   МБП+ГСМ: ${markup.mbp_gsm}%`);
  console.log(`   Гарантийный период: ${markup.warranty_period}%`);
  console.log(`   Рост стоимости работ: ${markup.works_cost_growth}%`);
  console.log(`   Рост стоимости материалов: ${markup.materials_cost_growth}%`);
  console.log(`   Рост субработ: ${markup.subcontract_works_cost_growth}%`);
  console.log(`   Рост субматериалов: ${markup.subcontract_materials_cost_growth}%`);
  console.log(`   Непредвиденные затраты: ${markup.contingency_costs}%`);
  console.log(`   ООЗ собств. силы: ${markup.overhead_own_forces}%`);
  console.log(`   ООЗ субподряд: ${markup.overhead_subcontract}%`);
  console.log(`   ОФЗ (без субподряда): ${markup.general_costs_without_subcontract}%`);
  console.log(`   Прибыль собств. силы: ${markup.profit_own_forces}%`);
  console.log(`   Прибыль субподряд: ${markup.profit_subcontract}%\n`);

  // Рассчитываем коммерческую стоимость
  const baseMaterials = parseFloat(position.total_materials_cost || '0');
  const baseWorks = parseFloat(position.total_works_cost || '0');

  console.log('📐 РАСЧЕТ КОММЕРЧЕСКОЙ СТОИМОСТИ МАТЕРИАЛОВ:');
  console.log('   Формула: поэтапное применение накруток\n');

  if (baseMaterials > 0) {
    // Шаг 1: Рост стоимости материалов
    const mat1 = baseMaterials * (1 + markup.materials_cost_growth / 100);
    console.log(`   Шаг 1. Материалы РОСТ:`);
    console.log(`          ${baseMaterials.toLocaleString('ru-RU')} × (1 + ${markup.materials_cost_growth}%) = ${mat1.toLocaleString('ru-RU')} ₽`);

    // Шаг 2: Непредвиденные затраты
    const mat2 = baseMaterials * (1 + markup.contingency_costs / 100);
    console.log(`   Шаг 2. Непредвиденные затраты:`);
    console.log(`          ${baseMaterials.toLocaleString('ru-RU')} × (1 + ${markup.contingency_costs}%) = ${mat2.toLocaleString('ru-RU')} ₽`);

    // Шаг 3: ООЗ
    const mat3 = (mat1 + mat2 - baseMaterials) * (1 + markup.overhead_own_forces / 100);
    console.log(`   Шаг 3. ООЗ собств. силы:`);
    console.log(`          (${mat1.toLocaleString('ru-RU')} + ${mat2.toLocaleString('ru-RU')} - ${baseMaterials.toLocaleString('ru-RU')}) × (1 + ${markup.overhead_own_forces}%)`);
    console.log(`          = ${(mat1 + mat2 - baseMaterials).toLocaleString('ru-RU')} × ${(1 + markup.overhead_own_forces / 100).toFixed(2)} = ${mat3.toLocaleString('ru-RU')} ₽`);

    // Шаг 4: ОФЗ
    const mat4 = mat3 * (1 + markup.general_costs_without_subcontract / 100);
    console.log(`   Шаг 4. ОФЗ (без субподряда):`);
    console.log(`          ${mat3.toLocaleString('ru-RU')} × (1 + ${markup.general_costs_without_subcontract}%) = ${mat4.toLocaleString('ru-RU')} ₽`);

    // Шаг 5: Прибыль
    const mat5 = mat4 * (1 + markup.profit_own_forces / 100);
    console.log(`   Шаг 5. Прибыль собств. силы:`);
    console.log(`          ${mat4.toLocaleString('ru-RU')} × (1 + ${markup.profit_own_forces}%) = ${mat5.toLocaleString('ru-RU')} ₽`);

    console.log(`\n   📍 ИТОГОВАЯ КОММЕРЧЕСКАЯ СТОИМОСТЬ МАТЕРИАЛОВ: ${mat5.toLocaleString('ru-RU')} ₽`);

    const materialMarkup = ((mat5 - baseMaterials) / baseMaterials * 100).toFixed(1);
    console.log(`   📈 Общая наценка на материалы: ${materialMarkup}%\n`);
  } else {
    console.log('   Материалы отсутствуют (0 ₽)\n');
  }

  console.log('📐 РАСЧЕТ КОММЕРЧЕСКОЙ СТОИМОСТИ РАБОТ:');

  if (baseWorks > 0) {
    // Шаг 1: Работы 1.6
    const work1 = baseWorks * (1 + markup.works_16_markup / 100);
    console.log(`   Шаг 1. Работы 1.6:`);
    console.log(`          ${baseWorks.toLocaleString('ru-RU')} × (1 + ${markup.works_16_markup}%) = ${work1.toLocaleString('ru-RU')} ₽`);

    // Шаг 2: Рост стоимости работ
    const work2 = work1 * (1 + markup.works_cost_growth / 100);
    console.log(`   Шаг 2. Работы РОСТ:`);
    console.log(`          ${work1.toLocaleString('ru-RU')} × (1 + ${markup.works_cost_growth}%) = ${work2.toLocaleString('ru-RU')} ₽`);

    // Шаг 3: Непредвиденные затраты (от базовой стоимости)
    const work3 = baseWorks * (1 + markup.contingency_costs / 100);
    console.log(`   Шаг 3. Непредвиденные затраты:`);
    console.log(`          ${baseWorks.toLocaleString('ru-RU')} × (1 + ${markup.contingency_costs}%) = ${work3.toLocaleString('ru-RU')} ₽`);

    // Шаг 4: ООЗ
    const work4 = (work2 + work3 - baseWorks) * (1 + markup.overhead_own_forces / 100);
    console.log(`   Шаг 4. ООЗ собств. силы:`);
    console.log(`          (${work2.toLocaleString('ru-RU')} + ${work3.toLocaleString('ru-RU')} - ${baseWorks.toLocaleString('ru-RU')}) × (1 + ${markup.overhead_own_forces}%)`);
    console.log(`          = ${(work2 + work3 - baseWorks).toLocaleString('ru-RU')} × ${(1 + markup.overhead_own_forces / 100).toFixed(2)} = ${work4.toLocaleString('ru-RU')} ₽`);

    // Шаг 5: ОФЗ
    const work5 = work4 * (1 + markup.general_costs_without_subcontract / 100);
    console.log(`   Шаг 5. ОФЗ (без субподряда):`);
    console.log(`          ${work4.toLocaleString('ru-RU')} × (1 + ${markup.general_costs_without_subcontract}%) = ${work5.toLocaleString('ru-RU')} ₽`);

    // Шаг 6: Прибыль
    const work6 = work5 * (1 + markup.profit_own_forces / 100);
    console.log(`   Шаг 6. Прибыль собств. силы:`);
    console.log(`          ${work5.toLocaleString('ru-RU')} × (1 + ${markup.profit_own_forces}%) = ${work6.toLocaleString('ru-RU')} ₽`);

    console.log(`\n   📍 ИТОГОВАЯ КОММЕРЧЕСКАЯ СТОИМОСТЬ РАБОТ: ${work6.toLocaleString('ru-RU')} ₽`);

    const worksMarkup = ((work6 - baseWorks) / baseWorks * 100).toFixed(1);
    console.log(`   📈 Общая наценка на работы: ${worksMarkup}%\n`);
  } else {
    console.log('   Работы отсутствуют (0 ₽)\n');
  }

  console.log('═════════════════════════════════════════════════════════════════');
  console.log('🎯 ИТОГОВАЯ ПРОВЕРКА:');

  // Расчет коммерческой стоимости
  let calcMat = 0;
  if (baseMaterials > 0) {
    const m1 = baseMaterials * (1 + markup.materials_cost_growth / 100);
    const m2 = baseMaterials * (1 + markup.contingency_costs / 100);
    const m3 = (m1 + m2 - baseMaterials) * (1 + markup.overhead_own_forces / 100);
    const m4 = m3 * (1 + markup.general_costs_without_subcontract / 100);
    calcMat = m4 * (1 + markup.profit_own_forces / 100);
  }

  let calcWork = 0;
  if (baseWorks > 0) {
    const w1 = baseWorks * (1 + markup.works_16_markup / 100);
    const w2 = w1 * (1 + markup.works_cost_growth / 100);
    const w3 = baseWorks * (1 + markup.contingency_costs / 100);
    const w4 = (w2 + w3 - baseWorks) * (1 + markup.overhead_own_forces / 100);
    const w5 = w4 * (1 + markup.general_costs_without_subcontract / 100);
    calcWork = w5 * (1 + markup.profit_own_forces / 100);
  }

  console.log(`   Рассчитанные материалы КП: ${calcMat.toLocaleString('ru-RU')} ₽`);
  console.log(`   В БД материалы КП: ${parseFloat(position.total_commercial_materials_cost || '0').toLocaleString('ru-RU')} ₽`);

  const matDiff = Math.abs(calcMat - parseFloat(position.total_commercial_materials_cost || '0'));
  if (matDiff > 1) {
    console.log(`   ⚠️ РАСХОЖДЕНИЕ: ${matDiff.toLocaleString('ru-RU')} ₽`);
  } else {
    console.log(`   ✅ Значения совпадают`);
  }

  console.log(`\n   Рассчитанные работы КП: ${calcWork.toLocaleString('ru-RU')} ₽`);
  console.log(`   В БД работы КП: ${parseFloat(position.total_commercial_works_cost || '0').toLocaleString('ru-RU')} ₽`);

  const workDiff = Math.abs(calcWork - parseFloat(position.total_commercial_works_cost || '0'));
  if (workDiff > 1) {
    console.log(`   ⚠️ РАСХОЖДЕНИЕ: ${workDiff.toLocaleString('ru-RU')} ₽`);
  } else {
    console.log(`   ✅ Значения совпадают`);
  }
}

// Получаем ID из аргументов командной строки
const positionId = process.argv[2] || 'e4f6ccfe-6215-4df2-8499-585d568ce17c';

checkPosition(positionId)
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });