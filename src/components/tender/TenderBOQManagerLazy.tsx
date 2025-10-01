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
import { PlusOutlined, ReloadOutlined, FolderOpenOutlined, BuildOutlined, ToolOutlined, FileExcelOutlined } from '@ant-design/icons';
import { clientPositionsApi, boqApi, tendersApi } from '../../lib/supabase/api';
import { supabase } from '../../lib/supabase/client';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import ClientPositionCardStreamlined from './ClientPositionCardStreamlined';
import type { ClientPositionInsert, ClientPositionType } from '../../lib/supabase/types';
import { exportBOQToExcel } from '../../utils/excel-templates';

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
  const [exportLoading, setExportLoading] = useState(false);

  // Store initial total cost to prevent reset on position expand
  const [initialTotalCost, setInitialTotalCost] = useState<number | null>(null);

  // Modal and forms
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Tender data for currency rates and export
  const [tender, setTender] = useState<{
    title?: string;
    version?: number;
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
          .select('id, title, version, usd_rate, eur_rate, cny_rate')
          .eq('id', tenderId)
          .single();

        if (directData && !directError) {
          const actualData = Array.isArray(directData) ? directData[0] : directData;
          setTender({
            title: actualData.title,
            version: actualData.version || 1,
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
    console.log('📡 [TenderBOQManagerLazy] Loading positions (without BOQ items) for tender:', tenderId);
    console.log('🔍 [TenderBOQManagerLazy] Tender ID type:', typeof tenderId);
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
      console.log('📊 [TenderBOQManagerLazy] First 3 positions:', positionsData.slice(0, 3).map(p => ({
        id: p.id,
        name: p.work_name,
        materials_cost: p.total_materials_cost,
        works_cost: p.total_works_cost
      })));

      // Get statistics for all positions
      const allPositionIds = [];
      positionsData.forEach(position => {
        allPositionIds.push(position.id);
        // Include additional works IDs
        if (position.additional_works && Array.isArray(position.additional_works)) {
          position.additional_works.forEach(add => {
            allPositionIds.push(add.id);
          });
        }
      });

      // Load statistics (works and materials counts)
      const statsResult = await clientPositionsApi.getPositionStatistics(allPositionIds);
      const statistics = statsResult.data || {};

      // Calculate total from all positions and apply statistics
      let totalCost = 0;
      let totalWorks = 0;
      let totalMaterials = 0;

      positionsData.forEach(position => {
        // Parse to numbers to ensure correct calculation
        const materialsCost = parseFloat(position.total_materials_cost) || 0;
        const worksCost = parseFloat(position.total_works_cost) || 0;
        const posCost = materialsCost + worksCost;

        totalCost += posCost;

        // Also set total_position_cost for display
        position.total_position_cost = posCost;

        // Apply statistics from database
        const posStats = statistics[position.id] || { works_count: 0, materials_count: 0 };
        position.works_count = posStats.works_count;
        position.materials_count = posStats.materials_count;
        totalWorks += posStats.works_count;
        totalMaterials += posStats.materials_count;

        console.log(`Position ${position.work_name}: Materials=${materialsCost}, Works=${worksCost}, Total=${posCost}, WorksCount=${posStats.works_count}, MaterialsCount=${posStats.materials_count}`);

        // Include additional works in the total
        if (position.additional_works && Array.isArray(position.additional_works)) {
          position.additional_works.forEach(add => {
            const addMaterialsCost = parseFloat(add.total_materials_cost) || 0;
            const addWorksCost = parseFloat(add.total_works_cost) || 0;
            const addCost = addMaterialsCost + addWorksCost;

            totalCost += addCost;

            // Also set total_position_cost for display
            add.total_position_cost = addCost;

            // Apply statistics for additional work
            const addStats = statistics[add.id] || { works_count: 0, materials_count: 0 };
            add.works_count = addStats.works_count;
            add.materials_count = addStats.materials_count;
            totalWorks += addStats.works_count;
            totalMaterials += addStats.materials_count;

            console.log(`  Additional ${add.work_name}: Materials=${addMaterialsCost}, Works=${addWorksCost}, Total=${addCost}, WorksCount=${addStats.works_count}, MaterialsCount=${addStats.materials_count}`);
          });
        }
      });

      console.log('📊 Total cost calculated:', totalCost);
      console.log('📊 Total works:', totalWorks, 'Total materials:', totalMaterials);

      // Set positions WITH statistics
      setPositions(positionsData);

      // Save initial total cost to prevent reset on position expand
      setInitialTotalCost(totalCost);

      // Update stats with position count, works/materials count and total
      onStatsUpdate?.({
        positions: positionsData.length,
        works: totalWorks,
        materials: totalMaterials,
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

      // Count works and materials from newly loaded items
      // But keep the initial total cost to prevent reset
      let totalWorks = worksCount;
      let totalMaterials = materialsCount;

      // Count items from all previously loaded positions
      positions.forEach(pos => {
        // Count items if loaded (but not the current position as we already counted it)
        if (pos.id !== positionId) {
          const items = loadedPositionItems.get(pos.id) || pos.boq_items || [];
          totalWorks += items.filter(item =>
            item.item_type === 'work' || item.item_type === 'sub_work'
          ).length;
          totalMaterials += items.filter(item =>
            item.item_type === 'material' || item.item_type === 'sub_material'
          ).length;
        }

        // Include additional works
        if (pos.additional_works) {
          pos.additional_works.forEach(add => {
            if (add.id !== positionId) {
              const addItems = loadedPositionItems.get(add.id) || add.boq_items || [];
              totalWorks += addItems.filter(item =>
                item.item_type === 'work' || item.item_type === 'sub_work'
              ).length;
              totalMaterials += addItems.filter(item =>
                item.item_type === 'material' || item.item_type === 'sub_material'
              ).length;
            }
          });
        }
      });

      // Update stats with work/material counts but preserve initial total cost
      onStatsUpdate?.({
        positions: positions.length,
        works: totalWorks,
        materials: totalMaterials,
        total: initialTotalCost || 0 // Use stored initial total to prevent reset
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
  }, [loadedPositionItems, loadingPositions, onStatsUpdate, positions, initialTotalCost]);

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

      // If position no longer exists (was deleted), remove it from state and return
      if (!updatedPosition) {
        console.log('🗑️ Position no longer exists, removing from state:', positionId);
        setPositions(prevPositions => {
          // Filter out the deleted position from main positions
          let newPositions = prevPositions.filter(pos => pos.id !== positionId);

          // Also filter out from additional_works arrays
          newPositions = newPositions.map(pos => {
            if (pos.additional_works) {
              const filteredAdditional = pos.additional_works.filter((add: any) => add.id !== positionId);
              if (filteredAdditional.length !== pos.additional_works.length) {
                return { ...pos, additional_works: filteredAdditional };
              }
            }
            return pos;
          });

          return newPositions;
        });

        // Also remove from caches
        setLoadedPositionItems(prev => {
          const next = new Map(prev);
          next.delete(positionId);
          return next;
        });
        setExpandedPositions(prev => {
          const next = new Set(prev);
          next.delete(positionId);
          return next;
        });

        return;
      }

      // Get fresh statistics for this position
      const statsResult = await clientPositionsApi.getPositionStatistics([positionId]);
      const positionStats = statsResult.data?.[positionId] || { works_count: 0, materials_count: 0 };

      // Also reload additional works for this position if it's not an additional work itself
      let additionalWorks = [];
      if (updatedPosition && !updatedPosition.is_additional) {
        console.log('🔄 Loading additional works for position:', positionId);
        // Get all positions for this tender and filter for additional works with this parent
        const { data: allPositions } = await clientPositionsApi.getByTenderId(
          updatedPosition.tender_id,
          { parent_position_id: positionId, is_additional: true },
          { limit: 100 }
        );

        if (allPositions && allPositions.length > 0) {
          additionalWorks = allPositions;
          console.log(`📊 Found ${additionalWorks.length} additional works for position ${positionId}`);
        }
      }

      if (updatedPosition) {
        // Calculate total_position_cost from components
        const updatedMaterialsCost = parseFloat(updatedPosition.total_materials_cost) || 0;
        const updatedWorksCost = parseFloat(updatedPosition.total_works_cost) || 0;
        const updatedTotalCost = updatedMaterialsCost + updatedWorksCost;

        console.log(`📊 Updated position costs: Materials=${updatedMaterialsCost}, Works=${updatedWorksCost}, Total=${updatedTotalCost}`);
        console.log(`📊 Updated position stats: WorksCount=${positionStats.works_count}, MaterialsCount=${positionStats.materials_count}`);

        setPositions(prevPositions =>
          prevPositions.map(pos => {
            if (pos.id === positionId) {
              return {
                ...pos,
                total_position_cost: updatedTotalCost,
                total_materials_cost: updatedMaterialsCost,
                total_works_cost: updatedWorksCost,
                materials_count: positionStats.materials_count,
                works_count: positionStats.works_count,
                boq_items: newItems !== undefined ? newItems : pos.boq_items,
                additional_works: additionalWorks.length > 0 ? additionalWorks : pos.additional_works
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
                    materials_count: positionStats.materials_count,
                    works_count: positionStats.works_count,
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
            // Use fresh stats for updated position
            totalWorks += positionStats.works_count;
            totalMaterials += positionStats.materials_count;
          } else {
            const posMaterialsCost = parseFloat(pos.total_materials_cost) || 0;
            const posWorksCost = parseFloat(pos.total_works_cost) || 0;
            totalCost += posMaterialsCost + posWorksCost;

            // Use cached counts if available, otherwise from position object
            if (pos.works_count !== undefined && pos.materials_count !== undefined) {
              totalWorks += pos.works_count;
              totalMaterials += pos.materials_count;
            } else {
              // Fallback to counting from loaded items
              const posItems = loadedPositionItems.get(pos.id) || [];
              totalWorks += posItems.filter(item =>
                item.item_type === 'work' || item.item_type === 'sub_work'
              ).length;
              totalMaterials += posItems.filter(item =>
                item.item_type === 'material' || item.item_type === 'sub_material'
              ).length;
            }
          }

          if (pos.additional_works) {
            pos.additional_works.forEach(add => {
              if (add.id === positionId) {
                totalCost += updatedTotalCost;
                // Use fresh stats for updated position (don't double count)
                // Stats already counted above for the main position check
              } else {
                const addMaterialsCost = parseFloat(add.total_materials_cost) || 0;
                const addWorksCost = parseFloat(add.total_works_cost) || 0;
                totalCost += addMaterialsCost + addWorksCost;

                // Use cached counts if available
                if (add.works_count !== undefined && add.materials_count !== undefined) {
                  totalWorks += add.works_count;
                  totalMaterials += add.materials_count;
                } else {
                  // Fallback to counting from loaded items
                  const addItems = loadedPositionItems.get(add.id) || [];
                  totalWorks += addItems.filter(item =>
                    item.item_type === 'work' || item.item_type === 'sub_work'
                  ).length;
                  totalMaterials += addItems.filter(item =>
                    item.item_type === 'material' || item.item_type === 'sub_material'
                  ).length;
                }
              }
            });
          }
        });

        console.log('📊 Stats update:', { totalCost, totalWorks, totalMaterials });

        // Update initial total cost when position data changes
        setInitialTotalCost(totalCost);

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

        // Calculate counts from loaded items if available
        let worksCount = 0;
        let materialsCount = 0;
        if (newItems) {
          worksCount = newItems.filter(item =>
            item.item_type === 'work' || item.item_type === 'sub_work'
          ).length;
          materialsCount = newItems.filter(item =>
            item.item_type === 'material' || item.item_type === 'sub_material'
          ).length;
          console.log(`📊 Calculated counts from ${newItems.length} loaded items: Works=${worksCount}, Materials=${materialsCount}`);
        } else {
          // Fall back to counts from position data
          worksCount = updatedPosition.works_count || 0;
          materialsCount = updatedPosition.materials_count || 0;
          console.log(`📊 Using counts from position data: Works=${worksCount}, Materials=${materialsCount}`);
        }

        console.log(`📊 Updated position costs: Materials=${updatedMaterialsCost}, Works=${updatedWorksCost}, Total=${updatedTotalCost}`);
        console.log(`📊 Setting position state with: Total=${updatedTotalCost}, Works=${worksCount}, Materials=${materialsCount}`);

        setPositions(prevPositions =>
          prevPositions.map(pos => {
            if (pos.id === positionId) {
              return {
                ...pos,
                total_position_cost: updatedTotalCost,
                total_materials_cost: updatedMaterialsCost,
                total_works_cost: updatedWorksCost,
                materials_count: materialsCount,
                works_count: worksCount,
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
                    materials_count: materialsCount,
                    works_count: worksCount,
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
            // Use the newly loaded items for the updated position
            if (newItems) {
              totalWorks += newItems.filter(item =>
                item.item_type === 'work' || item.item_type === 'sub_work'
              ).length;
              totalMaterials += newItems.filter(item =>
                item.item_type === 'material' || item.item_type === 'sub_material'
              ).length;
            } else {
              // If no new items, use cached count from position
              totalWorks += updatedPosition.works_count || 0;
              totalMaterials += updatedPosition.materials_count || 0;
            }
          } else {
            const posMaterialsCost = parseFloat(pos.total_materials_cost) || 0;
            const posWorksCost = parseFloat(pos.total_works_cost) || 0;
            totalCost += posMaterialsCost + posWorksCost;

            // Use cached counts from position if available
            if (pos.works_count !== undefined && pos.materials_count !== undefined) {
              totalWorks += pos.works_count;
              totalMaterials += pos.materials_count;
            } else {
              // Otherwise count from loaded items
              const posItems = loadedPositionItems.get(pos.id) || [];
              totalWorks += posItems.filter(item =>
                item.item_type === 'work' || item.item_type === 'sub_work'
              ).length;
              totalMaterials += posItems.filter(item =>
                item.item_type === 'material' || item.item_type === 'sub_material'
              ).length;
            }
          }

          // Include additional works
          if (pos.additional_works) {
            pos.additional_works.forEach(add => {
              if (add.id === positionId) {
                // Already counted in main check above, skip to avoid double counting
              } else {
                const addMaterialsCost = parseFloat(add.total_materials_cost) || 0;
                const addWorksCost = parseFloat(add.total_works_cost) || 0;
                totalCost += addMaterialsCost + addWorksCost;

                // Use cached counts from additional work if available
                if (add.works_count !== undefined && add.materials_count !== undefined) {
                  totalWorks += add.works_count;
                  totalMaterials += add.materials_count;
                } else {
                  // Otherwise count from loaded items
                  const addItems = loadedPositionItems.get(add.id) || [];
                  totalWorks += addItems.filter(item =>
                    item.item_type === 'work' || item.item_type === 'sub_work'
                  ).length;
                  totalMaterials += addItems.filter(item =>
                    item.item_type === 'material' || item.item_type === 'sub_material'
                  ).length;
                }
              }
            });
          }
        });

        console.log('📊 Stats update:', { totalCost, totalWorks, totalMaterials });

        // Update initial total cost when position data changes
        setInitialTotalCost(totalCost);

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

  // Export to Excel handler
  const handleExportToExcel = async () => {
    setExportLoading(true);
    try {
      // Show loading message - function will load all data internally
      const loadingMessage = message.loading('Экспорт данных в Excel...', 0);

      // Format tender name with version
      const tenderFullName = tender?.title
        ? `${tender.title} (Версия ${tender.version || 1})`
        : 'BOQ';

      // Pass null for boqItemsMap - function will load all data via batch APIs
      await exportBOQToExcel(positions, null, tenderFullName, tenderId);

      loadingMessage();
      message.success('Данные успешно экспортированы в Excel');
    } catch (error) {
      console.error('❌ Export error:', error);
      message.error('Ошибка при экспорте данных');
    } finally {
      setExportLoading(false);
    }
  };

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
              icon={<FileExcelOutlined />}
              onClick={handleExportToExcel}
              loading={exportLoading}
            >
              Экспорт в Excel
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