// Новая логика импорта для правильных таблиц

const handleImportExcelNew = async (file) => {
  console.log('🚀 [ConstructionCostsPage] Importing Excel with corrected logic:', file.name);
  
  // Сброс состояния
  setImportProgress(0);
  setImportStatus('processing');
  setImportLog([`Начало импорта файла: ${file.name}`]);
  
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      setImportLog(prev => [...prev, 'Чтение файла...']);
      const data = new Uint8Array(e.target?.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log('📦 [ConstructionCostsPage] Parsed Excel data:', jsonData);
      setImportLog(prev => [...prev, `Найдено строк: ${jsonData.length}`]);
      
      setLoading(true);
      
      // Загружаем справочники
      setImportLog(prev => [...prev, 'Загрузка справочников...']);
      const { data: unitsData } = await supabase.from('units').select('*');
      const { data: locationsData } = await supabase.from('location').select('*');
      const { data: costCategoriesData } = await supabase.from('cost_categories').select('*');
      const { data: detailCategoriesData } = await supabase.from('detail_cost_categories').select('*');
      
      const units = unitsData || [];
      const locations = locationsData || [];
      const costCategories = costCategoriesData || [];
      const detailCategories = detailCategoriesData || [];
      
      setImportLog(prev => [...prev, `Загружено справочников: ${units.length} единиц, ${locations.length} локализаций, ${costCategories.length} категорий, ${detailCategories.length} детальных категорий`]);
      
      const errors = [];
      let successCount = 0;
      let skipCount = 0;
      const totalRows = jsonData.length;
      
      for (let i = 0; i < totalRows; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        
        // Обновляем прогресс
        const progress = Math.round((i / totalRows) * 100);
        setImportProgress(progress);
        
        const catOrder = row[0] ? Number(row[0]) : null;
        const catName = row[1] ? String(row[1]).trim() : null;  // -> cost_categories
        const catUnit = row[2] ? String(row[2]).trim() : null;
        const detName = row[3] ? String(row[3]).trim() : null;  // -> detail_cost_categories
        const detUnit = row[4] ? String(row[4]).trim() : null;
        const locName = row[5] ? String(row[5]).trim() : null;  // -> location
        
        console.log(`🔍 Строка ${i + 1}:`, { catOrder, catName, catUnit, detName, detUnit, locName });
        
        // Пропускаем заголовок
        if (i === 0 && catName === 'Категория') {
          console.log(`⏭️ Пропускаем заголовок`);
          continue;
        }
        
        // Пропускаем пустые строки
        if (!catName && !detName) {
          skipCount++;
          continue;
        }
        
        try {
          // 1. Обрабатываем категорию затрат (столбец 2 -> cost_categories)
          let categoryId = null;
          if (catName) {
            // Ищем существующую категорию
            let existingCategory = costCategories.find(c => c.title === catName || c.name === catName);
            
            if (existingCategory) {
              categoryId = existingCategory.id;
              console.log(`✅ Найдена категория: ${catName}`);
            } else {
              // Создаем новую категорию
              const { data: newCategoryArray, error: catError } = await supabase
                .from('cost_categories')
                .insert({
                  title: catName,
                  name: catName,
                  order_num: catOrder || 100
                })
                .select();
              
              if (catError) {
                console.error(`❌ Ошибка создания категории ${catName}:`, catError);
                errors.push(`Строка ${i + 1}: Ошибка создания категории "${catName}": ${catError.message}`);
                continue;
              }
              
              if (newCategoryArray && newCategoryArray.length > 0) {
                const newCategory = newCategoryArray[0];
                categoryId = newCategory.id;
                costCategories.push(newCategory);
                console.log(`✅ Создана категория: ${catName}`);
              }
            }
          }
          
          // 2. Обрабатываем детальную категорию (столбец 4 -> detail_cost_categories)
          if (detName && categoryId) {
            // Ищем существующую детальную категорию
            let existingDetail = detailCategories.find(d => 
              d.title === detName && d.cost_category_id === categoryId
            );
            
            if (!existingDetail) {
              // Ищем единицу измерения для детали
              let detailUnitId = null;
              if (detUnit) {
                const unit = units.find(u => u.title === detUnit || u.code === detUnit);
                if (unit) {
                  detailUnitId = unit.id;
                }
              }
              
              // Ищем локализацию
              let locationId = null;
              if (locName) {
                const location = locations.find(l => l.title === locName);
                if (location) {
                  locationId = location.id;
                }
              }
              
              // Создаем детальную категорию
              const { data: newDetailArray, error: detError } = await supabase
                .from('detail_cost_categories')
                .insert({
                  cost_category_id: categoryId,
                  title: detName,
                  name: detName,
                  unit_id: detailUnitId,
                  location_id: locationId,
                  order_num: 100
                })
                .select();
              
              if (detError) {
                console.error(`❌ Ошибка создания детали ${detName}:`, detError);
                errors.push(`Строка ${i + 1}: Ошибка создания детали "${detName}": ${detError.message}`);
                continue;
              }
              
              if (newDetailArray && newDetailArray.length > 0) {
                const newDetail = newDetailArray[0];
                detailCategories.push(newDetail);
                console.log(`✅ Создана деталь: ${detName}`);
              }
            } else {
              console.log(`✅ Найдена существующая деталь: ${detName}`);
            }
          }
          
          successCount++;
          if (totalRows <= 50 || successCount % 10 === 0 || successCount === 1) {
            setImportLog(prev => [...prev, `✅ Строка ${i + 1}: обработана успешно`]);
          }
          
        } catch (err) {
          errors.push(`Строка ${i + 1}: ${err.message}`);
          setImportLog(prev => [...prev, `❌ Строка ${i + 1}: ${err.message}`]);
        }
      }
      
      setImportProgress(100);
      setImportLog(prev => [...prev, 
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `📊 Итоги импорта:`,
        `✅ Успешно обработано: ${successCount} записей`,
        `⏭️ Пропущено пустых строк: ${skipCount}`,
        `❌ Ошибок: ${errors.length}`,
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      ]);
      
      if (errors.length > 0) {
        console.log('❌ Errors during import:', errors);
      }
      
      setImportStatus('completed');
      await loadData(); // Обновляем отображение
      console.log('✅ [ConstructionCostsPage] Import complete');
      
    } catch (err) {
      console.error('❌ [ConstructionCostsPage] Import error:', err);
      setImportLog(prev => [...prev, `❌ Критическая ошибка: ${err.message}`]);
      setImportStatus('error');
    } finally {
      setLoading(false);
    }
  };
  
  reader.readAsArrayBuffer(file);
  return false;
};