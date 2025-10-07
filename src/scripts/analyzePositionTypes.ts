/**
 * Script to analyze all position types in Admiral tender and understand calculation logic
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

async function analyzePositionTypes() {
  console.log('\n🔍 АНАЛИЗ ТИПОВ ПОЗИЦИЙ В ТЕНДЕРЕ ЖК АДМИРАЛ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const tenderId = '736dc11c-33dc-4fce-a7ee-c477abb8b694';

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

  console.log(`📋 Всего позиций в тендере: ${positions.length}\n`);

  // Группируем по типам
  const typeGroups = positions.reduce((acc, pos) => {
    const type = pos.item_type || 'undefined';
    if (!acc[type]) acc[type] = [];
    acc[type].push(pos);
    return acc;
  }, {} as Record<string, any[]>);

  console.log('📊 РАСПРЕДЕЛЕНИЕ ПО ТИПАМ:');
  Object.entries(typeGroups).forEach(([type, positions]) => {
    console.log(`   ${type}: ${positions.length} позиций`);
  });

  console.log('\n📝 АНАЛИЗ КОНКРЕТНЫХ ПОЗИЦИЙ:');

  // Анализируем разные типы позиций
  Object.entries(typeGroups).forEach(([type, positionsOfType]) => {
    console.log(`\n🔹 ТИП: ${type}`);
    console.log('─'.repeat(50));

    // Показываем первые 5 позиций каждого типа
    const samplesToShow = positionsOfType.slice(0, 5);

    samplesToShow.forEach((pos) => {
      const baseMaterials = parseFloat(pos.total_materials_cost || '0');
      const baseWorks = parseFloat(pos.total_works_cost || '0');
      const commercialMaterials = parseFloat(pos.total_commercial_materials_cost || '0');
      const commercialWorks = parseFloat(pos.total_commercial_works_cost || '0');

      const totalBase = baseMaterials + baseWorks;
      const totalCommercial = commercialMaterials + commercialWorks;

      let markup = 0;
      if (totalBase > 0) {
        markup = ((totalCommercial - totalBase) / totalBase * 100);
      }

      console.log(`   Поз. ${pos.position_number}: ${pos.work_name.substring(0, 50)}...`);
      console.log(`      Базовая: ${totalBase.toLocaleString('ru-RU')} ₽`);
      console.log(`      Коммерческая: ${totalCommercial.toLocaleString('ru-RU')} ₽`);
      console.log(`      Наценка: ${markup.toFixed(1)}%`);
      console.log('');
    });

    if (positionsOfType.length > 5) {
      console.log(`   ... и еще ${positionsOfType.length - 5} позиций этого типа\n`);
    }
  });

  // Находим позицию 117 и проверяем её BOQ
  console.log('\n🎯 ДЕТАЛЬНЫЙ АНАЛИЗ ПОЗИЦИИ 117:');
  console.log('─'.repeat(50));

  const pos117 = positions.find(p => p.position_number === '117');
  if (pos117) {
    console.log(`ID позиции: ${pos117.id}`);
    console.log(`Название: ${pos117.work_name}`);
    console.log(`Тип: ${pos117.item_type || 'NULL'}`);

    // Проверяем BOQ items для этой позиции
    const { data: boqItems, error: boqError } = await supabase
      .from('boq_items')
      .select('*')
      .eq('client_position_id', pos117.id);

    if (boqError) {
      console.error('❌ Ошибка получения BOQ items:', boqError);
    } else {
      console.log(`\n📦 BOQ items в позиции 117: ${boqItems.length}`);

      if (boqItems.length > 0) {
        boqItems.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.description || 'Без описания'}`);
          console.log(`      Тип: ${item.item_type || 'NULL'}`);
          console.log(`      Стоимость: ${parseFloat(item.total_amount || '0').toLocaleString('ru-RU')} ₽`);
        });
      }
    }
  }

  // Проверяем функцию расчета коммерческих стоимостей
  console.log('\n🔧 ПРОВЕРКА ФУНКЦИЙ РАСЧЕТА В БД:');
  console.log('─'.repeat(50));

  // Проверяем, есть ли функция для расчета коммерческих стоимостей
  const { data: functions, error: funcError } = await supabase.rpc('get_functions_list');

  if (funcError) {
    console.log('Не удалось получить список функций, проверим альтернативным способом');

    // Попробуем найти функции в схеме
    const { data: schemas, error: schemaError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .ilike('routine_name', '%commercial%');

    if (!schemaError && schemas) {
      console.log('Найденные функции с "commercial" в названии:');
      schemas.forEach(func => {
        console.log(`   ${func.routine_name} (${func.routine_type})`);
      });
    }
  }

  console.log('\n✅ Анализ типов позиций завершен');
}

analyzePositionTypes()
  .then(() => {
    console.log('\n🎉 Анализ успешно завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка при анализе:', error);
    process.exit(1);
  });