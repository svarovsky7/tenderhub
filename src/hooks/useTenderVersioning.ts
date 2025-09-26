import { useState, useCallback } from 'react';
import { message } from 'antd';
import { supabase } from '../lib/supabase/client';
import { tenderVersioningApi } from '../lib/supabase/api/tender-versioning';
import type { TenderVersionMapping } from '../lib/supabase/api/tender-versioning';

interface TransferOptions {
  transferBOQ?: boolean;
  transferDOP?: boolean;
  transferCommercialCosts?: boolean;
  onlyConfirmedMappings?: boolean;
}

interface TransferResult {
  success: boolean;
  transferredPositions: number;
  transferredBOQItems: number;
  transferredDOPs: number;
  errors: string[];
}

export const useTenderVersioning = () => {
  const [transferring, setTransferring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');

  /**
   * Перенос данных между версиями тендера
   */
  const transferDataBetweenVersions = useCallback(async (
    oldTenderId: string,
    newTenderId: string,
    mappings: TenderVersionMapping[],
    options: TransferOptions = {}
  ): Promise<TransferResult> => {
    console.log('🚀 Starting data transfer between versions:', {
      oldTenderId,
      newTenderId,
      mappingsCount: mappings.length,
      options
    });

    const {
      transferBOQ = true,
      transferDOP = true,
      transferCommercialCosts = false,
      onlyConfirmedMappings = true
    } = options;

    const result: TransferResult = {
      success: false,
      transferredPositions: 0,
      transferredBOQItems: 0,
      transferredDOPs: 0,
      errors: []
    };

    setTransferring(true);
    setProgress(0);

    try {
      // Фильтруем маппинги
      const validMappings = onlyConfirmedMappings
        ? mappings.filter(m => m.mapping_status === 'confirmed')
        : mappings.filter(m => m.mapping_status !== 'rejected');

      console.log(`📊 Processing ${validMappings.length} valid mappings`);

      const totalSteps = validMappings.length + (transferDOP ? 1 : 0) + (transferCommercialCosts ? 1 : 0);
      let currentStep = 0;

      // Переносим BOQ items для каждого маппинга
      if (transferBOQ) {
        for (const mapping of validMappings) {
          if (mapping.action_type === 'copy_boq' && mapping.old_position_id && mapping.new_position_id) {
            setCurrentOperation(`Перенос BOQ для позиции ${mapping.old_position_number}`);

            try {
              // Получаем BOQ items из старой позиции
              const { data: oldItems, error: fetchError } = await supabase
                .from('boq_items')
                .select('*')
                .eq('client_position_id', mapping.old_position_id);

              if (fetchError) {
                result.errors.push(`Ошибка получения BOQ для позиции ${mapping.old_position_number}: ${fetchError.message}`);
                continue;
              }

              if (oldItems && oldItems.length > 0) {
                // Создаем маппинг старых ID к новым для work_material_links
                const itemIdMapping = new Map<string, string>();

                // Копируем BOQ items
                for (const item of oldItems) {
                  const { id: oldId, created_at, updated_at, ...itemData } = item;

                  const { data: newItem, error: insertError } = await supabase
                    .from('boq_items')
                    .insert({
                      ...itemData,
                      tender_id: newTenderId,
                      client_position_id: mapping.new_position_id
                    })
                    .select()
                    .single();

                  if (insertError) {
                    result.errors.push(`Ошибка копирования BOQ item: ${insertError.message}`);
                  } else if (newItem) {
                    itemIdMapping.set(oldId, newItem.id);
                    result.transferredBOQItems++;
                  }
                }

                // Переносим work_material_links
                const { data: oldLinks, error: linksError } = await supabase
                  .from('work_material_links')
                  .select('*')
                  .eq('client_position_id', mapping.old_position_id);

                if (!linksError && oldLinks) {
                  for (const link of oldLinks) {
                    const newWorkId = link.work_boq_item_id ? itemIdMapping.get(link.work_boq_item_id) : null;
                    const newMaterialId = link.material_boq_item_id ? itemIdMapping.get(link.material_boq_item_id) : null;

                    if (newWorkId || newMaterialId) {
                      await supabase
                        .from('work_material_links')
                        .insert({
                          ...link,
                          id: undefined,
                          client_position_id: mapping.new_position_id,
                          work_boq_item_id: newWorkId,
                          material_boq_item_id: newMaterialId,
                          created_at: undefined,
                          updated_at: undefined
                        });
                    }
                  }
                }
              }

              result.transferredPositions++;
            } catch (error) {
              console.error('Error transferring BOQ:', error);
              result.errors.push(`Ошибка переноса BOQ: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          currentStep++;
          setProgress(Math.round((currentStep / totalSteps) * 100));
        }
      }

      // Переносим ДОП позиции
      if (transferDOP) {
        setCurrentOperation('Перенос ДОП позиций...');

        try {
          const { data: dopCount, error: dopError } = await supabase.rpc('transfer_dop_positions', {
            p_old_tender_id: oldTenderId,
            p_new_tender_id: newTenderId
          });

          if (dopError) {
            result.errors.push(`Ошибка переноса ДОП: ${dopError.message}`);
          } else if (dopCount) {
            result.transferredDOPs = dopCount;
            console.log(`✅ Transferred ${dopCount} DOP positions`);
          }
        } catch (error) {
          console.error('Error transferring DOPs:', error);
          result.errors.push(`Ошибка переноса ДОП: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        currentStep++;
        setProgress(Math.round((currentStep / totalSteps) * 100));
      }

      // Переносим коммерческие затраты (если включено)
      if (transferCommercialCosts) {
        setCurrentOperation('Перенос коммерческих затрат...');

        try {
          // Получаем коммерческие затраты из старого тендера
          const { data: oldCosts, error: costsError } = await supabase
            .from('commercial_costs')
            .select('*')
            .eq('tender_id', oldTenderId);

          if (!costsError && oldCosts) {
            // Копируем в новый тендер
            for (const cost of oldCosts) {
              const { id, created_at, updated_at, ...costData } = cost;
              await supabase
                .from('commercial_costs')
                .insert({
                  ...costData,
                  tender_id: newTenderId
                });
            }

            console.log(`✅ Transferred ${oldCosts.length} commercial costs`);
          }
        } catch (error) {
          console.error('Error transferring commercial costs:', error);
          result.errors.push(`Ошибка переноса коммерческих затрат: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        currentStep++;
        setProgress(Math.round((currentStep / totalSteps) * 100));
      }

      result.success = result.errors.length === 0;
      setProgress(100);

      if (result.success) {
        message.success(`Успешно перенесено: ${result.transferredPositions} позиций, ${result.transferredBOQItems} BOQ элементов, ${result.transferredDOPs} ДОП`);
      } else {
        message.warning(`Перенос завершен с ошибками: ${result.errors.length} ошибок`);
      }

      return result;
    } catch (error) {
      console.error('💥 Critical error in data transfer:', error);
      result.errors.push(`Критическая ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
      message.error('Критическая ошибка при переносе данных');
      return result;
    } finally {
      setTransferring(false);
      setCurrentOperation('');
    }
  }, []);

  /**
   * Сравнение версий тендера
   */
  const compareVersions = useCallback(async (
    oldTenderId: string,
    newTenderId: string
  ) => {
    console.log('🚀 Comparing tender versions:', { oldTenderId, newTenderId });

    try {
      // Получаем позиции из обеих версий
      const [oldPositions, newPositions] = await Promise.all([
        supabase
          .from('client_positions')
          .select('*')
          .eq('tender_id', oldTenderId)
          .order('position_number'),
        supabase
          .from('client_positions')
          .select('*')
          .eq('tender_id', newTenderId)
          .order('position_number')
      ]);

      if (oldPositions.error || newPositions.error) {
        throw new Error('Failed to fetch positions for comparison');
      }

      // Анализируем изменения
      const oldPositionsMap = new Map((oldPositions.data || []).map(p => [p.work_name, p]));
      const newPositionsMap = new Map((newPositions.data || []).map(p => [p.work_name, p]));

      const added = Array.from(newPositionsMap.keys()).filter(k => !oldPositionsMap.has(k));
      const removed = Array.from(oldPositionsMap.keys()).filter(k => !newPositionsMap.has(k));
      const modified = Array.from(oldPositionsMap.keys()).filter(k => {
        if (!newPositionsMap.has(k)) return false;
        const oldPos = oldPositionsMap.get(k);
        const newPos = newPositionsMap.get(k);
        return oldPos?.unit !== newPos?.unit || oldPos?.volume !== newPos?.volume;
      });

      return {
        added: added.length,
        removed: removed.length,
        modified: modified.length,
        total: newPositions.data?.length || 0
      };
    } catch (error) {
      console.error('Error comparing versions:', error);
      message.error('Ошибка при сравнении версий');
      return null;
    }
  }, []);

  return {
    transferDataBetweenVersions,
    compareVersions,
    transferring,
    progress,
    currentOperation
  };
};