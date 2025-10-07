/**
 * Script to fix commercial costs for a specific tender
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

// Функция расчета для материалов
function calculateMaterialsCommercial(base: number, markups: any): number {
  if (base === 0) return 0;

  const step1 = base * (1 + markups.materials_cost_growth / 100);
  const step2 = base * (1 + markups.contingency_costs / 100);
  const step3 = (step1 + step2 - base) * (1 + markups.overhead_own_forces / 100);
  const step4 = step3 * (1 + markups.general_costs_without_subcontract / 100);
  const step5 = step4 * (1 + markups.profit_own_forces / 100);

  return step5;
}

// Функция расчета для работ
function calculateWorksCommercial(base: number, markups: any): number {
  if (base === 0) return 0;

  const step1 = base * (1 + markups.works_16_markup / 100);
  const step2 = step1 * (1 + markups.works_cost_growth / 100);
  const step3 = base * (1 + markups.contingency_costs / 100);
  const step4 = (step2 + step3 - base) * (1 + markups.overhead_own_forces / 100);
  const step5 = step4 * (1 + markups.general_costs_without_subcontract / 100);
  const step6 = step5 * (1 + markups.profit_own_forces / 100);

  return step6;
}

async function fixTenderCommercialCosts(tenderId: string) {
  console.log(`\n🔄 Исправление коммерческих стоимостей для тендера: ${tenderId}\n`);

  // Получаем информацию о тендере
  const { data: tender, error: tenderError } = await supabase
    .from('tenders')
    .select('title, client_name')
    .eq('id', tenderId)
    .single();

  if (tender) {
    console.log(`📋 Тендер: ${tender.title} - ${tender.client_name}\n`);
  }

  // Получаем проценты накруток
  const { data: markup, error: markupError } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('is_active', true)
    .single();

  if (markupError || !markup) {
    console.error('❌ Ошибка получения процентов накруток:', markupError);
    return;
  }

  console.log('📊 Проценты накруток:');
  console.log(`   Работы 1.6: ${markup.works_16_markup}%`);
  console.log(`   Рост материалов: ${markup.materials_cost_growth}%`);
  console.log(`   Рост работ: ${markup.works_cost_growth}%`);
  console.log(`   Непредвиденные: ${markup.contingency_costs}%`);
  console.log(`   ООЗ: ${markup.overhead_own_forces}%`);
  console.log(`   ОФЗ: ${markup.general_costs_without_subcontract}%`);
  console.log(`   Прибыль: ${markup.profit_own_forces}%\n`);

  // Получаем все позиции тендера
  const { data: positions, error: posError } = await supabase
    .from('client_positions')
    .select('*')
    .eq('tender_id', tenderId)
    .order('position_number');

  if (posError) {
    console.error('❌ Ошибка получения позиций:', posError);
    return;
  }

  console.log(`📋 Найдено ${positions?.length || 0} позиций\n`);

  let fixedCount = 0;
  let problemCount = 0;

  // Проверяем каждую позицию
  for (const position of positions || []) {
    const baseMaterials = parseFloat(position.total_materials_cost || '0');
    const baseWorks = parseFloat(position.total_works_cost || '0');
    const currentCommMaterials = parseFloat(position.total_commercial_materials_cost || '0');
    const currentCommWorks = parseFloat(position.total_commercial_works_cost || '0');

    if (baseMaterials > 0 || baseWorks > 0) {
      // Рассчитываем правильные значения
      const correctMaterials = calculateMaterialsCommercial(baseMaterials, markup);
      const correctWorks = calculateWorksCommercial(baseWorks, markup);

      // Проверяем, есть ли проблема (значение больше чем в 100 раз)
      const materialsProblem = currentCommMaterials > correctMaterials * 100;
      const worksProblem = currentCommWorks > correctWorks * 100;

      if (materialsProblem || worksProblem) {
        problemCount++;

        console.log(`⚠️ Позиция ${position.position_number}: ${position.work_name?.substring(0, 50)}`);
        console.log(`   База: М=${baseMaterials.toLocaleString('ru-RU')} Р=${baseWorks.toLocaleString('ru-RU')}`);

        if (materialsProblem) {
          console.log(`   ❌ Материалы КП в БД: ${currentCommMaterials.toLocaleString('ru-RU')} ₽`);
          console.log(`   ✅ Должно быть: ${Math.round(correctMaterials).toLocaleString('ru-RU')} ₽`);
        }

        if (worksProblem) {
          console.log(`   ❌ Работы КП в БД: ${currentCommWorks.toLocaleString('ru-RU')} ₽`);
          console.log(`   ✅ Должно быть: ${Math.round(correctWorks).toLocaleString('ru-RU')} ₽`);
        }

        // Исправляем значения
        const { error: updateError } = await supabase
          .from('client_positions')
          .update({
            total_commercial_materials_cost: correctMaterials,
            total_commercial_works_cost: correctWorks
          })
          .eq('id', position.id);

        if (updateError) {
          console.error(`   ❌ Ошибка обновления:`, updateError);
        } else {
          console.log(`   ✅ Исправлено!`);
          fixedCount++;
        }
        console.log('');
      }
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`📊 Результаты:`);
  console.log(`   Найдено проблемных позиций: ${problemCount}`);
  console.log(`   Исправлено позиций: ${fixedCount}`);

  if (problemCount === 0) {
    console.log(`   ✅ Все позиции уже имеют корректные значения!`);
  }
}

// Получаем ID тендера из аргументов или используем проблемный
const tenderId = process.argv[2] || 'd729177f-1454-4bb1-86d6-e509d3a834c3';

fixTenderCommercialCosts(tenderId)
  .then(() => {
    console.log('\n✅ Скрипт завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });