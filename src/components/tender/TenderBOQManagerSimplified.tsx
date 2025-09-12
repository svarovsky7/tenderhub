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

interface TenderBOQManagerSimplifiedProps {
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
}

const TenderBOQManagerSimplified: React.FC<TenderBOQManagerSimplifiedProps> = ({ 
  tenderId,
  onStatsUpdate 
}) => {
  console.log('🚀 TenderBOQManagerSimplified MOUNTED/RENDERED for tender:', tenderId, 'at', new Date().toISOString());

  // Sort positions by position number only (preserving Excel file order)
  const sortPositionsByNumber = useCallback((positions: ClientPositionWithStats[]): ClientPositionWithStats[] => {
    return [...positions].sort((a, b) => {
      // Sort only by position number to preserve Excel file order
      return a.position_number - b.position_number;
    });
  }, []);

  const [positions, setPositions] = useState<ClientPositionWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [tender, setTender] = useState<{
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null>(null);
  const [tenderLoading, setTenderLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key for forcing component updates
  
  // Load tender data for currency rates
  useEffect(() => {
    const loadTenderData = async () => {
      if (!tenderId) {
        setTenderLoading(false);
        return;
      }
      
      setTenderLoading(true);
      try {
        console.log('🚀 Loading tender data for currency rates:', tenderId);
        
        // Direct Supabase query for debugging
        const { data: directData, error: directError } = await supabase
          .from('tenders')
          .select('id, title, usd_rate, eur_rate, cny_rate')
          .eq('id', tenderId)
          .single();
          
        console.log('🔴 DIRECT SUPABASE QUERY RESULT:', {
          directData,
          directError,
          json: JSON.stringify(directData)
        });
        
        // Use direct data if available, as it has the correct currency rates
        if (directData && !directError) {
          // Handle both array and object responses from Supabase
          const actualData = Array.isArray(directData) ? directData[0] : directData;
          
          console.log('✅ Using DIRECT Supabase data with rates:', {
            tender_name: actualData.title,
            usd_rate: actualData.usd_rate,
            eur_rate: actualData.eur_rate,
            cny_rate: actualData.cny_rate
          });
          
          // Create tender object with proper rates from direct query
          const tenderData = {
            usd_rate: actualData.usd_rate,
            eur_rate: actualData.eur_rate,
            cny_rate: actualData.cny_rate
          };
          
          console.log('📦 Setting tender state from DIRECT data:', tenderData);
          console.log('📦 Tender state JSON:', JSON.stringify(tenderData));
          setTender(tenderData);
        } else {
          // Fallback to API if direct query fails
          const { data, error } = await tendersApi.getById(tenderId);
          
          if (error) {
            console.error('❌ Error loading tender:', error);
            setTenderLoading(false);
            return;
          }
          
          if (data) {
            console.log('🔥 RAW API DATA:', data);
            console.log('🔥 RAW API DATA JSON:', JSON.stringify(data));
            console.log('🔥 API DATA KEYS:', Object.keys(data));
            
            // Log each property individually
            console.log('📍 data.usd_rate =', data.usd_rate);
            console.log('📍 data["usd_rate"] =', data["usd_rate"]);
            console.log('📍 data.eur_rate =', data.eur_rate);
            console.log('📍 data["eur_rate"] =', data["eur_rate"]);
            console.log('📍 data.cny_rate =', data.cny_rate);
            console.log('📍 data["cny_rate"] =', data["cny_rate"]);
            
            console.log('✅ Tender loaded with rates:', {
              tender_name: data.title,
              usd_rate: data.usd_rate,
              usd_rate_type: typeof data.usd_rate,
              eur_rate: data.eur_rate,
              eur_rate_type: typeof data.eur_rate,
              cny_rate: data.cny_rate,
              cny_rate_type: typeof data.cny_rate,
              full_data_keys: Object.keys(data),
              raw_data: JSON.stringify(data)
            });
            
            // Create tender object with proper rates
            const tenderData = {
              usd_rate: data.usd_rate || null,
              eur_rate: data.eur_rate || null,
              cny_rate: data.cny_rate || null
            };
            
            console.log('📦 Setting tender state:', tenderData);
            console.log('📦 Tender state JSON:', JSON.stringify(tenderData));
            setTender(tenderData);
          } else {
            console.warn('⚠️ No tender data returned for ID:', tenderId);
          }
        }
      } catch (error) {
        console.error('💥 Critical error loading tender:', error);
      } finally {
        setTenderLoading(false);
      }
    };
    
    loadTenderData();
  }, [tenderId]);
  
  // Track component lifecycle
  useEffect(() => {
    console.log('🟢 TenderBOQManagerSimplified MOUNTED for tender:', tenderId);
    return () => {
      console.log('🔴 TenderBOQManagerSimplified UNMOUNTING for tender:', tenderId);
    };
  }, []);

  // Monitor tender state changes
  useEffect(() => {
    console.log('📊 [TenderBOQManagerSimplified] Tender state changed:', {
      tender,
      is_null: tender === null,
      usd_rate: tender?.usd_rate,
      eur_rate: tender?.eur_rate,
      cny_rate: tender?.cny_rate
    });
  }, [tender]);

  // Calculate and update stats
  const updateStats = useCallback((positionsList: ClientPositionWithStats[]) => {
    const stats = {
      positions: positionsList.length,
      works: 0,
      materials: 0,
      total: 0
    };

    positionsList.forEach(position => {
      const items = position.boq_items || [];
      stats.works += items.filter(item => item.item_type === 'work' || item.item_type === 'sub_work').length;
      stats.materials += items.filter(item => item.item_type === 'material' || item.item_type === 'sub_material').length;
      // Use the calculated total_position_cost which includes delivery
      stats.total += position.total_position_cost || 0;
      
      // Include additional works (ДОП) costs
      if (position.additional_works && position.additional_works.length > 0) {
        position.additional_works.forEach(additionalWork => {
          stats.total += additionalWork.total_position_cost || 0;
          const additionalItems = additionalWork.boq_items || [];
          stats.works += additionalItems.filter(item => item.item_type === 'work' || item.item_type === 'sub_work').length;
          stats.materials += additionalItems.filter(item => item.item_type === 'material' || item.item_type === 'sub_material').length;
        });
      }
    });

    console.log('📊 Stats calculated:', stats);
    onStatsUpdate?.(stats);
  }, []);

  // Load positions
  const loadPositions = useCallback(async () => {
    console.log('📡 Loading positions for tender:', tenderId);
    console.log('🔄 Force refresh triggered at:', new Date().toISOString());
    setLoading(true);
    try {
      // Force fresh data fetch by bypassing any potential caching
      // Use new API method to get positions with additional works
      const result = await clientPositionsApi.getPositionsWithAdditional(tenderId);
      let positionsData = [];
      let orphanedAdditionalData = [];
      
      if (result.error) {
        // Fallback to old method if new method not available
        console.log('⚠️ New API not available, using fallback');
        const fallbackResult = await clientPositionsApi.getByTenderId(tenderId, {}, { limit: 1000 });
        if (fallbackResult.error) {
          throw new Error(fallbackResult.error);
        }
        positionsData = fallbackResult.data || [];
      } else if (result.data) {
        // New API returns object with positions and orphanedAdditional
        if (result.data.positions) {
          positionsData = result.data.positions;
          orphanedAdditionalData = result.data.orphanedAdditional || [];
        } else {
          // Handle old API response format
          positionsData = result.data;
        }
      }
      
      console.log('✅ Positions loaded:', positionsData.length);
      console.log('📊 Positions refresh complete at:', new Date().toISOString());
      if (orphanedAdditionalData.length > 0) {
        console.log('📦 Orphaned additional works:', orphanedAdditionalData.length);
      }
      
      // Debug: Check if manual fields are loaded
      if (positionsData.length > 0) {
        console.log('🔍 First position data:', {
          id: positionsData[0].id,
          idType: typeof positionsData[0].id,
          manual_volume: positionsData[0].manual_volume,
          manual_note: positionsData[0].manual_note,
          work_name: positionsData[0].work_name,
          is_additional: positionsData[0].is_additional,
          parent_position_id: positionsData[0].parent_position_id,
          additional_works: positionsData[0].additional_works
        });
        
        // Check for positions with invalid IDs
        const invalidPositions = positionsData.filter(p => !p.id || p.id === 'undefined' || typeof p.id !== 'string');
        if (invalidPositions.length > 0) {
          console.error('❌ Found positions with invalid IDs:', invalidPositions);
        }
      }
      
      // Load BOQ items for each position with work-material links
      const positionsWithItems = await Promise.all(
        positionsData.map(async (pos) => {
          // Process additional works if they exist
          let additionalWorksWithItems = [];
          if (pos.additional_works && pos.additional_works.length > 0) {
            additionalWorksWithItems = await Promise.all(
              pos.additional_works.map(async (additionalWork) => {
                // Load BOQ items for additional work
                const { data: boqItems } = await boqApi.getByClientPositionId(additionalWork.id);
                const items = boqItems || [];
                
                // Load work-material links for additional work
                const { data: links } = await workMaterialLinksApi.getLinksByPosition(additionalWork.id);
                console.log('🔗 Links loaded for additional work:', {
                  id: additionalWork.id,
                  work_name: additionalWork.work_name,
                  links: links,
                  boq_items_count: items.length
                });
                
                // Process items with link information (same as main positions)
                const processedItems = items.map(item => {
                  if ((item.item_type === 'material' || item.item_type === 'sub_material') && links && links.length > 0) {
                    // Find ALL works this material is linked to
                    const materialLinks = links.filter(l => {
                      return l.material_boq_item_id === item.id || 
                             l.sub_material_boq_item_id === item.id ||
                             (l.material && l.material.id === item.id);
                    });
                    
                    if (materialLinks.length > 0) {
                      console.log('📎 Found links for material in additional work:', item.description, materialLinks);
                      return {
                        ...item,
                        work_links: materialLinks.map(link => ({
                          ...link,
                          material_quantity_per_work: link.material_quantity_per_work || link.material_consumption_coefficient || 1,
                          usage_coefficient: link.usage_coefficient || link.material_conversion_coefficient || 1
                        })),
                        work_link: materialLinks[0] ? {
                          ...materialLinks[0],
                          work_boq_item_id: materialLinks[0].work_boq_item_id,
                          sub_work_boq_item_id: materialLinks[0].sub_work_boq_item_id,
                          material_boq_item_id: materialLinks[0].material_boq_item_id,
                          sub_material_boq_item_id: materialLinks[0].sub_material_boq_item_id,
                          material_quantity_per_work: materialLinks[0].material_quantity_per_work || materialLinks[0].material_consumption_coefficient || 1,
                          usage_coefficient: materialLinks[0].usage_coefficient || materialLinks[0].material_conversion_coefficient || 1
                        } : undefined
                      };
                    }
                  } else if ((item.item_type === 'work' || item.item_type === 'sub_work') && links && links.length > 0) {
                    // Find materials linked to this work
                    const workLinks = links.filter(l => {
                      return l.work_boq_item_id === item.id || 
                             l.sub_work_boq_item_id === item.id ||
                             (l.work && l.work.id === item.id);
                    });
                    if (workLinks.length > 0) {
                      console.log('📎 Found materials for work in additional:', item.description, workLinks);
                      return {
                        ...item,
                        linked_materials: workLinks.map(wl => ({
                          ...wl,
                          material_quantity_per_work: wl.material_quantity_per_work || wl.material_consumption_coefficient || 1,
                          usage_coefficient: wl.usage_coefficient || wl.material_conversion_coefficient || 1
                        }))
                      };
                    }
                  }
                  return item;
                });
                
                // Calculate total for additional work including delivery
                let calculatedTotal = 0;
                processedItems.forEach(item => {
                  let quantity = item.quantity || 0;
                  const unitRate = item.unit_rate || 0;
                  
                  // For linked materials, calculate quantity based on work volume
                  if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
                    const work = processedItems.find(procItem => {
                      if (item.work_link.work_boq_item_id && 
                          procItem.id === item.work_link.work_boq_item_id && 
                          procItem.item_type === 'work') {
                        return true;
                      }
                      if (item.work_link.sub_work_boq_item_id && 
                          procItem.id === item.work_link.sub_work_boq_item_id && 
                          procItem.item_type === 'sub_work') {
                        return true;
                      }
                      return false;
                    });
                    
                    if (work) {
                      const consumptionCoef = item.consumption_coefficient || 
                                             item.work_link.material_quantity_per_work || 1;
                      const conversionCoef = item.conversion_coefficient || 
                                            item.work_link.usage_coefficient || 1;
                      const workQuantity = work.quantity || 0;
                      quantity = workQuantity * consumptionCoef * conversionCoef;
                    }
                  }
                  
                  // Apply currency conversion if needed
                  const currencyMultiplier = additionalWork.currency_type && additionalWork.currency_type !== 'RUB' && additionalWork.currency_rate 
                    ? additionalWork.currency_rate 
                    : 1;
                  let itemTotal = quantity * unitRate * currencyMultiplier;
                  
                  // Add delivery cost for materials
                  if (item.item_type === 'material' || item.item_type === 'sub_material') {
                    const deliveryType = item.delivery_price_type;
                    const deliveryAmount = item.delivery_amount || 0;
                    
                    if (deliveryType === 'amount') {
                      // Fixed amount per unit (already in RUB)
                      itemTotal += deliveryAmount * quantity;
                    } else if (deliveryType === 'not_included') {
                      // 3% of base cost
                      itemTotal += itemTotal * 0.03;
                    }
                  }
                  
                  calculatedTotal += itemTotal;
                });
                
                // Sort items: works first, then linked materials after their works, then unlinked materials
                const sortedItems = [];
                const unlinkedMaterials = [];
                
                // First pass: add works
                processedItems.forEach(item => {
                  if (item.item_type === 'work' || item.item_type === 'sub_work') {
                    sortedItems.push(item);
                    // Immediately add materials linked to this work
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
                
                // Add unlinked materials at the end
                sortedItems.push(...unlinkedMaterials);
                
                // Debug: check sorted items
                const linkedMaterials = sortedItems.filter(item => 
                  (item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link
                );
                if (sortedItems.length > 0) {
                  console.log('✅ ДОП работа after sorting:', {
                    work_name: additionalWork.work_name,
                    total_items: sortedItems.length,
                    linked_count: linkedMaterials.length,
                    sorted_order: sortedItems.map((si, idx) => ({
                      index: idx,
                      id: si.id,
                      type: si.item_type,
                      name: si.description,
                      has_link: !!si.work_link,
                      linked_to: si.work_link?.work_boq_item_id || si.work_link?.sub_work_boq_item_id
                    }))
                  });
                }
                
                return {
                  ...additionalWork,
                  boq_items: sortedItems,
                  materials_count: items.filter(item => item.item_type === 'material').length,
                  works_count: items.filter(item => item.item_type === 'work').length,
                  total_position_cost: calculatedTotal,
                  position_type: 'executable', // Убедимся, что ДОП работы имеют правильный тип
                  hierarchy_level: 6 // Executable level
                };
              })
            );
          }
          
          // Load BOQ items for this position
          const { data: boqItems } = await boqApi.getByClientPositionId(pos.id);
          
          const items = boqItems || [];
          
          // Load work-material links for this position
          const { data: links } = await workMaterialLinksApi.getLinksByPosition(pos.id);
          console.log('🔗 Links loaded for position:', pos.id, links);
          
          // Process items to add link information
          const processedItems = items.map(item => {
            if ((item.item_type === 'material' || item.item_type === 'sub_material') && links && links.length > 0) {
              // Find ALL works this material is linked to (material can be linked to multiple works)
              const materialLinks = links.filter(l => {
                // Check both regular material and sub_material fields
                return l.material_boq_item_id === item.id || 
                       l.sub_material_boq_item_id === item.id ||
                       (l.material && l.material.id === item.id);
              });
              
              if (materialLinks.length > 0) {
                console.log('📎 Found links for material:', item.description, materialLinks);
                return {
                  ...item,
                  // Support multiple links
                  work_links: materialLinks.map(link => ({
                    ...link,
                    material_quantity_per_work: link.material_quantity_per_work || link.material_consumption_coefficient || 1,
                    usage_coefficient: link.usage_coefficient || link.material_conversion_coefficient || 1
                  })),
                  // Keep single link for backward compatibility
                  work_link: materialLinks[0] ? {
                    ...materialLinks[0],
                    work_boq_item_id: materialLinks[0].work_boq_item_id,
                    sub_work_boq_item_id: materialLinks[0].sub_work_boq_item_id,
                    material_boq_item_id: materialLinks[0].material_boq_item_id,
                    sub_material_boq_item_id: materialLinks[0].sub_material_boq_item_id,
                    material_quantity_per_work: materialLinks[0].material_quantity_per_work || materialLinks[0].material_consumption_coefficient || 1,
                    usage_coefficient: materialLinks[0].usage_coefficient || materialLinks[0].material_conversion_coefficient || 1
                  } : undefined
                };
              }
            } else if ((item.item_type === 'work' || item.item_type === 'sub_work') && links && links.length > 0) {
              // Find materials linked to this work
              const workLinks = links.filter(l => {
                // Check both regular work and sub_work fields
                return l.work_boq_item_id === item.id || 
                       l.sub_work_boq_item_id === item.id ||
                       (l.work && l.work.id === item.id);
              });
              if (workLinks.length > 0) {
                console.log('📎 Found materials for work:', item.description, workLinks);
                return {
                  ...item,
                  linked_materials: workLinks.map(wl => ({
                    ...wl,
                    material_quantity_per_work: wl.material_quantity_per_work || wl.material_consumption_coefficient || 1,
                    usage_coefficient: wl.usage_coefficient || wl.material_conversion_coefficient || 1
                  }))
                };
              }
            }
            return item;
          });
          
          // Calculate total position cost from actual BOQ items including delivery
          let calculatedTotal = 0;
          processedItems.forEach(item => {
            let quantity = item.quantity || 0;
            const unitRate = item.unit_rate || 0;
            
            // For linked materials, calculate quantity based on work volume and coefficients
            if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
              // Find the linked work
              const work = processedItems.find(procItem => {
                if (item.work_link.work_boq_item_id && 
                    procItem.id === item.work_link.work_boq_item_id && 
                    procItem.item_type === 'work') {
                  return true;
                }
                if (item.work_link.sub_work_boq_item_id && 
                    procItem.id === item.work_link.sub_work_boq_item_id && 
                    procItem.item_type === 'sub_work') {
                  return true;
                }
                return false;
              });
              
              if (work) {
                // Get coefficients from BOQ item first, then from work_link
                const consumptionCoef = item.consumption_coefficient || 
                                       item.work_link.material_quantity_per_work || 1;
                const conversionCoef = item.conversion_coefficient || 
                                      item.work_link.usage_coefficient || 1;
                const workQuantity = work.quantity || 0;
                quantity = workQuantity * consumptionCoef * conversionCoef;
              }
            }
            
            // Apply currency conversion if needed
            const currencyMultiplier = item.currency_type && item.currency_type !== 'RUB' && item.currency_rate 
              ? item.currency_rate 
              : 1;
            let itemTotal = quantity * unitRate * currencyMultiplier;
            
            // Add delivery cost for materials
            if (item.item_type === 'material' || item.item_type === 'sub_material') {
              const deliveryType = item.delivery_price_type;
              const deliveryAmount = item.delivery_amount || 0;
              
              if (deliveryType === 'amount') {
                // Fixed amount per unit (already in RUB)
                itemTotal += deliveryAmount * quantity;
              } else if (deliveryType === 'not_included') {
                // 3% of base cost
                itemTotal += itemTotal * 0.03;
              }
            }
            
            calculatedTotal += itemTotal;
          });
          
          // Sort items: works first, then linked materials after their works, then unlinked materials
          const sortedItems = [];
          const unlinkedMaterials = [];
          
          // First pass: add works
          processedItems.forEach(item => {
            if (item.item_type === 'work' || item.item_type === 'sub_work') {
              sortedItems.push(item);
              // Immediately add materials linked to this work
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
          
          // Add unlinked materials at the end
          sortedItems.push(...unlinkedMaterials);
          
          return {
            ...pos,
            boq_items: sortedItems,
            materials_count: items.filter(item => item.item_type === 'material').length,
            works_count: items.filter(item => item.item_type === 'work').length,
            total_position_cost: calculatedTotal,
            // Ensure manual fields are preserved
            manual_volume: pos.manual_volume,
            manual_note: pos.manual_note,
            // Include processed additional works
            additional_works: additionalWorksWithItems
          };
        })
      );
      
      // Process orphaned additional works (same as regular positions)
      let orphanedWithItems = [];
      if (orphanedAdditionalData.length > 0) {
        orphanedWithItems = await Promise.all(
          orphanedAdditionalData.map(async (orphaned) => {
            // Load BOQ items for orphaned additional work
            const { data: boqItems } = await boqApi.getByClientPositionId(orphaned.id);
            const items = boqItems || [];
            
            // Load work-material links for orphaned additional work
            const { data: links } = await workMaterialLinksApi.getLinksByPosition(orphaned.id);
            console.log('🔗 Links loaded for orphaned additional work:', orphaned.id, links);
            
            // Process items with link information (same as regular positions)
            const processedItems = items.map(item => {
              if ((item.item_type === 'material' || item.item_type === 'sub_material') && links && links.length > 0) {
                // Find ALL works this material is linked to
                const materialLinks = links.filter(l => {
                  return l.material_boq_item_id === item.id || 
                         l.sub_material_boq_item_id === item.id ||
                         (l.material && l.material.id === item.id);
                });
                
                if (materialLinks.length > 0) {
                  console.log('📎 Found links for material in orphaned work:', item.description, materialLinks);
                  return {
                    ...item,
                    work_links: materialLinks.map(link => ({
                      ...link,
                      material_quantity_per_work: link.material_quantity_per_work || link.material_consumption_coefficient || 1,
                      usage_coefficient: link.usage_coefficient || link.material_conversion_coefficient || 1
                    })),
                    work_link: materialLinks[0] ? {
                      ...materialLinks[0],
                      work_boq_item_id: materialLinks[0].work_boq_item_id,
                      sub_work_boq_item_id: materialLinks[0].sub_work_boq_item_id,
                      material_boq_item_id: materialLinks[0].material_boq_item_id,
                      sub_material_boq_item_id: materialLinks[0].sub_material_boq_item_id,
                      material_quantity_per_work: materialLinks[0].material_quantity_per_work || materialLinks[0].material_consumption_coefficient || 1,
                      usage_coefficient: materialLinks[0].usage_coefficient || materialLinks[0].material_conversion_coefficient || 1
                    } : undefined
                  };
                }
              } else if ((item.item_type === 'work' || item.item_type === 'sub_work') && links && links.length > 0) {
                // Find materials linked to this work
                const workLinks = links.filter(l => {
                  return l.work_boq_item_id === item.id || 
                         l.sub_work_boq_item_id === item.id ||
                         (l.work && l.work.id === item.id);
                });
                if (workLinks.length > 0) {
                  console.log('📎 Found materials for work in orphaned:', item.description, workLinks);
                  return {
                    ...item,
                    linked_materials: workLinks.map(wl => ({
                      ...wl,
                      material_quantity_per_work: wl.material_quantity_per_work || wl.material_consumption_coefficient || 1,
                      usage_coefficient: wl.usage_coefficient || wl.material_conversion_coefficient || 1
                    }))
                  };
                }
              }
              return item;
            });
            
            // Calculate total including delivery
            let calculatedTotal = 0;
            processedItems.forEach(item => {
              let quantity = item.quantity || 0;
              const unitRate = item.unit_rate || 0;
              
              // For linked materials, calculate quantity based on work volume
              if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
                const work = processedItems.find(procItem => {
                  if (item.work_link.work_boq_item_id && 
                      procItem.id === item.work_link.work_boq_item_id && 
                      procItem.item_type === 'work') {
                    return true;
                  }
                  if (item.work_link.sub_work_boq_item_id && 
                      procItem.id === item.work_link.sub_work_boq_item_id && 
                      procItem.item_type === 'sub_work') {
                    return true;
                  }
                  return false;
                });
                
                if (work) {
                  const consumptionCoef = item.consumption_coefficient || 
                                         item.work_link.material_quantity_per_work || 1;
                  const conversionCoef = item.conversion_coefficient || 
                                        item.work_link.usage_coefficient || 1;
                  const workQuantity = work.quantity || 0;
                  quantity = workQuantity * consumptionCoef * conversionCoef;
                }
              }
              
              // Apply currency conversion if needed
              const currencyMultiplier = item.currency_type && item.currency_type !== 'RUB' && item.currency_rate 
                ? item.currency_rate 
                : 1;
              let itemTotal = quantity * unitRate * currencyMultiplier;
              
              // Add delivery cost for materials
              if (item.item_type === 'material' || item.item_type === 'sub_material') {
                const deliveryType = item.delivery_price_type;
                const deliveryAmount = item.delivery_amount || 0;
                
                if (deliveryType === 'amount') {
                  // Fixed amount per unit (already in RUB)
                  itemTotal += deliveryAmount * quantity;
                } else if (deliveryType === 'not_included') {
                  // 3% of base cost
                  itemTotal += itemTotal * 0.03;
                }
              }
              
              calculatedTotal += itemTotal;
            });
            
            // Sort items: works first, then linked materials after their works, then unlinked materials
            const sortedItems = [];
            const unlinkedMaterials = [];
            
            // First pass: add works
            processedItems.forEach(item => {
              if (item.item_type === 'work' || item.item_type === 'sub_work') {
                sortedItems.push(item);
                // Immediately add materials linked to this work
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
            
            // Add unlinked materials at the end
            sortedItems.push(...unlinkedMaterials);
            
            // Debug: check orphaned sorted items
            const linkedMats = sortedItems.filter(item => 
              (item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link
            );
            if (sortedItems.length > 0) {
              console.log('✅ Orphaned ДОП работа after sorting:', {
                work_name: orphaned.work_name,
                total_items: sortedItems.length,
                linked_count: linkedMats.length,
                sorted_order: sortedItems.map((si, idx) => ({
                  index: idx,
                  id: si.id,
                  type: si.item_type,
                  name: si.description,
                  has_link: !!si.work_link,
                  linked_to: si.work_link?.work_boq_item_id || si.work_link?.sub_work_boq_item_id
                }))
              });
            }
            
            return {
              ...orphaned,
              boq_items: sortedItems,
              materials_count: items.filter(item => item.item_type === 'material').length,
              works_count: items.filter(item => item.item_type === 'work').length,
              total_position_cost: calculatedTotal,
              is_orphaned: true, // Mark as orphaned for UI display
              position_type: 'executable', // Убедимся, что orphaned ДОП работы имеют правильный тип
              hierarchy_level: 6 // Executable level
            };
          })
        );
      }
      
      // Combine all positions
      const allPositions = [...positionsWithItems, ...orphanedWithItems];
      
      // Filter out positions with invalid IDs before setting state
      const validPositions = allPositions.filter(pos => {
        if (!pos.id || pos.id === 'undefined' || typeof pos.id !== 'string') {
          console.error('❌ Filtering out position with invalid ID during load:', {
            id: pos.id,
            type: typeof pos.id,
            work_name: pos.work_name
          });
          return false;
        }
        return true;
      });
      
      console.log('✅ Positions with items loaded:', validPositions.length);
      if (orphanedWithItems.length > 0) {
        console.log('📦 Orphaned additional works processed:', orphanedWithItems.length);
      }
      setPositions(validPositions);
      updateStats(validPositions);
      // Force component refresh after data load
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('❌ Load positions error:', error);
      message.error('Ошибка загрузки позиций');
    } finally {
      setLoading(false);
    }
  }, [tenderId, updateStats]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Toggle position expansion
  const togglePosition = useCallback((positionId: string) => {
    console.log('🔄 Toggling position:', positionId);
    setExpandedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(positionId)) {
        newSet.delete(positionId);
      } else {
        newSet.add(positionId);
      }
      return newSet;
    });
  }, []);

  // Create new position
  const handleCreatePosition = useCallback(async (values: any) => {
    console.log('🚀 Creating new position:', values);
    setLoading(true);
    try {
      const nextNumber = positions.length > 0 
        ? Math.max(...positions.map(p => p.position_number)) + 1
        : 1;
        
      const positionData: ClientPositionInsert = {
        tender_id: tenderId,
        position_number: nextNumber,
        item_no: `${nextNumber}`,
        work_name: values.work_name,
        total_materials_cost: 0,
        total_works_cost: 0
      };

      const result = await clientPositionsApi.create(positionData);
      if (result.error) {
        throw new Error(result.error);
      }

      console.log('✅ Position created successfully');
      message.success('Позиция создана');
      setCreateModalVisible(false);
      form.resetFields();
      loadPositions();
    } catch (error) {
      console.error('❌ Create position error:', error);
      message.error('Ошибка создания позиции');
    } finally {
      setLoading(false);
    }
  }, [tenderId, positions, form, loadPositions]);

  // Show loading state while tender is loading
  if (tenderLoading) {
    return (
      <div className="w-full">
        <Card className="shadow-sm mb-3 w-full" bodyStyle={{ padding: '10px 16px' }}>
          <div className="flex justify-center items-center py-8">
            <Spin tip="Загрузка курсов валют..." size="large" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <Card className="shadow-sm mb-3 w-full" bodyStyle={{ padding: '10px 16px' }}>
        <div className="flex flex-col">
          <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
            {/* Statistics */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <FolderOpenOutlined className="text-blue-500" style={{ fontSize: 16 }} />
                <div className="flex items-baseline gap-1">
                  <Text type="secondary" className="text-xs" style={{ cursor: 'default' }}>Позиций:</Text>
                  <Text strong className="text-sm" style={{ cursor: 'default' }}>{positions.length}</Text>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <BuildOutlined className="text-orange-500" style={{ fontSize: 16 }} />
                <div className="flex items-baseline gap-1">
                  <Text type="secondary" className="text-xs" style={{ cursor: 'default' }}>Работ:</Text>
                  <Text strong className="text-sm" style={{ cursor: 'default' }}>
                    {positions.reduce((sum, pos) => 
                      sum + (pos.boq_items?.filter(item => 
                        item.item_type === 'work' || item.item_type === 'sub_work'
                      ).length || 0), 0
                    )}
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <ToolOutlined className="text-purple-500" style={{ fontSize: 16 }} />
                <div className="flex items-baseline gap-1">
                  <Text type="secondary" className="text-xs" style={{ cursor: 'default' }}>Материалов:</Text>
                  <Text strong className="text-sm" style={{ cursor: 'default' }}>
                    {positions.reduce((sum, pos) => 
                      sum + (pos.boq_items?.filter(item => 
                        item.item_type === 'material' || item.item_type === 'sub_material'
                      ).length || 0), 0
                    )}
                  </Text>
                </div>
              </div>
            </div>
            
            {/* Buttons */}
            <Space className="flex-shrink-0 flex items-center" size="small">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadPositions}
              loading={loading}
              size="middle"
            >
              Обновить
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              size="middle"
            >
              Новая позиция
            </Button>
          </Space>
          </div>
        </div>
      </Card>

      {/* Positions List */}
      {loading && positions.length === 0 ? (
        <Card className="text-center py-12 w-full">
          <Spin size="large" />
        </Card>
      ) : positions.length === 0 ? (
        <Card className="w-full">
          <Empty
            description="Нет позиций заказчика"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              size="large"
            >
              Создать первую позицию
            </Button>
          </Empty>
        </Card>
      ) : (
        <div className="space-y-3 w-full">
          {/* Regular positions and their linked additional works */}
          {sortPositionsByNumber(positions.filter(p => !p.is_orphaned)).map(position => {
            // Validate position before rendering
            if (!position.id || position.id === 'undefined' || typeof position.id !== 'string') {
              console.error('❌ Skipping position with invalid ID:', {
                id: position.id,
                type: typeof position.id,
                work_name: position.work_name
              });
              return null;
            }
            
            return (
            <React.Fragment key={`${position.id}-${refreshKey}`}>
              {/* Main position */}
              <ClientPositionCardStreamlined
                position={position}
                isExpanded={expandedPositions.has(position.id)}
                onToggle={() => togglePosition(position.id)}
                onUpdate={loadPositions}
                tenderId={tenderId}
                tender={tender}
              />
              
              {/* Additional works for this position */}
              {position.additional_works && position.additional_works.map(additionalWork => {
                // Validate additional work before rendering
                if (!additionalWork.id || additionalWork.id === 'undefined') {
                  console.error('❌ Skipping additional work with invalid ID:', additionalWork);
                  return null;
                }
                
                return (
                <div 
                  key={additionalWork.id}
                  style={{ 
                    marginLeft: '40px',
                    position: 'relative'
                  }}
                >
                  {/* Visual connector line */}
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
                      boq_items: additionalWork.boq_items // Явно передаем boq_items с привязками
                    }}
                    isExpanded={expandedPositions.has(additionalWork.id)}
                    onToggle={() => togglePosition(additionalWork.id)}
                    onUpdate={loadPositions}
                    tenderId={tenderId}
                    tender={tender}
                  />
                </div>
                );
              })}
            </React.Fragment>
            );
          })}
          
          {/* Orphaned Additional Works Section */}
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
                  key={`${orphanedWork.id}-${refreshKey}`}
                  position={{
                    ...orphanedWork,
                    is_additional: true,
                    is_orphaned: true,
                    boq_items: orphanedWork.boq_items // Явно передаем boq_items с привязками
                  }}
                  isExpanded={expandedPositions.has(orphanedWork.id)}
                  onToggle={() => togglePosition(orphanedWork.id)}
                  onUpdate={loadPositions}
                  tenderId={tenderId}
                  tender={tender}
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
              placeholder="Например: Земляные работы" 
              size="large"
              autoFocus
            />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}
              size="large"
            >
              Отмена
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
            >
              Создать позицию
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TenderBOQManagerSimplified;