import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  MeasuringStrategy,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { theme, message, Modal, Radio } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { WorkCard } from './WorkCard';
import { CatalogMaterialItem } from './CatalogMaterialItem';
import { useMaterialDragDrop } from '../../hooks/useMaterialDragDrop';
import { clientPositionsApi, boqItemsApi, boqApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import { supabase } from '../../lib/supabase/client';
import { formatCurrency } from '../../utils/formatters';
import type { ClientPosition, BOQItem } from '../../lib/supabase/types';

interface EnhancedBOQManagerProps {
  tenderId: string;
}

export const EnhancedBOQManager: React.FC<EnhancedBOQManagerProps> = ({ tenderId }) => {
  const { token } = theme.useToken();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // States
  const [positions, setPositions] = useState<ClientPosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<ClientPosition | null>(null);
  const [allWorkLinks, setAllWorkLinks] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  
  // Conflict modal state
  const [conflictModal, setConflictModal] = useState({
    visible: false,
    srcId: null as string | null,
    tgtId: null as string | null,
    targetWorkId: null as string | null,
    materialName: '',
    sourceWorkName: '',
    targetWorkName: '',
  });
  const [conflictStrategy, setConflictStrategy] = useState<'sum' | 'replace'>('sum');

  // Use our custom drag-drop hook
  const {
    handleDragStart,
    handleDragOver,
    handleDragEnd: baseHandleDragEnd,
    activeId,
    overId,
    isDragging,
    draggedItem,
    isCtrlPressed,
    customCollisionDetection,
  } = useMaterialDragDrop();

  // Configure sensors for drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-scroll functionality
  useEffect(() => {
    if (!isDragging || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    let scrollInterval: NodeJS.Timeout | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const scrollSpeed = 5;
      const scrollZone = 50; // pixels from edge

      // Clear existing interval
      if (scrollInterval) clearInterval(scrollInterval);

      // Check if near edges
      const nearTop = e.clientY - rect.top < scrollZone;
      const nearBottom = rect.bottom - e.clientY < scrollZone;
      const nearLeft = e.clientX - rect.left < scrollZone;
      const nearRight = rect.right - e.clientX < scrollZone;

      if (nearTop || nearBottom || nearLeft || nearRight) {
        scrollInterval = setInterval(() => {
          if (nearTop) container.scrollTop -= scrollSpeed;
          if (nearBottom) container.scrollTop += scrollSpeed;
          if (nearLeft) container.scrollLeft -= scrollSpeed;
          if (nearRight) container.scrollLeft += scrollSpeed;
        }, 16); // ~60fps
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (scrollInterval) clearInterval(scrollInterval);
    };
  }, [isDragging]);

  // Load positions
  const loadPositions = useCallback(async () => {
    console.log('📡 Loading positions for tender:', tenderId);
    setLoading(true);
    
    try {
      const result = await clientPositionsApi.getByTenderId(tenderId, {}, { limit: 1000 });
      if (result.error) throw new Error(result.error);
      
      const positionsData = result.data || [];
      
      // Load BOQ items and links for each position
      const positionsWithDetails = await Promise.all(
        positionsData.map(async (position) => {
          const boqResult = await boqApi.getHierarchicalByPosition(position.id);
          const boqItems = boqResult.error ? [] : (boqResult.data || []);
          
          const linksResult = await workMaterialLinksApi.getLinksByPosition(position.id);
          const links = linksResult.error ? {} : groupLinksByWork(linksResult.data || []);
          
          return {
            ...position,
            boq_items: boqItems,
            work_links: links,
          };
        })
      );
      
      setPositions(positionsWithDetails);
      
      // Collect all work links
      const allLinks: Record<string, any[]> = {};
      positionsWithDetails.forEach(pos => {
        Object.assign(allLinks, pos.work_links);
      });
      setAllWorkLinks(allLinks);
      
    } catch (error) {
      console.error('💥 Error loading positions:', error);
      message.error('Ошибка загрузки позиций');
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  // Group links by work ID
  const groupLinksByWork = (links: any[]) => {
    const grouped: Record<string, any[]> = {};
    links.forEach(link => {
      if (!grouped[link.work_boq_item_id]) {
        grouped[link.work_boq_item_id] = [];
      }
      grouped[link.work_boq_item_id].push(link);
    });
    return grouped;
  };

  // Enhanced drag end handler
  const handleDragEnd = useCallback(async (event: any) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Determine if it's copy or move
    const mode = isCtrlPressed ? 'copy' : 'move';
    
    console.log('🎯 Drop operation:', {
      from: activeData,
      to: overData,
      mode,
    });

    // Handle different drop scenarios
    if (activeData?.type === 'material' && overData?.type === 'work') {
      const material = activeData.item;
      const targetWorkId = overData.workId;
      
      if (activeData.sourceType === 'catalog') {
        // From catalog to work
        await handleCatalogToWork(material, targetWorkId);
      } else if (activeData.sourceType === 'work') {
        // From work to work
        await handleWorkToWork(
          activeData.sourceWorkId,
          targetWorkId,
          material.id,
          activeData.linkId,
          mode
        );
      }
    }
  }, [isCtrlPressed]);

  // Handle material from catalog to work
  const handleCatalogToWork = async (material: BOQItem, targetWorkId: string) => {
    console.log('🔗 Creating link from catalog:', { material, targetWorkId });
    
    try {
      // Find the position containing the target work
      const position = positions.find(p => 
        p.boq_items?.some(item => item.id === targetWorkId)
      );
      
      if (!position) {
        message.error('Не удалось найти позицию для работы');
        return;
      }
      
      // Create link
      const result = await workMaterialLinksApi.createLink({
        client_position_id: position.id,
        work_boq_item_id: targetWorkId,
        material_boq_item_id: material.id,
        material_quantity_per_work: 1,
        usage_coefficient: 1,
      });
      
      if (result.error) {
        if (result.error.includes('duplicate')) {
          message.warning('Связь уже существует');
        } else {
          throw new Error(result.error);
        }
      } else {
        message.success('Материал привязан к работе');
        await loadPositions(); // Reload to update UI
      }
    } catch (error) {
      console.error('❌ Error creating link:', error);
      message.error('Ошибка привязки материала');
    }
  };

  // Handle material transfer between works
  const handleWorkToWork = async (
    sourceWorkId: string,
    targetWorkId: string,
    materialId: string,
    linkId: string,
    mode: 'move' | 'copy'
  ) => {
    console.log('🔄 Transfer between works:', {
      sourceWorkId,
      targetWorkId,
      materialId,
      mode,
    });

    try {
      const { data, error } = await supabase
        .rpc('rpc_move_material', {
          p_source_work: sourceWorkId,
          p_target_work: targetWorkId,
          p_material: materialId,
          p_new_index: 0,
          p_mode: mode,
        });

      if (error) throw error;

      if (data?.conflict) {
        // Show conflict modal
        const sourceWork = findWorkById(sourceWorkId);
        const targetWork = findWorkById(targetWorkId);
        const material = findMaterialById(materialId);
        
        setConflictModal({
          visible: true,
          srcId: data.src_id,
          tgtId: data.tgt_id,
          targetWorkId,
          materialName: material?.description || 'Материал',
          sourceWorkName: sourceWork?.description || 'Работа А',
          targetWorkName: targetWork?.description || 'Работа Б',
        });
      } else {
        message.success(mode === 'copy' ? 'Материал скопирован' : 'Материал перемещен');
        await loadPositions(); // Reload to update UI
      }
    } catch (error) {
      console.error('❌ Error transferring material:', error);
      message.error('Ошибка переноса материала');
    }
  };

  // Handle conflict resolution
  const handleConflictResolution = useCallback(async () => {
    if (!conflictModal.srcId || !conflictModal.tgtId || !conflictModal.targetWorkId) {
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('rpc_resolve_conflict', {
          p_src_id: conflictModal.srcId,
          p_tgt_id: conflictModal.tgtId,
          p_target_work: conflictModal.targetWorkId,
          p_strategy: conflictStrategy,
        });

      if (error) throw error;

      message.success(
        conflictStrategy === 'sum' 
          ? 'Объемы материалов суммированы' 
          : 'Материал заменен'
      );

      setConflictModal({
        visible: false,
        srcId: null,
        tgtId: null,
        targetWorkId: null,
        materialName: '',
        sourceWorkName: '',
        targetWorkName: '',
      });

      await loadPositions(); // Reload to update UI
    } catch (error) {
      console.error('❌ Error resolving conflict:', error);
      message.error('Ошибка разрешения конфликта');
    }
  }, [conflictModal, conflictStrategy]);

  // Helper functions
  const findWorkById = (workId: string): BOQItem | undefined => {
    for (const position of positions) {
      const work = position.boq_items?.find(item => item.id === workId);
      if (work) return work;
    }
    return undefined;
  };

  const findMaterialById = (materialId: string): BOQItem | undefined => {
    for (const position of positions) {
      const material = position.boq_items?.find(item => item.id === materialId);
      if (material) return material;
    }
    return undefined;
  };

  // Load data on mount
  useEffect(() => {
    if (tenderId) {
      loadPositions();
    }
  }, [tenderId, loadPositions]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      <div className="enhanced-boq-manager min-h-screen bg-gray-50 p-4">
        <div 
          ref={scrollContainerRef}
          className="max-w-7xl mx-auto overflow-auto"
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="text-xl font-bold">Управление ВОР</h2>
            <div className="text-sm text-gray-500 mt-1">
              Перетаскивайте материалы на работы для создания связей
              {isCtrlPressed && (
                <span className="ml-2 text-orange-600 font-medium">
                  [Режим копирования]
                </span>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Materials Catalog */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-medium mb-3">Каталог материалов</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {positions.flatMap(p => 
                    (p.boq_items || []).filter(item => 
                      item.item_type === 'material' && 
                      !Object.values(allWorkLinks).some(links => 
                        links.some(link => link.material_boq_item_id === item.id)
                      )
                    )
                  ).map(material => (
                    <CatalogMaterialItem
                      key={material.id}
                      material={material}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Works Area */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {positions.map(position => (
                  <div key={position.id} className="bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-medium mb-3">
                      {position.item_no}. {position.work_name}
                    </h3>
                    <div className="space-y-3">
                      {(position.boq_items || [])
                        .filter(item => item.item_type === 'work')
                        .map(work => (
                          <WorkCard
                            key={work.id}
                            work={work}
                            materials={allWorkLinks[work.id] || []}
                            allWorkLinks={allWorkLinks}
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}
        >
          {activeId && draggedItem && (
            <div className="bg-white p-2 rounded shadow-lg border-2 border-blue-400">
              <span className="text-sm font-medium">
                {draggedItem.item?.description}
              </span>
              <div className="text-xs text-gray-500 mt-1">
                {isCtrlPressed ? '📋 Копирование' : '✂️ Перемещение'}
              </div>
            </div>
          )}
        </DragOverlay>

        {/* Conflict Resolution Modal */}
        <Modal
          title="Конфликт перемещения материала"
          open={conflictModal.visible}
          onOk={handleConflictResolution}
          onCancel={() => setConflictModal({ ...conflictModal, visible: false })}
          okText="Применить"
          cancelText="Отмена"
        >
          <div className="space-y-4">
            <p>
              Материал <strong>{conflictModal.materialName}</strong> уже привязан к работе{' '}
              <strong>{conflictModal.targetWorkName}</strong>.
            </p>
            <Radio.Group
              value={conflictStrategy}
              onChange={(e) => setConflictStrategy(e.target.value)}
            >
              <Radio value="sum" className="block mb-2">
                <div>
                  <div className="font-medium">Суммировать объемы</div>
                  <div className="text-sm text-gray-500">
                    Объемы материала будут сложены
                  </div>
                </div>
              </Radio>
              <Radio value="replace" className="block">
                <div>
                  <div className="font-medium">Заменить</div>
                  <div className="text-sm text-gray-500">
                    Использовать коэффициенты из {conflictModal.sourceWorkName}
                  </div>
                </div>
              </Radio>
            </Radio.Group>
          </div>
        </Modal>
      </div>
    </DndContext>
  );
};