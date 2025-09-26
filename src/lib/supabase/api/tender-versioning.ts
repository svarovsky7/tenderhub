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
  new_position_number?: string;
  new_work_name?: string;
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
      // Получаем позиции из старого тендера
      const { data: oldPositions, error: oldError } = await supabase
        .from('client_positions')
        .select('*')
        .eq('tender_id', oldTenderId)
        .order('position_number');

      if (oldError) {
        console.error('❌ Failed to fetch old positions:', oldError);
        return { error: oldError.message };
      }

      // Получаем позиции из нового тендера
      const { data: newPositions, error: newError } = await supabase
        .from('client_positions')
        .select('*')
        .eq('tender_id', newTenderId)
        .order('position_number');

      if (newError) {
        console.error('❌ Failed to fetch new positions:', newError);
        return { error: newError.message };
      }

      console.log(`📊 Matching ${oldPositions?.length || 0} old positions with ${newPositions?.length || 0} new positions`);

      // Параметры сопоставления
      const fuzzyWeight = options?.fuzzyWeight ?? 0.7;
      const contextWeight = options?.contextWeight ?? 0.2;
      const hierarchyWeight = options?.hierarchyWeight ?? 0.1;
      const fuzzyThreshold = options?.fuzzyThreshold ?? 0.7;
      const autoConfirmThreshold = options?.autoConfirmThreshold ?? 0.95;

      const mappings: TenderVersionMapping[] = [];
      const usedNewPositions = new Set<string>();

      // Сопоставляем старые позиции с новыми
      for (const oldPos of oldPositions || []) {
        let bestMatch: any = null;
        let bestScore = 0;

        for (const newPos of newPositions || []) {
          // Пропускаем уже использованные позиции
          if (usedNewPositions.has(newPos.id)) continue;

          // Расчет fuzzy score по work_name
          const fuzzyScore = this.calculateFuzzyScore(
            oldPos.work_name || '',
            newPos.work_name || ''
          );

          // Расчет context score по номеру позиции
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
            old_position_number: oldPos.position_number,
            old_work_name: oldPos.work_name,
            new_position_number: bestMatch.position.position_number,
            new_work_name: bestMatch.position.work_name,
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
            old_position_number: oldPos.position_number,
            old_work_name: oldPos.work_name,
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
            new_position_number: newPos.position_number,
            new_work_name: newPos.work_name,
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
  async saveMappings(mappings: TenderVersionMapping[]): Promise<ApiResponse<void>> {
    console.log('🚀 Saving position mappings:', mappings.length);

    try {
      const { error } = await supabase
        .from('tender_version_mappings')
        .insert(mappings);

      if (error) {
        console.error('❌ Failed to save mappings:', error);
        return { error: error.message };
      }

      console.log('✅ Mappings saved successfully');
      return { message: `Сохранено ${mappings.length} сопоставлений` };
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
      // Получаем все подтвержденные маппинги
      const { data: mappings, error: mappingsError } = await supabase
        .from('tender_version_mappings')
        .select('*')
        .eq('new_tender_id', newTenderId)
        .eq('mapping_status', 'confirmed');

      if (mappingsError) {
        console.error('❌ Failed to fetch confirmed mappings:', mappingsError);
        return { error: mappingsError.message };
      }

      console.log(`📦 Found ${mappings?.length || 0} confirmed mappings to apply`);

      // Применяем каждый маппинг
      let successCount = 0;
      let errorCount = 0;

      for (const mapping of mappings || []) {
        if (mapping.action_type === 'copy_boq' && mapping.old_position_id) {
          const { error } = await supabase.rpc('transfer_boq_items', {
            p_mapping_id: mapping.id
          });

          if (error) {
            console.error(`❌ Failed to transfer BOQ for mapping ${mapping.id}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        }
      }

      // Обрабатываем ДОП позиции
      const { data: oldTenderId } = await supabase
        .from('tender_version_mappings')
        .select('old_tender_id')
        .eq('new_tender_id', newTenderId)
        .limit(1)
        .single();

      if (oldTenderId) {
        const { data: dopCount, error: dopError } = await supabase.rpc('transfer_dop_positions', {
          p_old_tender_id: oldTenderId.old_tender_id,
          p_new_tender_id: newTenderId
        });

        if (dopError) {
          console.error('❌ Failed to transfer DOP positions:', dopError);
        } else {
          console.log(`✅ Transferred ${dopCount || 0} DOP positions`);
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
   * Вспомогательная функция для расчета fuzzy score
   */
  calculateFuzzyScore(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    // Простая реализация расстояния Левенштейна
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
   * Вспомогательная функция для расчета context score
   */
  calculateContextScore(pos1: string, pos2: string): number {
    try {
      const num1 = parseInt(pos1);
      const num2 = parseInt(pos2);

      if (isNaN(num1) || isNaN(num2)) {
        return pos1 === pos2 ? 1 : 0.3;
      }

      const diff = Math.abs(num1 - num2);
      if (diff === 0) return 1.0;
      if (diff === 1) return 0.8;
      if (diff === 2) return 0.6;
      if (diff <= 5) return 0.4;
      return 0.3;
    } catch {
      return 0.3;
    }
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