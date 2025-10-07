/**
 * Fix ALL positions with trillion values in database
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

async function findAndFixTrillionValues() {
  console.log('🔍 Поиск ВСЕХ позиций с триллионными значениями в БД...\n');

  // Ищем все позиции с коммерческими стоимостями больше миллиарда
  const billion = 1000000000;

  const { data: positions, error } = await supabase
    .from('client_positions')
    .select('*')
    .or(`total_commercial_materials_cost.gt.${billion},total_commercial_works_cost.gt.${billion}`);

  if (error) {
    console.error('❌ Ошибка поиска:', error);
    return;
  }

  if (!positions || positions.length === 0) {
    console.log('✅ Триллионных значений не найдено!');
    console.log('   Все коммерческие стоимости в БД корректны.');
    return;
  }

  console.log(`⚠️ Найдено ${positions.length} позиций с триллионными значениями:\n`);

  // Группируем по тендерам
  const tenderMap = new Map<string, any[]>();

  for (const pos of positions) {
    if (!tenderMap.has(pos.tender_id)) {
      tenderMap.set(pos.tender_id, []);
    }
    tenderMap.get(pos.tender_id)?.push(pos);
  }

  console.log(`📋 Затронуто тендеров: ${tenderMap.size}\n`);

  // Обрабатываем каждый тендер
  for (const [tenderId, tenderPositions] of tenderMap) {
    console.log(`\n🔄 Тендер: ${tenderId}`);
    console.log(`   Позиций с проблемами: ${tenderPositions.length}`);

    // Получаем проценты накруток для тендера
    const { data: markup, error: markupError } = await supabase
      .from('tender_markup_percentages')
      .select('*')
      .eq('tender_id', tenderId)
      .eq('is_active', true)
      .single();

    if (markupError || !markup) {
      console.error(`   ❌ Не удалось получить проценты накруток`);
      continue;
    }

    // Исправляем каждую позицию
    for (const position of tenderPositions) {
      const commercialMaterials = parseFloat(position.total_commercial_materials_cost || '0');
      const commercialWorks = parseFloat(position.total_commercial_works_cost || '0');

      console.log(`\n   Позиция №${position.position_number}: ${position.work_name?.substring(0, 40)}...`);

      if (commercialMaterials > billion) {
        console.log(`      ❌ Материалы КП: ${commercialMaterials.toExponential(2)} (${(commercialMaterials / billion).toFixed(1)} млрд)`);
      }

      if (commercialWorks > billion) {
        console.log(`      ❌ Работы КП: ${commercialWorks.toExponential(2)} (${(commercialWorks / billion).toFixed(1)} млрд)`);
      }

      // Рассчитываем правильные значения
      const baseMaterials = parseFloat(position.total_materials_cost || '0');
      const baseWorks = parseFloat(position.total_works_cost || '0');

      let correctMaterials = 0;
      let correctWorks = 0;

      // Расчет для материалов
      if (baseMaterials > 0) {
        const m1 = baseMaterials * (1 + markup.materials_cost_growth / 100);
        const m2 = baseMaterials * (1 + markup.contingency_costs / 100);
        const m3 = (m1 + m2 - baseMaterials) * (1 + markup.overhead_own_forces / 100);
        const m4 = m3 * (1 + markup.general_costs_without_subcontract / 100);
        correctMaterials = m4 * (1 + markup.profit_own_forces / 100);
      }

      // Расчет для работ
      if (baseWorks > 0) {
        const w1 = baseWorks * (1 + markup.works_16_markup / 100);
        const w2 = w1 * (1 + markup.works_cost_growth / 100);
        const w3 = baseWorks * (1 + markup.contingency_costs / 100);
        const w4 = (w2 + w3 - baseWorks) * (1 + markup.overhead_own_forces / 100);
        const w5 = w4 * (1 + markup.general_costs_without_subcontract / 100);
        correctWorks = w5 * (1 + markup.profit_own_forces / 100);
      }

      console.log(`      ✅ Должно быть:`);
      console.log(`         Материалы: ${Math.round(correctMaterials).toLocaleString('ru-RU')} ₽`);
      console.log(`         Работы: ${Math.round(correctWorks).toLocaleString('ru-RU')} ₽`);

      // Обновляем в БД
      const { error: updateError } = await supabase
        .from('client_positions')
        .update({
          total_commercial_materials_cost: correctMaterials,
          total_commercial_works_cost: correctWorks
        })
        .eq('id', position.id);

      if (updateError) {
        console.error(`      ❌ Ошибка обновления:`, updateError);
      } else {
        console.log(`      ✅ Исправлено!`);
      }
    }
  }

  // Финальная проверка
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 Финальная проверка...\n');

  const { data: checkData, error: checkError } = await supabase
    .from('client_positions')
    .select('id')
    .or(`total_commercial_materials_cost.gt.${billion},total_commercial_works_cost.gt.${billion}`);

  if (checkError) {
    console.error('❌ Ошибка проверки:', checkError);
  } else if (!checkData || checkData.length === 0) {
    console.log('✅ ВСЕ ТРИЛЛИОННЫЕ ЗНАЧЕНИЯ ИСПРАВЛЕНЫ!');
    console.log('   В БД больше нет позиций с некорректными стоимостями.');
  } else {
    console.log(`⚠️ Осталось ${checkData.length} позиций с триллионными значениями`);
    console.log('   Возможно, требуется ручное вмешательство.');
  }
}

findAndFixTrillionValues()
  .then(() => {
    console.log('\n✅ Скрипт завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });