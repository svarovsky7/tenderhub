/**
 * Direct check of position values in database
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

async function directCheck() {
  const positionId = 'eff22792-c2c1-4dc0-ab3f-83c182952708';

  console.log('🔍 Прямая проверка позиции в БД');
  console.log(`   ID: ${positionId}\n`);

  // Получаем данные напрямую
  const { data, error } = await supabase
    .from('client_positions')
    .select('position_number, work_name, total_materials_cost, total_works_cost, total_commercial_materials_cost, total_commercial_works_cost')
    .eq('id', positionId)
    .single();

  if (error) {
    console.error('❌ Ошибка запроса:', error);
    return;
  }

  console.log('📊 Текущие значения в БД:');
  console.log(`   Позиция №${data.position_number}: ${data.work_name}\n`);

  console.log('   Базовые стоимости:');
  console.log(`      Материалы: ${parseFloat(data.total_materials_cost).toLocaleString('ru-RU')} ₽`);
  console.log(`      Работы: ${parseFloat(data.total_works_cost).toLocaleString('ru-RU')} ₽\n`);

  console.log('   Коммерческие стоимости:');
  const commercialMaterials = parseFloat(data.total_commercial_materials_cost);
  const commercialWorks = parseFloat(data.total_commercial_works_cost);

  console.log(`      Материалы КП: ${commercialMaterials.toLocaleString('ru-RU')} ₽`);
  console.log(`      Работы КП: ${commercialWorks.toLocaleString('ru-RU')} ₽`);

  // Проверяем, триллионные ли это значения
  if (commercialMaterials > 1000000000) {
    console.log(`      ⚠️ МАТЕРИАЛЫ - ТРИЛЛИОННОЕ ЗНАЧЕНИЕ! (${commercialMaterials.toExponential(2)})`);
  }

  if (commercialWorks > 1000000000) {
    console.log(`      ⚠️ РАБОТЫ - ТРИЛЛИОННОЕ ЗНАЧЕНИЕ! (${commercialWorks.toExponential(2)})`);
  }

  console.log(`\n   ИТОГО коммерческая: ${(commercialMaterials + commercialWorks).toLocaleString('ru-RU')} ₽`);

  // Теперь попробуем принудительно обновить на правильные значения
  console.log('\n🔄 Принудительное обновление на правильные значения...');

  const correctMaterials = 49222800;
  const correctWorks = 7797240;

  const { error: updateError } = await supabase
    .from('client_positions')
    .update({
      total_commercial_materials_cost: correctMaterials,
      total_commercial_works_cost: correctWorks
    })
    .eq('id', positionId);

  if (updateError) {
    console.error('❌ Ошибка обновления:', updateError);
  } else {
    console.log('✅ Обновлено успешно!');
    console.log(`   Новые значения:`);
    console.log(`      Материалы КП: ${correctMaterials.toLocaleString('ru-RU')} ₽`);
    console.log(`      Работы КП: ${correctWorks.toLocaleString('ru-RU')} ₽`);
  }

  // Проверяем результат
  console.log('\n🔍 Проверка после обновления...');

  const { data: checkData, error: checkError } = await supabase
    .from('client_positions')
    .select('total_commercial_materials_cost, total_commercial_works_cost')
    .eq('id', positionId)
    .single();

  if (checkError) {
    console.error('❌ Ошибка проверки:', checkError);
  } else {
    const newMaterials = parseFloat(checkData.total_commercial_materials_cost);
    const newWorks = parseFloat(checkData.total_commercial_works_cost);

    console.log('📊 Финальные значения в БД:');
    console.log(`   Материалы КП: ${newMaterials.toLocaleString('ru-RU')} ₽`);
    console.log(`   Работы КП: ${newWorks.toLocaleString('ru-RU')} ₽`);

    if (newMaterials === correctMaterials && newWorks === correctWorks) {
      console.log('\n✅ УСПЕХ! Значения корректные!');
    } else {
      console.log('\n⚠️ ВНИМАНИЕ! Значения не соответствуют ожидаемым!');
    }
  }
}

directCheck()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });