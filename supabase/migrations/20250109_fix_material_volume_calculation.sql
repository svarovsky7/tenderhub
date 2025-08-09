-- Исправление расчета объема материала при связывании с работой
-- Формула: объем = manual_volume * consumption_coefficient * conversion_coefficient

CREATE OR REPLACE FUNCTION public.get_materials_for_work(p_work_boq_item_id uuid)
RETURNS TABLE(
    link_id uuid, 
    material_id uuid, 
    material_description text, 
    material_unit text, 
    material_quantity numeric, 
    material_unit_rate numeric, 
    quantity_per_work numeric, 
    usage_coefficient numeric, 
    conversion_coefficient numeric, 
    consumption_coefficient numeric,
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
        wml.material_quantity_per_work AS quantity_per_work,
        wml.usage_coefficient,
        COALESCE(m.conversion_coefficient, 1) AS conversion_coefficient,
        COALESCE(m.consumption_coefficient, 1) AS consumption_coefficient,
        -- Исправленная формула: manual_volume × consumption_coefficient × conversion_coefficient × usage_coefficient
        (COALESCE(cp.manual_volume, w.quantity) * 
         COALESCE(m.consumption_coefficient, 1) * 
         COALESCE(m.conversion_coefficient, 1) * 
         COALESCE(wml.usage_coefficient, 1)) AS total_needed,
        -- Стоимость: объем × consumption_coefficient × conversion_coefficient × usage_coefficient × стоимость_за_единицу
        (COALESCE(cp.manual_volume, w.quantity) * 
         COALESCE(m.consumption_coefficient, 1) * 
         COALESCE(m.conversion_coefficient, 1) * 
         COALESCE(wml.usage_coefficient, 1) * 
         m.unit_rate) AS total_cost
    FROM public.work_material_links wml
    INNER JOIN public.boq_items w ON wml.work_boq_item_id = w.id
    INNER JOIN public.boq_items m ON wml.material_boq_item_id = m.id
    INNER JOIN public.client_positions cp ON w.client_position_id = cp.id
    WHERE wml.work_boq_item_id = p_work_boq_item_id;
END;
$function$;

-- Добавим также функцию для получения расчета объема материала
-- для более явного использования в UI
CREATE OR REPLACE FUNCTION public.calculate_material_volume(
    p_manual_volume numeric,
    p_consumption_coefficient numeric,
    p_conversion_coefficient numeric,
    p_usage_coefficient numeric DEFAULT 1
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $function$
    SELECT 
        COALESCE(p_manual_volume, 0) * 
        COALESCE(p_consumption_coefficient, 1) * 
        COALESCE(p_conversion_coefficient, 1) * 
        COALESCE(p_usage_coefficient, 1);
$function$;

-- Обновим представление work_material_links_detailed для корректного отображения
CREATE OR REPLACE VIEW public.work_material_links_detailed AS
SELECT 
    wml.id,
    wml.client_position_id,
    wml.work_boq_item_id,
    wml.material_boq_item_id,
    wml.material_quantity_per_work,
    wml.usage_coefficient,
    wml.notes,
    wml.created_at,
    wml.updated_at,
    w.description AS work_description,
    w.unit AS work_unit,
    w.quantity AS work_quantity,
    m.description AS material_description,
    m.unit AS material_unit,
    m.quantity AS material_quantity,
    m.unit_rate AS material_unit_rate,
    m.consumption_coefficient AS material_consumption_coefficient,
    m.conversion_coefficient AS material_conversion_coefficient,
    cp.manual_volume AS position_manual_volume,
    -- Расчет объема материала по формуле
    (COALESCE(cp.manual_volume, w.quantity) * 
     COALESCE(m.consumption_coefficient, 1) * 
     COALESCE(m.conversion_coefficient, 1) * 
     COALESCE(wml.usage_coefficient, 1)) AS calculated_material_volume,
    -- Расчет стоимости
    (COALESCE(cp.manual_volume, w.quantity) * 
     COALESCE(m.consumption_coefficient, 1) * 
     COALESCE(m.conversion_coefficient, 1) * 
     COALESCE(wml.usage_coefficient, 1) * 
     m.unit_rate) AS calculated_total_cost
FROM work_material_links wml
INNER JOIN boq_items w ON wml.work_boq_item_id = w.id
INNER JOIN boq_items m ON wml.material_boq_item_id = m.id
INNER JOIN client_positions cp ON w.client_position_id = cp.id;

COMMENT ON VIEW public.work_material_links_detailed IS 'Детализированное представление связей работ и материалов с расчетом объемов по формуле: manual_volume × consumption_coefficient × conversion_coefficient';