import { supabase } from '../client';
import * as XLSX from 'xlsx';
import type { ApiResponse, ClientPositionType } from '../types';
import { handleSupabaseError } from './utils';
import { HIERARCHY_LEVELS } from '../../../utils/clientPositionHierarchy';

export const clientWorksApi = {
  async uploadFromXlsx(
    tenderId: string, 
    file: File, 
    onProgress?: (progress: number, step: string) => void
  ): Promise<ApiResponse<{positionsCount: number}>> {
    console.log('🚀 clientWorksApi.uploadFromXlsx called with:', { tenderId, fileName: file.name });
    
    try {
      onProgress?.(10, 'Чтение Excel файла...');
      console.log('📖 Reading Excel file...');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      console.log('📋 Available sheets:', workbook.SheetNames);
      onProgress?.(25, 'Парсинг данных из Excel...');
      
      // Read all data from Excel with proper headers including position_type and client_note
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        header: ['position_number', 'position_type', 'work_name', 'unit', 'volume', 'client_note'], // Map columns to meaningful names
        range: 1, // Skip header row
        raw: false,
        defval: ''
      });

      console.log('📊 Raw Excel data:', rows.slice(0, 3)); // Log first 3 rows for debugging
      console.log('📈 Total rows found:', rows.length);

      // Valid position types (English)
      const validPositionTypes = ['article', 'section', 'subsection', 'header', 'subheader', 'executable'];
      
      // Russian to English type mapping
      const russianTypeMapping: Record<string, ClientPositionType> = {
        'статья': 'article',
        'раздел': 'section',
        'подраздел': 'subsection', 
        'заголовок': 'header',
        'подзаголовок': 'subheader',
        'исполняемая': 'executable'
      };
      
      // Function to normalize position type (supports both Russian and English)
      const normalizePositionType = (rawType: string): ClientPositionType => {
        if (!rawType) return 'executable';
        
        const cleanType = String(rawType).trim().toLowerCase();
        console.log(`🔍 Normalizing position type: "${rawType}" -> "${cleanType}"`);
        
        // Check English types first
        if (validPositionTypes.includes(cleanType)) {
          console.log(`✅ Found English type: ${cleanType}`);
          return cleanType as ClientPositionType;
        }
        
        // Check Russian types
        if (russianTypeMapping[cleanType]) {
          const englishType = russianTypeMapping[cleanType];
          console.log(`✅ Found Russian type: "${cleanType}" -> "${englishType}"`);
          return englishType;
        }
        
        // Default fallback
        console.warn(`⚠️ Unknown position type "${rawType}", defaulting to "executable"`);
        return 'executable';
      };
      
      // Filter and validate data - include all rows with position number and work name
      const validRows = rows.filter((row: any) => {
        const hasPositionNumber = row.position_number && String(row.position_number).trim();
        const hasWorkName = row.work_name && String(row.work_name).trim();
        
        // Just log the position type for debugging
        if (row.position_type) {
          const normalizedType = normalizePositionType(row.position_type);
          console.log(`📊 Row ${row.position_number}: type="${row.position_type}" -> "${normalizedType}"`);
        }
        
        // Include row even if unit or volume is missing
        return hasPositionNumber && hasWorkName;
      });

      console.log('✅ Valid rows after filtering:', validRows.length);
      onProgress?.(40, 'Валидация данных...');

      if (validRows.length === 0) {
        console.warn('⚠️ No valid data found in Excel file');
        return { 
          error: 'В Excel файле не найдено валидных данных. Проверьте формат: № п/п | Тип позиции | Наименование работ | Ед. изм. | Объем работ | Примечание\n\nПоддерживаемые типы позиций:\n• Статья (или article)\n• Раздел (или section)\n• Подраздел (или subsection)\n• Заголовок (или header)\n• Подзаголовок (или subheader)\n• Исполняемая (или executable)' 
        };
      }

      // Group rows by position number for creating client positions
      const positionsMap = new Map<string, any[]>();
      
      validRows.forEach((row: any) => {
        const positionNum = String(row.position_number).trim();
        const validatedType: ClientPositionType = normalizePositionType(row.position_type);
        const hierarchyLevel = HIERARCHY_LEVELS[validatedType];
        
        if (!positionsMap.has(positionNum)) {
          positionsMap.set(positionNum, []);
        }
        
        const volume = row.volume ? Number(row.volume) : 0; // Allow 0 volume after removing DB constraint
        console.log(`📊 Processing row: position=${positionNum}, type=${validatedType}, hierarchy=${hierarchyLevel}, work=${String(row.work_name).trim()}, unit=${row.unit || 'empty'}, volume=${volume}`);
        
        positionsMap.get(positionNum)!.push({
          work_name: String(row.work_name).trim(),
          unit: row.unit ? String(row.unit).trim() : '',  // Allow empty unit
          volume: volume,   // Allow 0 volume after removing DB constraint
          client_note: row.client_note ? String(row.client_note).trim() : null,
          position_type: validatedType,
          hierarchy_level: hierarchyLevel
        });
      });

      console.log('🗂️ Grouped into positions:', positionsMap.size);
      onProgress?.(60, 'Проверка существующих позиций...');

      // Get all existing position numbers for this tender to handle gaps
      console.log('🔍 Getting existing position numbers for tender:', tenderId);
      const { data: existingPositions, error: maxError } = await supabase
        .from('client_positions')
        .select('position_number')
        .eq('tender_id', tenderId)
        .order('position_number', { ascending: true });
      
      if (maxError) {
        console.error('❌ Error fetching position numbers:', maxError);
        return { error: 'Ошибка при получении существующих позиций' };
      }

      // Create a set of existing position numbers for quick lookup
      const existingNumbers = new Set(
        existingPositions?.map(p => p.position_number) || []
      );
      
      console.log('📊 Existing position numbers:', Array.from(existingNumbers).sort((a, b) => a - b));
      
      // Function to get next available position number
      const getNextAvailableNumber = (startFrom: number = 1): number => {
        let candidate = startFrom;
        while (existingNumbers.has(candidate)) {
          candidate++;
        }
        return candidate;
      };
      
      let nextPositionNumber = getNextAvailableNumber();
      
      console.log('🎯 Starting position number:', nextPositionNumber);

      let positionsCreated = 0;
      const totalPositions = positionsMap.size;

      // Create only client positions (no BOQ items)
      for (const [positionKey, items] of positionsMap) {
        const currentPosition = positionsCreated + 1;
        onProgress?.(60 + (currentPosition / totalPositions) * 35, `Создание позиции ${currentPosition} из ${totalPositions}...`);
        console.log(`📝 Creating position ${positionKey} with ${items.length} items`);
        
        // Get first item to extract position details
        const firstItem = items[0];
        
        // Use current nextPositionNumber for this position
        console.log(`🔢 Using position number: ${nextPositionNumber} (original: ${positionKey})`);
        
        // Ensure position_number is valid (double-check before insert)
        if (!nextPositionNumber || typeof nextPositionNumber !== 'number' || nextPositionNumber < 1) {
          console.error('❌ Invalid nextPositionNumber detected:', nextPositionNumber);
          console.log('🔧 Resetting to 1');
          nextPositionNumber = 1;
        }
        
        // Prepare position data - ensure all required fields are present
        const positionData = {
          tender_id: tenderId,
          position_number: nextPositionNumber,
          item_no: String(positionKey).substring(0, 10), // Ensure it fits varchar(10)
          work_name: firstItem.work_name || `Позиция ${positionKey}`, // First work name as position name
          unit: firstItem.unit || null,
          volume: firstItem.volume || null,
          client_note: firstItem.client_note || null, // Примечание from Excel
          position_type: firstItem.position_type || 'executable', // Position type from Excel
          hierarchy_level: firstItem.hierarchy_level || 6, // Hierarchy level calculated from type
          total_materials_cost: 0,
          total_works_cost: 0
        };
        
        console.log('💾 Creating client position with data:', JSON.stringify(positionData));
        
        // Create client position with new fields
        console.log('📡 Attempting to insert position with Supabase...');
        
        // Try insert first without select
        const insertResult = await supabase
          .from('client_positions')
          .insert(positionData);
          
        console.log('📦 Insert result:', { 
          data: insertResult.data, 
          error: insertResult.error,
          status: insertResult.status,
          statusText: insertResult.statusText 
        });
        
        let position = null;
        let posError = insertResult.error;
        
        // If insert succeeded (status 201 or no error), fetch the created record
        if (!posError || insertResult.status === 201) {
          console.log('✅ Insert successful (status:', insertResult.status, '), fetching created record...');
          const { data: fetchedData, error: fetchError } = await supabase
            .from('client_positions')
            .select('*')
            .eq('tender_id', tenderId)
            .eq('position_number', nextPositionNumber)
            .single();
            
          if (fetchedData) {
            position = fetchedData;
            posError = null; // Clear any error since we successfully got the data
            console.log('✅ Successfully fetched created position:', position);
          } else {
            // Don't treat fetch failure as insert failure if insert succeeded
            console.warn('⚠️ Could not fetch position after insert, but insert likely succeeded:', fetchError);
            // We'll handle this case below
          }
        }
        
        // Additional validation - if insert worked but we couldn't fetch, count it as success
        if (!position && (!posError || insertResult.status === 201)) {
          console.warn('⚠️ Insert succeeded but no data could be retrieved, counting as success');
          positionsCreated++;
          existingNumbers.add(nextPositionNumber);
          nextPositionNumber = getNextAvailableNumber(nextPositionNumber + 1);
          continue;
        }

        if (posError || !position) {
          console.error('❌ Error creating position:', posError);
          console.error('❌ Position data:', position);
          
          // Special handling for null error but no data
          if (!posError && !position) {
            console.error('❌ WARNING: No error but also no data returned from Supabase');
            console.error('❌ This might indicate a problem with the database or connection');
            // Skip this position
            continue;
          }
          
          if (posError) {
            console.error('❌ Full error object:', JSON.stringify(posError, null, 2));
          }
          
          // If error is due to duplicate position_number, try to find next available
          if (posError && posError.code === '23505') {
            console.log('⚠️ Position number conflict detected, finding next available...');
            
            // Get next available number
            nextPositionNumber = getNextAvailableNumber(nextPositionNumber + 1);
            positionData.position_number = nextPositionNumber;
            
            console.log(`🔄 Retrying with position number:`, nextPositionNumber);
            console.log('📡 Retry insert with updated data:', JSON.stringify(positionData));
            
            // Try insert without select
            const retryInsertResult = await supabase
              .from('client_positions')
              .insert(positionData);
              
            console.log('📦 Retry insert result:', { 
              error: retryInsertResult.error,
              status: retryInsertResult.status 
            });
            
            let retryPosition = null;
            let retryError = retryInsertResult.error;
            
            // If retry insert succeeded (status 201 or no error), fetch the created record
            if (!retryError || retryInsertResult.status === 201) {
              console.log('✅ Retry insert successful (status:', retryInsertResult.status, '), fetching created record...');
              const { data: fetchedRetry, error: fetchRetryError } = await supabase
                .from('client_positions')
                .select('*')
                .eq('tender_id', tenderId)
                .eq('position_number', nextPositionNumber)
                .single();
                
              if (fetchedRetry) {
                retryPosition = fetchedRetry;
                retryError = null; // Clear error since we got the data
                console.log('✅ Successfully fetched retry position:', retryPosition);
              } else {
                // Don't treat fetch failure as insert failure
                console.warn('⚠️ Could not fetch retry position, but insert likely succeeded');
              }
            }
            
            if (!retryError || retryInsertResult.status === 201) {
              // If we have the position data, log it
              if (retryPosition) {
                console.log('✅ Position created on retry:', {
                  id: retryPosition.id,
                  position_number: retryPosition.position_number,
                  item_no: retryPosition.item_no,
                  work_name: retryPosition.work_name
                });
              } else {
                console.log('✅ Position likely created on retry (no fetch data available)');
              }
              positionsCreated++;
              // Add to existing numbers set
              existingNumbers.add(nextPositionNumber);
              // Get next available for the next iteration
              nextPositionNumber = getNextAvailableNumber(nextPositionNumber + 1);
            } else {
              console.error('❌ Retry failed:', retryError);
              // Skip this position but continue with others
              continue;
            }
          } else {
            // Other error, skip this position
            console.error('❌ Non-duplicate error, skipping position');
            continue;
          }
        } else {
          // Successfully created and fetched position
          if (position) {
            console.log('✅ Position created:', {
              id: position.id,
              position_number: position.position_number,
              item_no: position.item_no,
              work_name: position.work_name
            });
          } else {
            console.log('✅ Position likely created (no fetch data available)');
          }
          positionsCreated++;
          // Add to existing numbers set
          existingNumbers.add(nextPositionNumber);
          // Get next available for the next iteration
          nextPositionNumber = getNextAvailableNumber(nextPositionNumber + 1);
        }

        // NOTE: BOQ items will be created manually by user through the interface
        // This is intentional - we only create client_positions from Excel import
      }

      onProgress?.(100, 'Импорт завершен успешно!');
      console.log('🎉 Import completed:', { positionsCreated });

      return { 
        data: { positionsCount: positionsCreated },
        message: `Успешно импортировано ${positionsCreated} позиций из файла ${file.name}` 
      };
    } catch (error) {
      console.error('💥 Excel import error:', error);
      return { error: handleSupabaseError(error, 'Upload Excel file') };
    }
  },
};