/**
 * Script to fix position types in ЖК Адмирал tender
 * Sets proper item_type values based on position numbers and names
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

async function fixPositionTypes() {
  const tenderId = '736dc11c-33dc-4fce-a7ee-c477abb8b694'; // ЖК Адмирал

  console.log('🔍 Анализ и исправление типов позиций для тендера ЖК Адмирал\n');

  // Получаем все позиции тендера
  const { data: positions, error } = await supabase
    .from('client_positions')
    .select('*')
    .eq('tender_id', tenderId)
    .order('position_number');

  if (error) {
    console.error('❌ Ошибка получения позиций:', error);
    return;
  }

  console.log(`📋 Найдено ${positions?.length || 0} позиций\n`);

  // Правила классификации
  const subWorkKeywords = [
    'суб-раб',
    'субподряд',
    'subcontract',
    'монтаж',
    'установка',
    'разработка грунта',
    'демонтаж',
    'устройство',
    'прокладка',
    'бурение'
  ];

  const subMaterialKeywords = [
    'суб-мат',
    'субподрядные материалы',
    'материалы субподряда',
    'поставка материалов'
  ];

  const workKeywords = [
    'работы',
    'услуги',
    'выполнение',
    'изготовление',
    'подготовка'
  ];

  let updateCount = 0;
  const updates: Array<{ id: string; type: string; position: number; name: string }> = [];

  for (const position of positions || []) {
    const name = (position.work_name || '').toLowerCase();
    const currentType = position.item_type;
    let newType: string | null = null;

    // Определяем тип на основе ключевых слов
    if (subWorkKeywords.some(keyword => name.includes(keyword))) {
      newType = 'sub_work';
    } else if (subMaterialKeywords.some(keyword => name.includes(keyword))) {
      newType = 'sub_material';
    } else if (workKeywords.some(keyword => name.includes(keyword))) {
      newType = 'work';
    } else {
      // По умолчанию считаем материалом, если не подходит под другие категории
      newType = 'material';
    }

    // Особые случаи на основе номера позиции
    // Например, позиции 100-200 - субподрядные работы
    if (position.position_number >= 100 && position.position_number <= 200) {
      if (newType === 'work' || newType === 'material') {
        newType = 'sub_work'; // Конвертируем в субподрядные
      }
    }

    // Если тип изменился или был NULL
    if (currentType !== newType) {
      updates.push({
        id: position.id,
        type: newType,
        position: position.position_number,
        name: position.work_name
      });
    }
  }

  console.log(`🔄 Необходимо обновить ${updates.length} позиций:\n`);

  // Группируем по типам для отчета
  const typeGroups = updates.reduce((acc, update) => {
    if (!acc[update.type]) acc[update.type] = [];
    acc[update.type].push(update);
    return acc;
  }, {} as Record<string, typeof updates>);

  // Показываем что будет обновлено
  for (const [type, items] of Object.entries(typeGroups)) {
    console.log(`📌 ${type} (${items.length} позиций):`);
    // Показываем первые 5 примеров
    items.slice(0, 5).forEach(item => {
      console.log(`   №${item.position}: ${item.name.substring(0, 50)}...`);
    });
    if (items.length > 5) {
      console.log(`   ... и еще ${items.length - 5} позиций`);
    }
    console.log('');
  }

  // Выполняем обновления
  console.log('⚡ Выполнение обновлений в БД...\n');

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('client_positions')
      .update({ item_type: update.type })
      .eq('id', update.id);

    if (updateError) {
      console.error(`❌ Ошибка обновления позиции ${update.position}:`, updateError);
    } else {
      updateCount++;
      if (updateCount % 50 === 0) {
        console.log(`   Обновлено ${updateCount}/${updates.length} позиций...`);
      }
    }
  }

  console.log(`\n✅ Успешно обновлено ${updateCount} позиций`);

  // Проверяем результат
  console.log('\n📊 Финальная статистика типов:');

  const { data: finalStats, error: statsError } = await supabase
    .from('client_positions')
    .select('item_type')
    .eq('tender_id', tenderId);

  if (!statsError && finalStats) {
    const typeCounts = finalStats.reduce((acc, item) => {
      const type = item.item_type || 'NULL';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [type, count] of Object.entries(typeCounts)) {
      console.log(`   ${type}: ${count} позиций`);
    }
  }

  // Особое внимание позиции 117
  const { data: position117, error: pos117Error } = await supabase
    .from('client_positions')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('position_number', 117)
    .single();

  if (!pos117Error && position117) {
    console.log('\n🎯 Позиция 117 (Разработка грунта):');
    console.log(`   Тип: ${position117.item_type}`);
    console.log(`   База: ${parseFloat(position117.total_works_cost || '0').toLocaleString('ru-RU')} ₽`);
    console.log(`   Коммерческая: ${parseFloat(position117.total_commercial_works_cost || '0').toLocaleString('ru-RU')} ₽`);
  }
}

// Запуск скрипта
fixPositionTypes()
  .then(() => {
    console.log('\n✅ Скрипт завершен успешно');
    console.log('\n📌 Следующие шаги:');
    console.log('   1. Запустите пересчет коммерческих стоимостей');
    console.log('   2. Проверьте результат на странице коммерческих стоимостей');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });