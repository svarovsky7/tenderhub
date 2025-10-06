/**
 * Script to reset and recalculate commercial costs
 * First resets all commercial costs to 0, then recalculates with correct formula
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

async function resetAndRecalculate() {
  const tenderId = '736dc11c-33dc-4fce-a7ee-c477abb8b694'; // ЖК Адмирал

  console.log('🔄 ЭТАП 1: Сброс всех коммерческих стоимостей на 0...\n');

  // Сначала обнуляем ВСЕ коммерческие стоимости
  const { error: resetError, count } = await supabase
    .from('client_positions')
    .update({
      total_commercial_materials_cost: 0,
      total_commercial_works_cost: 0
    })
    .eq('tender_id', tenderId);

  if (resetError) {
    console.error('❌ Ошибка сброса коммерческих стоимостей:', resetError);
    return;
  }

  console.log(`✅ Обнулено коммерческих стоимостей в ${count || 0} позициях\n`);

  // Проверяем, что действительно обнулилось
  const { data: checkData, error: checkError } = await supabase
    .from('client_positions')
    .select('position_number, total_commercial_materials_cost, total_commercial_works_cost')
    .eq('tender_id', tenderId)
    .eq('position_number', 8)
    .single();

  if (checkData) {
    console.log('📋 Проверка позиции 8 после обнуления:');
    console.log(`   Материалы КП: ${checkData.total_commercial_materials_cost}`);
    console.log(`   Работы КП: ${checkData.total_commercial_works_cost}\n`);
  }

  console.log('🔄 ЭТАП 2: Пересчет коммерческих стоимостей с правильной формулой...\n');

  // Получаем проценты накруток
  const { data: markup, error: markupError } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('is_active', true)
    .single();

  if (markupError) {
    console.error('❌ Ошибка получения процентов накруток:', markupError);
    return;
  }

  console.log('📊 Активные проценты накруток:');
  console.log(`   Работы 1.6: ${markup.works_16_markup}%`);
  console.log(`   Рост работ: ${markup.works_cost_growth}%`);
  console.log(`   Рост материалов: ${markup.materials_cost_growth}%`);
  console.log(`   Непредвиденные: ${markup.contingency_costs}%`);
  console.log(`   ООЗ собств.: ${markup.overhead_own_forces}%`);
  console.log(`   ОФЗ: ${markup.general_costs_without_subcontract}%`);
  console.log(`   Прибыль собств.: ${markup.profit_own_forces}%\n`);

  // Получаем все позиции для пересчета
  const { data: positions, error: posError } = await supabase
    .from('client_positions')
    .select('id, position_number, work_name, total_materials_cost, total_works_cost')
    .eq('tender_id', tenderId)
    .order('position_number');

  if (posError) {
    console.error('❌ Ошибка получения позиций:', posError);
    return;
  }

  console.log(`📋 Найдено ${positions?.length || 0} позиций для пересчета\n`);

  let updatedCount = 0;
  let totalBaseMaterials = 0;
  let totalBaseWorks = 0;
  let totalCommercialMaterials = 0;
  let totalCommercialWorks = 0;

  // Функция расчета для материалов
  function calculateMaterialsCommercial(base: number): number {
    if (base === 0) return 0;

    const step1 = base * (1 + markup.materials_cost_growth / 100);
    const step2 = base * (1 + markup.contingency_costs / 100);
    const step3 = (step1 + step2 - base) * (1 + markup.overhead_own_forces / 100);
    const step4 = step3 * (1 + markup.general_costs_without_subcontract / 100);
    const step5 = step4 * (1 + markup.profit_own_forces / 100);

    return step5;
  }

  // Функция расчета для работ
  function calculateWorksCommercial(base: number): number {
    if (base === 0) return 0;

    const step1 = base * (1 + markup.works_16_markup / 100);
    const step2 = step1 * (1 + markup.works_cost_growth / 100);
    const step3 = base * (1 + markup.contingency_costs / 100);
    const step4 = (step2 + step3 - base) * (1 + markup.overhead_own_forces / 100);
    const step5 = step4 * (1 + markup.general_costs_without_subcontract / 100);
    const step6 = step5 * (1 + markup.profit_own_forces / 100);

    return step6;
  }

  // Обрабатываем каждую позицию
  for (const position of positions || []) {
    const baseMaterials = parseFloat(position.total_materials_cost || '0');
    const baseWorks = parseFloat(position.total_works_cost || '0');

    if (baseMaterials > 0 || baseWorks > 0) {
      const commercialMaterials = calculateMaterialsCommercial(baseMaterials);
      const commercialWorks = calculateWorksCommercial(baseWorks);

      // Обновляем в БД
      const { error: updateError } = await supabase
        .from('client_positions')
        .update({
          total_commercial_materials_cost: commercialMaterials,
          total_commercial_works_cost: commercialWorks
        })
        .eq('id', position.id);

      if (updateError) {
        console.error(`❌ Ошибка обновления позиции ${position.position_number}:`, updateError);
      } else {
        // Выводим детали для важных позиций
        if (position.position_number === 8 ||
            position.position_number === 119 ||
            position.position_number <= 5 ||
            (baseMaterials + baseWorks) > 1000000) {
          console.log(`✅ Позиция ${position.position_number}: ${position.work_name?.substring(0, 50)}...`);
          console.log(`   База: М=${baseMaterials.toLocaleString('ru-RU')} Р=${baseWorks.toLocaleString('ru-RU')}`);
          console.log(`   КП:   М=${Math.round(commercialMaterials).toLocaleString('ru-RU')} Р=${Math.round(commercialWorks).toLocaleString('ru-RU')}`);

          if (baseMaterials > 0) {
            const markupPercent = ((commercialMaterials - baseMaterials) / baseMaterials * 100).toFixed(1);
            console.log(`   Наценка на материалы: ${markupPercent}%`);
          }
          if (baseWorks > 0) {
            const markupPercent = ((commercialWorks - baseWorks) / baseWorks * 100).toFixed(1);
            console.log(`   Наценка на работы: ${markupPercent}%`);
          }
          console.log('');
        }

        updatedCount++;
        totalBaseMaterials += baseMaterials;
        totalBaseWorks += baseWorks;
        totalCommercialMaterials += commercialMaterials;
        totalCommercialWorks += commercialWorks;
      }
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`✅ Успешно обновлено ${updatedCount} позиций\n`);

  // Проверяем позицию 8 после пересчета
  const { data: finalCheck, error: finalError } = await supabase
    .from('client_positions')
    .select('position_number, total_materials_cost, total_works_cost, total_commercial_materials_cost, total_commercial_works_cost')
    .eq('tender_id', tenderId)
    .eq('position_number', 8)
    .single();

  if (finalCheck) {
    console.log('🎯 ФИНАЛЬНАЯ ПРОВЕРКА ПОЗИЦИИ 8:');
    console.log(`   База материалы: ${parseFloat(finalCheck.total_materials_cost).toLocaleString('ru-RU')} ₽`);
    console.log(`   База работы: ${parseFloat(finalCheck.total_works_cost).toLocaleString('ru-RU')} ₽`);
    console.log(`   КП материалы: ${parseFloat(finalCheck.total_commercial_materials_cost).toLocaleString('ru-RU')} ₽`);
    console.log(`   КП работы: ${parseFloat(finalCheck.total_commercial_works_cost).toLocaleString('ru-RU')} ₽\n`);
  }

  console.log('📊 ИТОГОВЫЕ СУММЫ ПО ТЕНДЕРУ:');
  console.log('   Базовые стоимости (ПЗ):');
  console.log(`      Материалы: ${Math.round(totalBaseMaterials).toLocaleString('ru-RU')} ₽`);
  console.log(`      Работы: ${Math.round(totalBaseWorks).toLocaleString('ru-RU')} ₽`);
  console.log(`      ИТОГО: ${Math.round(totalBaseMaterials + totalBaseWorks).toLocaleString('ru-RU')} ₽\n`);

  console.log('   Коммерческие стоимости (КП):');
  console.log(`      Материалы: ${Math.round(totalCommercialMaterials).toLocaleString('ru-RU')} ₽`);
  console.log(`      Работы: ${Math.round(totalCommercialWorks).toLocaleString('ru-RU')} ₽`);
  console.log(`      ИТОГО: ${Math.round(totalCommercialMaterials + totalCommercialWorks).toLocaleString('ru-RU')} ₽\n`);

  if (totalBaseMaterials + totalBaseWorks > 0) {
    const totalMarkup = ((totalCommercialMaterials + totalCommercialWorks) - (totalBaseMaterials + totalBaseWorks)) / (totalBaseMaterials + totalBaseWorks) * 100;
    console.log(`   Общая наценка: ${totalMarkup.toFixed(1)}%`);
  }
}

// Запуск скрипта
console.log('🚀 Запуск скрипта сброса и пересчета коммерческих стоимостей\n');
console.log('⚠️  ВНИМАНИЕ: Скрипт полностью пересчитает все коммерческие стоимости');
console.log('   для тендера "ЖК Адмирал" с правильными формулами\n');

resetAndRecalculate()
  .then(() => {
    console.log('\n✅ Скрипт завершен успешно');
    console.log('\n📌 Что делать дальше:');
    console.log('   1. Обновите страницу "Коммерческие стоимости"');
    console.log('   2. Проверьте, что сумма теперь совпадает со страницей "Финансовые показатели"');
    console.log('   3. Если всё ок, сохраните результат нажатием кнопки "Сохранить"');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });