import { supabase } from '../client';
import type { ApiResponse } from '../types';

export interface TenderVersionMapping {
  id?: string;
  old_tender_id: string;
  new_tender_id: string;
  old_position_id?: string;
  new_position_id?: string;
  old_position_number?: string;
  old_work_name?: string;
  old_volume?: number;
  old_unit?: string;
  old_client_note?: string;
  old_item_no?: string;
  new_position_number?: string;
  new_work_name?: string;
  new_volume?: number;
  new_unit?: string;
  new_client_note?: string;
  new_item_no?: string;
  mapping_type?: 'exact' | 'fuzzy' | 'manual' | 'dop' | 'new' | 'deleted';
  confidence_score?: number;
  fuzzy_score?: number;
  context_score?: number;
  hierarchy_score?: number;
  mapping_status?: 'suggested' | 'confirmed' | 'rejected' | 'applied';
  action_type?: 'copy_boq' | 'create_new' | 'delete' | 'preserve_dop';
  is_dop?: boolean;
  parent_mapping_id?: string;
  notes?: string;
}

export interface PositionMatchingOptions {
  fuzzyThreshold?: number;
  contextWeight?: number;
  fuzzyWeight?: number;
  hierarchyWeight?: number;
  autoConfirmThreshold?: number;
}

export const tenderVersioningApi = {
  /**
   * Создать новую версию тендера
   */
  async createNewVersion(parentTenderId: string, createdBy?: string): Promise<ApiResponse<string>> {
    console.log('🚀 Creating new tender version from:', parentTenderId);

    try {
      const { data, error } = await supabase.rpc('create_tender_version', {
        p_parent_tender_id: parentTenderId,
        p_created_by: createdBy || null
      });

      if (error) {
        console.error('❌ Failed to create tender version:', error);
        return { error: error.message };
      }

      console.log('✅ New tender version created:', data);
      return { data, message: 'Новая версия тендера создана' };
    } catch (error) {
      console.error('💥 Exception in createNewVersion:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Автоматическое сопоставление позиций между версиями
   */
  async autoMatchPositions(
    oldTenderId: string,
    newTenderId: string,
    options?: PositionMatchingOptions
  ): Promise<ApiResponse<TenderVersionMapping[]>> {
    console.log('🚀 Auto-matching positions between tenders:', { oldTenderId, newTenderId });

    try {
      // Получаем позиции из старого тендера (исключая ДОП)
      const { data: oldPositions, error: oldError } = await supabase
        .from('client_positions')
        .select('*')
        .eq('tender_id', oldTenderId)
        .eq('is_additional', false)  // Исключаем ДОП позиции по флагу is_additional
        .order('position_number');

      if (oldError) {
        console.error('❌ Failed to fetch old positions:', oldError);
        return { error: oldError.message };
      }

      // Получаем позиции из нового тендера (исключая ДОП)
      const { data: newPositions, error: newError } = await supabase
        .from('client_positions')
        .select('*')
        .eq('tender_id', newTenderId)
        .eq('is_additional', false)  // Исключаем ДОП позиции по флагу is_additional
        .order('position_number');

      if (newError) {
        console.error('❌ Failed to fetch new positions:', newError);
        return { error: newError.message };
      }

      console.log(`📊 Matching ${oldPositions?.length || 0} old positions with ${newPositions?.length || 0} new positions`);

      // Параметры сопоставления (оптимизированы для лучшего распознавания)
      const fuzzyWeight = options?.fuzzyWeight ?? 0.6;  // Уменьшили вес fuzzy для большего влияния контекста
      const contextWeight = options?.contextWeight ?? 0.3;  // Увеличили вес контекста (номер позиции)
      const hierarchyWeight = options?.hierarchyWeight ?? 0.1;
      const fuzzyThreshold = options?.fuzzyThreshold ?? 0.5;  // Снизили порог для более мягкого сопоставления
      const autoConfirmThreshold = options?.autoConfirmThreshold ?? 0.9;  // Снизили порог автоподтверждения

      const mappings: TenderVersionMapping[] = [];
      const usedNewPositions = new Set<string>();

      // Сопоставляем старые позиции с новыми
      for (const oldPos of oldPositions || []) {
        let bestMatch: any = null;
        let bestScore = 0;

        for (const newPos of newPositions || []) {
          // Пропускаем уже использованные позиции
          if (usedNewPositions.has(newPos.id)) continue;

          // Расчет fuzzy score по work_name с улучшенным алгоритмом
          const fuzzyScore = this.calculateFuzzyScore(
            oldPos.work_name || '',
            newPos.work_name || ''
          );

          // Расчет context score по номеру позиции (повышенная важность)
          const contextScore = this.calculateContextScore(
            oldPos.position_number,
            newPos.position_number
          );

          // Расчет hierarchy score по типу позиции
          const hierarchyScore = oldPos.position_type === newPos.position_type ? 1.0 :
            (!oldPos.position_type || !newPos.position_type) ? 0.5 : 0.0;

          // Общий score
          const totalScore = (fuzzyScore * fuzzyWeight) +
            (contextScore * contextWeight) +
            (hierarchyScore * hierarchyWeight);

          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestMatch = {
              position: newPos,
              scores: { fuzzyScore, contextScore, hierarchyScore }
            };
          }
        }

        // Создаем маппинг
        if (bestMatch && bestScore >= fuzzyThreshold) {
          usedNewPositions.add(bestMatch.position.id);

          mappings.push({
            old_tender_id: oldTenderId,
            new_tender_id: newTenderId,
            old_position_id: oldPos.id,
            new_position_id: bestMatch.position.id,
            old_position_number: oldPos.position_number || oldPos.item_no,
            old_work_name: oldPos.work_name,
            old_volume: oldPos.volume || oldPos.manual_volume,
            old_unit: oldPos.unit,
            old_client_note: oldPos.client_note || oldPos.manual_note,
            old_item_no: oldPos.item_no,
            new_position_number: bestMatch.position.position_number || bestMatch.position.item_no,
            new_work_name: bestMatch.position.work_name,
            new_volume: bestMatch.position.volume || bestMatch.position.manual_volume,
            new_unit: bestMatch.position.unit,
            new_client_note: bestMatch.position.client_note || bestMatch.position.manual_note,
            new_item_no: bestMatch.position.item_no,
            mapping_type: bestScore >= autoConfirmThreshold ? 'exact' : 'fuzzy',
            confidence_score: bestScore,
            fuzzy_score: bestMatch.scores.fuzzyScore,
            context_score: bestMatch.scores.contextScore,
            hierarchy_score: bestMatch.scores.hierarchyScore,
            mapping_status: bestScore >= autoConfirmThreshold ? 'confirmed' : 'suggested',
            action_type: 'copy_boq',
            is_dop: oldPos.position_type === 'dop'
          });
        } else {
          // Позиция удалена в новой версии
          mappings.push({
            old_tender_id: oldTenderId,
            new_tender_id: newTenderId,
            old_position_id: oldPos.id,
            old_position_number: oldPos.position_number || oldPos.item_no,
            old_work_name: oldPos.work_name,
            old_volume: oldPos.volume || oldPos.manual_volume,
            old_unit: oldPos.unit,
            old_client_note: oldPos.client_note || oldPos.manual_note,
            old_item_no: oldPos.item_no,
            mapping_type: 'deleted',
            confidence_score: 0,
            mapping_status: 'suggested',
            action_type: 'delete',
            is_dop: oldPos.position_type === 'dop'
          });
        }
      }

      // Добавляем новые позиции (которые не были сопоставлены)
      for (const newPos of newPositions || []) {
        if (!usedNewPositions.has(newPos.id)) {
          mappings.push({
            old_tender_id: oldTenderId,
            new_tender_id: newTenderId,
            new_position_id: newPos.id,
            new_position_number: newPos.position_number || newPos.item_no,
            new_work_name: newPos.work_name,
            new_volume: newPos.volume || newPos.manual_volume,
            new_unit: newPos.unit,
            new_client_note: newPos.client_note || newPos.manual_note,
            new_item_no: newPos.item_no,
            mapping_type: 'new',
            confidence_score: 0,
            mapping_status: 'suggested',
            action_type: 'create_new'
          });
        }
      }

      console.log(`✅ Created ${mappings.length} position mappings`);
      return { data: mappings };
    } catch (error) {
      console.error('💥 Exception in autoMatchPositions:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Сохранить маппинги в базу данных
   */
  async saveMappings(mappings: TenderVersionMapping[]): Promise<ApiResponse<any[]>> {
    console.log('🚀 Saving position mappings:', mappings.length);

    try {
      // Очищаем маппинги от поля 'key' и других frontend-only полей
      const cleanMappings = mappings.map(({ key, ...mapping }: any) => mapping);

      const { data, error } = await supabase
        .from('tender_version_mappings')
        .insert(cleanMappings)
        .select();

      if (error) {
        console.error('❌ Failed to save mappings:', error);
        return { error: error.message };
      }

      console.log('✅ Mappings saved successfully');
      return {
        data: data || [],
        message: `Сохранено ${mappings.length} сопоставлений`
      };
    } catch (error) {
      console.error('💥 Exception in saveMappings:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Получить маппинги для тендера
   */
  async getMappings(newTenderId: string): Promise<ApiResponse<TenderVersionMapping[]>> {
    console.log('🚀 Getting mappings for tender:', newTenderId);

    try {
      const { data, error } = await supabase
        .from('tender_version_mappings')
        .select('*')
        .eq('new_tender_id', newTenderId)
        .order('confidence_score', { ascending: false });

      if (error) {
        console.error('❌ Failed to fetch mappings:', error);
        return { error: error.message };
      }

      console.log(`✅ Fetched ${data?.length || 0} mappings`);
      return { data: data || [] };
    } catch (error) {
      console.error('💥 Exception in getMappings:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Обновить статус маппинга
   */
  async updateMappingStatus(
    mappingId: string,
    status: 'confirmed' | 'rejected',
    newPositionId?: string
  ): Promise<ApiResponse<void>> {
    console.log('🚀 Updating mapping status:', { mappingId, status, newPositionId });

    try {
      const updateData: any = {
        mapping_status: status,
        updated_at: new Date().toISOString()
      };

      if (newPositionId) {
        updateData.new_position_id = newPositionId;
        updateData.mapping_type = 'manual';
      }

      const { error } = await supabase
        .from('tender_version_mappings')
        .update(updateData)
        .eq('id', mappingId);

      if (error) {
        console.error('❌ Failed to update mapping:', error);
        return { error: error.message };
      }

      console.log('✅ Mapping status updated');
      return { message: 'Статус маппинга обновлен' };
    } catch (error) {
      console.error('💥 Exception in updateMappingStatus:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Применить маппинги и перенести данные
   */
  async applyMappings(newTenderId: string): Promise<ApiResponse<void>> {
    console.log('🚀 Applying mappings for tender:', newTenderId);

    try {
      // Получаем ВСЕ маппинги для тендера
      const { data: allMappings, error: mappingsError } = await supabase
        .from('tender_version_mappings')
        .select('*')
        .eq('new_tender_id', newTenderId);

      if (mappingsError) {
        console.error('❌ Failed to fetch mappings:', mappingsError);
        return { error: mappingsError.message };
      }

      // Применяем ВСЕ маппинги кроме явно отклоненных
      // Это нужно чтобы перенести все позиции между версиями
      const mappingsToApply = (allMappings || []).filter(m =>
        m.mapping_status !== 'rejected' && // Исключаем только явно отклоненные
        m.action_type === 'copy_boq' // Только маппинги для копирования BOQ
      );

      console.log(`📦 Found ${mappingsToApply.length} mappings to apply (из ${allMappings?.length || 0} всего)`);

      // Применяем каждый маппинг
      let successCount = 0;
      let errorCount = 0;

      for (const mapping of mappingsToApply) {
        // Автоматически подтверждаем ВСЕ маппинги перед применением
        if (mapping.mapping_status !== 'confirmed') {
          await supabase
            .from('tender_version_mappings')
            .update({ mapping_status: 'confirmed', updated_at: new Date().toISOString() })
            .eq('id', mapping.id);
        }

        // Переносим BOQ items
        if (mapping.action_type === 'copy_boq' &&
            mapping.old_position_id &&
            mapping.new_position_id) {

          console.log(`📋 Transferring BOQ items for mapping:`, {
            mappingId: mapping.id,
            oldPosition: mapping.old_position_id,
            newPosition: mapping.new_position_id,
            oldName: mapping.old_work_name,
            newName: mapping.new_work_name
          });

          // Сначала проверим, есть ли BOQ items для переноса
          const { data: boqCount, error: countError } = await supabase
            .from('boq_items')
            .select('id', { count: 'exact', head: true })
            .eq('client_position_id', mapping.old_position_id);

          console.log(`📊 Found ${boqCount || 0} BOQ items in old position`);

          const { error } = await supabase.rpc('transfer_boq_items', {
            p_mapping_id: mapping.id
          });

          if (error) {
            console.error(`❌ Failed to transfer BOQ for mapping ${mapping.id}:`, error);
            console.error('  Old position:', mapping.old_position_number, mapping.old_work_name);
            console.error('  New position:', mapping.new_position_number, mapping.new_work_name);
            errorCount++;
          } else {
            console.log(`✅ Transferred BOQ: ${mapping.old_position_number} -> ${mapping.new_position_number}`);

            // Проверим результат
            const { data: newBoqCount, error: newCountError } = await supabase
              .from('boq_items')
              .select('id', { count: 'exact', head: true })
              .eq('client_position_id', mapping.new_position_id);

            console.log(`✅ New position now has ${newBoqCount || 0} BOQ items`);
            successCount++;
          }
        }
      }

      // Обрабатываем ДОП позиции - автоматически переносим их с родительскими позициями
      const { data: oldTenderId } = await supabase
        .from('tender_version_mappings')
        .select('old_tender_id')
        .eq('new_tender_id', newTenderId)
        .limit(1)
        .single();

      if (oldTenderId) {
        console.log('🔄 Transferring DOP positions...');

        // Переносим ДОП позиции автоматически
        const dopResult = await this.transferDopPositionsWithMappings(
          oldTenderId.old_tender_id,
          newTenderId
        );

        if (dopResult.error) {
          console.error('❌ Failed to transfer DOP positions:', dopResult.error);
        } else if (dopResult.data) {
          console.log(`✅ Transferred ${dopResult.data.dopCount || 0} DOP positions`);
          console.log(`✅ Transferred BOQ items for ${dopResult.data.boqTransferCount || 0} DOP positions`);
        }
      }

      console.log(`✅ Applied mappings: ${successCount} success, ${errorCount} errors`);
      return {
        message: `Применено ${successCount} сопоставлений${errorCount > 0 ? `, ${errorCount} ошибок` : ''}`
      };
    } catch (error) {
      console.error('💥 Exception in applyMappings:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Перенос ДОП позиций с учетом маппингов родительских позиций
   */
  async transferDopPositionsWithMappings(
    oldTenderId: string,
    newTenderId: string
  ): Promise<ApiResponse<{ dopCount: number; boqTransferCount: number }>> {
    console.log('🚀 Transferring DOP positions with mappings');

    try {
      // Получаем все ДОП позиции из старого тендера
      const { data: dopPositions, error: dopError } = await supabase
        .from('client_positions')
        .select('*')
        .eq('tender_id', oldTenderId)
        .eq('is_additional', true)  // Используем флаг is_additional для ДОП позиций
        .order('position_number');

      if (dopError) {
        console.error('❌ Failed to fetch DOP positions:', dopError);
        return { error: dopError.message };
      }

      if (!dopPositions || dopPositions.length === 0) {
        console.log('ℹ️ No DOP positions found in old tender');
        return { data: { dopCount: 0, boqTransferCount: 0 } };
      }

      console.log(`📦 Found ${dopPositions.length} DOP positions to transfer`);

      // Получаем маппинги для родительских позиций
      const { data: mappings, error: mappingError } = await supabase
        .from('tender_version_mappings')
        .select('*')
        .eq('new_tender_id', newTenderId)
        .in('mapping_status', ['confirmed', 'applied']);

      if (mappingError) {
        console.error('❌ Failed to fetch mappings:', mappingError);
        return { error: mappingError.message };
      }

      let dopCount = 0;
      let boqTransferCount = 0;

      // Переносим каждую ДОП позицию
      for (const dopPosition of dopPositions) {
        // Находим маппинг для родительской позиции (используем правильное имя поля)
        const parentMapping = mappings?.find(m => m.old_position_id === dopPosition.parent_position_id);

        let newParentId = null;
        if (!parentMapping || !parentMapping.new_position_id) {
          console.warn(`⚠️ No parent mapping found for DOP position ${dopPosition.id}`);

          // Если родительская позиция не найдена, пытаемся найти другую позицию в том же разделе
          const { data: alternativeParent } = await supabase
            .from('client_positions')
            .select('id')
            .eq('tender_id', newTenderId)
            .eq('is_additional', false)  // Не ДОП позиция
            .limit(1)
            .single();

          if (!alternativeParent) {
            console.error(`❌ No alternative parent found for orphaned DOP ${dopPosition.id}`);
            continue;
          }

          newParentId = alternativeParent.id;
          console.log(`📎 Reassigned orphaned DOP to alternative parent ${alternativeParent.id}`);
        } else {
          newParentId = parentMapping.new_position_id;
        }

        // Создаем новую ДОП позицию со всеми полями
        const { data: newDopPosition, error: createError } = await supabase
          .from('client_positions')
          .insert({
            tender_id: newTenderId,
            parent_position_id: newParentId,  // Используем новый ID родителя
            position_number: dopPosition.position_number,
            item_no: dopPosition.item_no,
            work_name: dopPosition.work_name,
            unit: dopPosition.unit,
            volume: dopPosition.volume,
            manual_volume: dopPosition.manual_volume,
            client_note: dopPosition.client_note,
            manual_note: dopPosition.manual_note,
            position_type: dopPosition.position_type,  // Копируем оригинальный тип
            hierarchy_level: dopPosition.hierarchy_level,
            is_additional: true,  // Важно! Устанавливаем флаг для ДОП
            total_materials_cost: 0,
            total_works_cost: 0,
            total_commercial_materials_cost: 0,
            total_commercial_works_cost: 0
          })
          .select()
          .single();

        if (createError) {
          console.error(`❌ Failed to create DOP position:`, createError);
          continue;
        }

        dopCount++;
        console.log(`✅ Created DOP position ${newDopPosition.id}`);

        // Переносим BOQ items для этой ДОП позиции
        const { data: boqItems, error: boqError } = await supabase
          .from('boq_items')
          .select('*')
          .eq('client_position_id', dopPosition.id);

        if (boqError) {
          console.error(`❌ Failed to fetch BOQ items for DOP:`, boqError);
          continue;
        }

        if (boqItems && boqItems.length > 0) {
          // Создаем новые BOQ items
          const newBoqItems = boqItems.map(item => ({
            ...item,
            id: undefined, // Пусть БД сгенерирует новый ID
            client_position_id: newDopPosition.id,
            created_at: undefined,
            updated_at: undefined
          }));

          const { error: insertBoqError } = await supabase
            .from('boq_items')
            .insert(newBoqItems);

          if (insertBoqError) {
            console.error(`❌ Failed to insert BOQ items for DOP:`, insertBoqError);
          } else {
            boqTransferCount++;
            console.log(`✅ Transferred ${boqItems.length} BOQ items for DOP ${newDopPosition.id}`);
          }
        }
      }

      console.log(`✅ Successfully transferred ${dopCount} DOP positions with BOQ items`);
      return {
        data: { dopCount, boqTransferCount },
        message: `Перенесено ${dopCount} ДОП позиций`
      };
    } catch (error) {
      console.error('💥 Exception in transferDopPositionsWithMappings:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Вспомогательная функция для расчета fuzzy score
   */
  calculateFuzzyScore(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    // Проверка совпадения начала строки (первые 30 символов)
    const prefixLength = 30;
    const prefix1 = s1.substring(0, prefixLength);
    const prefix2 = s2.substring(0, prefixLength);

    // Если начала строк совпадают значительно, даем бонус
    if (prefix1 === prefix2 && prefix1.length >= 10) {
      // Минимум 0.7 если начала совпадают
      return Math.max(0.7, this.calculateLevenshteinScore(s1, s2));
    }

    // Проверка на содержание ключевых слов друг в друге
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.8; // Высокий score если одна строка содержит другую
    }

    // Стандартный расчет через расстояние Левенштейна
    return this.calculateLevenshteinScore(s1, s2);
  },

  /**
   * Расчет score через расстояние Левенштейна
   */
  calculateLevenshteinScore(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return Math.max(0, 1 - distance / maxLen);
  },

  /**
   * Создать ручное сопоставление между позициями
   */
  async createManualMapping(
    oldTenderId: string,
    newTenderId: string,
    oldPositionId: string,
    newPositionId: string | null
  ): Promise<ApiResponse<TenderVersionMapping>> {
    console.log('🚀 Creating manual mapping:', { oldPositionId, newPositionId });

    try {
      // Получаем информацию о старой позиции
      const { data: oldPosition, error: oldError } = await supabase
        .from('client_positions')
        .select('*')
        .eq('id', oldPositionId)
        .single();

      if (oldError) {
        console.error('❌ Failed to fetch old position:', oldError);
        return { error: oldError.message };
      }

      // Если указана новая позиция - получаем её информацию
      let newPosition = null;
      if (newPositionId) {
        const { data: newPos, error: newError } = await supabase
          .from('client_positions')
          .select('*')
          .eq('id', newPositionId)
          .single();

        if (newError) {
          console.error('❌ Failed to fetch new position:', newError);
          return { error: newError.message };
        }
        newPosition = newPos;
      }

      // Создаем маппинг
      const mapping: TenderVersionMapping = {
        old_tender_id: oldTenderId,
        new_tender_id: newTenderId,
        old_position_id: oldPositionId,
        new_position_id: newPositionId,
        old_position_number: oldPosition.position_number || oldPosition.item_no,
        old_work_name: oldPosition.work_name,
        old_volume: oldPosition.volume || oldPosition.manual_volume,
        old_unit: oldPosition.unit,
        old_client_note: oldPosition.client_note || oldPosition.manual_note,
        old_item_no: oldPosition.item_no,
        new_position_number: newPosition?.position_number || newPosition?.item_no,
        new_work_name: newPosition?.work_name,
        new_volume: newPosition?.volume || newPosition?.manual_volume,
        new_unit: newPosition?.unit,
        new_client_note: newPosition?.client_note || newPosition?.manual_note,
        new_item_no: newPosition?.item_no,
        mapping_type: 'manual',
        confidence_score: 1.0, // Ручное сопоставление имеет максимальную уверенность
        mapping_status: 'confirmed',
        action_type: newPositionId ? 'copy_boq' : 'delete'
      };

      // Сохраняем в базу
      const { data, error } = await supabase
        .from('tender_version_mappings')
        .insert(mapping)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to save manual mapping:', error);
        return { error: error.message };
      }

      console.log('✅ Manual mapping created');
      return { data, message: 'Ручное сопоставление создано' };
    } catch (error) {
      console.error('💥 Exception in createManualMapping:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Обновить сопоставление позиций
   */
  async updateMapping(
    mappingId: string,
    newPositionId: string | null
  ): Promise<ApiResponse<void>> {
    console.log('🚀 Updating mapping:', { mappingId, newPositionId });

    try {
      // Получаем текущий маппинг
      const { data: currentMapping, error: fetchError } = await supabase
        .from('tender_version_mappings')
        .select('*')
        .eq('id', mappingId)
        .single();

      if (fetchError) {
        console.error('❌ Failed to fetch mapping:', fetchError);
        return { error: fetchError.message };
      }

      // Получаем информацию о новой позиции (если указана)
      let newPosition = null;
      if (newPositionId) {
        const { data: newPos, error: newError } = await supabase
          .from('client_positions')
          .select('*')
          .eq('id', newPositionId)
          .single();

        if (newError) {
          console.error('❌ Failed to fetch new position:', newError);
          return { error: newError.message };
        }
        newPosition = newPos;
      }

      // Обновляем маппинг
      const updateData: any = {
        new_position_id: newPositionId,
        new_position_number: newPosition?.position_number || newPosition?.item_no || null,
        new_work_name: newPosition?.work_name || null,
        new_volume: newPosition?.volume || newPosition?.manual_volume || null,
        new_unit: newPosition?.unit || null,
        new_client_note: newPosition?.client_note || newPosition?.manual_note || null,
        new_item_no: newPosition?.item_no || null,
        mapping_type: 'manual',
        confidence_score: 1.0,
        mapping_status: 'confirmed',
        action_type: newPositionId ? 'copy_boq' : 'delete',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tender_version_mappings')
        .update(updateData)
        .eq('id', mappingId);

      if (error) {
        console.error('❌ Failed to update mapping:', error);
        return { error: error.message };
      }

      console.log('✅ Mapping updated successfully');
      return { message: 'Сопоставление обновлено' };
    } catch (error) {
      console.error('💥 Exception in updateMapping:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Получить доступные позиции для сопоставления
   */
  async getAvailablePositionsForMapping(
    newTenderId: string
  ): Promise<ApiResponse<any[]>> {
    console.log('🚀 Getting available positions for mapping:', newTenderId);

    try {
      // Получаем все позиции из новой версии
      const { data: positions, error } = await supabase
        .from('client_positions')
        .select('id, position_number, item_no, work_name, unit, volume')
        .eq('tender_id', newTenderId)
        .order('position_number');

      if (error) {
        console.error('❌ Failed to fetch positions:', error);
        return { error: error.message };
      }

      // Получаем уже использованные позиции
      const { data: mappings, error: mappingError } = await supabase
        .from('tender_version_mappings')
        .select('new_position_id')
        .eq('new_tender_id', newTenderId)
        .not('new_position_id', 'is', null);

      if (mappingError) {
        console.error('❌ Failed to fetch mappings:', mappingError);
        return { error: mappingError.message };
      }

      const usedPositionIds = new Set(mappings?.map(m => m.new_position_id) || []);

      // Помечаем использованные позиции
      const positionsWithStatus = positions?.map(pos => ({
        ...pos,
        isUsed: usedPositionIds.has(pos.id),
        label: `${pos.position_number || pos.item_no || ''} - ${pos.work_name}`.trim()
      })) || [];

      console.log(`✅ Found ${positionsWithStatus.length} positions (${usedPositionIds.size} used)`);
      return { data: positionsWithStatus };
    } catch (error) {
      console.error('💥 Exception in getAvailablePositionsForMapping:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Вспомогательная функция для расчета context score
   */
  calculateContextScore(pos1: string | number | null | undefined, pos2: string | number | null | undefined): number {
    // Приводим к строкам и обрабатываем null/undefined
    const position1 = String(pos1 || '');
    const position2 = String(pos2 || '');

    // Если одна или обе позиции пустые
    if (!position1 || !position2) return 0.3;

    // Если позиции полностью совпадают - максимальный score
    if (position1 === position2) return 1.0;

    // Обрабатываем иерархические номера (например, "1.1", "2.3.4")
    const parts1 = position1.split('.');
    const parts2 = position2.split('.');

    // Если структура номеров одинаковая
    if (parts1.length === parts2.length) {
      let matchCount = 0;
      for (let i = 0; i < parts1.length; i++) {
        if (parts1[i] === parts2[i]) {
          matchCount++;
        }
      }
      // Возвращаем score пропорционально совпадению частей
      return matchCount / parts1.length;
    }

    // Для простых числовых номеров
    try {
      const num1 = parseInt(position1);
      const num2 = parseInt(position2);

      if (!isNaN(num1) && !isNaN(num2)) {
        const diff = Math.abs(num1 - num2);
        if (diff === 0) return 1.0;
        if (diff === 1) return 0.85;  // Увеличили score для соседних позиций
        if (diff === 2) return 0.7;
        if (diff <= 5) return 0.5;
        return 0.3;
      }
    } catch {
      return 0.3;
    }

    return 0.3;
  },

  /**
   * Получить историю версий тендера
   */
  async getVersionHistory(tenderId: string): Promise<ApiResponse<any[]>> {
    console.log('🚀 Getting version history for tender:', tenderId);

    try {
      // Получаем все версии этого тендера
      const { data: tender } = await supabase
        .from('tenders')
        .select('id, parent_version_id')
        .eq('id', tenderId)
        .single();

      if (!tender) {
        return { error: 'Tender not found' };
      }

      // Находим корневой тендер
      let rootTenderId = tenderId;
      if (tender.parent_version_id) {
        const { data: parent } = await supabase
          .from('tenders')
          .select('id, parent_version_id')
          .eq('id', tender.parent_version_id)
          .single();

        if (parent && !parent.parent_version_id) {
          rootTenderId = parent.id;
        }
      }

      // Получаем все версии
      const { data: versions, error } = await supabase
        .from('tenders')
        .select('id, name, version, version_status, version_created_at, created_at')
        .or(`id.eq.${rootTenderId},parent_version_id.eq.${rootTenderId}`)
        .order('version', { ascending: true });

      if (error) {
        console.error('❌ Failed to fetch version history:', error);
        return { error: error.message };
      }

      console.log(`✅ Found ${versions?.length || 0} versions`);
      return { data: versions || [] };
    } catch (error) {
      console.error('💥 Exception in getVersionHistory:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};