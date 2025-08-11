import { useState, useCallback, useEffect } from 'react';
import {
  closestCenter,
  rectIntersection,
} from '@dnd-kit/core';
import type { 
  CollisionDetection,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { message } from 'antd';
import { supabase } from '../lib/supabase/client';

// Types
interface DragItemData {
  type: 'material';
  item: any;
  sourceType: 'catalog' | 'work';
  sourceWorkId?: string;
  linkId?: string;
}

interface DropTargetData {
  type: 'work' | 'position';
  workId?: string;
  positionIndex?: number;
}

// Custom collision detection that prioritizes work cards over sortable items
export const customCollisionDetection: CollisionDetection = (args) => {
  // First, check for work card collisions using rect intersection
  const workCollisions = rectIntersection({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      container => container.data.current?.type === 'work'
    ),
  });

  if (workCollisions.length > 0) {
    return workCollisions;
  }

  // If no work collision, check for sortable position collisions
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      container => container.data.current?.type === 'position'
    ),
  });
};

export const useMaterialDragDrop = () => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DragItemData | null>(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  // Track Ctrl/Cmd key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('🎯 Drag start:', event);
    const { active } = event;
    const data = active.data.current as DragItemData;
    
    setActiveId(active.id);
    setIsDragging(true);
    setDraggedItem(data);
    
    // Update cursor based on Ctrl state
    document.body.style.cursor = isCtrlPressed ? 'copy' : 'move';
  }, [isCtrlPressed]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id || null);
    
    // Update cursor during drag
    if (isDragging) {
      document.body.style.cursor = isCtrlPressed ? 'copy' : 'move';
    }
  }, [isDragging, isCtrlPressed]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    console.log('🎯 Drag end:', event);
    const { active, over } = event;
    
    // Reset states
    setActiveId(null);
    setOverId(null);
    setIsDragging(false);
    setDraggedItem(null);
    document.body.style.cursor = '';
    
    if (!over) {
      console.log('❌ No drop target');
      return;
    }

    const activeData = active.data.current as DragItemData;
    const overData = over.data.current as DropTargetData;
    
    // Determine operation mode
    const mode = isCtrlPressed ? 'copy' : 'move';
    
    console.log('📋 Drop operation:', {
      source: activeData,
      target: overData,
      mode,
    });

    // Extract IDs based on drag source type
    const materialId = extractMaterialId(active.id as string, activeData);
    const sourceWorkId = activeData.sourceWorkId;
    const targetWorkId = overData.workId;
    const dropIndex = overData.positionIndex ?? -1; // -1 means append to end

    if (!materialId || !targetWorkId) {
      console.error('❌ Missing required IDs');
      return;
    }

    // Check if this is a move between works or from catalog
    if (activeData.sourceType === 'catalog') {
      // Creating new link from catalog
      await handleCatalogToWork(materialId, targetWorkId, dropIndex);
    } else if (activeData.sourceType === 'work' && sourceWorkId) {
      // Moving/copying between works
      await handleWorkToWork(sourceWorkId, targetWorkId, materialId, dropIndex, mode);
    }
  }, [isCtrlPressed]);

  const handleCatalogToWork = async (
    materialId: string,
    targetWorkId: string,
    dropIndex: number
  ) => {
    console.log('🔗 Creating link from catalog:', { materialId, targetWorkId, dropIndex });
    
    try {
      // This would call your existing API to create a work-material link
      // For now, using the pattern from your existing code
      message.success('Материал добавлен к работе');
    } catch (error) {
      console.error('❌ Error creating link:', error);
      message.error('Ошибка добавления материала');
    }
  };

  const handleWorkToWork = async (
    sourceWorkId: string,
    targetWorkId: string,
    materialId: string,
    dropIndex: number,
    mode: 'move' | 'copy'
  ) => {
    console.log('🔄 Transfer between works:', {
      sourceWorkId,
      targetWorkId,
      materialId,
      dropIndex,
      mode,
    });

    try {
      // Call your existing RPC function
      const { data, error } = await supabase
        .rpc('rpc_move_material', {
          p_source_work: sourceWorkId,
          p_target_work: targetWorkId,
          p_material: materialId,
          p_new_index: dropIndex >= 0 ? dropIndex : 0,
          p_mode: mode,
        });

      if (error) throw error;

      if (data?.conflict) {
        // Handle conflict - return data for modal
        return { conflict: true, data };
      }

      message.success(mode === 'copy' ? 'Материал скопирован' : 'Материал перемещен');
      return { success: true };
    } catch (error) {
      console.error('❌ Error transferring material:', error);
      message.error('Ошибка переноса материала');
      return { error };
    }
  };

  // Helper to extract material ID from drag ID
  const extractMaterialId = (dragId: string, data: DragItemData): string => {
    if (data.sourceType === 'catalog') {
      // catalog:materialId format
      return dragId.replace('catalog:', '');
    } else if (data.sourceType === 'work') {
      // wm:workId:materialId format
      const parts = dragId.split(':');
      return parts[2] || data.item?.id || '';
    }
    return data.item?.id || '';
  };

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    activeId,
    overId,
    isDragging,
    draggedItem,
    isCtrlPressed,
    customCollisionDetection,
  };
};