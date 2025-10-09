import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Button,
  Input,
  Row,
  Col,
  Statistic,
  Empty,
  Spin,
  Tabs,
  message,
  Select
} from 'antd';
import {
  ToolOutlined,
  AppstoreOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
  BarChartOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { boqApi, tendersApi } from '../lib/supabase/api';
import type { BOQItem, Tender } from '../lib/supabase/types';
import { formatCurrency, formatQuantity } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';
import QuickTenderSelector from '../components/common/QuickTenderSelector';
import DeadlineStatusBar from '../components/tender/DeadlineStatusBar';
import * as XLSX from 'xlsx-js-style';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface GroupedItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  total_amount: number;
  item_type: 'material' | 'work' | 'sub_material' | 'sub_work';
  material_type?: 'main' | 'auxiliary';
  positions_count: number;
  positions: string[];
}

const TenderMaterialsWorksPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderName, setSelectedTenderName] = useState<string | null>(null);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [previousTenderId, setPreviousTenderId] = useState<string | null>(null);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'materials' | 'works'>('all');
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isFirstSelection, setIsFirstSelection] = useState(true);

  // Ref to preserve scroll position when changing tenders
  const scrollPositionRef = useRef<number>(0);
  const shouldPreserveScroll = useRef<boolean>(false);

  // Check for tender parameter in URL
  const searchParams = new URLSearchParams(window.location.search);
  const tenderParam = searchParams.get('tender');

  // Загрузка тендеров
  const loadTenders = useCallback(async () => {
    console.log('📡 [TenderMaterialsWorksPage] Loading tenders...');
    setTendersLoading(true);
    try {
      const { data, error } = await tendersApi.getAll({ includeVersions: true });
      if (error) {
        console.error('❌ [TenderMaterialsWorksPage] Error loading tenders:', error);
        message.error('Ошибка загрузки тендеров');
        return;
      }
      console.log('✅ [TenderMaterialsWorksPage] Tenders loaded:', data?.length);
      setTenders(data || []);

      // Auto-select tender from URL parameter if present
      if (tenderParam && data) {
        const foundTender = data.find(t => t.id === tenderParam);
        if (foundTender) {
          console.log('🎯 Auto-selecting tender from URL parameter:', tenderParam);
          const tenderNameKey = `${foundTender.title}___${foundTender.client_name}`;
          setSelectedTenderName(tenderNameKey);
          setSelectedTenderId(tenderParam);
        }
      }
    } catch (error) {
      console.error('💥 [TenderMaterialsWorksPage] Exception loading tenders:', error);
      message.error('Ошибка загрузки тендеров');
    } finally {
      setTendersLoading(false);
    }
  }, [tenderParam]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  // Handle tender name selection
  const handleTenderNameChange = useCallback((value: string) => {
    console.log('🔄 Tender name selection changed:', value);
    const currentScroll = window.scrollY;

    // Preserve scroll position when changing tenders (if we're not at the top)
    if (selectedTenderId && currentScroll > 100) {
      scrollPositionRef.current = currentScroll;
      shouldPreserveScroll.current = true;
      console.log('✅📍 PRESERVED scroll position:', scrollPositionRef.current);
    }

    // Store previous tender before clearing
    if (selectedTenderId) {
      setPreviousTenderId(selectedTenderId);
    }

    setSelectedTenderName(value);
    setSelectedTenderId(null);
    // Don't hide content - keep it visible
  }, [selectedTenderId]);

  // Handle version selection
  const handleVersionChange = useCallback((version: number) => {
    console.log('🔄 Version selection changed:', version);
    if (!selectedTenderName) return;

    const [title, clientName] = selectedTenderName.split('___');
    const targetTender = tenders.find(t =>
      t.title === title &&
      t.client_name === clientName &&
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

  // Get unique tender names/titles
  const uniqueTenderNames = useMemo(() => {
    const nameMap = new Map<string, string>();
    tenders.forEach(t => {
      const key = `${t.title}___${t.client_name}`;
      const displayName = `${t.title} - ${t.client_name}`;
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
    const sameTenders = tenders.filter(t =>
      t.title === title &&
      t.client_name === clientName
    );

    const versions = new Set(sameTenders.map(t => t.version || 1));
    return Array.from(versions).sort((a, b) => b - a);
  }, [tenders, selectedTenderName]);

  // Загрузка элементов BOQ
  const loadBoqItems = useCallback(async () => {
    if (!selectedTenderId) return;

    setLoading(true);
    try {
      console.log('🚀 Loading BOQ items for tender:', selectedTenderId);
      const { data, error } = await boqApi.getByTenderId(selectedTenderId, {}, { limit: 10000 });

      if (error) throw error;

      console.log('✅ Loaded BOQ items:', data?.length || 0);
      setBoqItems(data || []);
    } catch (error) {
      console.error('❌ Error loading BOQ items:', error);
    } finally {
      setLoading(false);

      // Restore scroll position after data is loaded
      console.log('🔍 Checking scroll restoration - shouldPreserve:', shouldPreserveScroll.current, 'position:', scrollPositionRef.current);

      if (shouldPreserveScroll.current && scrollPositionRef.current > 0) {
        console.log('📍 Attempting to restore scroll position:', scrollPositionRef.current);
        // Use setTimeout with double requestAnimationFrame to ensure DOM and table are fully rendered
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const targetScroll = scrollPositionRef.current;
            window.scrollTo({
              top: targetScroll,
              behavior: 'auto' // Use 'auto' for immediate scroll restoration
            });
            console.log('🔄 Restored scroll position to:', targetScroll, 'actual:', window.scrollY);
            shouldPreserveScroll.current = false;
            scrollPositionRef.current = 0;
          });
        });
      } else {
        console.log('⏭️ Skipping scroll restoration');
      }
    }
  }, [selectedTenderId]);

  // Загрузка элементов BOQ при выборе тендера
  useEffect(() => {
    if (selectedTenderId) {
      loadBoqItems();
    }
  }, [selectedTenderId, loadBoqItems]);

  // Группировка элементов по описанию и типу
  const groupedItems = useMemo(() => {
    const grouped = new Map<string, GroupedItem>();

    boqItems.forEach(item => {
      const key = `${item.description}_${item.unit}_${item.item_type}`;

      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.quantity += item.quantity || 0;
        existing.total_amount += item.total_amount || 0;
        existing.positions_count += 1;
        existing.positions.push(item.item_number || '');
      } else {
        grouped.set(key, {
          id: item.id,
          description: item.description || '',
          unit: item.unit || '',
          quantity: item.quantity || 0,
          unit_rate: item.unit_rate || 0,
          total_amount: item.total_amount || 0,
          item_type: item.item_type,
          material_type: item.material_type,
          positions_count: 1,
          positions: [item.item_number || '']
        });
      }
    });

    return Array.from(grouped.values());
  }, [boqItems]);

  // Фильтрация по поиску и типу
  const filteredItems = useMemo(() => {
    let items = groupedItems;

    // Фильтр по типу
    if (activeTab === 'materials') {
      items = items.filter(item => item.item_type === 'material' || item.item_type === 'sub_material');
    } else if (activeTab === 'works') {
      items = items.filter(item => item.item_type === 'work' || item.item_type === 'sub_work');
    }

    // Фильтр по поиску
    if (searchText) {
      const search = searchText.toLowerCase();
      items = items.filter(item =>
        item.description.toLowerCase().includes(search) ||
        item.unit.toLowerCase().includes(search)
      );
    }

    return items;
  }, [groupedItems, searchText, activeTab]);

  // Подсчет статистики
  const stats = useMemo(() => {
    const materials = groupedItems.filter(i => i.item_type === 'material' || i.item_type === 'sub_material');
    const works = groupedItems.filter(i => i.item_type === 'work' || i.item_type === 'sub_work');

    const materialsTotal = materials.reduce((sum, item) => sum + item.total_amount, 0);
    const worksTotal = works.reduce((sum, item) => sum + item.total_amount, 0);

    return {
      materialsCount: materials.length,
      worksCount: works.length,
      materialsTotal,
      worksTotal,
      total: materialsTotal + worksTotal
    };
  }, [groupedItems]);

  // Колонки таблицы
  const columns: ColumnsType<GroupedItem> = [
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 120,
      fixed: 'left',
      align: 'center',
      render: (type: string, record: GroupedItem) => {
        const typeConfig = {
          work: { color: 'orange', icon: <ToolOutlined />, label: 'Работа' },
          sub_work: { color: 'purple', icon: <ToolOutlined />, label: 'Суб-раб' },
          material: { color: 'blue', icon: <AppstoreOutlined />, label: 'Материал' },
          sub_material: { color: 'green', icon: <AppstoreOutlined />, label: 'Суб-мат' },
        };

        const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.material;
        const isMaterial = type === 'material' || type === 'sub_material';
        const isMain = record.material_type !== 'auxiliary';

        return (
          <div className="flex flex-col gap-0.5 items-center">
            <Tag icon={config.icon} color={config.color}>
              {config.label}
            </Tag>
            {isMaterial && (
              <Tag
                color={isMain ? "cyan" : "gold"}
                className="text-xs"
                style={{ fontSize: '10px', padding: '0 4px', height: '18px', lineHeight: '18px' }}
              >
                {isMain ? <>📦 Основной</> : <>🔧 Вспомогательный</>}
              </Tag>
            )}
          </div>
        );
      },
      filters: [
        { text: 'Работы', value: 'work' },
        { text: 'Субподряд: Работы', value: 'sub_work' },
        { text: 'Материалы', value: 'material' },
        { text: 'Субподряд: Материалы', value: 'sub_material' },
      ],
      onFilter: (value, record) => record.item_type === value,
    },
    {
      title: 'Наименование',
      dataIndex: 'description',
      key: 'description',
      width: 400,
      ellipsis: true,
      sorter: (a, b) => a.description.localeCompare(b.description),
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      align: 'right',
      render: (quantity: number) => formatQuantity(quantity),
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      align: 'center',
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 140,
      align: 'right',
      render: (rate: number) => formatCurrency(rate),
      sorter: (a, b) => a.unit_rate - b.unit_rate,
    },
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 150,
      align: 'right',
      render: (amount: number) => (
        <Text strong>{formatCurrency(amount)}</Text>
      ),
      sorter: (a, b) => a.total_amount - b.total_amount,
    },
    {
      title: 'Позиций',
      dataIndex: 'positions_count',
      key: 'positions_count',
      width: 100,
      align: 'center',
      render: (count: number, record: GroupedItem) => (
        <span title={`Позиции: ${record.positions.join(', ')}`}>
          {count}
        </span>
      ),
      sorter: (a, b) => a.positions_count - b.positions_count,
    },
  ];

  // Handle tender selection
  const handleTenderSelect = useCallback((tender: Tender) => {
    console.log('🚀 Quick tender selected:', tender.id, tender.title);

    // Auto-fill the tender selection fields
    const tenderNameKey = `${tender.title}___${tender.client_name}`;
    setSelectedTenderName(tenderNameKey);
    setSelectedTenderId(tender.id);
    setPreviousTenderId(null);

    // Show content after brief delay for smooth transition
    setTimeout(() => {
      setIsContentVisible(true);
      // Mark first selection as complete AFTER animation finishes
      setTimeout(() => {
        setIsFirstSelection(false);
      }, 650);
    }, 150);
  }, []);

  const selectedTender = tenders.find(t => t.id === (selectedTenderId || previousTenderId));

  // Export to Excel
  const handleExportToExcel = useCallback(() => {
    if (!selectedTender || filteredItems.length === 0) {
      message.warning('Нет данных для экспорта');
      return;
    }

    try {
      message.loading({ content: 'Подготовка файла...', key: 'export' });

      // Prepare data
      const exportData = filteredItems.map(item => {
        const typeLabels = {
          work: 'Работа',
          sub_work: 'Субподряд: Работа',
          material: 'Материал',
          sub_material: 'Субподряд: Материал',
        };

        // Format numbers without currency symbols for Excel
        const formatNumberForExcel = (num: number): string => {
          return num.toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        };

        return {
          'Тип': typeLabels[item.item_type as keyof typeof typeLabels] || item.item_type,
          'Наименование': item.description,
          'Количество': formatQuantity(item.quantity),
          'Ед. изм.': item.unit,
          'Цена за ед.': formatNumberForExcel(item.unit_rate),
          'Сумма': formatNumberForExcel(item.total_amount),
          'Позиций': item.positions_count,
        };
      });

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 25 }, // Тип
        { wch: 60 }, // Наименование
        { wch: 15 }, // Количество
        { wch: 12 }, // Ед. изм.
        { wch: 18 }, // Цена за ед.
        { wch: 20 }, // Сумма
        { wch: 10 }, // Позиций
      ];

      // Style header row
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1890FF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
          },
        };
      }

      // Add borders to all cells
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            border: {
              top: { style: 'thin', color: { rgb: 'CCCCCC' } },
              bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
              left: { style: 'thin', color: { rgb: 'CCCCCC' } },
              right: { style: 'thin', color: { rgb: 'CCCCCC' } },
            },
          };
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'БСМ');

      // Generate filename
      const fileName = `БСМ ${selectedTender.title} (Версия ${selectedTender.version || 1}).xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);

      message.success({ content: 'Файл успешно экспортирован', key: 'export' });
    } catch (error) {
      console.error('❌ Export error:', error);
      message.error({ content: 'Ошибка экспорта данных', key: 'export' });
    }
  }, [selectedTender, filteredItems]);

  // Reset tender selection
  const handleResetSelection = useCallback(() => {
    setSelectedTenderId(null);
    setSelectedTenderName(null);
    setPreviousTenderId(null);
    setBoqItems([]);
    setIsContentVisible(false);
    setIsFirstSelection(true);
    message.info('Выбор тендера сброшен');
  }, []);

  // Refresh data
  const handleRefresh = useCallback(() => {
    if (!selectedTenderId) {
      console.log('❌ No tender selected for refresh');
      message.info('Выберите тендер для обновления');
      return;
    }

    console.log('🔄 Starting refresh for tender:', selectedTenderId);
    message.loading('Обновление данных...', 0.5);

    // Reload BOQ items
    loadBoqItems();
  }, [selectedTenderId, loadBoqItems]);

  return (
    <>
      <style>
        {`
          .materials-works-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            padding-bottom: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .materials-works-page-header.dark {
            background: linear-gradient(135deg, #1e293b 0%, #064e3b 50%, #134e4a 100%);
          }
          .materials-works-action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .materials-works-action-btn {
            height: 42px;
            padding: 0 24px;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .materials-works-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .materials-works-action-btn-transparent {
            background: transparent !important;
            color: rgba(255, 255, 255, 0.95) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
          }
          .materials-works-action-btn-transparent:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            border-color: rgba(255, 255, 255, 0.5) !important;
          }
          .materials-works-page-header::before {
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
        `}
      </style>
      <div className="w-full min-h-full bg-gray-50">
        <div className="p-6">
          {/* Beautiful Gradient Header */}
          <div className={`materials-works-page-header ${theme === 'dark' ? 'dark' : ''}`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <FileTextOutlined style={{ fontSize: 32, color: 'white' }} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0, color: 'white', fontSize: 28 }}>
                  {selectedTender ? selectedTender.title : 'БСМ'}
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                  {selectedTender ? `Заказчик: ${selectedTender.client_name}` : 'Базовые стоимости материалов - просмотр всех используемых материалов и работ в выбранном тендере'}
                </Text>
              </div>
            </div>
            <div className="materials-works-action-buttons">
              {(selectedTenderId || previousTenderId) && (
                <Button
                  className="materials-works-action-btn materials-works-action-btn-transparent"
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleResetSelection}
                >
                  Назад к выбору
                </Button>
              )}
              <Button
                className="materials-works-action-btn materials-works-action-btn-transparent"
                size="large"
                icon={<DashboardOutlined />}
                onClick={() => navigate('/dashboard')}
              >
                К дашборду
              </Button>
              <Button
                className="materials-works-action-btn"
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
                        loading={tendersLoading}
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
                  <Col xs={24} lg={10}>
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
                          <strong style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626' }}>Площадь по СП:</strong> <span style={{ color: '#1890ff', fontWeight: 600, fontSize: '15px' }}>{selectedTender.area_sp ? formatQuantity(selectedTender.area_sp, 0) + ' м²' : '—'}</span>
                        </span>
                        <span className="text-sm whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626', cursor: 'default' }}>
                          <strong>Площадь Заказчика:</strong> {selectedTender.area_client ? formatQuantity(selectedTender.area_client, 0) + ' м²' : '—'}
                        </span>
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
            </div>
          </div>

          {/* Quick Tender Selection - moved to header */}
          {!selectedTenderId && !selectedTenderName && (
            <div className="mt-6">
              <QuickTenderSelector
                tenders={tenders}
                loading={tendersLoading}
                onTenderSelect={handleTenderSelect}
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

        {(selectedTenderId || previousTenderId) && (
          <Card className="mb-4 bsm-stats-card">
            <style>
              {`
                .bsm-stats-card .ant-statistic-content-prefix {
                  color: inherit !important;
                }
                .bsm-stats-card .ant-statistic-title {
                  color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)'};
                }
              `}
            </style>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Материалов"
                    value={stats.materialsCount}
                    prefix={<AppstoreOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Работ"
                    value={stats.worksCount}
                    prefix={<ToolOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Стоимость материалов"
                    value={stats.materialsTotal}
                    prefix={<CalculatorOutlined style={{ color: '#1890ff' }} />}
                    formatter={(value) => formatCurrency(value as number)}
                    valueStyle={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Стоимость работ"
                    value={stats.worksTotal}
                    prefix={<CalculatorOutlined style={{ color: '#52c41a' }} />}
                    formatter={(value) => formatCurrency(value as number)}
                    valueStyle={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                  />
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Card size="small" style={{ backgroundColor: theme === 'dark' ? '#1f1f1f' : '#f0f2f5' }}>
                    <Statistic
                      title="Общая стоимость"
                      value={stats.total}
                      prefix={<BarChartOutlined style={{ color: '#722ed1' }} />}
                      formatter={(value) => formatCurrency(value as number)}
                      valueStyle={{ color: theme === 'dark' ? '#ffffff' : '#000000', fontSize: '24px' }}
                    />
                  </Card>
                </Col>
              </Row>
            </Space>
          </Card>
        )}

        {selectedTenderId && (
          <Card>
            <style>
              {`
                .ant-table-thead > tr > th {
                  text-align: center !important;
                }
                .ant-table-tbody > tr > td {
                  border-right: 1px solid #f0f0f0 !important;
                }
                .ant-table-thead > tr > th {
                  border-right: 1px solid #e8e8e8 !important;
                }
              `}
            </style>
            <div className="mb-4">
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Search
                  placeholder="Поиск по наименованию или единице измерения"
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="large"
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 400 }}
                />
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportToExcel}
                  disabled={!selectedTenderId || filteredItems.length === 0}
                  type="primary"
                >
                  Экспорт в Excel
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadBoqItems}
                  loading={loading}
                >
                  Обновить
                </Button>
              </Space>
            </Space>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as typeof activeTab)}
            items={[
              {
                key: 'all',
                label: `Все (${groupedItems.length})`,
              },
              {
                key: 'materials',
                label: `Материалы (${stats.materialsCount})`,
              },
              {
                key: 'works',
                label: `Работы (${stats.worksCount})`,
              },
            ]}
          />

          <Table
            columns={columns}
            dataSource={filteredItems}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`,
              defaultPageSize: 50,
              pageSizeOptions: ['20', '50', '100', '200'],
            }}
            scroll={{ x: 1200 }}
            locale={{
              emptyText: selectedTenderId ? (
                <Empty description="Нет данных для отображения" />
              ) : (
                <Empty
                  description={
                    <div className="space-y-2">
                      <Text
                        className="text-xl font-semibold block"
                        style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#1f2937' }}
                      >
                        Выберите тендер для просмотра материалов и работ
                      </Text>
                      <Text
                        className="text-base"
                        style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : '#6b7280' }}
                      >
                        Выберите тендер из списка выше или используйте селектор
                      </Text>
                    </div>
                  }
                />
              ),
            }}
          />
          </Card>
        )}

        {!selectedTenderId && !previousTenderId && (
          <Card className="mt-4 text-center max-w-2xl mx-auto shadow-lg">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="space-y-3">
                  <div>
                    <Text
                      className="text-xl font-semibold block"
                      style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#1f2937' }}
                    >
                      {tendersLoading ? "Загрузка тендеров..." : "Выберите тендер для просмотра материалов и работ"}
                    </Text>
                  </div>
                  {!tendersLoading && (
                    <div>
                      <Text
                        className="text-base block"
                        style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : '#6b7280' }}
                      >
                        Выберите тендер из списка выше или используйте селектор
                      </Text>
                    </div>
                  )}
                </div>
              }
            />
          </Card>
        )}
        </div>
      </div>
    </>
  );
};

export default TenderMaterialsWorksPage;
