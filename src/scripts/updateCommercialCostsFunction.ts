import { supabase } from '../lib/supabase/client';

async function updateCommercialCostsFunction() {
  

// Контроль логирования
const ENABLE_DETAILED_LOGGING = false;
const debugLog = (message: string, ...args: any[]) => {
  if (ENABLE_DETAILED_LOGGING) {
    console.log(message, ...args);
  }
};

  const sql = `
-- ============================================
-- ОБНОВЛЕНИЕ ФУНКЦИИ РАСЧЕТА КОММЕРЧЕСКИХ СТОИМОСТЕЙ
-- С УЧЕТОМ ПЕРЕНОСА НАЦЕНОК В РАБОТЫ
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_commercial_costs_by_category(p_tender_id UUID)
RETURNS VOID AS $$
DECLARE
    v_markup_record RECORD;
BEGIN
    -- Получаем проценты наценок для тендера
    SELECT * INTO v_markup_record
    FROM tender_markup_percentages
    WHERE tender_id = p_tender_id
    LIMIT 1;
    
    -- Если нет записи о наценках, используем дефолтные значения
    IF v_markup_record IS NULL THEN
        -- Создаем запись с дефолтными значениями
        INSERT INTO tender_markup_percentages (tender_id)
        VALUES (p_tender_id)
        RETURNING * INTO v_markup_record;
    END IF;

    -- Удаляем старые записи для этого тендера
    DELETE FROM commercial_costs_by_category WHERE tender_id = p_tender_id;
    
    -- Вставляем новые агрегированные данные с правильной логикой
    INSERT INTO commercial_costs_by_category (
        tender_id,
        detail_cost_category_id,
        direct_materials,
        direct_works,
        direct_submaterials,
        direct_subworks,
        commercial_materials,
        commercial_works,
        commercial_submaterials,
        commercial_subworks
    )
    WITH boq_data AS (
        -- Собираем все BOQ items с их типами и информацией о связанности материалов
        SELECT 
            bi.detail_cost_category_id,
            bi.item_type,
            bi.total_amount as direct_cost,
            bi.commercial_cost,
            bi.work_id,
            bi.material_id,
            -- Определяем, является ли материал основным (linked) или вспомогательным (unlinked)
            CASE 
                WHEN bi.item_type = 'material' AND bi.work_id IS NOT NULL THEN true  -- Основной материал (linked)
                WHEN bi.item_type = 'material' AND bi.work_id IS NULL THEN false     -- Вспомогательный материал (unlinked)
                ELSE NULL
            END as is_linked_material
        FROM boq_items bi
        WHERE bi.tender_id = p_tender_id
            AND bi.detail_cost_category_id IS NOT NULL
    ),
    material_transfers AS (
        -- Рассчитываем переносы из материалов в работы
        SELECT 
            detail_cost_category_id,
            -- Прямые затраты остаются как есть
            SUM(CASE WHEN item_type = 'material' THEN direct_cost ELSE 0 END) as direct_materials,
            SUM(CASE WHEN item_type = 'work' THEN direct_cost ELSE 0 END) as direct_works,
            SUM(CASE WHEN item_type = 'sub_material' THEN direct_cost ELSE 0 END) as direct_submaterials,
            SUM(CASE WHEN item_type = 'sub_work' THEN direct_cost ELSE 0 END) as direct_subworks,
            
            -- Коммерческие материалы (с учетом логики переноса)
            SUM(CASE 
                -- Основные материалы (linked): остается только базовая стоимость
                WHEN item_type = 'material' AND is_linked_material = true THEN direct_cost
                -- Вспомогательные материалы (unlinked): в материалах ничего не остается
                WHEN item_type = 'material' AND is_linked_material = false THEN 0
                ELSE 0
            END) as commercial_materials_calculated,
            
            -- Коммерческие работы (включая переносы из материалов)
            SUM(CASE 
                WHEN item_type = 'work' THEN COALESCE(commercial_cost, 0)
                ELSE 0
            END) +
            -- Добавляем наценку от основных материалов
            SUM(CASE 
                WHEN item_type = 'material' AND is_linked_material = true 
                THEN COALESCE(commercial_cost, 0) - direct_cost  -- Наценка = коммерческая - базовая
                ELSE 0
            END) +
            -- Добавляем всю стоимость вспомогательных материалов
            SUM(CASE 
                WHEN item_type = 'material' AND is_linked_material = false 
                THEN COALESCE(commercial_cost, 0)  -- Вся коммерческая стоимость
                ELSE 0
            END) as commercial_works_calculated,
            
            -- Коммерческие субматериалы: остается базовая стоимость
            SUM(CASE 
                WHEN item_type = 'sub_material' THEN direct_cost
                ELSE 0
            END) as commercial_submaterials_calculated,
            
            -- Коммерческие субработы (включая наценку от субматериалов)
            SUM(CASE 
                WHEN item_type = 'sub_work' THEN COALESCE(commercial_cost, 0)
                ELSE 0
            END) +
            -- Добавляем наценку от субматериалов
            SUM(CASE 
                WHEN item_type = 'sub_material' 
                THEN COALESCE(commercial_cost, 0) - direct_cost  -- Наценка от субматериалов
                ELSE 0
            END) as commercial_subworks_calculated
            
        FROM boq_data
        GROUP BY detail_cost_category_id
    )
    SELECT 
        p_tender_id,
        detail_cost_category_id,
        direct_materials,
        direct_works,
        direct_submaterials,
        direct_subworks,
        commercial_materials_calculated,
        commercial_works_calculated,
        commercial_submaterials_calculated,
        commercial_subworks_calculated
    FROM material_transfers;
    
END;
$$ LANGUAGE plpgsql;
  `;

  try {
    // Выполняем SQL через Supabase
    const { error } = await supabase.rpc('query', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error updating function:', error);
      // Если функция query не существует, попробуем альтернативный способ
      
      // Альтернатива: создаем временную функцию для выполнения SQL
      // Но в Supabase это может быть ограничено политиками безопасности
      throw new Error('Cannot execute raw SQL. Please update the function manually in Supabase dashboard.');
    }
    
    
    // Пересчитываем для тестового тендера
    debugLog('🔄 Recalculating commercial costs for test tender...');
    const { error: recalcError } = await supabase.rpc('recalculate_commercial_costs_by_category', {
      p_tender_id: '81aa40f6-01e0-454b-ba3a-0f696622c21c'
    });
    
    if (recalcError) {
      console.error('❌ Error recalculating:', recalcError);
    } else {
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    debugLog('⚠️ Please update the function manually in Supabase SQL Editor:');
    debugLog('1. Go to Supabase Dashboard → SQL Editor');
    debugLog('2. Paste the SQL from update_commercial_costs_logic.sql');
    debugLog('3. Execute the query');
  }
}

// Экспортируем для использования
export default updateCommercialCostsFunction;

// Если запускается напрямую
if (import.meta.url === `file://${__filename}`) {
  updateCommercialCostsFunction();
}