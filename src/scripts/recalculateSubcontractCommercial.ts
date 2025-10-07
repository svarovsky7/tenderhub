/**
 * Script to recalculate commercial costs for subcontract positions
 * Specifically fixes positions that should have subcontract markup
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

// Функция расчета для субподрядных работ
function calculateSubWorkCommercial(base: number, markups: any): number {
  if (base === 0) return 0;

  // Формула для субподрядных работ отличается от обычных работ
  // Применяются специальные проценты для субподряда
  const step1 = base * (1 + (markups.subcontract_works_cost_growth || 0) / 100);
  const step2 = base * (1 + (markups.contingency_costs || 0) / 100);
  const step3 = (step1 + step2 - base) * (1 + (markups.overhead_subcontract || 0) / 100);
  const step4 = step3 * (1 + (markups.general_costs_without_subcontract || 0) / 100);
  const step5 = step4 * (1 + (markups.profit_subcontract || 0) / 100);

  return step5;
}

// Функция расчета для субподрядных материалов
function calculateSubMaterialCommercial(base: number, markups: any): number {
  if (base === 0) return 0;

  const step1 = base * (1 + (markups.subcontract_materials_cost_growth || 0) / 100);
  const step2 = base * (1 + (markups.contingency_costs || 0) / 100);
  const step3 = (step1 + step2 - base) * (1 + (markups.overhead_subcontract || 0) / 100);
  const step4 = step3 * (1 + (markups.general_costs_without_subcontract || 0) / 100);
  const step5 = step4 * (1 + (markups.profit_subcontract || 0) / 100);

  return step5;
}

async function recalculateSubcontract() {
  const tenderId = '736dc11c-33dc-4fce-a7ee-c477abb8b694'; // ЖК Адмирал

  console.log('🔄 Пересчет коммерческих стоимостей субподрядных позиций\n');
  console.log('📋 Тендер: ЖК Адмирал\n');

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

  console.log('📊 Проценты накруток для субподряда:');
  console.log(`   Рост субподрядных работ: ${markup.subcontract_works_cost_growth}%`);
  console.log(`   Рост субподрядных материалов: ${markup.subcontract_materials_cost_growth}%`);
  console.log(`   ООЗ субподряд: ${markup.overhead_subcontract}%`);
  console.log(`   Прибыль субподряд: ${markup.profit_subcontract}%\n`);

  // Получаем все позиции с BOQ items типа sub_work или sub_material
  const { data: subPositions, error: posError } = await supabase
    .from('client_positions')
    .select(`
      *,
      boq_items!inner(
        id,
        item_type,
        description,
        quantity,
        unit_rate,
        total_amount
      )
    `)
    .eq('tender_id', tenderId)
    .or('item_type.eq.sub_work,item_type.eq.sub_material', { foreignTable: 'boq_items' });

  if (posError) {
    console.error('❌ Ошибка получения позиций:', posError);
    return;
  }

  // Группируем по позициям и суммируем
  const positionMap = new Map();

  for (const position of subPositions || []) {
    const posId = position.id;

    if (!positionMap.has(posId)) {
      positionMap.set(posId, {
        ...position,
        sub_work_base: 0,
        sub_material_base: 0,
        sub_work_items: [],
        sub_material_items: []
      });
    }

    const pos = positionMap.get(posId);

    // Суммируем базовые стоимости по типам
    for (const item of position.boq_items || []) {
      if (item.item_type === 'sub_work') {
        pos.sub_work_base += item.total_amount || 0;
        pos.sub_work_items.push(item);
      } else if (item.item_type === 'sub_material') {
        pos.sub_material_base += item.total_amount || 0;
        pos.sub_material_items.push(item);
      }
    }
  }

  console.log(`📌 Найдено ${positionMap.size} позиций с субподрядными элементами\n`);

  let updatedCount = 0;
  const updates = [];

  // Обрабатываем каждую позицию
  for (const [posId, position] of positionMap) {
    const subWorkBase = position.sub_work_base;
    const subMaterialBase = position.sub_material_base;

    if (subWorkBase > 0 || subMaterialBase > 0) {
      // Рассчитываем коммерческие стоимости
      const subWorkCommercial = calculateSubWorkCommercial(subWorkBase, markup);
      const subMaterialCommercial = calculateSubMaterialCommercial(subMaterialBase, markup);

      // Также нужно учесть обычные работы и материалы, если они есть
      const currentWorkCommercial = parseFloat(position.total_commercial_works_cost || '0');
      const currentMaterialCommercial = parseFloat(position.total_commercial_materials_cost || '0');

      console.log(`\n📍 Позиция №${position.position_number}: ${position.work_name?.substring(0, 40)}...`);

      if (subWorkBase > 0) {
        console.log(`   Субподрядные работы:`);
        console.log(`      База: ${subWorkBase.toLocaleString('ru-RU')} ₽`);
        console.log(`      Коммерческая: ${Math.round(subWorkCommercial).toLocaleString('ru-RU')} ₽`);
        console.log(`      Наценка: ${((subWorkCommercial - subWorkBase) / subWorkBase * 100).toFixed(1)}%`);
      }

      if (subMaterialBase > 0) {
        console.log(`   Субподрядные материалы:`);
        console.log(`      База: ${subMaterialBase.toLocaleString('ru-RU')} ₽`);
        console.log(`      Коммерческая: ${Math.round(subMaterialCommercial).toLocaleString('ru-RU')} ₽`);
        console.log(`      Наценка: ${((subMaterialCommercial - subMaterialBase) / subMaterialBase * 100).toFixed(1)}%`);
      }

      updates.push({
        id: posId,
        position_number: position.position_number,
        work_name: position.work_name,
        sub_work_commercial: subWorkCommercial,
        sub_material_commercial: subMaterialCommercial
      });
    }
  }

  // Применяем обновления
  console.log('\n⚡ Обновление коммерческих стоимостей в БД...\n');

  for (const update of updates) {
    // Для субподрядных работ обновляем total_commercial_works_cost
    // Для субподрядных материалов обновляем total_commercial_materials_cost
    const updateData: any = {};

    if (update.sub_work_commercial > 0) {
      updateData.total_commercial_works_cost = update.sub_work_commercial;
    }
    if (update.sub_material_commercial > 0) {
      updateData.total_commercial_materials_cost = update.sub_material_commercial;
    }

    const { error: updateError } = await supabase
      .from('client_positions')
      .update(updateData)
      .eq('id', update.id);

    if (updateError) {
      console.error(`❌ Ошибка обновления позиции ${update.position_number}:`, updateError);
    } else {
      updatedCount++;
    }
  }

  console.log(`\n✅ Успешно обновлено ${updatedCount} позиций`);

  // Проверяем позицию 117
  const { data: position117, error: pos117Error } = await supabase
    .from('client_positions')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('position_number', 117)
    .single();

  if (!pos117Error && position117) {
    console.log('\n🎯 Позиция 117 (Разработка грунта - суб-раб):');
    console.log(`   База работ: ${parseFloat(position117.total_works_cost || '0').toLocaleString('ru-RU')} ₽`);
    console.log(`   Коммерческая работ: ${parseFloat(position117.total_commercial_works_cost || '0').toLocaleString('ru-RU')} ₽`);

    const base = parseFloat(position117.total_works_cost || '0');
    const commercial = parseFloat(position117.total_commercial_works_cost || '0');
    if (base > 0) {
      const markupPercent = ((commercial - base) / base * 100).toFixed(1);
      console.log(`   Наценка: ${markupPercent}%`);
    }
  }
}

recalculateSubcontract()
  .then(() => {
    console.log('\n✅ Скрипт завершен успешно');
    console.log('\n📌 Обновите страницу коммерческих стоимостей для просмотра изменений');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });