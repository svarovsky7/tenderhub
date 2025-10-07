import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  calculateWorkCommercialCost,
  calculateMainMaterialCommercialCost,
  calculateAuxiliaryMaterialCommercialCost,
  calculateSubcontractWorkCommercialCost,
  calculateSubcontractMaterialCommercialCost,
  calculateAuxiliarySubcontractMaterialCommercialCost
} from '../utils/calculateCommercialCost';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface BOQItem {
  id: string;
  tender_id: string;
  client_position_id: string;
  item_type: 'work' | 'material' | 'sub_work' | 'sub_material';
  description: string;
  quantity: number;
  unit_rate: number;
  total_amount: number;
  commercial_cost: number | null;
  commercial_markup_coefficient: number | null;
  delivery_price_type: string;
  delivery_amount: number;
  material_type: 'main' | 'auxiliary' | null;
  consumption_coefficient: number | null;
  conversion_coefficient: number | null;
}

interface TenderMarkup {
  works_16_markup: number;
  works_cost_growth: number;
  materials_cost_growth: number;
  subcontract_works_cost_growth: number;
  contingency_costs: number;
  overhead_own_forces: number;
  overhead_subcontract: number;
  general_costs_without_subcontract: number;
  profit_own_forces: number;
  profit_subcontract: number;
  mechanization_service: number;
  mbp_gsm: number;
  warranty_period: number;
}

