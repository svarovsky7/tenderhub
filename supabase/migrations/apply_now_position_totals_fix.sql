-- ========================================
-- ВАЖНО: Выполните этот SQL в Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/lkmgbizyyaaacetllbzr/sql
-- ========================================

-- Шаг 1: Создаем триггер для автоматического пересчета сумм
DROP TRIGGER IF EXISTS recalculate_position_totals_trigger ON public.boq_items;

CREATE TRIGGER recalculate_position_totals_trigger
AFTER INSERT OR DELETE OR UPDATE OF total_amount, quantity, unit_rate, item_type, client_position_id
ON public.boq_items
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_client_position_totals();

-- Шаг 2: Пересчитываем все существующие суммы (исправляем текущие неверные значения)
-- Это разовая операция для исправления данных
DO $$
DECLARE
    pos_record RECORD;
    materials_total DECIMAL(15,2);
    works_total DECIMAL(15,2);
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting recalculation of all position totals...';

    -- Обрабатываем каждую позицию
    FOR pos_record IN
        SELECT DISTINCT cp.id, cp.work_name
        FROM public.client_positions cp
        WHERE EXISTS (
            SELECT 1 FROM public.boq_items bi
            WHERE bi.client_position_id = cp.id
        )
        ORDER BY cp.id
    LOOP
        -- Считаем сумму материалов
        SELECT COALESCE(SUM(total_amount), 0) INTO materials_total
        FROM public.boq_items
        WHERE client_position_id = pos_record.id
        AND item_type IN ('material', 'sub_material');

        -- Считаем сумму работ
        SELECT COALESCE(SUM(total_amount), 0) INTO works_total
        FROM public.boq_items
        WHERE client_position_id = pos_record.id
        AND item_type IN ('work', 'sub_work');

        -- Обновляем позицию
        UPDATE public.client_positions
        SET
            total_materials_cost = materials_total,
            total_works_cost = works_total,
            updated_at = NOW()
        WHERE id = pos_record.id;

        updated_count := updated_count + 1;

        -- Выводим информацию для отслеживания прогресса
        RAISE NOTICE 'Updated position %: materials=%, works=%, name=%',
            pos_record.id, materials_total, works_total, pos_record.work_name;
    END LOOP;

    RAISE NOTICE 'Completed! Updated % positions', updated_count;
END $$;

-- Шаг 3: Проверяем результат для конкретной проблемной позиции
SELECT
    cp.id,
    cp.work_name,
    cp.total_materials_cost,
    cp.total_works_cost,
    cp.total_materials_cost + cp.total_works_cost as total_position_cost,
    (SELECT SUM(total_amount) FROM boq_items WHERE client_position_id = cp.id AND item_type IN ('material', 'sub_material')) as actual_materials,
    (SELECT SUM(total_amount) FROM boq_items WHERE client_position_id = cp.id AND item_type IN ('work', 'sub_work')) as actual_works,
    (SELECT SUM(total_amount) FROM boq_items WHERE client_position_id = cp.id) as actual_total
FROM client_positions cp
WHERE cp.id = '4d0f7d21-a38d-40f7-b9d4-58f8bdcdfb53';

-- Должно показать корректные суммы (972,000,000 вместо 8,000,000)