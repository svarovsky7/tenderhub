import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Empty,
  Spin,
  message,
  Modal,
  Form,
  Input,
  Space,
  Typography,
  Card
} from 'antd';
import { PlusOutlined, ReloadOutlined, FolderOpenOutlined, BuildOutlined, ToolOutlined } from '@ant-design/icons';
import { clientPositionsApi, boqApi, tendersApi } from '../../lib/supabase/api';
import { supabase } from '../../lib/supabase/client';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import ClientPositionCardStreamlined from './ClientPositionCardStreamlined';
import type { ClientPositionInsert, ClientPositionType } from '../../lib/supabase/types';

const { Title, Text } = Typography;

interface TenderBOQManagerLazyProps {
  tenderId: string;
  onStatsUpdate?: (stats: { works: number; materials: number; total: number; positions: number }) => void;
}

interface ClientPositionWithStats {
  id: string;
  tender_id: string;
  position_number: number;
  item_no: string;
  work_name: string;
  total_materials_cost: number;
  total_works_cost: number;
  created_at: string;
  updated_at: string;
  position_type?: ClientPositionType;
  hierarchy_level?: number;
  boq_items?: any[];
  materials_count?: number;
  works_count?: number;
  total_position_cost?: number;
  // Additional fields
  additional_works?: any[];
  is_additional?: boolean;
  parent_position_id?: string | null;
  is_orphaned?: boolean;
  manual_volume?: number | null;
  manual_note?: string | null;
}