async function recalculateAllCommercialCosts() {
  console.log('🚀 Пересчет коммерческих стоимостей для ВСЕХ тендеров и ВСЕХ BOQ элементов');
  console.log('═══════════════════════════════════════════════════════════════════════');

  try {
    // 1. Получаем все тендеры
    const { data: tenders, error: tendersError } = await supabase
      .from('tenders')
      .select('id, title, tender_number')
      .order('title');

    if (tendersError) {
      console.error('❌ Error fetching tenders:', tendersError);
      return;
    }

    console.log(`\n📋 Найдено ${tenders?.length || 0} тендеров\n`);

    let totalTendersProcessed = 0;
    let totalItemsUpdated = 0;
    let totalItemsWithErrors = 0;

    // 2. Обрабатываем каждый тендер
    for (const tender of tenders || []) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📁 Тендер: ${tender.title} (№${tender.tender_number})`);
      console.log(`   ID: ${tender.id}`);
      console.log(`${'='.repeat(80)}`);

      // 2.1. Получаем активные проценты накруток для тендера
      const { data: markups, error: markupsError } = await supabase
        .from('tender_markup_percentages')
        .select('*')
        .eq('tender_id', tender.id)
        .eq('is_active', true)
        .maybeSingle();

      if (markupsError) {
        console.error(`❌ Error fetching markups for tender ${tender.title}:`, markupsError);
        continue;
      }

      if (!markups) {
        console.log(`⚠️  Нет активных процентов накруток для тендера ${tender.title}, пропускаем...`);
        continue;
      }

      console.log(`\n💰 Активные проценты накруток:`);
      console.log(`   Работы 1.6: ${markups.works_16_markup}%`);
      console.log(`   Рост работ: ${markups.works_cost_growth}%`);
      console.log(`   Рост материалов: ${markups.materials_cost_growth}%`);
      console.log(`   Рост субработ: ${markups.subcontract_works_cost_growth}%`);
      console.log(`   Непредвиденные: ${markups.contingency_costs}%`);
      console.log(`   ООЗ собств: ${markups.overhead_own_forces}%`);
      console.log(`   ООЗ субподряд: ${markups.overhead_subcontract}%`);
      console.log(`   ОФЗ: ${markups.general_costs_without_subcontract}%`);
      console.log(`   Прибыль собств: ${markups.profit_own_forces}%`);
      console.log(`   Прибыль субподряд: ${markups.profit_subcontract}%`);

      // 2.2. Получаем все BOQ элементы для тендера
      const { data: boqItems, error: boqError } = await supabase
        .from('boq_items')
        .select('*')
        .eq('tender_id', tender.id)
        .order('sort_order');

      if (boqError) {
        console.error(`❌ Error fetching BOQ items for tender ${tender.title}:`, boqError);
        continue;
      }

      console.log(`\n📦 Найдено ${boqItems?.length || 0} BOQ элементов`);

      if (!boqItems || boqItems.length === 0) {
        console.log(`⚠️  Нет BOQ элементов для обработки`);
        continue;
      }

      // 2.3. Обрабатываем каждый BOQ элемент
      let itemsUpdated = 0;
      let itemsSkipped = 0;
      let itemsWithErrors = 0;

      const batchSize = 100;
      const batches = Math.ceil(boqItems.length / batchSize);

      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const start = batchIndex * batchSize;
        const end = Math.min(start + batchSize, boqItems.length);
        const batch = boqItems.slice(start, end);

        console.log(`\n🔄 Обработка батча ${batchIndex + 1}/${batches} (элементы ${start + 1}-${end})...`);

        for (const item of batch) {
          try {
            // Рассчитываем базовую стоимость
            let baseCost = item.total_amount || 0;

            // Для материалов добавляем доставку
            if ((item.item_type === 'material' || item.item_type === 'sub_material')) {
              const deliveryType = item.delivery_price_type || 'included';
              const deliveryAmount = item.delivery_amount || 0;
              const quantity = item.quantity || 0;

              if ((deliveryType === 'amount' || deliveryType === 'not_included') && deliveryAmount > 0) {
                baseCost = baseCost + (deliveryAmount * quantity);
              }
            }

            if (baseCost <= 0) {
              itemsSkipped++;
              continue;
            }

            // Рассчитываем коммерческую стоимость в зависимости от типа
            let commercialCost = baseCost;

            switch (item.item_type) {
              case 'work':
                commercialCost = calculateWorkCommercialCost(baseCost, markups as TenderMarkup);
                break;

              case 'material':
                const isAuxiliary = item.material_type === 'auxiliary';
                if (isAuxiliary) {
                  const result = calculateAuxiliaryMaterialCommercialCost(baseCost, markups as TenderMarkup);
                  commercialCost = result.materialCost + result.workMarkup;
                } else {
                  const result = calculateMainMaterialCommercialCost(baseCost, markups as TenderMarkup);
                  commercialCost = result.materialCost + result.workMarkup;
                }
                break;

              case 'sub_work':
                commercialCost = calculateSubcontractWorkCommercialCost(baseCost, markups as TenderMarkup);
                break;

              case 'sub_material':
                const isSubAuxiliary = item.material_type === 'auxiliary';
                if (isSubAuxiliary) {
                  const result = calculateAuxiliarySubcontractMaterialCommercialCost(baseCost, markups as TenderMarkup);
                  commercialCost = result.materialCost + result.workMarkup;
                } else {
                  const result = calculateSubcontractMaterialCommercialCost(baseCost, markups as TenderMarkup);
                  commercialCost = result.materialCost + result.workMarkup;
                }
                break;
            }

            const markupCoefficient = commercialCost / baseCost;

            // Обновляем в базе данных
            const { error: updateError } = await supabase
              .from('boq_items')
              .update({
                commercial_cost: commercialCost,
                commercial_markup_coefficient: markupCoefficient
              })
              .eq('id', item.id);

            if (updateError) {
              console.error(`   ❌ Error updating item ${item.id}:`, updateError.message);
              itemsWithErrors++;
            } else {
              itemsUpdated++;
            }

          } catch (error: any) {
            console.error(`   ❌ Exception processing item ${item.id}:`, error.message);
            itemsWithErrors++;
          }
        }

        // Показываем прогресс после каждого батча
        console.log(`   ✅ Батч ${batchIndex + 1}/${batches} завершен`);
      }

      console.log(`\n📊 Статистика по тендеру ${tender.title}:`);
      console.log(`   ✅ Обновлено: ${itemsUpdated}`);
      console.log(`   ⏭️  Пропущено (нулевая стоимость): ${itemsSkipped}`);
      console.log(`   ❌ Ошибок: ${itemsWithErrors}`);

      totalTendersProcessed++;
      totalItemsUpdated += itemsUpdated;
      totalItemsWithErrors += itemsWithErrors;

      // Пауза между тендерами
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Итоговая статистика
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ ПЕРЕСЧЕТ ЗАВЕРШЕН`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`);
    console.log(`   Обработано тендеров: ${totalTendersProcessed}`);
    console.log(`   Обновлено BOQ элементов: ${totalItemsUpdated}`);
    console.log(`   Ошибок при обновлении: ${totalItemsWithErrors}`);

    if (totalItemsWithErrors > 0) {
      console.log(`\n⚠️  Внимание: ${totalItemsWithErrors} элементов не были обновлены из-за ошибок`);
    }

  } catch (error) {
    console.error('💥 Critical exception:', error);
    process.exit(1);
  }
}

// Запуск скрипта
console.log('⏳ Начинаем пересчет...\n');

recalculateAllCommercialCosts()
  .then(() => {
    console.log('\n✅ Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
