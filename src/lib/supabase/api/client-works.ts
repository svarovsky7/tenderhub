import { supabase } from '../client';
import * as XLSX from 'xlsx';
import type { ApiResponse } from '../types';
import { handleSupabaseError } from './utils';

export const clientWorksApi = {
  async uploadFromXlsx(tenderId: string, file: File): Promise<ApiResponse<{itemsCount: number, positionsCount: number}>> {
    console.log('🚀 clientWorksApi.uploadFromXlsx called with:', { tenderId, fileName: file.name });
    
    try {
      console.log('📖 Reading Excel file...');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      console.log('📋 Available sheets:', workbook.SheetNames);
      
      // Read all data from Excel with proper headers
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        header: ['position_number', 'work_name', 'unit', 'volume'], // Map columns to meaningful names
        range: 1, // Skip header row
        raw: false,
        defval: ''
      });

      console.log('📊 Raw Excel data:', rows.slice(0, 3)); // Log first 3 rows for debugging
      console.log('📈 Total rows found:', rows.length);

      // Filter and validate data
      const validRows = rows.filter((row: any) => {
        const hasPositionNumber = row.position_number && String(row.position_number).trim();
        const hasWorkName = row.work_name && String(row.work_name).trim();
        const hasVolume = row.volume && Number(row.volume) > 0;
        
        return hasPositionNumber && hasWorkName && hasVolume;
      });

      console.log('✅ Valid rows after filtering:', validRows.length);

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
        
        positionsMap.get(positionNum)!.push({
          work_name: String(row.work_name).trim(),
          unit: String(row.unit || 'шт').trim(),
          volume: Number(row.volume) || 1
        });
      });

      console.log('🗂️ Grouped into positions:', positionsMap.size);

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

      let totalItemsCreated = 0;
      let positionsCreated = 0;

      // Create client positions and BOQ items
      for (const [positionKey, items] of positionsMap) {
        console.log(`📝 Creating position ${positionKey} with ${items.length} items`);
        
        // Use next available position number to avoid duplicates
        const actualPositionNumber = nextPositionNumber;
        console.log(`🔢 Using position number: ${actualPositionNumber} (original: ${positionKey})`);
        
        // Create client position
        const { data: position, error: posError } = await supabase
          .from('client_positions')
          .insert({
            tender_id: tenderId,
            position_number: actualPositionNumber,
            title: `Позиция ${positionKey}`,
            description: `Импортировано из Excel файла: ${file.name}`,
            status: 'active'
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

        // Create BOQ items for this position
        if (position && items.length > 0) {
          const boqItems = items.map((item, index) => ({
            tender_id: tenderId,
            client_position_id: position.id,
            item_number: `${actualPositionNumber}.${index + 1}`,
            sub_number: index + 1,
            sort_order: index,
            item_type: 'work' as const, // All items from Excel are works
            description: item.work_name,
            unit: item.unit,
            quantity: item.volume,
            unit_rate: 0, // Will be filled later by user
            coefficient: 1.0,
            notes: `Импортировано из Excel: ${file.name}`,
            source_file: file.name,
            imported_at: new Date().toISOString()
          }));

          console.log(`💾 Creating ${boqItems.length} BOQ items for position ${positionKey}`);

          const { error: boqError } = await supabase
            .from('boq_items')
            .insert(boqItems);

          if (boqError) {
            console.error('❌ Error creating BOQ items:', boqError);
          } else {
            console.log('✅ BOQ items created successfully');
            totalItemsCreated += boqItems.length;
          }
        }
      }

      console.log('🎉 Import completed:', { positionsCreated, totalItemsCreated });

      return { 
        data: { itemsCount: totalItemsCreated, positionsCount: positionsCreated },
        message: `Успешно импортировано: ${positionsCreated} позиций, ${totalItemsCreated} работ из файла ${file.name}` 
      };
    } catch (error) {
      console.error('💥 Excel import error:', error);
      return { error: handleSupabaseError(error, 'Upload Excel file') };
    }
  },
};