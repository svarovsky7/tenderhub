-- Миграция для удаления неиспользуемых полей material_quantity_per_work и usage_coefficient
-- Перед выполнением убедитесь, что эти поля содержат только значения по умолчанию (1.0)

-- 1. Обновляем view work_material_links_detailed
DROP VIEW IF EXISTS public.work_material_links_detailed;

CREATE OR REPLACE VIEW public.work_material_links_detailed AS
 SELECT wml.id,
    wml.client_position_id,
    wml.work_boq_item_id,
    wml.material_boq_item_id,
    wml.notes,
    wml.created_at,
    wml.updated_at,
    cp.position_number,
    cp.work_name AS position_name,
    cp.tender_id,
    w.item_number AS work_item_number,
    w.description AS work_description,
    w.unit AS work_unit,
    w.quantity AS work_quantity,
    w.unit_rate AS work_unit_rate,
    w.total_amount AS work_total_amount,
    m.item_number AS material_item_number,
    m.description AS material_description,
    m.unit AS material_unit,
    m.quantity AS material_quantity,
    m.unit_rate AS material_unit_rate,
    m.total_amount AS material_total_amount,
    m.consumption_coefficient AS material_consumption_coefficient,
    m.conversion_coefficient AS material_conversion_coefficient,
    -- Упрощенная формула без material_quantity_per_work и usage_coefficient
    -- Теперь: объем работы * коэффициент расхода * коэффициент перевода
    (w.quantity * COALESCE(m.consumption_coefficient, 1) * COALESCE(m.conversion_coefficient, 1)) AS total_material_needed,
    -- Стоимость = объем * цена
    ((w.quantity * COALESCE(m.consumption_coefficient, 1) * COALESCE(m.conversion_coefficient, 1)) * m.unit_rate) AS total_material_cost
   FROM (((work_material_links wml
     JOIN client_positions cp ON ((wml.client_position_id = cp.id)))
     JOIN boq_items w ON ((wml.work_boq_item_id = w.id)))
     JOIN boq_items m ON ((wml.material_boq_item_id = m.id)))
  WHERE ((w.item_type = 'work'::boq_item_type) AND (m.item_type = 'material'::boq_item_type));

-- 2. Удаляем старую функцию и создаем новую get_materials_for_work
DROP FUNCTION IF EXISTS public.get_materials_for_work(uuid);

CREATE OR REPLACE FUNCTION public.get_materials_for_work(p_work_boq_item_id uuid)
 RETURNS TABLE(
    link_id uuid, 
    material_id uuid, 
    material_description text, 
    material_unit text, 
    material_quantity numeric, 
    material_unit_rate numeric, 
    consumption_coefficient numeric,
    conversion_coefficient numeric,
    total_needed numeric, 
    total_cost numeric
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        wml.id AS link_id,
        m.id AS material_id,
        m.description AS material_description,
        m.unit AS material_unit,
        m.quantity AS material_quantity,
        m.unit_rate AS material_unit_rate,
        COALESCE(m.consumption_coefficient, 1) AS consumption_coefficient,
        COALESCE(m.conversion_coefficient, 1) AS conversion_coefficient,
        -- Упрощенная формула: объем работы × коэф.расхода × коэф.перевода
        (w.quantity * COALESCE(m.consumption_coefficient, 1) * COALESCE(m.conversion_coefficient, 1)) AS total_needed,
        -- Стоимость: объем × коэф.расхода × коэф.перевода × цена за единицу
        (w.quantity * COALESCE(m.consumption_coefficient, 1) * COALESCE(m.conversion_coefficient, 1) * m.unit_rate) AS total_cost
    FROM public.work_material_links wml
    INNER JOIN public.boq_items w ON wml.work_boq_item_id = w.id
    INNER JOIN public.boq_items m ON wml.material_boq_item_id = m.id
    WHERE wml.work_boq_item_id = p_work_boq_item_id;
END;
$function$;

-- 3. Удаляем старую функцию и создаем новую get_works_using_material
DROP FUNCTION IF EXISTS public.get_works_using_material(uuid);

CREATE OR REPLACE FUNCTION public.get_works_using_material(p_material_boq_item_id uuid)
 RETURNS TABLE(
    link_id uuid,
    work_id uuid,
    work_description text,
    work_unit text,
    work_quantity numeric,
    work_unit_rate numeric,
    total_material_usage numeric
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        wml.id AS link_id,
        w.id AS work_id,
        w.description AS work_description,
        w.unit AS work_unit,
        w.quantity AS work_quantity,
        w.unit_rate AS work_unit_rate,
        -- Упрощенная формула без material_quantity_per_work и usage_coefficient
        w.quantity AS total_material_usage
    FROM public.work_material_links wml
    INNER JOIN public.boq_items w ON wml.work_boq_item_id = w.id
    WHERE wml.material_boq_item_id = p_material_boq_item_id;
END;
$function$;

-- 4. Удаляем столбцы из таблицы work_material_links
ALTER TABLE public.work_material_links 
DROP COLUMN IF EXISTS material_quantity_per_work,
DROP COLUMN IF EXISTS usage_coefficient;

-- 5. Добавляем комментарий о изменении
COMMENT ON TABLE public.work_material_links IS 
'Связи между работами и материалами. Расчет объемов материалов производится через коэффициенты в таблице boq_items';