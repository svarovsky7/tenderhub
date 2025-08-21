import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Select,
  Form,
  message,
  Row,
  Col,
  Alert,
  Space,
  Typography,
  Badge,
  Divider,
  Progress,
  Modal,
  InputNumber,
  Tag,
  Tooltip,
  Input
} from 'antd';
import '../styles/tender-costs-theme.css';
import {
  DollarOutlined,
  FileTextOutlined,
  BuildOutlined,
  CalculatorOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  InboxOutlined,
  ToolOutlined,
  TeamOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { supabase } from '../lib/supabase/client';
import { getCategoriesWithDetails } from '../lib/supabase/api/construction-costs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

interface Tender {
  id: string;
  title: string;
  tender_number: string;
}

interface DetailCostCategory {
  id: string;
  name: string;
  unit: string | null;
  unit_cost: number | null;
  cost_category_id: string;
  location_id: string;
  cost_categories?: {
    id: string;
    name: string;
    code: string | null;
  };
  location?: {
    id: string;
    city: string | null;
    region: string | null;
  };
}

interface CostWithCalculation {
  id: string;
  detail_cost_category_id: string;
  category_name: string;
  detail_name: string;
  location: string;
  unit: string;
  volume: number | null;
  materials_total: number;
  works_total: number;
  submaterials_total: number;
  subworks_total: number;
  total: number;
  // Actual BOQ costs (not dependent on volume)
  actual_materials: number;
  actual_works: number;
  actual_submaterials: number;
  actual_subworks: number;
}

interface TenderCostVolume {
  id?: string;
  tender_id: string;
  detail_cost_category_id: string;
  volume: number;
  created_at?: string;
  updated_at?: string;
}

const TenderConstructionCostsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [costCategories, setCostCategories] = useState<DetailCostCategory[]>([]);
  const [costsWithCalculations, setCostsWithCalculations] = useState<CostWithCalculation[]>([]);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [saveTimeouts, setSaveTimeouts] = useState<Record<string, NodeJS.Timeout>>({});
  const [savedVolumes, setSavedVolumes] = useState<Record<string, number>>({});
  const [searchText, setSearchText] = useState('');
  const [hideZeroCosts, setHideZeroCosts] = useState(false);
  const [stats, setStats] = useState({
    totalMaterials: 0,
    totalWorks: 0,
    totalSubmaterials: 0,
    totalSubworks: 0,
    totalCost: 0,
    categoriesWithVolume: 0,
    totalCategories: 0,
    // Фактические итоги (независимо от объема)
    actualTotalMaterials: 0,
    actualTotalWorks: 0,
    actualTotalSubmaterials: 0,
    actualTotalSubworks: 0,
    actualTotalCost: 0
  });

  useEffect(() => {
    loadTenders();
    loadCostCategories();
  }, []);

  // Очистка таймеров при размонтировании компонента
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [saveTimeouts]);

  useEffect(() => {
    console.log('🔄 [useEffect] Tender changed to:', selectedTenderId);
    
    // ВАЖНО: Очищаем все ожидающие сохранения при смене тендера
    console.log('⏱️ [useEffect] Clearing pending save timeouts');
    Object.values(saveTimeouts).forEach(timeout => {
      if (timeout) clearTimeout(timeout);
    });
    setSaveTimeouts({});
    
    if (selectedTenderId) {
      // Сначала очищаем старые объемы
      console.log('🧹 [useEffect] Clearing old volumes');
      setVolumes({});
      setSavedVolumes({});
      // Затем загружаем новые
      console.log('📥 [useEffect] Loading volumes for new tender');
      loadTenderVolumes();
      calculateCosts();
    } else {
      // Если тендер не выбран, очищаем объемы
      console.log('❌ [useEffect] No tender selected, clearing volumes');
      setVolumes({});
      setSavedVolumes({});
    }
  }, [selectedTenderId]);

  useEffect(() => {
    if (selectedTenderId) {
      calculateCosts();
    }
  }, [volumes]);

  const loadTenders = async () => {
    console.log('🚀 [loadTenders] Loading tenders');
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('id, title, tender_number')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTenders(data || []);
      console.log('✅ [loadTenders] Success:', data?.length, 'tenders');
    } catch (error) {
      console.error('❌ [loadTenders] Error:', error);
      message.error('Ошибка загрузки тендеров');
    }
  };

  const loadCostCategories = async () => {
    console.log('🚀 [loadCostCategories] Loading cost categories');
    setLoading(true);
    try {
      // Load detail cost categories with relations
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .select(`
          *,
          cost_categories (
            id,
            name,
            code
          ),
          location (
            id,
            city,
            region,
            country,
            title
          )
        `)
        .order('cost_categories(name)', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setCostCategories(data || []);
      console.log('✅ [loadCostCategories] Success:', data?.length, 'categories');
      
      // Логируем для отладки
      if (data && data.length > 0) {
        console.log('📍 Sample location data:', {
          category: data[0].cost_categories?.name,
          detail: data[0].name,
          location: data[0].location
        });
      }
    } catch (error) {
      console.error('❌ [loadCostCategories] Error:', error);
      message.error('Ошибка загрузки категорий затрат');
    } finally {
      setLoading(false);
    }
  };

  const loadTenderVolumes = async () => {
    if (!selectedTenderId) return;

    console.log('🚀 [loadTenderVolumes] Loading volumes for tender:', selectedTenderId);
    try {
      // Load existing volumes from the table
      const { data, error } = await supabase
        .from('tender_cost_volumes')
        .select('*')
        .eq('tender_id', selectedTenderId);

      if (error) {
        console.error('❌ [loadTenderVolumes] Error loading volumes:', error);
        // Если таблица не существует, просто очищаем объемы
        setVolumes({});
        setSavedVolumes({});
        return;
      }

      if (data) {
        const volumesMap: Record<string, number> = {};
        data.forEach(item => {
          // Загружаем только объемы >= 1
          if (item.volume >= 1) {
            volumesMap[item.detail_cost_category_id] = Number(item.volume);
          }
        });
        setVolumes(volumesMap);
        setSavedVolumes(volumesMap); // Обновляем и сохраненные объемы
        console.log('✅ [loadTenderVolumes] Loaded', Object.keys(volumesMap).length, 'volumes for tender:', selectedTenderId);
        console.log('📋 [loadTenderVolumes] Loaded volumes:', volumesMap);
        
        // Логируем для отладки
        if (Object.keys(volumesMap).length > 0) {
          console.log('📊 Loaded volumes:', volumesMap);
        }
      } else {
        // Нет данных - очищаем объемы
        setVolumes({});
        console.log('📝 [loadTenderVolumes] No volumes found for tender:', selectedTenderId);
      }
    } catch (error) {
      console.error('❌ [loadTenderVolumes] Unexpected error:', error);
      setVolumes({});
    }
  };

  const calculateCosts = async () => {
    if (!selectedTenderId) return;

    console.log('🚀 [calculateCosts] Calculating costs for tender:', selectedTenderId);
    
    try {
      // Load client positions with BOQ items for this tender
      const { data: positions, error: posError } = await supabase
        .from('client_positions')
        .select(`
          *,
          boq_items (
            *
          )
        `)
        .eq('tender_id', selectedTenderId);

      if (posError) throw posError;

      // Calculate costs for each detail category based on assigned categories in BOQ items
      const calculations: CostWithCalculation[] = costCategories.map(category => {
        let materialsTotal = 0;
        let worksTotal = 0;
        let submaterialsTotal = 0;
        let subworksTotal = 0;

        // Go through all positions and their BOQ items
        positions?.forEach(position => {
          const categoryItems = position.boq_items?.filter((item: any) => 
            item.detail_cost_category_id === category.id
          ) || [];

          // Sum up the costs for this category using total_amount (includes delivery)
          materialsTotal += categoryItems
            .filter((item: any) => item.item_type === 'material')
            .reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);

          worksTotal += categoryItems
            .filter((item: any) => item.item_type === 'work')
            .reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);

          submaterialsTotal += categoryItems
            .filter((item: any) => item.item_type === 'sub_material')
            .reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);

          subworksTotal += categoryItems
            .filter((item: any) => item.item_type === 'sub_work')
            .reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);
        });

        const volume = volumes[category.id] || null;
        
        // Only show costs if volume is entered
        const displayMaterials = volume && volume > 0 ? materialsTotal : 0;
        const displayWorks = volume && volume > 0 ? worksTotal : 0;
        const displaySubmaterials = volume && volume > 0 ? submaterialsTotal : 0;
        const displaySubworks = volume && volume > 0 ? subworksTotal : 0;

        return {
          id: category.id,
          detail_cost_category_id: category.id,
          category_name: category.cost_categories?.name || '',
          detail_name: category.name,
          location: [category.location?.city, category.location?.region, category.location?.country]
            .filter(Boolean)
            .join(', ') || category.location?.title || '',
          unit: category.unit || '',
          volume: volume,
          materials_total: displayMaterials,
          works_total: displayWorks,
          submaterials_total: displaySubmaterials,
          subworks_total: displaySubworks,
          total: displayMaterials + displayWorks + displaySubmaterials + displaySubworks,
          actual_materials: materialsTotal,
          actual_works: worksTotal,
          actual_submaterials: submaterialsTotal,
          actual_subworks: subworksTotal
        };
      });

      setCostsWithCalculations(calculations);

      // Calculate statistics - only count categories with volumes
      const totalMaterials = calculations.reduce((sum, c) => sum + c.materials_total, 0);
      const totalWorks = calculations.reduce((sum, c) => sum + c.works_total, 0);
      const totalSubmaterials = calculations.reduce((sum, c) => sum + c.submaterials_total, 0);
      const totalSubworks = calculations.reduce((sum, c) => sum + c.subworks_total, 0);
      const categoriesWithVolume = calculations.filter(c => c.volume && c.volume > 0).length;

      // Calculate actual totals (independent of volume)
      const actualTotalMaterials = calculations.reduce((sum, c) => sum + c.actual_materials, 0);
      const actualTotalWorks = calculations.reduce((sum, c) => sum + c.actual_works, 0);
      const actualTotalSubmaterials = calculations.reduce((sum, c) => sum + c.actual_submaterials, 0);
      const actualTotalSubworks = calculations.reduce((sum, c) => sum + c.actual_subworks, 0);

      setStats({
        totalMaterials,
        totalWorks,
        totalSubmaterials,
        totalSubworks,
        totalCost: totalMaterials + totalWorks + totalSubmaterials + totalSubworks,
        categoriesWithVolume,
        totalCategories: calculations.length,
        actualTotalMaterials,
        actualTotalWorks,
        actualTotalSubmaterials,
        actualTotalSubworks,
        actualTotalCost: actualTotalMaterials + actualTotalWorks + actualTotalSubmaterials + actualTotalSubworks
      });

      console.log('✅ [calculateCosts] Calculated costs for', calculations.length, 'categories');
      console.log('📊 Total materials:', totalMaterials, 'Total works:', totalWorks);
      console.log('📊 Total submaterials:', totalSubmaterials, 'Total subworks:', totalSubworks);
      
      // Детальная отладка
      const categoriesWithMaterials = calculations.filter(c => c.actual_materials > 0);
      const categoriesWithWorks = calculations.filter(c => c.actual_works > 0);
      const categoriesWithSubmaterials = calculations.filter(c => c.actual_submaterials > 0);
      const categoriesWithSubworks = calculations.filter(c => c.actual_subworks > 0);
      
      console.log('📦 Categories with materials:', categoriesWithMaterials.length);
      console.log('🔨 Categories with works:', categoriesWithWorks.length);
      console.log('🔧 Categories with submaterials:', categoriesWithSubmaterials.length);
      console.log('⚡ Categories with subworks:', categoriesWithSubworks.length);
      
      if (categoriesWithMaterials.length > 0) {
        console.log('📦 Sample material category:', {
          category: categoriesWithMaterials[0].category_name,
          detail: categoriesWithMaterials[0].detail_name,
          amount: categoriesWithMaterials[0].actual_materials
        });
      }
      
      // Отладка общих итогов
      console.log('💰 ACTUAL TOTALS:');
      console.log('  - Materials:', actualTotalMaterials);
      console.log('  - Works:', actualTotalWorks);
      console.log('  - Submaterials:', actualTotalSubmaterials);
      console.log('  - Subworks:', actualTotalSubworks);
      console.log('  - Grand Total:', actualTotalMaterials + actualTotalWorks + actualTotalSubmaterials + actualTotalSubworks);
    } catch (error) {
      console.error('❌ [calculateCosts] Error:', error);
    }
  };

  const saveVolumeRecord = async (detailCostCategoryId: string, volume: number) => {
    if (!selectedTenderId) {
      console.log('🚫 [saveVolumeRecord] No tender selected');
      return;
    }
    
    try {
      console.log('🚀 [saveVolumeRecord] Saving volume:', volume, 'for tender:', selectedTenderId, 'category:', detailCostCategoryId);

      // Вычисляем unit_total
      const costRecord = costsWithCalculations.find(c => c.detail_cost_category_id === detailCostCategoryId);
      const totalActual = costRecord ? 
        costRecord.actual_materials + costRecord.actual_works + costRecord.actual_submaterials + costRecord.actual_subworks : 0;
      const unitTotal = volume > 0 ? totalActual / volume : 0;

      const record = {
        tender_id: selectedTenderId,
        detail_cost_category_id: detailCostCategoryId,
        volume: volume,
        unit_total: Number(unitTotal.toFixed(2))
      };

      if (volume >= 1) {
        // Сначала пробуем обновить существующую запись
        console.log('🔍 [saveVolumeRecord] Checking for existing record:', {
          tender_id: selectedTenderId,
          detail_cost_category_id: detailCostCategoryId
        });
        const { data: existing, error: selectError } = await supabase
          .from('tender_cost_volumes')
          .select('id')
          .eq('tender_id', selectedTenderId)
          .eq('detail_cost_category_id', detailCostCategoryId)
          .single();
        
        if (selectError && selectError.code !== 'PGRST116') {
          console.log('⚠️ [saveVolumeRecord] Select error (not 404):', selectError);
        }

        let error;
        if (existing) {
          // Обновляем существующую запись
          console.log('📝 [saveVolumeRecord] Updating existing record for:', detailCostCategoryId);
          const { error: updateError } = await supabase
            .from('tender_cost_volumes')
            .update({ volume: volume, unit_total: Number(unitTotal.toFixed(2)) })
            .eq('tender_id', selectedTenderId)
            .eq('detail_cost_category_id', detailCostCategoryId);
          error = updateError;
        } else {
          // Создаем новую запись
          console.log('➕ [saveVolumeRecord] Creating new record:', record);
          const { error: insertError } = await supabase
            .from('tender_cost_volumes')
            .insert(record);
          error = insertError;
          if (insertError) {
            console.error('❌ [saveVolumeRecord] Insert error details:', insertError);
          }
        }

        if (error) {
          console.error('❌ [saveVolumeRecord] Save error:', error);
          message.error(`Ошибка сохранения объема: ${error.message}`);
          return;
        }
        console.log('✅ [saveVolumeRecord] Auto-saved volume:', volume, 'for category:', detailCostCategoryId);
        
        // Отслеживаем успешно сохраненные объемы
        setSavedVolumes(prev => ({
          ...prev,
          [detailCostCategoryId]: volume
        }));
      } else {
        // Удаляем запись если объем равен 0
        const { error } = await supabase
          .from('tender_cost_volumes')
          .delete()
          .eq('tender_id', selectedTenderId)
          .eq('detail_cost_category_id', detailCostCategoryId);
        
        if (error) {
          console.error('❌ [saveVolumeRecord] Delete error:', error);
        } else {
          console.log('🗑️ [saveVolumeRecord] Auto-deleted volume for category:', detailCostCategoryId);
          // Удаляем из отслеживания сохраненных объемов
          setSavedVolumes(prev => {
            const newSaved = { ...prev };
            delete newSaved[detailCostCategoryId];
            return newSaved;
          });
        }
      }
    } catch (error) {
      console.error('❌ [saveVolumeRecord] General error:', error);
      message.error(`Ошибка автосохранения: ${error.message}`);
    }
  };

  // Функция для немедленного сохранения всех ожидающих объемов
  const saveAllPendingVolumes = async () => {
    console.log('💾 [saveAllPendingVolumes] Saving all pending volumes');
    
    // Очищаем все таймеры
    Object.values(saveTimeouts).forEach(timeout => {
      if (timeout) clearTimeout(timeout);
    });
    
    // Сохраняем все измененные объемы
    const promises = Object.entries(volumes).map(([categoryId, volume]) => {
      if (volume >= 1) {
        return saveVolumeRecord(categoryId, volume);
      }
      return Promise.resolve();
    });
    
    await Promise.all(promises);
    setSaveTimeouts({});
    console.log('✅ [saveAllPendingVolumes] All pending volumes saved');
  };

  const handleVolumeChange = async (detailCategoryId: string, value: number | null) => {
    // Если значение меньше 1 или null, считаем как 0 (удаление)
    const volume = (value && value >= 1) ? value : 0;
    console.log('🔄 [handleVolumeChange] Changed volume for category:', detailCategoryId, 'to:', volume);
    
    // Обновляем локальное состояние
    setVolumes(prev => ({
      ...prev,
      [detailCategoryId]: volume
    }));

    // Очищаем предыдущий таймер если пользователь продолжает вводить
    if (saveTimeouts[detailCategoryId]) {
      clearTimeout(saveTimeouts[detailCategoryId]);
    }

    // Автоматически сохраняем в БД с задержкой 800ms
    const timeoutId = setTimeout(() => {
      saveVolumeRecord(detailCategoryId, volume);
      // Очищаем таймер из состояния
      setSaveTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[detailCategoryId];
        return newTimeouts;
      });
    }, 800);

    setSaveTimeouts(prev => ({
      ...prev,
      [detailCategoryId]: timeoutId
    }));
  };


  // Вычисляем статистику фильтрации
  const nonZeroCosts = costsWithCalculations.filter(cost => {
    const totalCost = cost.actual_materials + cost.actual_works + cost.actual_submaterials + cost.actual_subworks;
    return totalCost > 0;
  });
  
  const zeroCostsCount = costsWithCalculations.length - nonZeroCosts.length;

  const filteredCosts = costsWithCalculations.filter(cost => {
    // Фильтр по поиску
    const searchLower = searchText.toLowerCase();
    const fullString = `${cost.category_name}-${cost.detail_name}-${cost.location}`.toLowerCase();
    const separateMatch = 
      cost.category_name.toLowerCase().includes(searchLower) ||
      cost.detail_name.toLowerCase().includes(searchLower) ||
      cost.location.toLowerCase().includes(searchLower);
    
    const matchesSearch = separateMatch || fullString.includes(searchLower);
    
    // Фильтр нулевых затрат
    if (hideZeroCosts) {
      const totalCost = cost.actual_materials + cost.actual_works + cost.actual_submaterials + cost.actual_subworks;
      return matchesSearch && totalCost > 0;
    }
    
    return matchesSearch;
  });

  const columns: ColumnsType<CostWithCalculation> = [
    {
      title: 'Категория',
      key: 'category',
      fixed: 'left',
      width: 220,
      render: (_, record) => (
        <div style={{ 
          whiteSpace: 'normal', 
          wordBreak: 'break-word',
          minWidth: '200px',
          padding: '4px 0'
        }}>
          <Tag 
            className="category-tag"
            style={{ 
              marginBottom: 4,
              background: 'var(--color-neutral-100)',
              color: 'var(--color-neutral-700)',
              border: '1px solid var(--border-light)',
              maxWidth: '100%',
              whiteSpace: 'normal',
              height: 'auto',
              lineHeight: '1.4',
              padding: '4px 8px'
            }}
          >
            {record.category_name}
          </Tag>
        </div>
      ),
      filters: Array.from(new Set(costsWithCalculations.map(c => c.category_name))).map(name => ({
        text: name,
        value: name
      })),
      onFilter: (value, record) => record.category_name === value,
      filterSearch: true
    },
    {
      title: 'Вид затрат',
      dataIndex: 'detail_name',
      key: 'detail_name',
      width: 250,
      render: (text: string) => (
        <div style={{ 
          whiteSpace: 'normal', 
          wordBreak: 'break-word',
          minWidth: '230px',
          padding: '4px 0'
        }}>
          <Tag 
            className="category-tag"
            style={{ 
              marginBottom: 4,
              background: 'var(--color-primary-50)',
              color: 'var(--color-primary-700)',
              border: '1px solid var(--color-primary-200)',
              maxWidth: '100%',
              whiteSpace: 'normal',
              height: 'auto',
              lineHeight: '1.4',
              padding: '4px 8px'
            }}
          >
            {text}
          </Tag>
        </div>
      ),
      filters: Array.from(new Set(costsWithCalculations.map(c => c.detail_name))).map(name => ({
        text: name,
        value: name
      })),
      onFilter: (value, record) => record.detail_name === value,
      filterSearch: true
    },
    {
      title: 'Локализация',
      dataIndex: 'location',
      key: 'location',
      width: 180,
      render: (text: string) => (
        <div style={{ 
          whiteSpace: 'normal', 
          wordBreak: 'break-word',
          minWidth: '160px',
          padding: '4px 0'
        }}>
          {text ? (
            <Tag 
              className="category-tag"
              style={{ 
                background: 'var(--color-info-50)',
                color: 'var(--color-info-700)',
                border: '1px solid var(--color-info-200)',
                maxWidth: '100%',
                whiteSpace: 'normal',
                height: 'auto',
                lineHeight: '1.4',
                padding: '4px 8px'
              }}
            >
              {text}
            </Tag>
          ) : (
            <Tag 
              className="category-tag"
              style={{ 
                background: 'var(--color-neutral-50)',
                color: 'var(--color-neutral-500)',
                border: '1px solid var(--border-light)',
                maxWidth: '100%',
                whiteSpace: 'normal',
                height: 'auto',
                lineHeight: '1.4',
                padding: '4px 8px'
              }}
            >
              Не указано
            </Tag>
          )}
        </div>
      ),
      filters: Array.from(new Set(costsWithCalculations.map(c => c.location))).map(location => ({
        text: location || 'Не указано',
        value: location || 'Не указано'
      })),
      onFilter: (value, record) => (record.location || 'Не указано') === value,
      filterSearch: true
    },
    {
      title: 'Объем',
      key: 'volume',
      width: 120,
      render: (_, record) => {
        const currentVolume = volumes[record.detail_cost_category_id] || 0;
        const savedVolume = savedVolumes[record.detail_cost_category_id] || 0;
        const hasPendingSave = saveTimeouts[record.detail_cost_category_id] !== undefined;
        const hasUnsavedChanges = currentVolume !== savedVolume && !hasPendingSave;
        
        return (
          <div style={{ position: 'relative' }}>
            <InputNumber
              className="input-field"
              value={volumes[record.detail_cost_category_id] || null}
              onChange={(value) => handleVolumeChange(record.detail_cost_category_id, value)}
              min={1}
              step={0.01}
              precision={2}
              style={{ 
                width: '100%', 
                height: 36,
                borderColor: hasUnsavedChanges ? 'var(--color-warning-500)' : undefined
              }}
              placeholder="1.00"
              formatter={(value) => {
                // Заменяем запятую на точку для правильной обработки
                const strValue = String(value).replace(',', '.');
                // Форматируем с разделителем тысяч
                return strValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
              }}
              parser={(value) => {
                // Убираем пробелы и заменяем запятую на точку
                return value?.replace(/\s/g, '').replace(',', '.') || '';
              }}
            />
            {hasPendingSave && (
              <span style={{
                position: 'absolute',
                right: -20,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-primary-500)',
                fontSize: 10
              }}>
                ⏱️
              </span>
            )}
          </div>
        );
      }
    },
    {
      title: 'Ед.',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
      render: (text: string) => (
        <span style={{ 
          fontSize: 'var(--font-size-xs)', 
          color: 'var(--color-neutral-600)',
          fontWeight: 'var(--font-weight-medium)'
        }}>
          {text || '-'}
        </span>
      )
    },
    {
      title: 'Итого за единицу',
      key: 'unit_total',
      width: 150,
      render: (_, record) => {
        const volume = volumes[record.detail_cost_category_id] || 0;
        const totalActual = record.actual_materials + record.actual_works + record.actual_submaterials + record.actual_subworks;
        const unitTotal = volume > 0 ? totalActual / volume : 0;
        
        return (
          <div style={{ textAlign: 'right' }}>
            <Text 
              className="money-value"
              style={{ 
                color: unitTotal > 0 ? 'var(--color-primary-700)' : 'var(--color-neutral-400)',
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-sm)'
              }}
            >
              {unitTotal > 0 ? `${Math.round(unitTotal).toLocaleString('ru-RU')} ₽/${record.unit || 'ед.'}` : '-'}
            </Text>
          </div>
        );
      },
      sorter: (a, b) => {
        const volumeA = volumes[a.detail_cost_category_id] || 0;
        const volumeB = volumes[b.detail_cost_category_id] || 0;
        const totalA = a.actual_materials + a.actual_works + a.actual_submaterials + a.actual_subworks;
        const totalB = b.actual_materials + b.actual_works + b.actual_submaterials + b.actual_subworks;
        const unitTotalA = volumeA > 0 ? totalA / volumeA : 0;
        const unitTotalB = volumeB > 0 ? totalB / volumeB : 0;
        return unitTotalA - unitTotalB;
      }
    },
    {
      title: 'Материалы',
      key: 'materials',
      width: 140,
      className: 'cost-type-materials',
      render: (_, record) => {
        const hasVolume = record.volume && record.volume > 0;
        const hasCosts = record.actual_materials > 0;
        
        return (
          <Tooltip title={
            hasCosts 
              ? hasVolume 
                ? `При объеме ${record.volume} ${record.unit}` 
                : 'Введите объем для активации'
              : 'Нет материалов с этой категорией'
          }>
            <Text 
              className="money-value"
              style={{ 
                color: hasCosts 
                  ? hasVolume 
                    ? 'var(--color-materials-600)' 
                    : 'var(--color-neutral-400)'
                  : 'var(--color-neutral-300)',
                fontWeight: hasCosts ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'
              }}
            >
              {hasVolume ? Math.round(record.materials_total).toLocaleString('ru-RU') : Math.round(record.actual_materials).toLocaleString('ru-RU')} ₽
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => a.actual_materials - b.actual_materials
    },
    {
      title: 'Работы',
      key: 'works',
      width: 140,
      className: 'cost-type-works',
      render: (_, record) => {
        const hasVolume = record.volume && record.volume > 0;
        const hasCosts = record.actual_works > 0;
        
        return (
          <Tooltip title={
            hasCosts 
              ? hasVolume 
                ? `При объеме ${record.volume} ${record.unit}` 
                : 'Введите объем для активации'
              : 'Нет работ с этой категорией'
          }>
            <Text 
              className="money-value"
              style={{ 
                color: hasCosts 
                  ? hasVolume 
                    ? 'var(--color-works-600)' 
                    : 'var(--color-neutral-400)'
                  : 'var(--color-neutral-300)',
                fontWeight: hasCosts ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'
              }}
            >
              {hasVolume ? Math.round(record.works_total).toLocaleString('ru-RU') : Math.round(record.actual_works).toLocaleString('ru-RU')} ₽
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => a.actual_works - b.actual_works
    },
    {
      title: 'Субматериалы',
      key: 'submaterials',
      width: 140,
      className: 'cost-type-sub-materials',
      render: (_, record) => {
        const hasVolume = record.volume && record.volume > 0;
        const hasCosts = record.actual_submaterials > 0;
        
        return (
          <Tooltip title={
            hasCosts 
              ? hasVolume 
                ? `При объеме ${record.volume} ${record.unit}` 
                : 'Введите объем для активации'
              : 'Нет субподрядных материалов с этой категорией'
          }>
            <Text 
              className="money-value"
              style={{ 
                color: hasCosts 
                  ? hasVolume 
                    ? 'var(--color-sub-materials-600)' 
                    : 'var(--color-neutral-400)'
                  : 'var(--color-neutral-300)',
                fontWeight: hasCosts ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'
              }}
            >
              {hasVolume ? Math.round(record.submaterials_total).toLocaleString('ru-RU') : Math.round(record.actual_submaterials).toLocaleString('ru-RU')} ₽
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => a.actual_submaterials - b.actual_submaterials
    },
    {
      title: 'Субработы',
      key: 'subworks',
      width: 140,
      className: 'cost-type-sub-works',
      render: (_, record) => {
        const hasVolume = record.volume && record.volume > 0;
        const hasCosts = record.actual_subworks > 0;
        
        return (
          <Tooltip title={
            hasCosts 
              ? hasVolume 
                ? `При объеме ${record.volume} ${record.unit}` 
                : 'Введите объем для активации'
              : 'Нет субподрядных работ с этой категорией'
          }>
            <Text 
              className="money-value"
              style={{ 
                color: hasCosts 
                  ? hasVolume 
                    ? 'var(--color-sub-works-600)' 
                    : 'var(--color-neutral-400)'
                  : 'var(--color-neutral-300)',
                fontWeight: hasCosts ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'
              }}
            >
              {hasVolume ? Math.round(record.subworks_total).toLocaleString('ru-RU') : Math.round(record.actual_subworks).toLocaleString('ru-RU')} ₽
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => a.actual_subworks - b.actual_subworks
    },
    {
      title: 'Итого',
      key: 'total',
      fixed: 'right',
      render: (_, record) => {
        const hasVolume = record.volume && record.volume > 0;
        const totalActual = record.actual_materials + record.actual_works + record.actual_submaterials + record.actual_subworks;
        const hasCosts = totalActual > 0;
        
        return (
          <Tooltip title={
            hasCosts 
              ? hasVolume 
                ? `Активировано при объеме ${record.volume} ${record.unit}` 
                : 'Введите объем для активации суммы'
              : 'Нет позиций BOQ с этой категорией'
          }>
            <Text strong type={!hasVolume && hasCosts ? "secondary" : undefined}>
              {hasVolume ? Math.round(record.total).toLocaleString('ru-RU') : Math.round(totalActual).toLocaleString('ru-RU')} ₽
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => (a.actual_materials + a.actual_works + a.actual_submaterials + a.actual_subworks) - (b.actual_materials + b.actual_works + b.actual_submaterials + b.actual_subworks)
    }
  ];

  return (
    <>
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%)',
        padding: 'var(--spacing-xl)',
        borderRadius: 'var(--radius-xl)',
        marginBottom: 'var(--spacing-xl)',
        boxShadow: 'var(--shadow-modal)'
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title 
              level={2} 
              style={{ 
                color: 'white', 
                margin: 0,
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)'
              }}
            >
              <DollarOutlined style={{ marginRight: 'var(--spacing-sm)' }} /> 
              Затраты тендера
            </Title>
            <Text style={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontSize: 'var(--font-size-md)',
              lineHeight: 'var(--line-height-normal)'
            }}>
              Распределение объемов и расчет затрат по категориям строительства
            </Text>
          </Col>
          <Col>
            <Button
              className="action-button"
              icon={<ReloadOutlined />}
              onClick={calculateCosts}
              size="large"
              style={{ 
                background: 'rgba(255, 255, 255, 0.95)',
                borderColor: 'transparent',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-neutral-600)',
                height: 48,
                padding: '0 var(--spacing-lg)'
              }}
            >
              Обновить данные
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <Form layout="vertical">
              <Form.Item label="Выберите тендер">
                <Select
                  placeholder="Выберите тендер для работы с затратами"
                  value={selectedTenderId}
                  onChange={setSelectedTenderId}
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {tenders.map(tender => (
                    <Option key={tender.id} value={tender.id}>
                      {tender.tender_number} - {tender.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      {selectedTenderId && (
        <>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
            <Card className="stats-card cost-type-materials" style={{ height: '100%', minHeight: '180px', padding: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="stats-card-title">Материалы (BOQ)</div>
                <InboxOutlined style={{ fontSize: '32px', color: 'var(--color-materials-500)', opacity: 0.8 }} />
              </div>
              <div className="stats-card-value money-value" style={{ color: 'var(--color-materials-600)' }}>
                {Math.round(stats.actualTotalMaterials).toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-sm)' }}>
                Включая доставку
              </div>
              <Progress 
                percent={stats.actualTotalCost > 0 ? 
                  Number((stats.actualTotalMaterials / stats.actualTotalCost * 100).toFixed(1)) : 0
                }
                size="small"
                strokeColor="var(--color-materials-500)"
                trailColor="var(--color-materials-100)"
                style={{ marginBottom: 'var(--spacing-xs)' }}
                showInfo={false}
              />
              <div style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-materials-600)', 
                fontWeight: 'var(--font-weight-medium)',
                textAlign: 'center'
              }}>
                {stats.actualTotalCost > 0 ? 
                  `${((stats.actualTotalMaterials / stats.actualTotalCost) * 100).toFixed(1)}% от общих затрат` : 
                  '0% от общих затрат'
                }
              </div>
            </Card>

            <Card className="stats-card cost-type-works" style={{ height: '100%', minHeight: '180px', padding: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="stats-card-title">Работы (BOQ)</div>
                <BuildOutlined style={{ fontSize: '32px', color: 'var(--color-works-500)', opacity: 0.8 }} />
              </div>
              <div className="stats-card-value money-value" style={{ color: 'var(--color-works-600)' }}>
                {Math.round(stats.actualTotalWorks).toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-sm)' }}>
                Строительные работы
              </div>
              <Progress 
                percent={stats.actualTotalCost > 0 ? 
                  Number((stats.actualTotalWorks / stats.actualTotalCost * 100).toFixed(1)) : 0
                }
                size="small"
                strokeColor="var(--color-works-500)"
                trailColor="var(--color-works-100)"
                style={{ marginBottom: 'var(--spacing-xs)' }}
                showInfo={false}
              />
              <div style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-works-600)', 
                fontWeight: 'var(--font-weight-medium)',
                textAlign: 'center'
              }}>
                {stats.actualTotalCost > 0 ? 
                  `${((stats.actualTotalWorks / stats.actualTotalCost) * 100).toFixed(1)}% от общих затрат` : 
                  '0% от общих затрат'
                }
              </div>
            </Card>

            <Card className="stats-card cost-type-sub-materials" style={{ height: '100%', minHeight: '180px', padding: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="stats-card-title">Субматериалы</div>
                <ToolOutlined style={{ fontSize: '32px', color: 'var(--color-sub-materials-500)', opacity: 0.8 }} />
              </div>
              <div className="stats-card-value money-value" style={{ color: 'var(--color-sub-materials-600)' }}>
                {Math.round(stats.actualTotalSubmaterials).toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-sm)' }}>
                Субподрядные материалы
              </div>
              <Progress 
                percent={stats.actualTotalCost > 0 ? 
                  Number((stats.actualTotalSubmaterials / stats.actualTotalCost * 100).toFixed(1)) : 0
                }
                size="small"
                strokeColor="var(--color-sub-materials-500)"
                trailColor="var(--color-sub-materials-100)"
                style={{ marginBottom: 'var(--spacing-xs)' }}
                showInfo={false}
              />
              <div style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-sub-materials-600)', 
                fontWeight: 'var(--font-weight-medium)',
                textAlign: 'center'
              }}>
                {stats.actualTotalCost > 0 ? 
                  `${((stats.actualTotalSubmaterials / stats.actualTotalCost) * 100).toFixed(1)}% от общих затрат` : 
                  '0% от общих затрат'
                }
              </div>
            </Card>

            <Card className="stats-card cost-type-sub-works" style={{ height: '100%', minHeight: '180px', padding: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="stats-card-title">Субработы</div>
                <TeamOutlined style={{ fontSize: '32px', color: 'var(--color-sub-works-500)', opacity: 0.8 }} />
              </div>
              <div className="stats-card-value money-value" style={{ color: 'var(--color-sub-works-600)' }}>
                {Math.round(stats.actualTotalSubworks).toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-sm)' }}>
                Субподрядные работы
              </div>
              <Progress 
                percent={stats.actualTotalCost > 0 ? 
                  Number((stats.actualTotalSubworks / stats.actualTotalCost * 100).toFixed(1)) : 0
                }
                size="small"
                strokeColor="var(--color-sub-works-500)"
                trailColor="var(--color-sub-works-100)"
                style={{ marginBottom: 'var(--spacing-xs)' }}
                showInfo={false}
              />
              <div style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-sub-works-600)', 
                fontWeight: 'var(--font-weight-medium)',
                textAlign: 'center'
              }}>
                {stats.actualTotalCost > 0 ? 
                  `${((stats.actualTotalSubworks / stats.actualTotalCost) * 100).toFixed(1)}% от общих затрат` : 
                  '0% от общих затрат'
                }
              </div>
            </Card>

            <Card className="stats-card" style={{ height: '100%', minHeight: '180px', padding: 'var(--spacing-md)', background: 'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-primary-100) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="stats-card-title">Общая сумма</div>
                <DollarOutlined style={{ fontSize: '32px', color: 'var(--color-primary-600)', opacity: 0.8 }} />
              </div>
              <div className="stats-card-value money-value" style={{ color: 'var(--color-primary-700)', fontWeight: 'var(--font-weight-bold)' }}>
                {Math.round(stats.actualTotalCost).toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-600)', marginBottom: 'var(--spacing-sm)' }}>
                Итог по тендеру
              </div>
              <Progress 
                percent={100}
                size="small"
                strokeColor="var(--color-primary-500)"
                trailColor="var(--color-primary-200)"
                style={{ marginBottom: 'var(--spacing-xs)' }}
                showInfo={false}
              />
              <div style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-primary-700)', 
                fontWeight: 'var(--font-weight-bold)',
                textAlign: 'center'
              }}>
                100% общих затрат
              </div>
            </Card>

            <Card className="stats-card" style={{ height: '100%', minHeight: '180px', padding: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="stats-card-title">Прогресс</div>
                <SettingOutlined style={{ fontSize: '32px', color: 'var(--color-neutral-400)', opacity: 0.8 }} />
              </div>
              <div className="stats-card-value" style={{ color: 'var(--color-neutral-700)' }}>
                {stats.categoriesWithVolume} / {stats.totalCategories}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-sm)' }}>
                Категории с объемом
              </div>
              <Progress 
                percent={stats.totalCategories > 0 ? 
                  Number((stats.categoriesWithVolume / stats.totalCategories * 100).toFixed(1)) : 0
                }
                size="small"
                strokeColor="var(--color-success-500)"
                trailColor="var(--color-neutral-200)"
                style={{ marginBottom: 'var(--spacing-xs)' }}
                showInfo={false}
              />
              <div style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--color-success-600)', 
                fontWeight: 'var(--font-weight-medium)',
                textAlign: 'center'
              }}>
                {stats.totalCategories > 0 ? 
                  `${((stats.categoriesWithVolume / stats.totalCategories) * 100).toFixed(1)}% заполнено` : 
                  '0% заполнено'
                }
              </div>
            </Card>
          </div>

          {/* Блок поиска */}
          <Card className="search-block">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-sm) 0'
            }}>
              <SearchOutlined style={{ 
                fontSize: 'var(--font-size-lg)', 
                color: 'var(--color-primary-600)' 
              }} />
              <Search
                placeholder="Поиск по категориям, видам затрат и локализации"
                allowClear
                size="large"
                value={searchText}
                onSearch={setSearchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ 
                  flex: 1,
                  maxWidth: 400
                }}
                enterButton="Найти"
              />
              
              <Button
                className={hideZeroCosts ? "filter-button-active" : "action-button"}
                icon={hideZeroCosts ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                onClick={() => setHideZeroCosts(!hideZeroCosts)}
                size="large"
                style={{ 
                  background: hideZeroCosts 
                    ? 'var(--color-success-500)' 
                    : 'var(--bg-card)',
                  borderColor: hideZeroCosts 
                    ? 'var(--color-success-500)' 
                    : 'var(--border-medium)',
                  color: hideZeroCosts 
                    ? 'white' 
                    : 'var(--color-neutral-600)',
                  fontWeight: 'var(--font-weight-medium)',
                  minWidth: '140px'
                }}
              >
                {hideZeroCosts ? 'Показать все' : 'Скрыть нули'}
              </Button>

              <Space>
                {searchText && (
                  <Text style={{ 
                    color: 'var(--color-neutral-500)',
                    fontSize: 'var(--font-size-sm)',
                    whiteSpace: 'nowrap'
                  }}>
                    Найдено: {filteredCosts.length}
                  </Text>
                )}
                {hideZeroCosts && (
                  <Text style={{ 
                    color: 'var(--color-success-600)',
                    fontSize: 'var(--font-size-sm)',
                    whiteSpace: 'nowrap',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    Скрыто нулевых: {zeroCostsCount}
                  </Text>
                )}
                <Text style={{ 
                  color: 'var(--color-neutral-400)',
                  fontSize: 'var(--font-size-sm)',
                  whiteSpace: 'nowrap'
                }}>
                  Показано: {filteredCosts.length} / {costsWithCalculations.length}
                </Text>
              </Space>
            </div>
          </Card>

          <Card>
            <Alert
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Затраты на строительство по категориям</span>
                  <Space>
                    <Text>Всего категорий:</Text>
                    <Badge count={filteredCosts.length} style={{ backgroundColor: '#52c41a' }} showZero />
                  </Space>
                </div>
              }
              description="Введите объемы для каждой категории затрат. Стоимость материалов и работ рассчитывается автоматически на основе позиций BOQ, связанных с данной категорией."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              className="tender-costs-table"
              columns={columns}
              dataSource={filteredCosts}
              rowKey="id"
              loading={loading}
              size="middle"
              pagination={false}
              scroll={{ x: 1550, y: 600 }}
              summary={(data) => {
                const visibleData = data || filteredCosts;
                
                // Используем actual_ поля для показа реальных затрат, независимо от объема
                const summaryMaterials = visibleData.reduce((sum, item) => sum + item.actual_materials, 0);
                const summaryWorks = visibleData.reduce((sum, item) => sum + item.actual_works, 0);
                const summarySubmaterials = visibleData.reduce((sum, item) => sum + item.actual_submaterials, 0);
                const summarySubworks = visibleData.reduce((sum, item) => sum + item.actual_subworks, 0);
                const summaryTotal = summaryMaterials + summaryWorks + summarySubmaterials + summarySubworks;
                
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: 'var(--bg-table-header)' }}>
                      <Table.Summary.Cell index={0} colSpan={5}>
                        <Text 
                          strong 
                          style={{ 
                            color: 'var(--color-neutral-700)',
                            fontSize: 'var(--font-size-md)',
                            fontWeight: 'var(--font-weight-semibold)'
                          }}
                        >
                          Итого фактических затрат BOQ:
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        <Text 
                          className="money-value"
                          strong 
                          style={{ 
                            color: 'var(--color-materials-600)',
                            fontWeight: 'var(--font-weight-bold)'
                          }}
                        >
                          {Math.round(summaryMaterials).toLocaleString('ru-RU')} ₽
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
                        <Text 
                          className="money-value"
                          strong 
                          style={{ 
                            color: 'var(--color-works-600)',
                            fontWeight: 'var(--font-weight-bold)'
                          }}
                        >
                          {Math.round(summaryWorks).toLocaleString('ru-RU')} ₽
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7}>
                        <Text 
                          className="money-value"
                          strong 
                          style={{ 
                            color: 'var(--color-sub-materials-600)',
                            fontWeight: 'var(--font-weight-bold)'
                          }}
                        >
                          {Math.round(summarySubmaterials).toLocaleString('ru-RU')} ₽
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8}>
                        <Text 
                          className="money-value"
                          strong 
                          style={{ 
                            color: 'var(--color-sub-works-600)',
                            fontWeight: 'var(--font-weight-bold)'
                          }}
                        >
                          {Math.round(summarySubworks).toLocaleString('ru-RU')} ₽
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={9}>
                        <Text 
                          className="money-value"
                          strong 
                          style={{ 
                            color: 'var(--color-primary-700)',
                            fontWeight: 'var(--font-weight-bold)',
                            fontSize: 'var(--font-size-lg)'
                          }}
                        >
                          {Math.round(summaryTotal).toLocaleString('ru-RU')} ₽
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </>
      )}
    </>
  );
};

export default TenderConstructionCostsPage;