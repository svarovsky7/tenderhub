import { supabase } from '../client';
import * as XLSX from 'xlsx-js-style';
import type { ApiResponse, ClientPositionType } from '../types';
import { handleSupabaseError } from './utils';
import { HIERARCHY_LEVELS } from '../../../utils/clientPositionHierarchy';
import { tenderVersioningApi, type TenderVersionMapping } from './tender-versioning';

export interface VersionUploadOptions {
  parentTenderId?: string;  // ID родительской версии тендера
  autoMatch?: boolean;      // Автоматическое сопоставление позиций
  matchingThreshold?: number; // Порог для автоматического сопоставления
}

export interface VersionUploadResult {
  tenderId: string;
  positionsCount: number;
  mappings?: TenderVersionMapping[];
  matchedCount?: number;
  newCount?: number;
  deletedCount?: number;
}

export const clientWorksVersioningApi = {
  /**
   * Загрузка Excel файла как новой версии тендера с автоматическим сопоставлением
   */
  async uploadAsNewVersion(
    file: File,
    options: VersionUploadOptions,
    onProgress?: (progress: number, step: string) => void
  ): Promise<ApiResponse<VersionUploadResult>> {
    console.log('🚀 uploadAsNewVersion called with:', {
      fileName: file.name,
      parentTenderId: options.parentTenderId,
      autoMatch: options.autoMatch
    });

    try {
      // Шаг 1: Создаем новую версию тендера
      onProgress?.(5, 'Создание новой версии тендера...');

      if (!options.parentTenderId) {
        return { error: 'Не указан родительский тендер для версионирования' };
      }

      const { data: newTenderId, error: versionError } = await tenderVersioningApi.createNewVersion(
        options.parentTenderId
      );

      if (versionError || !newTenderId) {
        console.error('❌ Failed to create new version:', versionError);
        return { error: versionError || 'Не удалось создать новую версию' };
      }

      console.log('✅ Created new tender version:', newTenderId);

      // Шаг 2: Читаем и парсим Excel файл
      onProgress?.(10, 'Чтение Excel файла...');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // Парсим данные из Excel
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        header: ['position_number', 'position_type', 'work_name', 'unit', 'volume', 'client_note'],
        range: 1,
        raw: false,
        defval: ''
      });

      console.log('📊 Parsed rows from Excel:', rows.length);
      onProgress?.(20, 'Обработка данных из Excel...');

      // Маппинг типов позиций
      const russianTypeMapping: Record<string, ClientPositionType> = {
        'статья': 'article',
        'раздел': 'section',
        'подраздел': 'subsection',
        'заголовок': 'header',
        'подзаголовок': 'subheader',
        'исполняемая': 'executable'
      };

      const normalizePositionType = (rawType: string): ClientPositionType => {
        if (!rawType) return 'executable';
        const cleanType = String(rawType).trim().toLowerCase();
        const validTypes = ['article', 'section', 'subsection', 'header', 'subheader', 'executable'];

        if (validTypes.includes(cleanType)) {
          return cleanType as ClientPositionType;
        }

        return russianTypeMapping[cleanType] || 'executable';
      };

      // Фильтруем и группируем данные
      const positionsMap = new Map<string, any>();

      rows.forEach((row: any) => {
        const positionNum = String(row.position_number).trim();
        const workName = String(row.work_name).trim();

        if (!positionNum || !workName) return;

        const positionType = normalizePositionType(row.position_type);

        // Для версионирования важно сохранить оригинальный номер позиции
        positionsMap.set(positionNum, {
          original_number: positionNum,
          work_name: workName,
          unit: row.unit ? String(row.unit).trim() : '',
          volume: row.volume ? Number(row.volume) : 0,
          client_note: row.client_note ? String(row.client_note).trim() : null,
          position_type: positionType,
          hierarchy_level: HIERARCHY_LEVELS[positionType]
        });
      });

      console.log('📦 Grouped into positions:', positionsMap.size);

      if (positionsMap.size === 0) {
        // Удаляем пустую версию
        await supabase.from('tenders').delete().eq('id', newTenderId);
        return { error: 'В Excel файле не найдено валидных данных' };
      }

      // Шаг 3: Создаем позиции в новой версии
      onProgress?.(30, 'Создание позиций в новой версии...');

      let positionNumber = 1;
      const createdPositions: any[] = [];

      for (const [key, positionData] of positionsMap) {
        const { data: position, error: posError } = await supabase
          .from('client_positions')
          .insert({
            tender_id: newTenderId,
            position_number: positionNumber++,
            item_no: positionData.original_number.substring(0, 10),
            work_name: positionData.work_name,
            unit: positionData.unit,
            volume: positionData.volume,
            client_note: positionData.client_note,
            position_type: positionData.position_type,
            hierarchy_level: positionData.hierarchy_level,
            total_materials_cost: 0,
            total_works_cost: 0
          })
          .select()
          .single();

        if (posError) {
          console.error('❌ Failed to create position:', posError);
          continue;
        }

        createdPositions.push(position);
      }

      console.log(`✅ Created ${createdPositions.length} positions in new version`);

      // Шаг 4: Автоматическое сопоставление позиций (если включено)
      let mappings: TenderVersionMapping[] = [];
      let matchedCount = 0;
      let newCount = 0;
      let deletedCount = 0;

      if (options.autoMatch) {
        onProgress?.(50, 'Сопоставление позиций между версиями...');

        const { data: matchResults, error: matchError } = await tenderVersioningApi.autoMatchPositions(
          options.parentTenderId,
          newTenderId,
          {
            fuzzyThreshold: options.matchingThreshold || 0.7,
            autoConfirmThreshold: 0.95
          }
        );

        if (matchError) {
          console.error('❌ Failed to auto-match positions:', matchError);
        } else if (matchResults) {
          mappings = matchResults;

          // Подсчитываем статистику
          matchedCount = mappings.filter(m => m.mapping_type === 'exact' || m.mapping_type === 'fuzzy').length;
          newCount = mappings.filter(m => m.mapping_type === 'new').length;
          deletedCount = mappings.filter(m => m.mapping_type === 'deleted').length;

          console.log(`📊 Matching statistics:
            - Matched: ${matchedCount}
            - New: ${newCount}
            - Deleted: ${deletedCount}`);

          // Сохраняем маппинги в базу и получаем их с ID
          onProgress?.(70, 'Сохранение сопоставлений...');
          const saveResult = await tenderVersioningApi.saveMappings(mappings);

          if (saveResult.error) {
            console.error('⚠️ Failed to save mappings:', saveResult.error);
          } else if (saveResult.data) {
            // Обновляем маппинги с полученными ID из БД
            mappings = mappings.map((m, index) => ({
              ...m,
              id: saveResult.data?.[index]?.id || m.id
            }));
            console.log('✅ Mappings saved with IDs');
          }
        }

        // Автоматически применяем маппинги и переносим данные
        if (mappings.length > 0) {
          onProgress?.(80, 'Перенос BOQ items, ДОП позиций и связей...');
          console.log('🔄 Automatically applying mappings and transferring data...');

          const transferResult = await tenderVersioningApi.applyMappings(newTenderId);

          if (transferResult.error) {
            console.error('⚠️ Data transfer failed:', transferResult.error);
            // Не считаем критической ошибкой, позволяем пользователю повторить позже
            console.log('ℹ️ User can manually transfer data later if needed');
          } else {
            console.log('✅ Data transfer completed successfully');
            onProgress?.(95, 'Перенос данных завершен');
          }
        }
      }

      onProgress?.(100, 'Завершено!');

      return {
        data: {
          tenderId: newTenderId,
          positionsCount: createdPositions.length,
          mappings: options.autoMatch ? mappings : undefined,  // Теперь маппинги будут с ID
          matchedCount,
          newCount,
          deletedCount
        },
        message: `Создана новая версия тендера с ${createdPositions.length} позициями`
      };
    } catch (error) {
      console.error('💥 Exception in uploadAsNewVersion:', error);
      return {
        error: error instanceof Error ? error.message : 'Неизвестная ошибка при загрузке'
      };
    }
  },

  /**
   * Загрузка Excel файла в существующий тендер (обычная загрузка без версионирования)
   */
  async uploadToExistingTender(
    tenderId: string,
    file: File,
    onProgress?: (progress: number, step: string) => void
  ): Promise<ApiResponse<{ positionsCount: number }>> {
    // Используем оригинальную функцию из clientWorksApi
    const { clientWorksApi } = await import('./client-works');
    return clientWorksApi.uploadFromXlsx(tenderId, file, onProgress);
  },

  /**
   * Проверка, является ли тендер версией другого тендера
   */
  async checkIfVersion(tenderId: string): Promise<ApiResponse<{
    isVersion: boolean;
    parentTenderId?: string;
    version?: number;
  }>> {
    console.log('🚀 Checking if tender is a version:', tenderId);

    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('parent_version_id, version')
        .eq('id', tenderId)
        .single();

      if (error) {
        console.error('❌ Failed to check tender version:', error);
        return { error: error.message };
      }

      const isVersion = !!data?.parent_version_id;

      console.log(`✅ Tender ${isVersion ? 'is' : 'is not'} a version`);

      return {
        data: {
          isVersion,
          parentTenderId: data?.parent_version_id,
          version: data?.version
        }
      };
    } catch (error) {
      console.error('💥 Exception in checkIfVersion:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};