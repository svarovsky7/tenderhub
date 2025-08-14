import { supabase } from '../client';
import { handleSupabaseError } from './utils';
import type {
  CostCategory,
  DetailCostCategory,
  Location,
  CategoryLocationMapping,
  TenderCostMapping,
  TenderCostView,
  CreateCostCategoryInput,
  CreateDetailCostCategoryInput,
  CreateLocationInput,
  CreateCategoryLocationMappingInput,
  CreateTenderCostMappingInput,
  ImportCostRow,
  ParsedImportData,
  ImportResult
} from '../types/new-cost-structure';

export const costStructureApi = {
  // ========== HELPER FUNCTIONS ==========
  
  determineLocationType(locationName: string): string {
    const name = locationName.toLowerCase();
    if (name.includes('здание')) return 'building';
    if (name.includes('улица')) return 'street';
    if (name.includes('квартир')) return 'apartment';
    if (name.includes('моп')) return 'common_area';
    if (name.includes('паркинг')) return 'parking';
    if (name.includes('подвал')) return 'basement';
    if (name.includes('крыш') || name.includes('кровл')) return 'roof';
    if (name.includes('фасад')) return 'facade';
    return 'other';
  },

  // ========== COST CATEGORIES ==========
  
  async getCostCategories(includeInactive = false) {
    console.log('🚀 [getCostCategories] called with:', { includeInactive });
    
    try {
      let query = supabase
        .from('cost_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('✅ [getCostCategories] completed:', { count: data?.length });
      return data as CostCategory[];
    } catch (error) {
      console.error('❌ [getCostCategories] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async createCostCategory(input: CreateCostCategoryInput) {
    console.log('🚀 [createCostCategory] called with:', input);
    
    try {
      const { data, error } = await supabase
        .from('cost_categories')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ [createCostCategory] completed:', data);
      return data as CostCategory;
    } catch (error) {
      console.error('❌ [createCostCategory] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async bulkCreateCostCategories(categories: CreateCostCategoryInput[]) {
    console.log('🚀 [bulkCreateCostCategories] called with:', { count: categories.length });
    
    try {
      const { data, error } = await supabase
        .from('cost_categories')
        .upsert(categories, { 
          onConflict: 'code',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) throw error;
      
      console.log('✅ [bulkCreateCostCategories] completed:', { created: data?.length });
      return data as CostCategory[];
    } catch (error) {
      console.error('❌ [bulkCreateCostCategories] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== DETAIL COST CATEGORIES ==========
  
  async getDetailCostCategories(categoryId?: string, includeInactive = false) {
    console.log('🚀 [getDetailCostCategories] called with:', { categoryId, includeInactive });
    
    try {
      let query = supabase
        .from('detail_cost_categories')
        .select(`
          *,
          category:cost_categories(*)
        `)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('✅ [getDetailCostCategories] completed:', { count: data?.length });
      return data as DetailCostCategory[];
    } catch (error) {
      console.error('❌ [getDetailCostCategories] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async createDetailCostCategory(input: CreateDetailCostCategoryInput) {
    console.log('🚀 [createDetailCostCategory] called with:', input);
    
    try {
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .insert(input)
        .select(`
          *,
          category:cost_categories(*)
        `)
        .single();
      
      if (error) throw error;
      
      console.log('✅ [createDetailCostCategory] completed:', data);
      return data as DetailCostCategory;
    } catch (error) {
      console.error('❌ [createDetailCostCategory] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async bulkCreateDetailCostCategories(categories: CreateDetailCostCategoryInput[]) {
    console.log('🚀 [bulkCreateDetailCostCategories] called with:', { count: categories.length });
    
    try {
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .upsert(categories, { 
          onConflict: 'code',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) throw error;
      
      console.log('✅ [bulkCreateDetailCostCategories] completed:', { created: data?.length });
      return data as DetailCostCategory[];
    } catch (error) {
      console.error('❌ [bulkCreateDetailCostCategories] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== LOCATIONS ==========
  
  async getLocations(parentId: string | null = null, includeInactive = false) {
    console.log('🚀 [getLocations] called with:', { parentId, includeInactive });
    
    try {
      let query = supabase
        .from('location')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('✅ [getLocations] completed:', { count: data?.length });
      return data as Location[];
    } catch (error) {
      console.error('❌ [getLocations] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async getAllLocations(includeInactive = false) {
    console.log('🚀 [getAllLocations] called with:', { includeInactive });
    
    try {
      let query = supabase
        .from('location')
        .select('*')
        .order('level', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('✅ [getAllLocations] completed:', { count: data?.length });
      return data as Location[];
    } catch (error) {
      console.error('❌ [getAllLocations] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async getLocationsForDetailCategory(detailCategoryId: string) {
    console.log('🚀 [getLocationsForDetailCategory] called with:', { detailCategoryId });
    
    try {
      const { data, error } = await supabase
        .rpc('get_locations_for_detail_category', {
          p_detail_category_id: detailCategoryId
        });
      
      if (error) throw error;
      
      console.log('✅ [getLocationsForDetailCategory] completed:', { count: data?.length });
      return data as Array<{
        location_id: string;
        location_name: string;
        location_code: string;
        location_description: string;
        sort_order: number;
      }>;
    } catch (error) {
      console.error('❌ [getLocationsForDetailCategory] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async getLocationHierarchy(locationId?: string) {
    console.log('🚀 [getLocationHierarchy] called with:', { locationId });
    
    try {
      const { data, error } = await supabase
        .rpc('get_location_hierarchy', {
          p_location_id: locationId || null
        });
      
      if (error) throw error;
      
      console.log('✅ [getLocationHierarchy] completed:', { count: data?.length });
      return data as Location[];
    } catch (error) {
      console.error('❌ [getLocationHierarchy] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async createLocation(input: CreateLocationInput) {
    console.log('🚀 [createLocation] called with:', input);
    
    try {
      const { data, error } = await supabase
        .from('location')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ [createLocation] completed:', data);
      return data as Location;
    } catch (error) {
      console.error('❌ [createLocation] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async bulkCreateLocations(locations: CreateLocationInput[]) {
    console.log('🚀 [bulkCreateLocations] called with:', { count: locations.length });
    
    try {
      const { data, error } = await supabase
        .from('location')
        .upsert(locations, { 
          onConflict: 'code',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) throw error;
      
      console.log('✅ [bulkCreateLocations] completed:', { created: data?.length });
      return data as Location[];
    } catch (error) {
      console.error('❌ [bulkCreateLocations] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== CATEGORY-LOCATION MAPPING ==========
  
  async getCategoryLocationMappings(filters: {
    detail_category_id?: string;
    location_id?: string;
    includeInactive?: boolean;
  } = {}) {
    console.log('🚀 [getCategoryLocationMappings] called with:', filters);
    
    try {
      let query = supabase
        .from('category_location_mapping')
        .select(`
          *,
          detail_category:detail_cost_categories(
            id,
            code,
            name,
            unit,
            base_price,
            category_id,
            category:cost_categories(id, code, name)
          ),
          location:location(
            id,
            code,
            name,
            description,
            level,
            sort_order
          )
        `)
        .order('created_at', { ascending: false });
      
      if (filters.detail_category_id) {
        query = query.eq('detail_category_id', filters.detail_category_id);
      }
      
      if (filters.location_id) {
        query = query.eq('location_id', filters.location_id);
      }
      
      if (!filters.includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('✅ [getCategoryLocationMappings] completed:', { 
        count: data?.length,
        sampleData: data?.[0] 
      });
      
      // Дополнительная отладка
      if (data && data.length > 0) {
        console.log('📦 [getCategoryLocationMappings] Sample mapping structure:', {
          id: data[0].id,
          detail_category_id: data[0].detail_category_id,
          location_id: data[0].location_id,
          has_detail_category: !!data[0].detail_category,
          has_location: !!data[0].location,
          detail_category_name: data[0].detail_category?.name,
          location_name: data[0].location?.name
        });
      }
      
      return data as CategoryLocationMapping[];
    } catch (error) {
      console.error('❌ [getCategoryLocationMappings] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async createCategoryLocationMapping(input: CreateCategoryLocationMappingInput) {
    console.log('🚀 [createCategoryLocationMapping] called with:', input);
    
    try {
      const { data, error } = await supabase
        .from('category_location_mapping')
        .insert(input)
        .select(`
          *,
          detail_category:detail_cost_categories(*),
          location:location(*)
        `)
        .single();
      
      if (error) throw error;
      
      console.log('✅ [createCategoryLocationMapping] completed:', data);
      return data as CategoryLocationMapping;
    } catch (error) {
      console.error('❌ [createCategoryLocationMapping] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async bulkCreateCategoryLocationMappings(mappings: CreateCategoryLocationMappingInput[]) {
    console.log('🚀 [bulkCreateCategoryLocationMappings] called with:', { count: mappings.length });
    
    try {
      const { data, error } = await supabase
        .from('category_location_mapping')
        .upsert(mappings, { 
          onConflict: 'detail_category_id,location_id',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) throw error;
      
      console.log('✅ [bulkCreateCategoryLocationMappings] completed:', { created: data?.length });
      return data as CategoryLocationMapping[];
    } catch (error) {
      console.error('❌ [bulkCreateCategoryLocationMappings] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== IMPORT FUNCTIONALITY ==========
  
  parseImportData(rows: ImportCostRow[]): ParsedImportData {
    console.log('🚀 [parseImportData] Parsing rows:', rows.length);
    
    const categories = new Map<string, CreateCostCategoryInput>();
    const detailCategories = new Map<string, CreateDetailCostCategoryInput & { rowNumber: number }>();
    const locations = new Map<string, CreateLocationInput & { rowNumber: number }>();
    const mappings: ParsedImportData['mappings'] = [];
    
    // Track which category is active for detail categories
    let currentCategoryCode: string | null = null;
    
    rows.forEach(row => {
      // Process Cost Category (columns 1-3)
      if (row.categoryCode && row.categoryName) {
        currentCategoryCode = row.categoryCode;
        if (!categories.has(row.categoryCode)) {
          categories.set(row.categoryCode, {
            code: row.categoryCode,
            name: row.categoryName,
            description: row.categoryDescription || undefined,
            sort_order: categories.size,
            is_active: true
          });
        }
      }
      
      // Process Detail Cost Category (columns 4-5)
      // ВАЖНО: Используем currentCategoryCode из предыдущих строк, если категория не указана в текущей строке
      if ((row.detailCode || row.detailName)) {
        // Проверяем, есть ли активная категория
        if (!currentCategoryCode) {
          console.warn(`⚠️ [parseImportData] Row ${row.rowNumber}: Detail without category - skipping`);
          console.warn(`   Detail: ${row.detailName} (${row.detailCode})`);
          // Пропускаем детализацию без категории
        } else {
          // Генерируем уникальный код если не указан
          const detailCode = row.detailCode || `${currentCategoryCode}.${String(row.rowNumber).padStart(3, '0')}`;
          // Используем код как ключ
          const detailKey = detailCode;
          
          if (!detailCategories.has(detailKey)) {
            console.log(`📋 [parseImportData] Adding detail from row ${row.rowNumber}: ${detailCode} - ${row.detailName}`);
            // Will need to get category_id after categories are created
            detailCategories.set(detailKey, {
              category_id: '', // Will be filled after category creation
              code: detailCode,
              name: row.detailName,
              unit: row.detailUnit || 'шт',
              base_price: row.detailPrice || 0,
              description: undefined,
              sort_order: detailCategories.size,
              is_active: true,
              rowNumber: row.rowNumber,
              categoryCode: currentCategoryCode // Сохраняем код категории для последующей связи
            });
          } else {
            console.log(`⚠️ [parseImportData] Duplicate detail code at row ${row.rowNumber}: ${detailCode} - будет обновлена существующая`);
          }
        }
      }
      
      // Process Location (column 6)
      // ВАЖНО: Используем ТОЧНОЕ название локации из столбца 6 Excel БЕЗ модификаций
      if (row.locationName) {
        // Используем простой уникальный ключ на основе имени
        const locationKey = row.locationName.toLowerCase().trim();
        
        // Создаем простой код без префиксов типа
        const locationCode = row.locationCode || row.locationName.toUpperCase().replace(/\s+/g, '_');
        
        if (!locations.has(locationKey)) {
          console.log(`📍 [parseImportData] Adding location from row ${row.rowNumber}: "${row.locationName}" with code "${locationCode}"`);
          locations.set(locationKey, {
            code: locationCode, // Простой код без префиксов
            name: row.locationName, // ТОЧНОЕ название из Excel
            description: undefined,
            parent_id: undefined,
            sort_order: locations.size * 10,
            level: 1,
            is_active: true,
            rowNumber: row.rowNumber
          });
        }
      }
      
      // Create mapping if all components exist
      // ВАЖНО: Связь создается для каждой строки, где есть детализация И локация
      if ((row.detailCode || row.detailName) && row.locationName && currentCategoryCode) {
        // Используем тот же код, что и для детальной категории
        const detailCode = row.detailCode || `${currentCategoryCode}.${String(row.rowNumber).padStart(3, '0')}`;
        
        // Создаем простой код локации БЕЗ префиксов типа
        const locationCode = row.locationCode || row.locationName.toUpperCase().replace(/\s+/g, '_');
        
        console.log(`🔍 [parseImportData] Creating mapping from row ${row.rowNumber}: ${row.detailName} (${detailCode}) -> ${row.locationName} (${locationCode})`);
        mappings.push({
          rowNumber: row.rowNumber,
          detailCategoryCode: detailCode,
          detailCategoryName: row.detailName,
          locationCode: locationCode, // Простой код локации
          locationName: row.locationName, // ТОЧНОЕ название из Excel
          quantity: row.quantity || 1,
          unitPrice: row.unitPrice || row.detailPrice || 0,
          discount: row.discount || 0,
          categoryCode: currentCategoryCode // Добавляем код категории для отладки
        });
      } else if ((row.detailCode || row.detailName) && row.locationName && !currentCategoryCode) {
        console.warn(`⚠️ [parseImportData] Row ${row.rowNumber}: Cannot create mapping - no category context`);
        console.warn(`   Detail: ${row.detailName}, Location: ${row.locationName}`);
      }
    });
    
    console.log('✅ [parseImportData] Parsed:', {
      categories: categories.size,
      detailCategories: detailCategories.size,
      locations: locations.size,
      mappings: mappings.length
    });
    
    // Дополнительная отладка маппингов
    console.log('📊 [parseImportData] Sample mappings:', mappings.slice(0, 3).map(m => ({
      row: m.rowNumber,
      detail: `${m.detailCategoryName} (${m.detailCategoryCode})`,
      location: `${m.locationName} (${m.locationCode})`
    })));
    
    return { categories, detailCategories, locations, mappings };
  },

  async importCostStructure(
    rows: ImportCostRow[], 
    onProgress?: (progress: number, message: string) => void
  ): Promise<ImportResult> {
    console.log('🚀 [importCostStructure] Starting import with rows:', rows.length);
    
    const result: ImportResult = {
      success: false,
      categoriesCreated: 0,
      detailCategoriesCreated: 0,
      locationsCreated: 0,
      mappingsCreated: 0,
      errors: []
    };
    
    try {
      onProgress?.(10, 'Парсинг данных...');
      
      // Parse the import data
      const parsedData = this.parseImportData(rows);
      
      console.log('📊 [importCostStructure] Parsed data:', {
        categories: parsedData.categories.size,
        detailCategories: parsedData.detailCategories.size,
        locations: parsedData.locations.size,
        mappings: parsedData.mappings.length
      });
      
      onProgress?.(20, `Создание ${parsedData.categories.size} категорий...`);
      
      // Step 1: Create Cost Categories
      if (parsedData.categories.size > 0) {
        const categoriesArray = Array.from(parsedData.categories.values());
        const createdCategories = await this.bulkCreateCostCategories(categoriesArray);
        result.categoriesCreated = createdCategories.length;
        
        // Create map of code to id for linking
        const categoryIdMap = new Map<string, string>();
        createdCategories.forEach(cat => {
          categoryIdMap.set(cat.code, cat.id);
        });
        
        onProgress?.(40, `Создание ${parsedData.detailCategories.size} детальных категорий...`);
        
        // Step 2: Create Detail Cost Categories with proper category_id
        if (parsedData.detailCategories.size > 0) {
          const detailCategoriesArray = Array.from(parsedData.detailCategories.values());
          
          // Link detail categories to their parent categories using saved categoryCode
          detailCategoriesArray.forEach(detail => {
            // Используем сохраненный categoryCode из детализации
            const categoryCode = (detail as any).categoryCode;
            if (categoryCode && categoryIdMap.has(categoryCode)) {
              detail.category_id = categoryIdMap.get(categoryCode)!;
              console.log(`🔗 [importCostStructure] Linked detail "${detail.name}" to category ${categoryCode}`);
            } else {
              console.warn(`⚠️ [importCostStructure] Cannot link detail "${detail.name}" - category code "${categoryCode}" not found`);
            }
          });
          
          // Filter out details without category_id
          const validDetails = detailCategoriesArray.filter(d => d.category_id);
          
          console.log(`🔗 [importCostStructure] Linking details: ${validDetails.length}/${detailCategoriesArray.length} linked successfully`);
          
          if (validDetails.length > 0) {
            const createdDetails = await this.bulkCreateDetailCostCategories(validDetails);
            result.detailCategoriesCreated = createdDetails.length;
            
            // Create map for detail categories
            const detailIdMap = new Map<string, string>();
            createdDetails.forEach(detail => {
              detailIdMap.set(detail.code, detail.id);
            });
            
            onProgress?.(60, `Создание ${parsedData.locations.size} локаций...`);
            
            // Step 3: Create Locations (simplified - no hierarchy for now)
            if (parsedData.locations.size > 0) {
              const allLocations = Array.from(parsedData.locations.values())
                .map(loc => ({ ...loc, parent_id: undefined })); // Ignore hierarchy for simplicity
              
              console.log('🏗️ [importCostStructure] Creating locations:', allLocations.map(l => ({ code: l.code, name: l.name })));
              
              const createdLocations = await this.bulkCreateLocations(allLocations);
              result.locationsCreated = createdLocations.length;
              
              console.log('✅ [importCostStructure] Created locations:', createdLocations.map(l => ({ id: l.id, code: l.code, name: l.name })));
              
              // Create map for locations
              const locationIdMap = new Map<string, string>();
              createdLocations.forEach(loc => {
                locationIdMap.set(loc.code, loc.id);
              });
              
              onProgress?.(80, `Создание ${parsedData.mappings.length} связей...`);
              
              // Step 4: Create Category-Location Mappings
              if (parsedData.mappings.length > 0) {
                console.log(`🔍 Processing ${parsedData.mappings.length} mappings from Excel...`);
                
                // Create comprehensive maps for matching
                const detailMaps = {
                  byName: new Map<string, string>(),
                  byCode: new Map<string, string>(),
                  byFullKey: new Map<string, string>() // Категория + детализация
                };
                
                createdDetails.forEach(detail => {
                  const normalizedName = detail.name.toLowerCase().trim();
                  detailMaps.byName.set(normalizedName, detail.id);
                  detailMaps.byCode.set(detail.code, detail.id);
                  console.log(`📋 Detail registered: "${detail.name}" (${detail.code}) -> ${detail.id}`);
                });
                
                const locationMaps = {
                  byName: new Map<string, string>(),
                  byCode: new Map<string, string>()
                };
                
                createdLocations.forEach(loc => {
                  const normalizedName = loc.name.toLowerCase().trim();
                  locationMaps.byName.set(normalizedName, loc.id);
                  locationMaps.byCode.set(loc.code, loc.id);
                  console.log(`📍 Location registered: "${loc.name}" (${loc.code}) -> ${loc.id}`);
                });
                
                console.log(`📊 Available for mapping: ${detailMaps.byName.size} details, ${locationMaps.byName.size} locations`);
                
                // Дополнительная отладка - показываем что есть в словарях
                console.log('🔍 Detail codes available:', Array.from(detailMaps.byCode.keys()).slice(0, 5));
                console.log('🔍 Detail names available:', Array.from(detailMaps.byName.keys()).slice(0, 5));
                console.log('🔍 Location codes available:', Array.from(locationMaps.byCode.keys()));
                console.log('🔍 Location names available:', Array.from(locationMaps.byName.keys()));
                
                const mappingsToCreate = parsedData.mappings
                  .map(m => {
                    // Получаем данные из маппинга (из Excel файла)
                    const detailName = (m as any).detailCategoryName || '';
                    const locationName = (m as any).locationName || '';
                    const detailCode = m.detailCategoryCode;
                    const locationCode = m.locationCode;
                    
                    console.log(`🔎 Processing mapping from row ${m.rowNumber}: "${detailName}" (${detailCode}) -> "${locationName}" (${locationCode})`);
                    
                    // Нормализуем для поиска
                    const normalizedDetailName = detailName.toLowerCase().trim();
                    const normalizedLocationName = locationName.toLowerCase().trim();
                    
                    // Ищем ID детальной категории
                    let detailId = detailMaps.byCode.get(detailCode);
                    if (!detailId) {
                      detailId = detailMaps.byName.get(normalizedDetailName);
                    }
                    
                    // Ищем ID локации - сначала по коду, потом по имени
                    let locationId = locationMaps.byCode.get(locationCode);
                    if (!locationId) {
                      // Пробуем найти по имени
                      locationId = locationMaps.byName.get(normalizedLocationName);
                    }
                    if (!locationId) {
                      // Пробуем варианты кода (на случай если коды были созданы по-разному)
                      const codeVariants = [
                        locationCode.toUpperCase(),
                        locationCode.toLowerCase(),
                        locationName.toUpperCase().replace(/\s+/g, '_')
                      ];
                      
                      for (const variant of codeVariants) {
                        locationId = locationMaps.byCode.get(variant);
                        if (locationId) {
                          console.log(`✅ Found location by variant code: ${variant}`);
                          break;
                        }
                      }
                    }
                    
                    if (!detailId) {
                      console.warn(`⚠️ Row ${m.rowNumber}: Cannot find detail category: "${detailName}" (code: ${detailCode})`);
                      console.warn(`   Available details: ${Array.from(detailMaps.byName.keys()).slice(0, 5).join(', ')}...`);
                      return null;
                    }
                    
                    if (!locationId) {
                      console.warn(`⚠️ Row ${m.rowNumber}: Cannot find location: "${locationName}" (code: ${locationCode})`);
                      console.warn(`   Normalized location name: "${normalizedLocationName}"`);
                      console.warn(`   Available location names: ${Array.from(locationMaps.byName.keys()).join(', ')}`);
                      console.warn(`   Available location codes: ${Array.from(locationMaps.byCode.keys()).join(', ')}`);
                      console.warn(`   Возможно, проблема с регистром или пробелами в названии локации`);
                      return null;
                    }
                    
                    console.log(`✅ Row ${m.rowNumber}: Создаем связь из Excel: "${detailName}" -> "${locationName}"`);
                    
                    return {
                      detail_category_id: detailId,
                      location_id: locationId,
                      quantity: m.quantity || 1,
                      unit_price: m.unitPrice || 0,
                      discount_percent: m.discount || 0,
                      is_active: true
                    };
                  })
                  .filter(m => m !== null);
                
                console.log(`🔗 [importCostStructure] Creating mappings: ${mappingsToCreate.length}/${parsedData.mappings.length} valid`);
                
                if (mappingsToCreate.length > 0) {
                  console.log('📝 [importCostStructure] Mappings to create:', mappingsToCreate.slice(0, 5).map(m => ({
                    detail_id: m.detail_category_id?.substring(0, 8),
                    location_id: m.location_id?.substring(0, 8),
                    quantity: m.quantity,
                    unit_price: m.unit_price
                  })));
                  
                  const createdMappings = await this.bulkCreateCategoryLocationMappings(mappingsToCreate);
                  result.mappingsCreated = createdMappings.length;
                  
                  console.log('✅ [importCostStructure] Created mappings:', createdMappings.length);
                } else {
                  console.warn('⚠️ No valid mappings to create');
                  console.warn('📊 Failed mapping details:', parsedData.mappings.slice(0, 5));
                }
              }
            }
          }
        }
      }
      
      onProgress?.(100, 'Импорт завершен!');
      
      result.success = true;
      console.log('✅ [importCostStructure] Import completed:', result);
      
    } catch (error) {
      console.error('❌ [importCostStructure] Import failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      onProgress?.(100, `Ошибка импорта: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
};