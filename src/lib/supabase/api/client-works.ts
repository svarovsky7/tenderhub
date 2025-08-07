import { supabase } from '../client';
import * as XLSX from 'xlsx';
import type { ApiResponse } from '../types';
import { handleSupabaseError } from './utils';

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
      
      // Read all data from Excel with proper headers including client_note
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        header: ['position_number', 'work_name', 'unit', 'volume', 'client_note'], // Map columns to meaningful names
        range: 1, // Skip header row
        raw: false,
        defval: ''
      });

      console.log('📊 Raw Excel data:', rows.slice(0, 3)); // Log first 3 rows for debugging
      console.log('📈 Total rows found:', rows.length);

      // Filter and validate data - include all rows with position number and work name
      const validRows = rows.filter((row: any) => {
        const hasPositionNumber = row.position_number && String(row.position_number).trim();
        const hasWorkName = row.work_name && String(row.work_name).trim();
        
        // Include row even if unit or volume is missing
        return hasPositionNumber && hasWorkName;
      });

      console.log('✅ Valid rows after filtering:', validRows.length);
      onProgress?.(40, 'Валидация данных...');

      if (validRows.length === 0) {
        console.warn('⚠️ No valid data found in Excel file');
        return { 
          error: 'В Excel файле не найдено валидных данных. Проверьте формат: № п/п | Наименование работ | Ед. изм. | Объем работ' 
        };
      }

      // Group rows by position number for creating client positions
      const positionsMap = new Map<string, any[]>();
      
      validRows.forEach((row: any) => {
        const positionNum = String(row.position_number).trim();
        
        if (!positionsMap.has(positionNum)) {
          positionsMap.set(positionNum, []);
        }
        
        const volume = row.volume ? Number(row.volume) : 0; // Allow 0 volume after removing DB constraint
        console.log(`📊 Processing row: position=${positionNum}, work=${String(row.work_name).trim()}, unit=${row.unit || 'empty'}, volume=${volume}`);
        
        positionsMap.get(positionNum)!.push({
          work_name: String(row.work_name).trim(),
          unit: row.unit ? String(row.unit).trim() : '',  // Allow empty unit
          volume: volume,   // Allow 0 volume after removing DB constraint
          client_note: row.client_note ? String(row.client_note).trim() : null
        });
      });

      console.log('🗂️ Grouped into positions:', positionsMap.size);
      onProgress?.(60, 'Проверка существующих позиций...');

      // Get existing positions for this tender to avoid duplicates
      console.log('🔍 Checking existing positions for tender:', tenderId);
      const { data: existingPositions, error: existingError } = await supabase
        .from('client_positions')
        .select('position_number')
        .eq('tender_id', tenderId);
      
      if (existingError) {
        console.error('❌ Error fetching existing positions:', existingError);
        return { error: 'Ошибка при проверке существующих позиций' };
      }

      const existingNumbers = new Set(existingPositions?.map(p => p.position_number) || []);
      console.log('📋 Existing position numbers:', Array.from(existingNumbers));

      // Get next available position number
      let nextPositionNumber = 1;
      while (existingNumbers.has(nextPositionNumber)) {
        nextPositionNumber++;
      }
      console.log('🎯 Starting position number:', nextPositionNumber);

      let positionsCreated = 0;
      const totalPositions = positionsMap.size;

      // Create only client positions (no BOQ items)
      for (const [positionKey, items] of positionsMap) {
        const currentPosition = positionsCreated + 1;
        onProgress?.(60 + (currentPosition / totalPositions) * 35, `Создание позиции ${currentPosition} из ${totalPositions}...`);
        console.log(`📝 Creating position ${positionKey} with ${items.length} items`);
        
        // Use next available position number to avoid duplicates
        const actualPositionNumber = nextPositionNumber;
        console.log(`🔢 Using position number: ${actualPositionNumber} (original: ${positionKey})`);
        
        // Get first item to extract position details
        const firstItem = items[0];
        
        // Create client position with new fields
        const { data: position, error: posError } = await supabase
          .from('client_positions')
          .insert({
            tender_id: tenderId,
            position_number: actualPositionNumber,
            item_no: positionKey, // № п/п from Excel
            work_name: firstItem.work_name, // First work name as position name
            unit: firstItem.unit || null,
            volume: firstItem.volume || null,
            client_note: firstItem.client_note || null // Примечание from Excel
          })
          .select()
          .single();

        if (posError) {
          console.error('❌ Error creating position:', posError);
          continue;
        }

        console.log('✅ Position created:', position.id);
        positionsCreated++;
        nextPositionNumber++; // Increment for next position

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