const TenderBOQManagerLazy: React.FC<TenderBOQManagerLazyProps> = ({
  tenderId,
  onStatsUpdate
}) => {
  // State for positions (without BOQ items initially)
  const [positions, setPositions] = useState<ClientPositionWithStats[]>([]);

  // Cache for loaded BOQ items by position ID
  const [loadedPositionItems, setLoadedPositionItems] = useState<Map<string, any[]>>(new Map());

  // Track which positions are currently loading
  const [loadingPositions, setLoadingPositions] = useState<Set<string>>(new Set());

  // Track expanded positions
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  // Loading states
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Modal and forms
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Tender data for currency rates
  const [tender, setTender] = useState<{
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null>(null);

  // Sort positions by position number only (preserving Excel file order)
  const sortPositionsByNumber = useCallback((positions: ClientPositionWithStats[]): ClientPositionWithStats[] => {
    return [...positions].sort((a, b) => a.position_number - b.position_number);
  }, []);

  // Load tender data for currency rates
  useEffect(() => {
    const loadTenderData = async () => {
      if (!tenderId) return;

      try {
        const { data: directData, error: directError } = await supabase
          .from('tenders')
          .select('id, title, usd_rate, eur_rate, cny_rate')
          .eq('id', tenderId)
          .single();

        if (directData && !directError) {
          const actualData = Array.isArray(directData) ? directData[0] : directData;
          setTender({
            usd_rate: actualData.usd_rate,
            eur_rate: actualData.eur_rate,
            cny_rate: actualData.cny_rate
          });
        }
      } catch (error) {
        console.error('❌ Error loading tender:', error);
      }
    };

    loadTenderData();
  }, [tenderId]);

  // Load ONLY positions without BOQ items
  const loadPositions = useCallback(async () => {
    console.log('📡 Loading positions (without BOQ items) for tender:', tenderId);
    setLoading(true);

    try {
      // Load positions with additional works structure
      const result = await clientPositionsApi.getPositionsWithAdditional(tenderId);

      let positionsData = [];

      if (result.error) {
        // Fallback to basic loading
        const fallbackResult = await clientPositionsApi.getByTenderId(tenderId, {}, { limit: 1000 });
        if (fallbackResult.error) {
          throw new Error(fallbackResult.error);
        }
        positionsData = fallbackResult.data || [];
      } else if (result.data) {
        if (result.data.positions) {
          positionsData = result.data.positions;
          // Handle orphaned additional works
          const orphanedAdditional = result.data.orphanedAdditional || [];
          orphanedAdditional.forEach(orphaned => {
            orphaned.is_orphaned = true;
            orphaned.is_additional = true;
            positionsData.push(orphaned);
          });
        } else {
          positionsData = result.data;
        }
      }

      console.log(`✅ Loaded ${positionsData.length} positions (headers only)`);

      // Set positions WITHOUT loading BOQ items
      setPositions(positionsData);

      // Calculate total from all positions (including additional works)
      let totalCost = 0;
      positionsData.forEach(position => {
        // Parse to numbers to ensure correct calculation
        const materialsCost = parseFloat(position.total_materials_cost) || 0;
        const worksCost = parseFloat(position.total_works_cost) || 0;
        const posCost = materialsCost + worksCost;

        totalCost += posCost;

        // Also set total_position_cost for display
        position.total_position_cost = posCost;

        console.log(`Position ${position.work_name}: Materials=${materialsCost}, Works=${worksCost}, Total=${posCost}, Raw: mat=${position.total_materials_cost}, work=${position.total_works_cost}`);

        // Include additional works in the total
        if (position.additional_works && Array.isArray(position.additional_works)) {
          position.additional_works.forEach(add => {
            const addMaterialsCost = parseFloat(add.total_materials_cost) || 0;
            const addWorksCost = parseFloat(add.total_works_cost) || 0;
            const addCost = addMaterialsCost + addWorksCost;

            totalCost += addCost;

            // Also set total_position_cost for display
            add.total_position_cost = addCost;

            console.log(`  Additional ${add.work_name}: Materials=${addMaterialsCost}, Works=${addWorksCost}, Total=${addCost}`);
          });
        }
      });

      console.log('📊 Total cost calculated:', totalCost);

      // Update stats with position count and total
      onStatsUpdate?.({
        positions: positionsData.length,
        works: 0,
        materials: 0,
        total: totalCost
      });

    } catch (error) {
      console.error('❌ Error loading positions:', error);
      message.error('Ошибка загрузки позиций');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [tenderId, onStatsUpdate]);

  // Load BOQ items for a specific position (lazy loading)
  const loadPositionItems = useCallback(async (positionId: string) => {
    // Check if already loaded or loading
    if (loadedPositionItems.has(positionId)) {
      console.log('✅ Items already cached for position:', positionId);
      return loadedPositionItems.get(positionId);
    }

    if (loadingPositions.has(positionId)) {
      console.log('⏳ Already loading items for position:', positionId);
      return;
    }

    console.log('📡 Loading BOQ items for position:', positionId);

    // Mark as loading
    setLoadingPositions(prev => new Set(prev).add(positionId));

    try {
      // Load BOQ items
      const { data: boqItems } = await boqApi.getByClientPositionId(positionId);
      const items = boqItems || [];

      // Load work-material links
      const { data: links } = await workMaterialLinksApi.getLinksByPosition(positionId);

      // Process items with link information
      const processedItems = items.map(item => {
        if ((item.item_type === 'material' || item.item_type === 'sub_material') && links && links.length > 0) {
          const materialLinks = links.filter(l =>
            l.material_boq_item_id === item.id ||
            l.sub_material_boq_item_id === item.id
          );

          if (materialLinks.length > 0) {
            return {
              ...item,
              work_links: materialLinks,
              work_link: materialLinks[0]
            };
          }
        } else if ((item.item_type === 'work' || item.item_type === 'sub_work') && links && links.length > 0) {
          const workLinks = links.filter(l =>
            l.work_boq_item_id === item.id ||
            l.sub_work_boq_item_id === item.id
          );

          if (workLinks.length > 0) {
            return {
              ...item,
              linked_materials: workLinks
            };
          }
        }
        return item;
      });

      // Sort items: works first, then linked materials, then unlinked
      const sortedItems = [];
      const unlinkedMaterials = [];

      processedItems.forEach(item => {
        if (item.item_type === 'work' || item.item_type === 'sub_work') {
          sortedItems.push(item);
          // Add linked materials right after their work
          processedItems.forEach(matItem => {
            if ((matItem.item_type === 'material' || matItem.item_type === 'sub_material') && matItem.work_link) {
              const linkedToThisWork =
                (matItem.work_link.work_boq_item_id === item.id && item.item_type === 'work') ||
                (matItem.work_link.sub_work_boq_item_id === item.id && item.item_type === 'sub_work');
              if (linkedToThisWork && !sortedItems.includes(matItem)) {
                sortedItems.push(matItem);
              }
            }
          });
        } else if ((item.item_type === 'material' || item.item_type === 'sub_material') && !item.work_link) {
          unlinkedMaterials.push(item);
        }
      });

      sortedItems.push(...unlinkedMaterials);

      console.log(`✅ Loaded ${sortedItems.length} items for position ${positionId}`);

      // Cache the loaded items
      setLoadedPositionItems(prev => new Map(prev).set(positionId, sortedItems));

      // Update position with loaded items
      setPositions(prevPositions =>
        prevPositions.map(pos => {
          if (pos.id === positionId) {
            return { ...pos, boq_items: sortedItems };
          }
          // Also check additional works
          if (pos.additional_works) {
            const updatedAdditional = pos.additional_works.map((add: any) =>
              add.id === positionId ? { ...add, boq_items: sortedItems } : add
            );
            if (updatedAdditional !== pos.additional_works) {
              return { ...pos, additional_works: updatedAdditional };
            }
          }
          return pos;
        })
      );

      // Update stats
      const worksCount = sortedItems.filter(item =>
        item.item_type === 'work' || item.item_type === 'sub_work'
      ).length;
      const materialsCount = sortedItems.filter(item =>
        item.item_type === 'material' || item.item_type === 'sub_material'
      ).length;

      // Recalculate total stats from all loaded positions
      let totalWorks = 0;
      let totalMaterials = 0;
      let totalCost = 0;

      positions.forEach(pos => {
        totalCost += pos.total_position_cost || 0;

        // Count items if loaded
        const items = loadedPositionItems.get(pos.id) || pos.boq_items || [];
        totalWorks += items.filter(item =>
          item.item_type === 'work' || item.item_type === 'sub_work'
        ).length;
        totalMaterials += items.filter(item =>
          item.item_type === 'material' || item.item_type === 'sub_material'
        ).length;

        // Include additional works
        if (pos.additional_works) {
          pos.additional_works.forEach(add => {
            totalCost += add.total_position_cost || 0;
            const addItems = loadedPositionItems.get(add.id) || add.boq_items || [];
            totalWorks += addItems.filter(item =>
              item.item_type === 'work' || item.item_type === 'sub_work'
            ).length;
            totalMaterials += addItems.filter(item =>
              item.item_type === 'material' || item.item_type === 'sub_material'
            ).length;
          });
        }
      });

      // Update global stats with current totals
      onStatsUpdate?.({
        positions: positions.length,
        works: totalWorks + worksCount,
        materials: totalMaterials + materialsCount,
        total: totalCost
      });

      return sortedItems;

    } catch (error) {
      console.error('❌ Error loading position items:', error);
      message.error('Ошибка загрузки элементов позиции');
    } finally {
      // Remove from loading set
      setLoadingPositions(prev => {
        const next = new Set(prev);
        next.delete(positionId);
        return next;
      });
    }
  }, [loadedPositionItems, loadingPositions, onStatsUpdate]);

  // Toggle position expansion and load items if needed
  const togglePosition = useCallback(async (positionId: string) => {
    const isExpanding = !expandedPositions.has(positionId);

    // Update expanded state
    setExpandedPositions(prev => {
      const next = new Set(prev);
      if (isExpanding) {
        next.add(positionId);
      } else {
        next.delete(positionId);
      }
      return next;
    });

    // Load items if expanding and not loaded
    if (isExpanding && !loadedPositionItems.has(positionId)) {
      await loadPositionItems(positionId);
    }
  }, [expandedPositions, loadedPositionItems, loadPositionItems]);

  // Force refresh position - always reload items regardless of cache
  const forceRefreshPosition = useCallback(async (positionId: string) => {
    console.log('🔄 Force refreshing position:', positionId);

    try {
      // Remove from cache to force reload
      setLoadedPositionItems(prev => {
        const next = new Map(prev);
        next.delete(positionId);
        return next;
      });

      // Always reload items if position is expanded
      let newItems = undefined;
      if (expandedPositions.has(positionId)) {
        console.log('🔄 Force reloading items for expanded position:', positionId);

        // Mark as loading
        setLoadingPositions(prev => new Set(prev).add(positionId));

        try {
          // Load BOQ items directly from API
          const { data: boqItems } = await boqApi.getByClientPositionId(positionId);
          const items = boqItems || [];

          // Load work-material links
          const { data: links } = await workMaterialLinksApi.getLinksByPosition(positionId);

          // Process items with link information
          const processedItems = items.map(item => {
            if ((item.item_type === 'material' || item.item_type === 'sub_material') && links && links.length > 0) {
              const materialLinks = links.filter(l =>
                l.material_boq_item_id === item.id ||
                l.sub_material_boq_item_id === item.id
              );

              if (materialLinks.length > 0) {
                return {
                  ...item,
                  work_links: materialLinks,
                  work_link: materialLinks[0]
                };
              }
            } else if ((item.item_type === 'work' || item.item_type === 'sub_work') && links && links.length > 0) {
              const workLinks = links.filter(l =>
                l.work_boq_item_id === item.id ||
                l.sub_work_boq_item_id === item.id
              );

              if (workLinks.length > 0) {
                return {
                  ...item,
                  linked_materials: workLinks
                };
              }
            }
            return item;
          });

          // Sort items
          const sortedItems = [];
          const unlinkedMaterials = [];

          processedItems.forEach(item => {
            if (item.item_type === 'work' || item.item_type === 'sub_work') {
              sortedItems.push(item);
              processedItems.forEach(matItem => {
                if ((matItem.item_type === 'material' || matItem.item_type === 'sub_material') && matItem.work_link) {
                  const linkedToThisWork =
                    (matItem.work_link.work_boq_item_id === item.id && item.item_type === 'work') ||
                    (matItem.work_link.sub_work_boq_item_id === item.id && item.item_type === 'sub_work');
                  if (linkedToThisWork && !sortedItems.includes(matItem)) {
                    sortedItems.push(matItem);
                  }
                }
              });
            } else if ((item.item_type === 'material' || item.item_type === 'sub_material') && !item.work_link) {
              unlinkedMaterials.push(item);
            }
          });

          sortedItems.push(...unlinkedMaterials);
          newItems = sortedItems;

          console.log(`✅ Force reloaded ${sortedItems.length} items for position ${positionId}`);

          // Update cache
          setLoadedPositionItems(prev => new Map(prev).set(positionId, sortedItems));
        } finally {
          // Remove from loading
          setLoadingPositions(prev => {
            const next = new Set(prev);
            next.delete(positionId);
            return next;
          });
        }
      }

      // Then reload position header data to get updated totals
      const { data: updatedPosition } = await clientPositionsApi.getById(positionId);
      if (updatedPosition) {
        // Calculate total_position_cost from components
        const updatedMaterialsCost = parseFloat(updatedPosition.total_materials_cost) || 0;
        const updatedWorksCost = parseFloat(updatedPosition.total_works_cost) || 0;
        const updatedTotalCost = updatedMaterialsCost + updatedWorksCost;

        console.log(`📊 Updated position costs: Materials=${updatedMaterialsCost}, Works=${updatedWorksCost}, Total=${updatedTotalCost}`);

        setPositions(prevPositions =>
          prevPositions.map(pos => {
            if (pos.id === positionId) {
              return {
                ...pos,
                total_position_cost: updatedTotalCost,
                total_materials_cost: updatedMaterialsCost,
                total_works_cost: updatedWorksCost,
                materials_count: updatedPosition.materials_count || 0,
                works_count: updatedPosition.works_count || 0,
                boq_items: newItems !== undefined ? newItems : pos.boq_items
              };
            }
            // Also check additional works
            if (pos.additional_works) {
              const updatedAdditional = pos.additional_works.map((add: any) => {
                if (add.id === positionId) {
                  return {
                    ...add,
                    total_position_cost: updatedTotalCost,
                    total_materials_cost: updatedMaterialsCost,
                    total_works_cost: updatedWorksCost,
                    materials_count: updatedPosition.materials_count || 0,
                    works_count: updatedPosition.works_count || 0,
                    boq_items: newItems !== undefined ? newItems : add.boq_items
                  };
                }
                return add;
              });
              if (updatedAdditional !== pos.additional_works) {
                return { ...pos, additional_works: updatedAdditional };
              }
            }
            return pos;
          })
        );

        // Recalculate total stats
        let totalCost = 0;
        let totalWorks = 0;
        let totalMaterials = 0;

        positions.forEach(pos => {
          if (pos.id === positionId) {
            totalCost += updatedTotalCost;
          } else {
            const posMaterialsCost = parseFloat(pos.total_materials_cost) || 0;
            const posWorksCost = parseFloat(pos.total_works_cost) || 0;
            totalCost += posMaterialsCost + posWorksCost;
          }

          const posItems = loadedPositionItems.get(pos.id) || [];
          totalWorks += posItems.filter(item =>
            item.item_type === 'work' || item.item_type === 'sub_work'
          ).length;
          totalMaterials += posItems.filter(item =>
            item.item_type === 'material' || item.item_type === 'sub_material'
          ).length;

          if (pos.additional_works) {
            pos.additional_works.forEach(add => {
              if (add.id === positionId) {
                totalCost += updatedTotalCost;
              } else {
                const addMaterialsCost = parseFloat(add.total_materials_cost) || 0;
                const addWorksCost = parseFloat(add.total_works_cost) || 0;
                totalCost += addMaterialsCost + addWorksCost;
              }

              const addItems = loadedPositionItems.get(add.id) || [];
              totalWorks += addItems.filter(item =>
                item.item_type === 'work' || item.item_type === 'sub_work'
              ).length;
              totalMaterials += addItems.filter(item =>
                item.item_type === 'material' || item.item_type === 'sub_material'
              ).length;
            });
          }
        });

        console.log('📊 Stats update:', { totalCost, totalWorks, totalMaterials });

        onStatsUpdate?.({
          positions: positions.length,
          works: totalWorks,
          materials: totalMaterials,
          total: totalCost
        });
      }

      console.log('✅ Position force refreshed successfully');
      message.success('Позиция успешно обновлена');

    } catch (error) {
      console.error('❌ Error force refreshing position:', error);
      message.error('Ошибка обновления позиции');
    }
  }, [expandedPositions, positions, loadedPositionItems, onStatsUpdate, clientPositionsApi, boqApi, workMaterialLinksApi]);

  // Update single position after changes
  const updateSinglePosition = useCallback(async (positionId: string) => {
    console.log('🔄 Updating single position:', positionId);

    try {
      // Remove from cache to force reload
      setLoadedPositionItems(prev => {
        const next = new Map(prev);
        next.delete(positionId);
        return next;
      });

      // If position is expanded, reload its items first
      let newItems = undefined;
      if (expandedPositions.has(positionId)) {
        console.log('🔄 Position is expanded, reloading items for:', positionId);
        newItems = await loadPositionItems(positionId);
        console.log('✅ Items reloaded:', newItems?.length || 0, 'items');
      }

      // Then reload position header data to get updated totals
      const { data: updatedPosition } = await clientPositionsApi.getById(positionId);
      if (updatedPosition) {
        // Calculate total_position_cost from components (parse as float to ensure correct calculation)
        const updatedMaterialsCost = parseFloat(updatedPosition.total_materials_cost) || 0;
        const updatedWorksCost = parseFloat(updatedPosition.total_works_cost) || 0;
        const updatedTotalCost = updatedMaterialsCost + updatedWorksCost;

        console.log(`📊 Updated position costs: Materials=${updatedMaterialsCost}, Works=${updatedWorksCost}, Total=${updatedTotalCost}`);

        setPositions(prevPositions =>
          prevPositions.map(pos => {
            if (pos.id === positionId) {
              return {
                ...pos,
                total_position_cost: updatedTotalCost,
                total_materials_cost: updatedMaterialsCost,
                total_works_cost: updatedWorksCost,
                materials_count: updatedPosition.materials_count || 0,
                works_count: updatedPosition.works_count || 0,
                // Use newly loaded items if available
                boq_items: newItems !== undefined ? newItems : pos.boq_items
              };
            }
            // Also check additional works
            if (pos.additional_works) {
              const updatedAdditional = pos.additional_works.map((add: any) => {
                if (add.id === positionId) {
                  return {
                    ...add,
                    total_position_cost: updatedTotalCost,
                    total_materials_cost: updatedMaterialsCost,
                    total_works_cost: updatedWorksCost,
                    materials_count: updatedPosition.materials_count || 0,
                    works_count: updatedPosition.works_count || 0,
                    // Use newly loaded items if available
                    boq_items: newItems !== undefined ? newItems : add.boq_items
                  };
                }
                return add;
              });
              if (updatedAdditional !== pos.additional_works) {
                return { ...pos, additional_works: updatedAdditional };
              }
            }
            return pos;
          })
        );

        // Recalculate total stats - use updated position data
        let totalCost = 0;
        let totalWorks = 0;
        let totalMaterials = 0;

        positions.forEach(pos => {
          if (pos.id === positionId) {
            totalCost += updatedTotalCost;
          } else {
            const posMaterialsCost = parseFloat(pos.total_materials_cost) || 0;
            const posWorksCost = parseFloat(pos.total_works_cost) || 0;
            totalCost += posMaterialsCost + posWorksCost;
          }

          // Count items only if loaded
          const posItems = loadedPositionItems.get(pos.id) || [];
          totalWorks += posItems.filter(item =>
            item.item_type === 'work' || item.item_type === 'sub_work'
          ).length;
          totalMaterials += posItems.filter(item =>
            item.item_type === 'material' || item.item_type === 'sub_material'
          ).length;

          // Include additional works
          if (pos.additional_works) {
            pos.additional_works.forEach(add => {
              if (add.id === positionId) {
                totalCost += updatedTotalCost;
              } else {
                const addMaterialsCost = parseFloat(add.total_materials_cost) || 0;
                const addWorksCost = parseFloat(add.total_works_cost) || 0;
                totalCost += addMaterialsCost + addWorksCost;
              }

              const addItems = loadedPositionItems.get(add.id) || [];
              totalWorks += addItems.filter(item =>
                item.item_type === 'work' || item.item_type === 'sub_work'
              ).length;
              totalMaterials += addItems.filter(item =>
                item.item_type === 'material' || item.item_type === 'sub_material'
              ).length;
            });
          }
        });

        console.log('📊 Stats update:', { totalCost, totalWorks, totalMaterials });

        onStatsUpdate?.({
          positions: positions.length,
          works: totalWorks,
          materials: totalMaterials,
          total: totalCost
        });
      }

      console.log('✅ Position updated successfully');
      message.success('Позиция успешно обновлена');
    } catch (error) {
      console.error('❌ Error updating position:', error);
      message.error('Ошибка обновления позиции');
    }
  }, [loadPositionItems, positions, loadedPositionItems, onStatsUpdate, expandedPositions, clientPositionsApi]);

  // Handle create position
  const handleCreatePosition = async (values: any) => {
    try {
      const newPosition: ClientPositionInsert = {
        tender_id: tenderId,
        work_name: values.work_name,
        position_type: 'executable',
        hierarchy_level: 6,
        position_number: positions.length + 1,
        item_no: `${positions.length + 1}`
      };

      const result = await clientPositionsApi.create(newPosition);

      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Позиция создана');
      setCreateModalVisible(false);
      form.resetFields();
      loadPositions();
    } catch (error) {
      console.error('❌ Error creating position:', error);
      message.error('Ошибка создания позиции');
    }
  };

  // Initial load
  useEffect(() => {
    if (tenderId) {
      loadPositions();
    }
  }, [tenderId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <Title level={4} className="mb-0">
              <FolderOpenOutlined className="mr-2" />
              Позиции заказчика
            </Title>
            <Text type="secondary">
              {positions.length} позиций •
              {expandedPositions.size} развернуто •
              {loadedPositionItems.size} загружено
            </Text>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Создать позицию
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadPositions}
              loading={loading}
            >
              Обновить список
            </Button>
          </Space>
        </div>
      </Card>

      {/* Loading state */}
      {initialLoading ? (
        <Card className="text-center py-12">
          <Spin size="large" />
          <div className="mt-4">
            <Text type="secondary">Загрузка позиций...</Text>
          </div>
        </Card>
      ) : positions.length === 0 ? (
        <Card>
          <Empty
            description="Нет позиций заказчика"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => setCreateModalVisible(true)}
              icon={<PlusOutlined />}
            >
              Создать первую позицию
            </Button>
          </Empty>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortPositionsByNumber(positions.filter(p => !p.is_additional && !p.is_orphaned)).map(position => (
            <React.Fragment key={position.id}>
              <ClientPositionCardStreamlined
                position={{
                  ...position,
                  boq_items: loadedPositionItems.get(position.id) || position.boq_items
                }}
                isExpanded={expandedPositions.has(position.id)}
                onToggle={() => togglePosition(position.id)}
                onUpdate={() => forceRefreshPosition(position.id)}
                tenderId={tenderId}
                tender={tender}
                isLoading={loadingPositions.has(position.id)}
              />

              {/* Additional works for this position */}
              {position.additional_works?.map(additionalWork => (
                <div key={additionalWork.id} style={{ marginLeft: '32px', position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-20px',
                      top: '0',
                      bottom: '0',
                      width: '2px',
                      backgroundColor: '#faad14',
                      opacity: 0.5
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: '-20px',
                      top: '50%',
                      width: '20px',
                      height: '2px',
                      backgroundColor: '#faad14',
                      opacity: 0.5
                    }}
                  />

                  <ClientPositionCardStreamlined
                    position={{
                      ...additionalWork,
                      is_additional: true,
                      boq_items: loadedPositionItems.get(additionalWork.id) || additionalWork.boq_items
                    }}
                    isExpanded={expandedPositions.has(additionalWork.id)}
                    onToggle={() => togglePosition(additionalWork.id)}
                    onUpdate={() => forceRefreshPosition(additionalWork.id)}
                    tenderId={tenderId}
                    tender={tender}
                    isLoading={loadingPositions.has(additionalWork.id)}
                  />
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Orphaned Additional Works */}
          {positions.filter(p => p.is_orphaned).length > 0 && (
            <>
              <div style={{
                marginTop: '24px',
                marginBottom: '12px',
                padding: '8px 16px',
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '4px'
              }}>
                <Text strong style={{ color: '#fa8c16' }}>
                  Независимые ДОП работы (исходная позиция удалена)
                </Text>
              </div>

              {sortPositionsByNumber(positions.filter(p => p.is_orphaned)).map(orphanedWork => (
                <ClientPositionCardStreamlined
                  key={orphanedWork.id}
                  position={{
                    ...orphanedWork,
                    is_additional: true,
                    is_orphaned: true,
                    boq_items: loadedPositionItems.get(orphanedWork.id) || orphanedWork.boq_items
                  }}
                  isExpanded={expandedPositions.has(orphanedWork.id)}
                  onToggle={() => togglePosition(orphanedWork.id)}
                  onUpdate={() => forceRefreshPosition(orphanedWork.id)}
                  tenderId={tenderId}
                  tender={tender}
                  isLoading={loadingPositions.has(orphanedWork.id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Create Position Modal */}
      <Modal
        title="Создать позицию заказчика"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreatePosition}
          autoComplete="off"
        >
          <Form.Item
            name="work_name"
            label="Название позиции"
            rules={[{ required: true, message: 'Введите название позиции' }]}
          >
            <Input
              placeholder="Например: Монтаж электропроводки"
              size="large"
              autoFocus
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                Создать
              </Button>
              <Button
                onClick={() => {
                  setCreateModalVisible(false);
                  form.resetFields();
                }}
                size="large"
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default React.memo(TenderBOQManagerLazy);