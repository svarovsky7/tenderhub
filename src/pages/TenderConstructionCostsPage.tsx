import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Input,
  Empty,
  Switch
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
  SettingOutlined,
  FolderOpenOutlined,
  DashboardOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { supabase } from '../lib/supabase/client';
import { getCategoriesWithDetails } from '../lib/supabase/api/construction-costs';
import { useNavigate } from 'react-router-dom';
import { formatQuantity } from '../utils/formatters';
import QuickTenderSelector from '../components/common/QuickTenderSelector';
import DeadlineStatusBar from '../components/tender/DeadlineStatusBar';
import { useTheme } from '../contexts/ThemeContext';
// import { FinancialIndicatorsTab } from '../components/financial/FinancialIndicatorsTab';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

interface Tender {
  id: string;
  title: string;
  tender_number: string;
  client_name?: string;
  version?: number;
  area_sp?: number;
  area_client?: number;
  submission_deadline?: string;
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
  // Commercial costs from BOQ items
  commercial_materials: number;
  commercial_works: number;
  commercial_submaterials: number;
  commercial_subworks: number;
  commercial_total: number;
  // Commercial costs with volume
  commercial_materials_with_volume: number;
  commercial_works_with_volume: number;
  commercial_submaterials_with_volume: number;
  commercial_subworks_with_volume: number;
  commercial_total_with_volume: number;
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
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderName, setSelectedTenderName] = useState<string | null>(null);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [previousTenderId, setPreviousTenderId] = useState<string | null>(null);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isFirstSelection, setIsFirstSelection] = useState(true);

  // Refs to preserve scroll position
  const scrollPositionRef = useRef<number>(0);
  const shouldPreserveScroll = useRef<boolean>(false);

  const [costCategories, setCostCategories] = useState<DetailCostCategory[]>([]);
  const [costsWithCalculations, setCostsWithCalculations] = useState<CostWithCalculation[]>([]);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [saveTimeouts, setSaveTimeouts] = useState<Record<string, NodeJS.Timeout>>({});
  const [savedVolumes, setSavedVolumes] = useState<Record<string, number>>({});
  const [searchText, setSearchText] = useState('');
  const [hideZeroCosts, setHideZeroCosts] = useState(false);
  const [showCommercialCosts, setShowCommercialCosts] = useState(false);
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
    actualTotalCost: 0,
    // Коммерческие итоги (независимо от объема)
    commercialTotalMaterials: 0,
    commercialTotalWorks: 0,
    commercialTotalSubmaterials: 0,
    commercialTotalSubworks: 0,
    commercialTotalCost: 0
  });

  // Get unique tender names/titles
  const uniqueTenderNames = useMemo(() => {
    const nameMap = new Map<string, string>();
    tenders.forEach(t => {
      const key = `${t.title}___${t.client_name || ''}`;
      const displayName = `${t.title} - ${t.client_name || 'Без заказчика'}`;
      if (!nameMap.has(key)) {
        nameMap.set(key, displayName);
      }
    });
    return Array.from(nameMap.entries());
  }, [tenders]);

  // Get versions for currently selected tender name
  const availableVersions = useMemo(() => {
    if (!selectedTenderName) return [];
    
    const [title, clientName] = selectedTenderName.split('___');
    
    // Find all tenders with the same title and client
    const sameTenders = tenders.filter(t => 
      t.title === title && 
      (t.client_name || '') === (clientName || '')
    );
    
    // Get unique versions from these tenders
    const versions = [...new Set(sameTenders.map(t => t.version || 1))];
    return versions.sort((a, b) => a - b);
  }, [selectedTenderName, tenders]);

  // Get selected tender object
  const selectedTender = useMemo(() => {
    return tenders.find(t => t.id === (selectedTenderId || previousTenderId)) || null;
  }, [selectedTenderId, previousTenderId, tenders]);

  // Handle tender name selection (first step)
  const handleTenderNameChange = useCallback((value: string) => {
    console.log('🔄 Tender name selection changed:', value);
    const currentScroll = window.scrollY;

    // Preserve scroll position when changing tenders (if we're not at the top)
    if (selectedTenderId && currentScroll > 100) {
      scrollPositionRef.current = currentScroll;
      shouldPreserveScroll.current = true;
      console.log('✅📍 PRESERVED scroll position:', scrollPositionRef.current);
    }

    // Store previous tender ID before clearing
    if (selectedTenderId) {
      setPreviousTenderId(selectedTenderId);
    }

    setSelectedTenderName(value);
    setSelectedTenderId(null); // Reset tender ID when name changes
    // Don't hide content - keep it visible
  }, [selectedTenderId]);

  // Handle version selection (second step)
  const handleVersionChange = useCallback((version: number) => {
    console.log('🔄 Version selection changed:', version);
    if (!selectedTenderName) return;

    // Find the tender with the selected name and version
    const [title, clientName] = selectedTenderName.split('___');
    const targetTender = tenders.find(t =>
      t.title === title &&
      (t.client_name || '') === (clientName || '') &&
      (t.version || 1) === version
    );

    if (targetTender) {
      setSelectedTenderId(targetTender.id);
      setPreviousTenderId(null);

      if (!isContentVisible) {
        setIsContentVisible(true);
        // Mark first selection as complete AFTER animation finishes
        setTimeout(() => {
          setIsFirstSelection(false);
        }, 650);
      } else {
        setIsFirstSelection(false);
      }

      // Restore scroll position if needed
      setTimeout(() => {
        if (shouldPreserveScroll.current && scrollPositionRef.current > 0) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({
                top: scrollPositionRef.current,
                behavior: 'auto'
              });
              console.log('🔄 Restored scroll position:', scrollPositionRef.current);
              shouldPreserveScroll.current = false;
              scrollPositionRef.current = 0;
            });
          });
        }
      }, 100);
    }
  }, [selectedTenderName, tenders, isContentVisible]);

  // Navigate to tender details
  const handleNavigateToTender = useCallback(() => {
    if (selectedTenderId) {
      navigate(`/tenders/${selectedTenderId}`);
    }
  }, [selectedTenderId, navigate]);

  // Refresh data
  const handleRefresh = useCallback(() => {
    if (!selectedTenderId) {
      console.log('❌ No tender selected for refresh');
      message.info('Выберите тендер для обновления');
      return;
    }

    console.log('🔄 Starting refresh for tender:', selectedTenderId);
    setLoading(true);
    message.loading('Обновление данных...', 0.5);

    setIsContentVisible(false);

    setTimeout(() => {
      const currentId = selectedTenderId;
      setSelectedTenderId(null);

      setTimeout(() => {
        setSelectedTenderId(currentId);
        setIsContentVisible(true);
        setLoading(false);
        message.success('Данные обновлены');
      }, 100);
    }, 300);
  }, [selectedTenderId]);

  // Handle quick tender selection
  const handleQuickTenderSelect = useCallback((tender: Tender) => {
    console.log('🚀 Quick tender selected for construction costs:', tender.id, tender.title);

    // Auto-fill the tender selection fields
    const tenderNameKey = `${tender.title}___${tender.client_name || ''}`;
    setSelectedTenderName(tenderNameKey);
    setSelectedTenderId(tender.id);
    setPreviousTenderId(null);

    console.log('✅ Auto-filled tender selection for construction costs:', {
      tenderNameKey,
      tenderId: tender.id,
      version: tender.version
    });

    // Show content after brief delay for smooth transition
    setTimeout(() => {
      setIsContentVisible(true);
      // Mark first selection as complete AFTER animation finishes
      setTimeout(() => {
        setIsFirstSelection(false);
      }, 650);
    }, 150);

    // Scroll to content section
    setTimeout(() => {
      const contentSection = document.getElementById('construction-costs-content-section');
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }, []);

  // Reset tender selection
  const handleResetSelection = useCallback(() => {
    setSelectedTenderId(null);
    setSelectedTenderName(null);
    setPreviousTenderId(null);
    setIsContentVisible(false);
    setIsFirstSelection(true);
    message.info('Выбор тендера сброшен');
  }, []);

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
        .select('id, title, tender_number, client_name, version, area_sp, area_client, submission_deadline')
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
      // First, ensure commercial costs are up to date
      console.log('🔄 [calculateCosts] Recalculating commercial costs...');
      await supabase.rpc('recalculate_commercial_costs_by_category', {
        p_tender_id: selectedTenderId
      });

      // Load commercial costs from the new table
      const { data: commercialCosts, error: commercialError } = await supabase
        .from('commercial_costs_by_category')
        .select('*')
        .eq('tender_id', selectedTenderId);

      if (commercialError) {
        console.error('❌ Error loading commercial costs:', commercialError);
      }

      // Create a map for quick lookup
      const commercialCostsMap = new Map();
      commercialCosts?.forEach(cost => {
        commercialCostsMap.set(cost.detail_cost_category_id, cost);
      });

      console.log('💰 [calculateCosts] Loaded commercial costs for', commercialCosts?.length, 'categories');

      // Load client positions with BOQ items for this tender (for direct costs)
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

      console.log('🔍 [calculateCosts] Loaded positions:', positions?.length);
      
      // Enhanced debugging for commercial costs
      let totalCommercialFound = 0;
      let itemsWithCommercial = 0;
      let itemsWithoutCommercial = 0;
      
      // Check all BOQ items for commercial_cost
      positions?.forEach(position => {
        position.boq_items?.forEach((item: any) => {
          if (item.commercial_cost && item.commercial_cost > 0) {
            itemsWithCommercial++;
            totalCommercialFound += item.commercial_cost;
            // Log first few items with commercial cost
            if (itemsWithCommercial <= 3) {
              console.log('✅ Found commercial cost:', {
                position: position.name,
                item_type: item.item_type,
                total_amount: item.total_amount,
                commercial_cost: item.commercial_cost,
                detail_cost_category_id: item.detail_cost_category_id
              });
            }
          } else {
            itemsWithoutCommercial++;
          }
        });
      });
      
      console.log('📊 Commercial Cost Summary:');
      console.log(`  - Items WITH commercial cost: ${itemsWithCommercial}`);
      console.log(`  - Items WITHOUT commercial cost: ${itemsWithoutCommercial}`);
      console.log(`  - Total commercial cost found: ${totalCommercialFound.toLocaleString('ru-RU')} ₽`);

      // Calculate costs for each detail category based on assigned categories in BOQ items
      const calculations: CostWithCalculation[] = costCategories.map(category => {
        let materialsTotal = 0;
        let worksTotal = 0;
        let submaterialsTotal = 0;
        let subworksTotal = 0;
        
        // Get commercial costs from the new table
        const commercialData = commercialCostsMap.get(category.id);
        
        // Apply the commercial cost transfer logic:
        // 1. For materials: only base cost stays (no markup)
        // 2. For works: includes original commercial cost + material markups
        // 3. For submaterials: only base cost stays  
        // 4. For subworks: includes original commercial cost + submaterial markups
        
        let commercialMaterials = 0;
        let commercialWorks = 0;
        let commercialSubmaterials = 0;
        let commercialSubworks = 0;
        
        if (commercialData) {
          // Analyze material types in this category
          let mainMaterialsTotal = 0;
          let auxiliaryMaterialsTotal = 0;
          let mainMaterialsCommercial = 0;
          let auxiliaryMaterialsCommercial = 0;
          
          let mainSubmaterialsTotal = 0;
          let auxiliarySubmaterialsTotal = 0;
          let mainSubmaterialsCommercial = 0;
          let auxiliarySubmaterialsCommercial = 0;
          
          // Go through BOQ items to separate main and auxiliary materials
          positions?.forEach(position => {
            const categoryItems = position.boq_items?.filter((item: any) => 
              item.detail_cost_category_id === category.id
            ) || [];
            
            categoryItems.forEach((item: any) => {
              if (item.item_type === 'material') {
                if (item.material_type === 'main') {
                  mainMaterialsTotal += item.total_amount || 0;
                  mainMaterialsCommercial += item.commercial_cost || 0;
                } else if (item.material_type === 'auxiliary') {
                  auxiliaryMaterialsTotal += item.total_amount || 0;
                  auxiliaryMaterialsCommercial += item.commercial_cost || 0;
                }
              } else if (item.item_type === 'sub_material') {
                if (item.material_type === 'main') {
                  mainSubmaterialsTotal += item.total_amount || 0;
                  mainSubmaterialsCommercial += item.commercial_cost || 0;
                } else if (item.material_type === 'auxiliary') {
                  auxiliarySubmaterialsTotal += item.total_amount || 0;
                  auxiliarySubmaterialsCommercial += item.commercial_cost || 0;
                }
              }
            });
          });
          
          // Calculate works and subworks commercial costs from BOQ items
          let worksCommercial = 0;
          let subworksCommercial = 0;
          
          positions?.forEach(position => {
            const categoryItems = position.boq_items?.filter((item: any) => 
              item.detail_cost_category_id === category.id
            ) || [];
            
            categoryItems.forEach((item: any) => {
              if (item.item_type === 'work') {
                worksCommercial += item.commercial_cost || 0;
              } else if (item.item_type === 'sub_work') {
                subworksCommercial += item.commercial_cost || 0;
              }
            });
          });
          
          // Calculate commercial materials (only main materials stay, auxiliary transfer to works)
          commercialMaterials = mainMaterialsTotal; // Main materials: only base cost
          
          // Calculate commercial works (includes original works + markup from main materials + all auxiliary materials)
          const mainMaterialsMarkup = mainMaterialsCommercial - mainMaterialsTotal;
          commercialWorks = worksCommercial + mainMaterialsMarkup + auxiliaryMaterialsCommercial;
          
          // Calculate commercial submaterials (only main submaterials stay, auxiliary transfer to subworks)
          commercialSubmaterials = mainSubmaterialsTotal; // Main submaterials: only base cost
          
          // Calculate commercial subworks (includes original subworks + markup from main submaterials + all auxiliary submaterials)
          const mainSubmaterialsMarkup = mainSubmaterialsCommercial - mainSubmaterialsTotal;
          commercialSubworks = subworksCommercial + mainSubmaterialsMarkup + auxiliarySubmaterialsCommercial;
          
          console.log('💰 Material transfer logic for', category.name, {
            main_materials: mainMaterialsTotal,
            auxiliary_materials: auxiliaryMaterialsTotal,
            main_markup: mainMaterialsMarkup,
            auxiliary_to_works: auxiliaryMaterialsCommercial,
            final_commercial_materials: commercialMaterials,
            final_commercial_works: commercialWorks
          });
        }

        // If we have data from the commercial costs table, use it for direct costs too
        if (commercialData) {
          materialsTotal = commercialData.direct_materials || 0;
          worksTotal = commercialData.direct_works || 0;
          submaterialsTotal = commercialData.direct_submaterials || 0;
          subworksTotal = commercialData.direct_subworks || 0;
          
          console.log('📊 Using commercial costs for category:', category.name, {
            direct_total: commercialData.direct_total,
            commercial_total: commercialData.commercial_total,
            markup: commercialData.commercial_total - commercialData.direct_total
          });
        } else {
          // Fallback: calculate from BOQ items if not in commercial costs table
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
        }

        const volume = volumes[category.id] || null;
        
        // Only show costs if volume is entered
        const displayMaterials = volume && volume > 0 ? materialsTotal : 0;
        const displayWorks = volume && volume > 0 ? worksTotal : 0;
        const displaySubmaterials = volume && volume > 0 ? submaterialsTotal : 0;
        const displaySubworks = volume && volume > 0 ? subworksTotal : 0;
        
        // Commercial costs with volume - apply volume to the TRANSFERRED commercial values
        const displayCommercialMaterials = volume && volume > 0 ? commercialMaterials : 0;
        const displayCommercialWorks = volume && volume > 0 ? commercialWorks : 0;
        const displayCommercialSubmaterials = volume && volume > 0 ? commercialSubmaterials : 0;
        const displayCommercialSubworks = volume && volume > 0 ? commercialSubworks : 0;

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
          actual_subworks: subworksTotal,
          // Commercial costs
          commercial_materials: commercialMaterials || 0,
          commercial_works: commercialWorks || 0,
          commercial_submaterials: commercialSubmaterials || 0,
          commercial_subworks: commercialSubworks || 0,
          commercial_total: (commercialMaterials || 0) + (commercialWorks || 0) + (commercialSubmaterials || 0) + (commercialSubworks || 0),
          // Commercial costs with volume
          commercial_materials_with_volume: displayCommercialMaterials || 0,
          commercial_works_with_volume: displayCommercialWorks || 0,
          commercial_submaterials_with_volume: displayCommercialSubmaterials || 0,
          commercial_subworks_with_volume: displayCommercialSubworks || 0,
          commercial_total_with_volume: (displayCommercialMaterials || 0) + (displayCommercialWorks || 0) + (displayCommercialSubmaterials || 0) + (displayCommercialSubworks || 0)
        };
      });

      setCostsWithCalculations(calculations);
      
      // Debug commercial costs aggregation with corrected totals
      const totalCommercialMaterials = calculations.reduce((sum, c) => sum + (c.commercial_materials || 0), 0);
      const totalCommercialWorks = calculations.reduce((sum, c) => sum + (c.commercial_works || 0), 0);
      const totalCommercialSubmaterials = calculations.reduce((sum, c) => sum + (c.commercial_submaterials || 0), 0);
      const totalCommercialSubworks = calculations.reduce((sum, c) => sum + (c.commercial_subworks || 0), 0);
      const grandTotalCommercial = totalCommercialMaterials + totalCommercialWorks + totalCommercialSubmaterials + totalCommercialSubworks;
      
      console.log('💰 COMMERCIAL TOTALS WITH TRANSFERS:');
      console.log(`  Materials: ${totalCommercialMaterials.toLocaleString('ru-RU')} ₽`);
      console.log(`  Works: ${totalCommercialWorks.toLocaleString('ru-RU')} ₽`);
      console.log(`  Submaterials: ${totalCommercialSubmaterials.toLocaleString('ru-RU')} ₽`);
      console.log(`  Subworks: ${totalCommercialSubworks.toLocaleString('ru-RU')} ₽`);
      console.log(`  GRAND TOTAL: ${grandTotalCommercial.toLocaleString('ru-RU')} ₽`);
      console.log(`  Expected: 21,449,186.98 ₽`);
      
      if (Math.abs(grandTotalCommercial - 21449186.98) > 1) {
        console.warn('⚠️ Total mismatch! Difference:', (grandTotalCommercial - 21449186.98).toLocaleString('ru-RU'), '₽');
      }

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
        actualTotalCost: actualTotalMaterials + actualTotalWorks + actualTotalSubmaterials + actualTotalSubworks,
        commercialTotalMaterials: totalCommercialMaterials,
        commercialTotalWorks: totalCommercialWorks,
        commercialTotalSubmaterials: totalCommercialSubmaterials,
        commercialTotalSubworks: totalCommercialSubworks,
        commercialTotalCost: totalCommercialMaterials + totalCommercialWorks + totalCommercialSubmaterials + totalCommercialSubworks
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
      
      console.log('💾 [saveVolumeRecord] Record to save:', JSON.stringify(record, null, 2));

      if (volume >= 1) {
        // Сначала пробуем обновить существующую запись
        console.log('🔍 [saveVolumeRecord] Checking for existing record:', {
          tender_id: selectedTenderId,
          detail_cost_category_id: detailCostCategoryId
        });
        
        // First check if any records exist
        const { data: allRecords, error: allError } = await supabase
          .from('tender_cost_volumes')
          .select('*')
          .eq('tender_id', selectedTenderId);
        
        console.log('📋 [saveVolumeRecord] All existing records for tender:', allRecords);
        
        const { data: existing, error: selectError } = await supabase
          .from('tender_cost_volumes')
          .select('id')
          .eq('tender_id', selectedTenderId)
          .eq('detail_cost_category_id', detailCostCategoryId)
          .single();
        
        console.log('🔎 [saveVolumeRecord] Existing record check result:', { existing, selectError });
        
        if (selectError && selectError.code !== 'PGRST116') {
          console.log('⚠️ [saveVolumeRecord] Select error (not 404):', selectError);
        }
        
        const existingRecord = existing && existing.length > 0;
        console.log('📝 [saveVolumeRecord] Will update existing:', existingRecord, 'Will create new:', !existingRecord);

        let error;
        if (existingRecord) {
          // Обновляем существующую запись
          console.log('📝 [saveVolumeRecord] Updating existing record for:', detailCostCategoryId);
          const updatePayload = { 
            volume: volume, 
            unit_total: Number(unitTotal.toFixed(2)),
            updated_at: new Date().toISOString()
          };
          
          console.log('🔄 [saveVolumeRecord] Update payload:', updatePayload);
          console.log('🎯 [saveVolumeRecord] Update filters:', { tender_id: selectedTenderId, detail_cost_category_id: detailCostCategoryId });
          
          const { data: updateData, error: updateError, count } = await supabase
            .from('tender_cost_volumes')
            .update(updatePayload)
            .eq('tender_id', selectedTenderId)
            .eq('detail_cost_category_id', detailCostCategoryId)
            .select();
          
          console.log('📦 [saveVolumeRecord] Update result:', { data: updateData, error: updateError, count });
          error = updateError;
        } else {
          // Создаем новую запись
          console.log('➕ [saveVolumeRecord] Creating new record for category:', detailCostCategoryId);
          console.log('➕ [saveVolumeRecord] Creating new record:', record);
          console.log('➕ [saveVolumeRecord] Inserting new record:', record);
          
          const { data: insertData, error: insertError, count } = await supabase
            .from('tender_cost_volumes')
            .insert(record)
            .select();
          
          console.log('📦 [saveVolumeRecord] Insert result:', { data: insertData, error: insertError, count });
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
        
        // Выбираем итоговую сумму в зависимости от режима отображения
        const total = showCommercialCosts 
          ? (record.commercial_materials + record.commercial_works + record.commercial_submaterials + record.commercial_subworks)
          : (record.actual_materials + record.actual_works + record.actual_submaterials + record.actual_subworks);
        
        const unitTotal = volume > 0 ? total / volume : 0;

        return (
          <div style={{ textAlign: 'right' }}>
            <Text
              className="money-value"
              style={{
                color: unitTotal > 0 ? (showCommercialCosts ? 'var(--color-success-700)' : 'var(--color-primary-700)') : 'var(--color-neutral-400)',
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
        
        // Используем соответствующие суммы для сортировки
        const totalA = showCommercialCosts 
          ? (a.commercial_materials + a.commercial_works + a.commercial_submaterials + a.commercial_subworks)
          : (a.actual_materials + a.actual_works + a.actual_submaterials + a.actual_subworks);
        const totalB = showCommercialCosts 
          ? (b.commercial_materials + b.commercial_works + b.commercial_submaterials + b.commercial_subworks)
          : (b.actual_materials + b.actual_works + b.actual_submaterials + b.actual_subworks);
        
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
        
        // Выбираем значение в зависимости от режима
        const displayValue = showCommercialCosts 
          ? (hasVolume ? (record.commercial_materials_with_volume || 0) : (record.commercial_materials || 0))  // Коммерческие затраты
          : (record.actual_materials || 0);  // Прямые: всегда показываем фактические
        
        const tooltipText = showCommercialCosts
          ? hasCosts 
            ? hasVolume 
              ? `Коммерческие затраты при объеме ${record.volume} ${record.unit}` 
              : 'Введите объем для расчета коммерческих затрат'
            : 'Нет материалов с этой категорией'
          : hasCosts
            ? 'Прямые затраты (фактические данные из BOQ)'
            : 'Нет материалов с этой категорией';
        
        return (
          <Tooltip title={tooltipText}>
            <Text 
              className="money-value"
              style={{ 
                color: displayValue > 0 
                  ? 'var(--color-materials-600)' 
                  : 'var(--color-neutral-300)',
                fontWeight: displayValue > 0 ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'
              }}
            >
              {Math.round(displayValue).toLocaleString('ru-RU')} ₽
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
        
        // Выбираем значение в зависимости от режима
        const displayValue = showCommercialCosts 
          ? (hasVolume ? (record.commercial_works_with_volume || 0) : (record.commercial_works || 0))  // Коммерческие затраты
          : (record.actual_works || 0);  // Прямые: всегда показываем фактические
        
        const tooltipText = showCommercialCosts
          ? hasCosts 
            ? hasVolume 
              ? `Коммерческие затраты при объеме ${record.volume} ${record.unit}` 
              : 'Введите объем для расчета коммерческих затрат'
            : 'Нет работ с этой категорией'
          : hasCosts
            ? 'Прямые затраты (фактические данные из BOQ)'
            : 'Нет работ с этой категорией';
        
        return (
          <Tooltip title={tooltipText}>
            <Text 
              className="money-value"
              style={{ 
                color: displayValue > 0 
                  ? 'var(--color-works-600)' 
                  : 'var(--color-neutral-300)',
                fontWeight: displayValue > 0 ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'
              }}
            >
              {Math.round(displayValue).toLocaleString('ru-RU')} ₽
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
        
        // Выбираем значение в зависимости от режима
        const displayValue = showCommercialCosts 
          ? (hasVolume ? (record.commercial_submaterials_with_volume || 0) : (record.commercial_submaterials || 0))  // Коммерческие затраты
          : (record.actual_submaterials || 0);  // Прямые: всегда показываем фактические
        
        const tooltipText = showCommercialCosts
          ? hasCosts 
            ? hasVolume 
              ? `Коммерческие затраты при объеме ${record.volume} ${record.unit}` 
              : 'Введите объем для расчета коммерческих затрат'
            : 'Нет субподрядных материалов с этой категорией'
          : hasCosts
            ? 'Прямые затраты (фактические данные из BOQ)'
            : 'Нет субподрядных материалов с этой категорией';
        
        return (
          <Tooltip title={tooltipText}>
            <Text 
              className="money-value"
              style={{ 
                color: displayValue > 0 
                  ? 'var(--color-sub-materials-600)' 
                  : 'var(--color-neutral-300)',
                fontWeight: displayValue > 0 ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'
              }}
            >
              {Math.round(displayValue).toLocaleString('ru-RU')} ₽
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
        
        // Выбираем значение в зависимости от режима
        const displayValue = showCommercialCosts 
          ? (hasVolume ? (record.commercial_subworks_with_volume || 0) : (record.commercial_subworks || 0))  // Коммерческие затраты
          : (record.actual_subworks || 0);  // Прямые: всегда показываем фактические
        
        const tooltipText = showCommercialCosts
          ? hasCosts 
            ? hasVolume 
              ? `Коммерческие затраты при объеме ${record.volume} ${record.unit}` 
              : 'Введите объем для расчета коммерческих затрат'
            : 'Нет субподрядных работ с этой категорией'
          : hasCosts
            ? 'Прямые затраты (фактические данные из BOQ)'
            : 'Нет субподрядных работ с этой категорией';
        
        return (
          <Tooltip title={tooltipText}>
            <Text 
              className="money-value"
              style={{ 
                color: displayValue > 0 
                  ? 'var(--color-sub-works-600)' 
                  : 'var(--color-neutral-300)',
                fontWeight: displayValue > 0 ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)'
              }}
            >
              {Math.round(displayValue).toLocaleString('ru-RU')} ₽
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
        
        // Выбираем значение в зависимости от режима
        const displayValue = showCommercialCosts 
          ? (hasVolume ? (record.commercial_total_with_volume || 0) : (record.commercial_total || 0))  // Коммерческие затраты
          : (totalActual || 0);  // Прямые: всегда показываем фактические
        
        const tooltipText = showCommercialCosts
          ? hasCosts 
            ? hasVolume 
              ? `Коммерческие затраты при объеме ${record.volume} ${record.unit}` 
              : 'Введите объем для расчета коммерческих затрат'
            : 'Нет позиций BOQ с этой категорией'
          : hasCosts
            ? 'Прямые затраты (фактические данные из BOQ)'
            : 'Нет позиций BOQ с этой категорией';
        
        return (
          <Tooltip title={tooltipText}>
            <Text 
              strong 
              style={{
                color: displayValue > 0 ? 'var(--color-primary-700)' : 'var(--color-neutral-400)'
              }}
            >
              {Math.round(displayValue).toLocaleString('ru-RU')} ₽
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => (a.actual_materials + a.actual_works + a.actual_submaterials + a.actual_subworks) - (b.actual_materials + b.actual_works + b.actual_submaterials + b.actual_subworks)
    }
  ];

  return (
    <div className="w-full min-h-full bg-gray-50">
      <div className="p-6">
      <style>
        {`
          .tender-costs-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            padding-bottom: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .tender-costs-header.dark {
            background: linear-gradient(135deg, #1e293b 0%, #064e3b 50%, #134e4a 100%);
          }
          .tender-costs-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: rotate 30s linear infinite;
          }
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .tender-costs-header > div {
            position: relative;
            z-index: 1;
          }
          .tender-action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .tender-action-btn {
            height: 42px;
            padding: 0 24px;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .tender-action-btn-transparent {
            background: transparent !important;
            color: rgba(255, 255, 255, 0.95) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            font-weight: 500 !important;
          }
          .tender-action-btn-transparent:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            border-color: rgba(255, 255, 255, 0.5) !important;
          }
        `}
      </style>

      {/* Header с градиентом и выбором тендера */}
        <div className={`tender-costs-header ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="max-w-none">
          {/* Title and buttons row */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <Title level={2} style={{ 
                color: 'white', 
                margin: 0, 
                marginBottom: 8,
                fontSize: '28px',
                fontWeight: 600
              }}>
                <DollarOutlined className="mr-3" style={{ fontSize: 24 }} />
                Затраты тендера
              </Title>
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '14px'
              }}>
                {selectedTender ? `Заказчик: ${selectedTender.client_name}` : 'Расчет затрат на основе категорий и объемов работ'}
              </Text>
            </div>
            <div className="tender-action-buttons">
              {(selectedTenderId || previousTenderId) && (
                <Button
                  className="tender-action-btn tender-action-btn-transparent"
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleResetSelection}
                >
                  Назад к выбору
                </Button>
              )}
              <Button
                className="tender-action-btn tender-action-btn-transparent"
                size="large"
                icon={<FolderOpenOutlined />}
                onClick={() => navigate('/tenders')}
              >
                К тендерам
              </Button>
              <Button
                className="tender-action-btn"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#1890ff',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  fontWeight: 600
                }}
                size="large"
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                Обновить
              </Button>
            </div>
          </div>

          {/* Tender Selection */}
          <div
            className={`flex items-center gap-4 mt-6 ${!(selectedTenderId || previousTenderId) ? 'justify-center' : 'justify-start'}`}
            style={{
              opacity: (selectedTenderId || previousTenderId) && isContentVisible ? 1 : ((selectedTenderId || previousTenderId) ? 0 : 1),
              transform: (selectedTenderId || previousTenderId) && isContentVisible ? 'translateY(0)' : ((selectedTenderId || previousTenderId) ? 'translateY(-10px)' : 'translateY(0)'),
              transition: isFirstSelection && (selectedTenderId || previousTenderId) && isContentVisible
                ? 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s'
                : 'none'
            }}
          >
            {/* Tender Selection - Left Side */}
            <div className={`rounded-lg p-4 ${(selectedTenderId || previousTenderId) ? 'flex-1 shadow-lg' : 'w-auto max-w-2xl'}`} style={{ background: theme === 'dark' ? 'rgba(31,31,31,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} lg={(selectedTenderId || previousTenderId) ? 14 : 24}>
                  <div className="flex flex-col gap-2">
                    <div className={`flex flex-wrap items-center gap-2 ${!(selectedTenderId || previousTenderId) ? 'justify-center' : 'justify-start'}`}>
                      <Text strong className="whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.95)' : '#262626', cursor: 'default' }}>Тендер:</Text>
                      <Select
                        value={selectedTenderName}
                        onChange={handleTenderNameChange}
                        style={{ minWidth: '280px', maxWidth: '400px' }}
                        placeholder="Выберите тендер"
                        loading={loading}
                        showSearch
                        size="large"
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.children as string).toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {uniqueTenderNames.map(([key, displayName]) => (
                          <Option key={key} value={key}>
                            {displayName}
                          </Option>
                        ))}
                      </Select>
                      <Select
                        value={selectedTenderId ? (selectedTender?.version || undefined) : undefined}
                        onChange={handleVersionChange}
                        style={{ width: '160px' }}
                        placeholder="Выберите версию"
                        size="large"
                        disabled={!selectedTenderName || availableVersions.length === 0}
                      >
                        {availableVersions.map(version => (
                          <Option key={version} value={version}>
                            Версия {version}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </Col>
                {selectedTender && (
                  <Col xs={24} lg={10} className={`transition-all duration-700 ${isContentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                    <div className="flex flex-col justify-center gap-2">
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <span className="text-sm whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626', cursor: 'default' }}>
                          <strong>Название:</strong> {selectedTender.title}
                        </span>
                        <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', cursor: 'default' }}>|</span>
                        <span className="text-sm whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626', cursor: 'default' }}>
                          <strong>Заказчик:</strong> {selectedTender.client_name}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <span className="text-sm whitespace-nowrap" style={{ cursor: 'default' }}>
                          <strong style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626' }}>Площадь по СП:</strong> <span style={{ color: '#1890ff', fontWeight: 600, fontSize: '15px' }}>{selectedTender?.area_sp ? formatQuantity(selectedTender.area_sp, 0) + ' м²' : '—'}</span>
                        </span>
                        <span className="text-sm whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626', cursor: 'default' }}>
                          <strong>Площадь Заказчика:</strong> {selectedTender?.area_client ? formatQuantity(selectedTender.area_client, 0) + ' м²' : '—'}
                        </span>
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
            </div>
            
            {/* Total Cost - Right Side */}
            {selectedTenderId && (
              <div className={`flex flex-col justify-center px-6 rounded-lg transition-all duration-700 self-stretch ${isContentVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ background: theme === 'dark' ? 'rgba(31,31,31,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(24,144,255,0.2)' }}>
                <div>
                  <Text className="text-sm block mb-1" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : '#6b7280', cursor: 'default' }}>
                    {showCommercialCosts ? 'Коммерческая стоимость' : 'Общая стоимость'}
                  </Text>
                  <div className="text-3xl font-bold" style={{ color: theme === 'dark' ? '#10b981' : '#15803d', cursor: 'default' }}>
                    {Math.round(showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick Tender Selection - moved to header */}
          {!selectedTenderId && !selectedTenderName && (
            <div className="mt-6">
              <QuickTenderSelector
                tenders={tenders}
                loading={loading}
                onTenderSelect={handleQuickTenderSelect}
                selectedTenderId={selectedTenderId}
                maxItems={6}
              />
            </div>
          )}

          {/* Deadline Status Bar */}
          {(selectedTenderId || previousTenderId) && selectedTender && (
            <div className="mt-4 -mx-8 -mb-8">
              <DeadlineStatusBar
                deadline={selectedTender.submission_deadline}
                className=""
              />
            </div>
          )}
        </div>
      </div>

        {/* Main Content */}
        <div className="max-w-none">

      {/* Intermediate state: tender name selected, waiting for version */}
      {!selectedTenderId && selectedTenderName && !previousTenderId && (
        <Card className="mt-4 text-center max-w-2xl mx-auto shadow-lg">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="space-y-2">
                <Text
                  className="text-xl font-semibold block"
                  style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#1f2937' }}
                >
                  Выберите версию тендера
                </Text>
                <Text
                  className="text-base"
                  style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : '#6b7280' }}
                >
                  Используйте селектор "Версия" в шапке страницы
                </Text>
              </div>
            }
          />
        </Card>
      )}

      {/* Main Content */}
      {!selectedTenderId && !previousTenderId ? (
        <div>
          {/* Empty State */}
          <div className="text-center max-w-2xl mx-auto">
            <Card className="shadow-lg">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className="space-y-2">
                    <Title level={4} className="text-gray-600">
                      Выберите тендер для анализа затрат
                    </Title>
                    <Text type="secondary" className="text-base">
                      Выберите тендер из списка выше или используйте селектор
                    </Text>
                  </div>
                }
              />
            </Card>
          </div>
        </div>
      ) : (
        <div
          id="construction-costs-content-section"
          style={{
            opacity: isContentVisible ? 1 : 0,
            transform: isContentVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: isFirstSelection && isContentVisible
              ? 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none'
          }}
        >
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                      <Card className="stats-card cost-type-materials" style={{ 
                        height: '100%', 
                        minHeight: '180px', 
                        padding: 'var(--spacing-md)',
                        background: 'linear-gradient(135deg, var(--color-materials-50) 0%, var(--color-materials-100) 100%)',
                        border: '1px solid var(--color-materials-200)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                          <div className="stats-card-title">Материалы (BOQ)</div>
                          <InboxOutlined style={{ fontSize: '32px', color: 'var(--color-materials-500)', opacity: 0.8 }} />
                        </div>
                        <div className="stats-card-value money-value" style={{ color: 'var(--color-materials-600)' }}>
                          {Math.round(showCommercialCosts ? stats.commercialTotalMaterials : stats.actualTotalMaterials).toLocaleString('ru-RU')} ₽
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-sm)' }}>
                          {showCommercialCosts ? 'Коммерческая стоимость' : 'Включая доставку'}
                        </div>
                        <Progress 
                          percent={(showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) > 0 ? 
                            Number(((showCommercialCosts ? stats.commercialTotalMaterials : stats.actualTotalMaterials) / 
                                   (showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) * 100).toFixed(1)) : 0
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
                          {(showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) > 0 ? 
                            `${(((showCommercialCosts ? stats.commercialTotalMaterials : stats.actualTotalMaterials) / 
                                 (showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost)) * 100).toFixed(1)}% от общих затрат` : 
                            '0% от общих затрат'
                          }
                        </div>
                      </Card>

            <Card className="stats-card cost-type-works" style={{ 
              height: '100%', 
              minHeight: '180px', 
              padding: 'var(--spacing-md)',
              background: 'linear-gradient(135deg, var(--color-works-50) 0%, var(--color-works-100) 100%)',
              border: '1px solid var(--color-works-200)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="stats-card-title">Работы (BOQ)</div>
                <BuildOutlined style={{ fontSize: '32px', color: 'var(--color-works-500)', opacity: 0.8 }} />
              </div>
              <div className="stats-card-value money-value" style={{ color: 'var(--color-works-600)' }}>
                {Math.round(showCommercialCosts ? stats.commercialTotalWorks : stats.actualTotalWorks).toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-sm)' }}>
                {showCommercialCosts ? 'Коммерческая стоимость' : 'Строительные работы'}
              </div>
              <Progress 
                percent={(showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) > 0 ? 
                  Number(((showCommercialCosts ? stats.commercialTotalWorks : stats.actualTotalWorks) / 
                         (showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) * 100).toFixed(1)) : 0
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
                {(showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) > 0 ? 
                  `${(((showCommercialCosts ? stats.commercialTotalWorks : stats.actualTotalWorks) / 
                       (showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost)) * 100).toFixed(1)}% от общих затрат` : 
                  '0% от общих затрат'
                }
              </div>
            </Card>

            <Card className="stats-card cost-type-sub-materials" style={{ 
              height: '100%', 
              minHeight: '180px', 
              padding: 'var(--spacing-md)',
              background: 'linear-gradient(135deg, var(--color-sub-materials-50) 0%, var(--color-sub-materials-100) 100%)',
              border: '1px solid var(--color-sub-materials-200)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="stats-card-title">Субматериалы</div>
                <ToolOutlined style={{ fontSize: '32px', color: 'var(--color-sub-materials-500)', opacity: 0.8 }} />
              </div>
              <div className="stats-card-value money-value" style={{ color: 'var(--color-sub-materials-600)' }}>
                {Math.round(showCommercialCosts ? stats.commercialTotalSubmaterials : stats.actualTotalSubmaterials).toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-sm)' }}>
                {showCommercialCosts ? 'Коммерческая стоимость' : 'Субподрядные материалы'}
              </div>
              <Progress 
                percent={(showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) > 0 ? 
                  Number(((showCommercialCosts ? stats.commercialTotalSubmaterials : stats.actualTotalSubmaterials) / 
                         (showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) * 100).toFixed(1)) : 0
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
                {(showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) > 0 ? 
                  `${(((showCommercialCosts ? stats.commercialTotalSubmaterials : stats.actualTotalSubmaterials) / 
                       (showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost)) * 100).toFixed(1)}% от общих затрат` : 
                  '0% от общих затрат'
                }
              </div>
            </Card>

            <Card className="stats-card cost-type-sub-works" style={{ 
              height: '100%', 
              minHeight: '180px', 
              padding: 'var(--spacing-md)',
              background: 'linear-gradient(135deg, var(--color-sub-works-50) 0%, var(--color-sub-works-100) 100%)',
              border: '1px solid var(--color-sub-works-200)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="stats-card-title">Субработы</div>
                <TeamOutlined style={{ fontSize: '32px', color: 'var(--color-sub-works-500)', opacity: 0.8 }} />
              </div>
              <div className="stats-card-value money-value" style={{ color: 'var(--color-sub-works-600)' }}>
                {Math.round(showCommercialCosts ? stats.commercialTotalSubworks : stats.actualTotalSubworks).toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-sm)' }}>
                {showCommercialCosts ? 'Коммерческая стоимость' : 'Субподрядные работы'}
              </div>
              <Progress 
                percent={(showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) > 0 ? 
                  Number(((showCommercialCosts ? stats.commercialTotalSubworks : stats.actualTotalSubworks) / 
                         (showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) * 100).toFixed(1)) : 0
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
                {(showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost) > 0 ? 
                  `${(((showCommercialCosts ? stats.commercialTotalSubworks : stats.actualTotalSubworks) / 
                       (showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost)) * 100).toFixed(1)}% от общих затрат` : 
                  '0% от общих затрат'
                }
              </div>
            </Card>

            <Card className="stats-card" style={{ height: '100%', minHeight: '180px', padding: 'var(--spacing-md)', background: 'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-primary-100) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="stats-card-title">{showCommercialCosts ? 'Коммерческая сумма' : 'Общая сумма'}</div>
                <DollarOutlined style={{ fontSize: '32px', color: 'var(--color-primary-600)', opacity: 0.8 }} />
              </div>
              <div className="stats-card-value money-value" style={{ color: 'var(--color-primary-700)', fontWeight: 'var(--font-weight-bold)' }}>
                {Math.round(showCommercialCosts ? stats.commercialTotalCost : stats.actualTotalCost).toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-600)', marginBottom: 'var(--spacing-sm)' }}>
                {showCommercialCosts ? 'Итог с наценками' : 'Итог по тендеру'}
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
              justifyContent: 'space-between',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-sm) 0'
            }}>
              {/* Левая часть - поиск и фильтры */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--spacing-md)',
                flex: 1
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

              {/* Правая часть - слайдер переключения */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                padding: '8px 16px',
                background: 'var(--color-neutral-50)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
                flexShrink: 0
              }}>
                <span style={{ 
                  color: showCommercialCosts ? 'var(--color-neutral-500)' : 'var(--color-primary-600)',
                  fontWeight: showCommercialCosts ? 400 : 600,
                  fontSize: '13px',
                  transition: 'all 0.2s ease'
                }}>
                  Прямые затраты
                </span>
                <Switch
                  checked={showCommercialCosts}
                  onChange={setShowCommercialCosts}
                  size="default"
                  style={{
                    backgroundColor: showCommercialCosts ? 'var(--color-success-500)' : 'var(--color-neutral-300)'
                  }}
                />
                <span style={{ 
                  color: showCommercialCosts ? 'var(--color-success-600)' : 'var(--color-neutral-500)',
                  fontWeight: showCommercialCosts ? 600 : 400,
                  fontSize: '13px',
                  transition: 'all 0.2s ease'
                }}>
                  Коммерческие затраты
                </span>
              </div>
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
                
                // Расчет зависит от режима отображения
                const summaryMaterials = showCommercialCosts 
                  ? visibleData.reduce((sum, item) => sum + (item.volume && item.volume > 0 ? (item.commercial_materials_with_volume || 0) : (item.commercial_materials || 0)), 0)
                  : visibleData.reduce((sum, item) => sum + (item.actual_materials || 0), 0);
                  
                const summaryWorks = showCommercialCosts 
                  ? visibleData.reduce((sum, item) => sum + (item.volume && item.volume > 0 ? (item.commercial_works_with_volume || 0) : (item.commercial_works || 0)), 0)
                  : visibleData.reduce((sum, item) => sum + (item.actual_works || 0), 0);
                  
                const summarySubmaterials = showCommercialCosts 
                  ? visibleData.reduce((sum, item) => sum + (item.volume && item.volume > 0 ? (item.commercial_submaterials_with_volume || 0) : (item.commercial_submaterials || 0)), 0)
                  : visibleData.reduce((sum, item) => sum + (item.actual_submaterials || 0), 0);
                  
                const summarySubworks = showCommercialCosts 
                  ? visibleData.reduce((sum, item) => sum + (item.volume && item.volume > 0 ? (item.commercial_subworks_with_volume || 0) : (item.commercial_subworks || 0)), 0)
                  : visibleData.reduce((sum, item) => sum + (item.actual_subworks || 0), 0);
                  
                const summaryTotal = summaryMaterials + summaryWorks + summarySubmaterials + summarySubworks;
                
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: 'var(--bg-table-header)' }}>
                      <Table.Summary.Cell index={0} colSpan={6}>
                        <Text 
                          strong 
                          style={{ 
                            color: 'var(--color-neutral-700)',
                            fontSize: 'var(--font-size-md)',
                            fontWeight: 'var(--font-weight-semibold)'
                          }}
                        >
                          {showCommercialCosts ? 'Итого коммерческие затраты:' : 'Итого прямые затраты:'}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
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
                      <Table.Summary.Cell index={7}>
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
                      <Table.Summary.Cell index={8}>
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
                      <Table.Summary.Cell index={9}>
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
                      <Table.Summary.Cell index={10}>
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
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default TenderConstructionCostsPage;