-- Исправленная RPC функция для импорта данных о затратах
-- Использует правильное имя таблицы location (не locations)
DROP FUNCTION IF EXISTS public.import_costs_row;

CREATE OR REPLACE FUNCTION public.import_costs_row(
    p_cat_order integer DEFAULT NULL,
    p_cat_name text DEFAULT NULL,
    p_cat_unit text DEFAULT NULL,
    p_det_name text DEFAULT NULL,
    p_det_unit text DEFAULT NULL,
    p_loc_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_cat_id uuid;
    v_det_id uuid;
    v_unit_id uuid;
    v_det_unit_id uuid;
    v_loc_id uuid;
    v_result json;
BEGIN
    -- If both category and detail names are null, skip
    IF p_cat_name IS NULL AND p_det_name IS NULL THEN
        RETURN json_build_object('status', 'skipped', 'reason', 'empty row');
    END IF;
    
    -- If detail exists but category doesn't, error
    IF p_det_name IS NOT NULL AND p_cat_name IS NULL THEN
        RAISE EXCEPTION 'Detail without category: %', p_det_name;
    END IF;
    
    -- Process category
    IF p_cat_name IS NOT NULL THEN
        -- Find or create unit for category
        IF p_cat_unit IS NOT NULL THEN
            SELECT id INTO v_unit_id
            FROM units
            WHERE title = p_cat_unit
            LIMIT 1;
            
            IF v_unit_id IS NULL THEN
                INSERT INTO units (title, code)
                VALUES (p_cat_unit, SUBSTRING(p_cat_unit, 1, 10))
                RETURNING id INTO v_unit_id;
            END IF;
        END IF;
        
        -- Find existing category
        SELECT id INTO v_cat_id
        FROM cost_nodes
        WHERE name = p_cat_name
          AND parent_id IS NULL
          AND kind = 'group'
        LIMIT 1;
        
        -- Create category if doesn't exist
        IF v_cat_id IS NULL THEN
            INSERT INTO cost_nodes (
                parent_id,
                kind,
                name,
                unit_id,
                sort_order
            ) VALUES (
                NULL,
                'group',
                p_cat_name,
                v_unit_id,
                COALESCE(p_cat_order, 100)
            )
            RETURNING id INTO v_cat_id;
        END IF;
    END IF;
    
    -- Process detail
    IF p_det_name IS NOT NULL AND v_cat_id IS NOT NULL THEN
        -- Find or create unit for detail
        IF p_det_unit IS NOT NULL THEN
            SELECT id INTO v_det_unit_id
            FROM units
            WHERE title = p_det_unit
            LIMIT 1;
            
            IF v_det_unit_id IS NULL THEN
                INSERT INTO units (title, code)
                VALUES (p_det_unit, SUBSTRING(p_det_unit, 1, 10))
                RETURNING id INTO v_det_unit_id;
            END IF;
        END IF;
        
        -- Find location (don't create new ones) - ИСПРАВЛЕНО: location вместо locations
        IF p_loc_name IS NOT NULL THEN
            SELECT id INTO v_loc_id
            FROM location  -- Исправлено с locations на location
            WHERE title = p_loc_name
            LIMIT 1;
        END IF;
        
        -- Always create new detail (allowing duplicates)
        INSERT INTO cost_nodes (
            parent_id,
            kind,
            name,
            unit_id,
            location_id,
            sort_order
        ) VALUES (
            v_cat_id,
            'item',
            p_det_name,
            v_det_unit_id,
            v_loc_id,
            100
        )
        RETURNING id INTO v_det_id;
    END IF;
    
    -- Return result
    v_result := json_build_object(
        'status', 'success',
        'category_id', v_cat_id,
        'detail_id', v_det_id,
        'location_found', v_loc_id IS NOT NULL
    );
    
    RETURN v_result;
END;
$$;