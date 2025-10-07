/**
 * Script to investigate markup issue with ЖК Адмирал tender position 117 (Разработка грунта)
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

async function investigateAdmiralTender() {
  console.log('\n🔍 ИССЛЕДОВАНИЕ ТЕНДЕРА ЖК АДМИРАЛ - ПОЗИЦИЯ 117 (Разработка грунта)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // 1. Поиск тендера ЖК Адмирал
  console.log('📋 Шаг 1: Поиск тендера ЖК Адмирал...');
  const { data: tenders, error: tenderError } = await supabase
    .from('tenders')
    .select('id, title, tender_number, usd_rate, eur_rate, cny_rate')
    .ilike('title', '%адмирал%');

  if (tenderError) {
    console.error('❌ Ошибка получения тендеров:', tenderError);
    return;
  }

  if (!tenders || tenders.length === 0) {
    console.error('❌ Тендер ЖК Адмирал не найден');
    return;
  }

  console.log(`✅ Найдено тендеров: ${tenders.length}`);
  tenders.forEach((tender, index) => {
    console.log(`   ${index + 1}. ID: ${tender.id}`);
    console.log(`      Название: ${tender.title}`);
    console.log(`      Номер: ${tender.tender_number || 'не указан'}`);
    console.log(`      USD курс: ${tender.usd_rate || 'не указан'}`);
  });

  const mainTender = tenders[0]; // Берем первый найденный
  console.log(`\n🎯 Выбран тендер: ${mainTender.title} (ID: ${mainTender.id})\n`);

  // 2. Поиск позиции 117
  console.log('📋 Шаг 2: Поиск позиции 117 (Разработка грунта)...');
  const { data: positions, error: posError } = await supabase
    .from('client_positions')
    .select('*')
    .eq('tender_id', mainTender.id)
    .eq('position_number', '117');

  if (posError) {
    console.error('❌ Ошибка получения позиций:', posError);
    return;
  }

  if (!positions || positions.length === 0) {
    console.log('❌ Позиция 117 не найдена. Попробуем найти позиции с "разработка" в названии...');

    const { data: altPositions, error: altError } = await supabase
      .from('client_positions')
      .select('*')
      .eq('tender_id', mainTender.id)
      .ilike('work_name', '%разработка%');

    if (altError) {
      console.error('❌ Ошибка альтернативного поиска:', altError);
      return;
    }

    if (!altPositions || altPositions.length === 0) {
      console.log('❌ Позиции с "разработка" не найдены');
      return;
    }

    console.log(`✅ Найдено позиций с "разработка": ${altPositions.length}`);
    altPositions.forEach((pos, index) => {
      console.log(`   ${index + 1}. Позиция ${pos.position_number}: ${pos.work_name}`);
      console.log(`      ID: ${pos.id}`);
      console.log(`      Тип: ${pos.item_type || 'не указан'}`);
    });

    // Используем первую найденную позицию
    positions.push(altPositions[0]);
  } else {
    console.log(`✅ Найдена позиция 117`);
  }

  const targetPosition = positions[0];
  console.log(`\n🎯 Исследуемая позиция:`);
  console.log(`   Номер: ${targetPosition.position_number}`);
  console.log(`   Название: ${targetPosition.work_name}`);
  console.log(`   ID: ${targetPosition.id}`);
  console.log(`   Тип: ${targetPosition.item_type || 'не указан'}\n`);

  // 3. Получение активных процентов накруток
  console.log('📋 Шаг 3: Получение активных процентов накруток...');
  const { data: markup, error: markupError } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', mainTender.id)
    .eq('is_active', true)
    .single();

  if (markupError) {
    console.error('❌ Ошибка получения процентов накруток:', markupError);
    return;
  }

  console.log('✅ Активные проценты накруток получены:');
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

  // 4. Анализ базовых стоимостей
  console.log('📋 Шаг 4: Анализ базовых и коммерческих стоимостей...');

  const baseMaterials = parseFloat(targetPosition.total_materials_cost || '0');
  const baseWorks = parseFloat(targetPosition.total_works_cost || '0');
  const totalBase = baseMaterials + baseWorks;

  const commercialMaterials = parseFloat(targetPosition.total_commercial_materials_cost || '0');
  const commercialWorks = parseFloat(targetPosition.total_commercial_works_cost || '0');
  const totalCommercial = commercialMaterials + commercialWorks;

  console.log('🔹 Базовые стоимости (ПЗ):');
  console.log(`   Материалы: ${baseMaterials.toLocaleString('ru-RU')} ₽`);
  console.log(`   Работы: ${baseWorks.toLocaleString('ru-RU')} ₽`);
  console.log(`   ИТОГО ПЗ: ${totalBase.toLocaleString('ru-RU')} ₽\n`);

  console.log('🔹 Коммерческие стоимости (в БД):');
  console.log(`   Материалы КП: ${commercialMaterials.toLocaleString('ru-RU')} ₽`);
  console.log(`   Работы КП: ${commercialWorks.toLocaleString('ru-RU')} ₽`);
  console.log(`   ИТОГО КП: ${totalCommercial.toLocaleString('ru-RU')} ₽\n`);

  // 5. Проверка типа позиции и применимых формул
  console.log('📋 Шаг 5: Анализ типа позиции и формул расчета...');

  const itemType = targetPosition.item_type;
  const isSubcontractWork = itemType === 'sub_work';

  console.log(`🔍 Тип позиции: ${itemType}`);
  console.log(`🔍 Является субподрядной работой: ${isSubcontractWork ? 'ДА' : 'НЕТ'}\n`);

  if (isSubcontractWork) {
    console.log('📐 РАСЧЕТ ДЛЯ СУБПОДРЯДНЫХ РАБОТ:');
    console.log('   Формула для субподрядных работ отличается от собственных сил!\n');

    // Расчет для субподрядных работ
    if (baseWorks > 0) {
      console.log('🔹 Расчет субподрядных работ:');

      // Шаг 1: Рост субработ
      const step1 = baseWorks * (1 + markup.subcontract_works_cost_growth / 100);
      console.log(`   Шаг 1. Рост субработ:`);
      console.log(`          ${baseWorks.toLocaleString('ru-RU')} × (1 + ${markup.subcontract_works_cost_growth}%) = ${step1.toLocaleString('ru-RU')} ₽`);

      // Шаг 2: Непредвиденные затраты
      const step2 = baseWorks * (1 + markup.contingency_costs / 100);
      console.log(`   Шаг 2. Непредвиденные затраты:`);
      console.log(`          ${baseWorks.toLocaleString('ru-RU')} × (1 + ${markup.contingency_costs}%) = ${step2.toLocaleString('ru-RU')} ₽`);

      // Шаг 3: ООЗ субподряд
      const step3 = (step1 + step2 - baseWorks) * (1 + markup.overhead_subcontract / 100);
      console.log(`   Шаг 3. ООЗ субподряд:`);
      console.log(`          (${step1.toLocaleString('ru-RU')} + ${step2.toLocaleString('ru-RU')} - ${baseWorks.toLocaleString('ru-RU')}) × (1 + ${markup.overhead_subcontract}%)`);
      console.log(`          = ${(step1 + step2 - baseWorks).toLocaleString('ru-RU')} × ${(1 + markup.overhead_subcontract / 100).toFixed(3)} = ${step3.toLocaleString('ru-RU')} ₽`);

      // Шаг 4: Прибыль субподряд
      const step4 = step3 * (1 + markup.profit_subcontract / 100);
      console.log(`   Шаг 4. Прибыль субподряд:`);
      console.log(`          ${step3.toLocaleString('ru-RU')} × (1 + ${markup.profit_subcontract}%) = ${step4.toLocaleString('ru-RU')} ₽`);

      console.log(`\n   📍 ИТОГОВАЯ КОММЕРЧЕСКАЯ СТОИМОСТЬ СУБРАБОТ: ${step4.toLocaleString('ru-RU')} ₽`);

      const subMarkup = ((step4 - baseWorks) / baseWorks * 100).toFixed(1);
      console.log(`   📈 Общая наценка на субработы: ${subMarkup}%\n`);

      // Сравнение с БД
      console.log('🎯 СРАВНЕНИЕ С ДАННЫМИ В БД:');
      console.log(`   Рассчитанная стоимость: ${step4.toLocaleString('ru-RU')} ₽`);
      console.log(`   В БД работы КП: ${commercialWorks.toLocaleString('ru-RU')} ₽`);

      const difference = Math.abs(step4 - commercialWorks);
      const percentDiff = commercialWorks > 0 ? (difference / commercialWorks * 100).toFixed(2) : '∞';

      if (difference > 1) {
        console.log(`   ⚠️ РАСХОЖДЕНИЕ: ${difference.toLocaleString('ru-RU')} ₽ (${percentDiff}%)`);
        console.log(`   🚨 ВОЗМОЖНАЯ ПРОБЛЕМА: БД содержит неверную коммерческую стоимость!`);
      } else {
        console.log(`   ✅ Значения совпадают (расхождение < 1 ₽)`);
      }
    }

    if (baseMaterials > 0) {
      console.log('\n🔹 Расчет субподрядных материалов:');

      // Шаг 1: Рост субматериалов
      const step1 = baseMaterials * (1 + markup.subcontract_materials_cost_growth / 100);
      console.log(`   Шаг 1. Рост субматериалов:`);
      console.log(`          ${baseMaterials.toLocaleString('ru-RU')} × (1 + ${markup.subcontract_materials_cost_growth}%) = ${step1.toLocaleString('ru-RU')} ₽`);

      // Шаг 2: Непредвиденные затраты
      const step2 = baseMaterials * (1 + markup.contingency_costs / 100);
      console.log(`   Шаг 2. Непредвиденные затраты:`);
      console.log(`          ${baseMaterials.toLocaleString('ru-RU')} × (1 + ${markup.contingency_costs}%) = ${step2.toLocaleString('ru-RU')} ₽`);

      // Шаг 3: ООЗ субподряд
      const step3 = (step1 + step2 - baseMaterials) * (1 + markup.overhead_subcontract / 100);
      console.log(`   Шаг 3. ООЗ субподряд:`);
      console.log(`          (${step1.toLocaleString('ru-RU')} + ${step2.toLocaleString('ru-RU')} - ${baseMaterials.toLocaleString('ru-RU')}) × (1 + ${markup.overhead_subcontract}%)`);
      console.log(`          = ${(step1 + step2 - baseMaterials).toLocaleString('ru-RU')} × ${(1 + markup.overhead_subcontract / 100).toFixed(3)} = ${step3.toLocaleString('ru-RU')} ₽`);

      // Шаг 4: Прибыль субподряд
      const step4 = step3 * (1 + markup.profit_subcontract / 100);
      console.log(`   Шаг 4. Прибыль субподряд:`);
      console.log(`          ${step3.toLocaleString('ru-RU')} × (1 + ${markup.profit_subcontract}%) = ${step4.toLocaleString('ru-RU')} ₽`);

      console.log(`\n   📍 ИТОГОВАЯ КОММЕРЧЕСКАЯ СТОИМОСТЬ СУБМАТЕРИАЛОВ: ${step4.toLocaleString('ru-RU')} ₽`);

      // Сравнение с БД
      console.log('\n🎯 СРАВНЕНИЕ С ДАННЫМИ В БД:');
      console.log(`   Рассчитанная стоимость: ${step4.toLocaleString('ru-RU')} ₽`);
      console.log(`   В БД материалы КП: ${commercialMaterials.toLocaleString('ru-RU')} ₽`);

      const difference = Math.abs(step4 - commercialMaterials);
      const percentDiff = commercialMaterials > 0 ? (difference / commercialMaterials * 100).toFixed(2) : '∞';

      if (difference > 1) {
        console.log(`   ⚠️ РАСХОЖДЕНИЕ: ${difference.toLocaleString('ru-RU')} ₽ (${percentDiff}%)`);
        console.log(`   🚨 ВОЗМОЖНАЯ ПРОБЛЕМА: БД содержит неверную коммерческую стоимость!`);
      } else {
        console.log(`   ✅ Значения совпадают (расхождение < 1 ₽)`);
      }
    }

  } else {
    console.log('📐 РАСЧЕТ ДЛЯ СОБСТВЕННЫХ СИЛ:');
    console.log('   Позиция НЕ является субподрядной работой, применяется стандартная формула\n');

    // Здесь можно добавить расчет для собственных сил, как в оригинальном скрипте
    // Но так как мы исследуем именно проблему с субподрядными работами,
    // сосредоточимся на анализе
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 ИТОГОВЫЙ АНАЛИЗ:');
  console.log(`   Тендер: ${mainTender.title}`);
  console.log(`   Позиция: ${targetPosition.position_number} - ${targetPosition.work_name}`);
  console.log(`   Тип позиции: ${itemType}`);
  console.log(`   Базовая стоимость: ${totalBase.toLocaleString('ru-RU')} ₽`);
  console.log(`   Коммерческая стоимость в БД: ${totalCommercial.toLocaleString('ru-RU')} ₽`);

  if (totalBase > 0) {
    const totalMarkup = ((totalCommercial - totalBase) / totalBase * 100).toFixed(1);
    console.log(`   Общая наценка: ${totalMarkup}%`);
  }

  console.log('\n✅ Исследование завершено');
}

investigateAdmiralTender()
  .then(() => {
    console.log('\n🎉 Анализ успешно завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка при анализе:', error);
    process.exit(1);
  });