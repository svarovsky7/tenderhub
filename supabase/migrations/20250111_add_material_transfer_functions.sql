-- Migration: Add RPC functions for material transfer between works
-- Description: Enables moving/copying materials between works without deleting the link
-- Date: 2025-01-11

-- Function to move or copy material between works
CREATE OR REPLACE FUNCTION public.rpc_move_material(
  p_source_work UUID,
  p_target_work UUID,
  p_material UUID,
  p_new_index INT DEFAULT 0,
  p_mode TEXT DEFAULT 'move'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_src_link_id UUID;
  v_tgt_link_id UUID;
  v_work_volume NUMERIC;
  v_src_record RECORD;
  v_conflict BOOLEAN := FALSE;
  v_result JSONB;
  v_client_position_id UUID;
BEGIN
  -- Start transaction
  BEGIN
    -- Get client_position_id from source work
    SELECT client_position_id INTO v_client_position_id
    FROM boq_items
    WHERE id = p_source_work;
    
    -- Lock source link for update
    SELECT wml.*, w.quantity as work_volume
    INTO v_src_record
    FROM work_material_links wml
    JOIN boq_items w ON w.id = p_target_work
    WHERE wml.work_boq_item_id = p_source_work 
      AND wml.material_boq_item_id = p_material
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Source link not found');
    END IF;
    
    v_src_link_id := v_src_record.id;
    v_work_volume := COALESCE(v_src_record.work_volume, 0);
    
    -- Check for conflict in target work
    SELECT id INTO v_tgt_link_id
    FROM work_material_links
    WHERE work_boq_item_id = p_target_work 
      AND material_boq_item_id = p_material
    FOR UPDATE;
    
    IF FOUND THEN
      v_conflict := TRUE;
    END IF;
    
    IF p_mode = 'move' THEN
      IF NOT v_conflict THEN
        -- Update work_id and recalculate
        UPDATE work_material_links
        SET 
          work_boq_item_id = p_target_work,
          updated_at = NOW()
        WHERE id = v_src_link_id;
        
        -- Note: Actual volume recalculation happens via the linked materials
        -- since we store coefficients on the material BOQ items
        
        RETURN jsonb_build_object(
          'ok', true, 
          'conflict', false,
          'link_id', v_src_link_id
        );
      ELSE
        -- Return conflict information
        RETURN jsonb_build_object(
          'ok', false,
          'conflict', true,
          'src_id', v_src_link_id,
          'tgt_id', v_tgt_link_id,
          'material_id', p_material
        );
      END IF;
      
    ELSIF p_mode = 'copy' THEN
      IF NOT v_conflict THEN
        -- Create new link
        INSERT INTO work_material_links (
          client_position_id,
          work_boq_item_id,
          material_boq_item_id,
          usage_coefficient,
          material_quantity_per_work,
          notes
        )
        VALUES (
          v_client_position_id,
          p_target_work,
          p_material,
          v_src_record.usage_coefficient,
          v_src_record.material_quantity_per_work,
          v_src_record.notes
        )
        RETURNING id INTO v_tgt_link_id;
        
        RETURN jsonb_build_object(
          'ok', true,
          'conflict', false,
          'link_id', v_tgt_link_id
        );
      ELSE
        -- Return conflict information
        RETURN jsonb_build_object(
          'ok', false,
          'conflict', true,
          'src_id', v_src_link_id,
          'tgt_id', v_tgt_link_id,
          'material_id', p_material
        );
      END IF;
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Invalid mode');
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', SQLERRM
      );
  END;
END;
$$;

-- Function to resolve conflicts when moving materials
CREATE OR REPLACE FUNCTION public.rpc_resolve_conflict(
  p_src_id UUID,
  p_tgt_id UUID,
  p_target_work UUID,
  p_strategy TEXT -- 'sum' or 'replace'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_work_volume NUMERIC;
  v_src_record RECORD;
  v_tgt_record RECORD;
  v_material_item RECORD;
  v_src_volume_b NUMERIC;
  v_new_volume NUMERIC;
  v_new_total NUMERIC;
BEGIN
  BEGIN
    -- Lock both links for update
    SELECT * INTO v_src_record
    FROM work_material_links
    WHERE id = p_src_id
    FOR UPDATE;
    
    SELECT * INTO v_tgt_record
    FROM work_material_links
    WHERE id = p_tgt_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Links not found');
    END IF;
    
    -- Get work volume for target work
    SELECT quantity INTO v_work_volume
    FROM boq_items
    WHERE id = p_target_work;
    
    v_work_volume := COALESCE(v_work_volume, 0);
    
    -- Get material coefficients
    SELECT 
      consumption_coefficient,
      conversion_coefficient,
      unit_rate
    INTO v_material_item
    FROM boq_items
    WHERE id = v_src_record.material_boq_item_id;
    
    -- Calculate source volume for target work
    v_src_volume_b := v_work_volume * 
                      COALESCE(v_material_item.consumption_coefficient, 1) * 
                      COALESCE(v_material_item.conversion_coefficient, 1) *
                      COALESCE(v_src_record.usage_coefficient, 1);
    
    IF p_strategy = 'sum' THEN
      -- Sum strategy: add volumes
      -- Get target material volume (already calculated for target work)
      SELECT 
        consumption_coefficient,
        conversion_coefficient,
        unit_rate
      INTO v_material_item
      FROM boq_items
      WHERE id = v_tgt_record.material_boq_item_id;
      
      v_new_volume := (v_work_volume * 
                       COALESCE(v_material_item.consumption_coefficient, 1) * 
                       COALESCE(v_material_item.conversion_coefficient, 1) *
                       COALESCE(v_tgt_record.usage_coefficient, 1)) + v_src_volume_b;
      
      -- Note: We don't directly update material volumes here since they're calculated
      -- from the work volume and coefficients. Instead we'd update usage_coefficient
      -- to achieve the desired total volume
      
      -- Update target link's usage coefficient to achieve the summed volume
      UPDATE work_material_links
      SET 
        usage_coefficient = CASE 
          WHEN v_work_volume > 0 AND 
               COALESCE(v_material_item.consumption_coefficient, 1) > 0 AND
               COALESCE(v_material_item.conversion_coefficient, 1) > 0
          THEN v_new_volume / (v_work_volume * 
                              COALESCE(v_material_item.consumption_coefficient, 1) * 
                              COALESCE(v_material_item.conversion_coefficient, 1))
          ELSE 1
        END,
        updated_at = NOW()
      WHERE id = p_tgt_id;
      
    ELSIF p_strategy = 'replace' THEN
      -- Replace strategy: use source coefficients
      UPDATE work_material_links
      SET 
        usage_coefficient = v_src_record.usage_coefficient,
        material_quantity_per_work = v_src_record.material_quantity_per_work,
        notes = v_src_record.notes,
        updated_at = NOW()
      WHERE id = p_tgt_id;
      
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Invalid strategy');
    END IF;
    
    -- Delete source link
    DELETE FROM work_material_links WHERE id = p_src_id;
    
    RETURN jsonb_build_object(
      'ok', true,
      'link_id', p_tgt_id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', SQLERRM
      );
  END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.rpc_move_material TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_move_material TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_resolve_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_resolve_conflict TO anon;

-- Add comments
COMMENT ON FUNCTION public.rpc_move_material IS 'Moves or copies a material link between works without deleting the original link';
COMMENT ON FUNCTION public.rpc_resolve_conflict IS 'Resolves conflicts when moving materials between works (sum or replace strategy)';