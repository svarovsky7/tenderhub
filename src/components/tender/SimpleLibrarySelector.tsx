import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Table,
  Input,
  Button,
  Space,
  message,
  InputNumber,
  Tag
} from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { materialsApi, worksApi } from '../../lib/supabase/api';
import type { 
  Material, 
  WorkItem, 
  BOQItemInsert
} from '../../lib/supabase/types';

const { TabPane } = Tabs;
const { Search } = Input;

interface SimpleLibrarySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (items: BOQItemInsert[]) => void;
}

interface SelectableItem extends Material {
  quantity?: number;
}

interface SelectableWork extends WorkItem {
  quantity?: number;
}

const SimpleLibrarySelector: React.FC<SimpleLibrarySelectorProps> = ({
  visible,
  onClose,
  onSelect
}) => {
  console.log('🚀 SimpleLibrarySelector rendered');

  const [activeTab, setActiveTab] = useState<'materials' | 'works'>('materials');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<Map<string, SelectableItem>>(new Map());
  const [selectedWorks, setSelectedWorks] = useState<Map<string, SelectableWork>>(new Map());

  // Load data
  const loadMaterials = useCallback(async () => {
    console.log('📡 Loading materials...');
    setLoading(true);
    try {
      const result = await materialsApi.getAll(
        { search: searchText },
        { limit: 100 }
      );
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ Materials loaded:', result.data?.length);
      setMaterials(result.data || []);
    } catch (error) {
      console.error('❌ Load materials error:', error);
      message.error('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  const loadWorks = useCallback(async () => {
    console.log('📡 Loading works...');
    setLoading(true);
    try {
      const result = await worksApi.getAll(
        { search: searchText },
        { limit: 100 }
      );
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ Works loaded:', result.data?.length);
      setWorks(result.data || []);
    } catch (error) {
      console.error('❌ Load works error:', error);
      message.error('Ошибка загрузки работ');
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  // Effects
  useEffect(() => {
    if (visible) {
      if (activeTab === 'materials') {
        loadMaterials();
      } else {
        loadWorks();
      }
    }
  }, [visible, activeTab, loadMaterials, loadWorks]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      console.log('🧹 Resetting selection...');
      setSelectedMaterials(new Map());
      setSelectedWorks(new Map());
      setSearchText('');
    }
  }, [visible]);

  // Handlers
  const handleSearch = useCallback((value: string) => {
    console.log('🔍 Searching:', value);
    setSearchText(value);
  }, []);

  const handleSelectMaterial = useCallback((material: Material) => {
    console.log('📦 Selecting material:', material.name);
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      if (newMap.has(material.id)) {
        newMap.delete(material.id);
      } else {
        newMap.set(material.id, { ...material, quantity: 1 });
      }
      return newMap;
    });
  }, []);

  const handleSelectWork = useCallback((work: WorkItem) => {
    console.log('🔧 Selecting work:', work.name);
    setSelectedWorks(prev => {
      const newMap = new Map(prev);
      if (newMap.has(work.id)) {
        newMap.delete(work.id);
      } else {
        newMap.set(work.id, { ...work, quantity: 1 });
      }
      return newMap;
    });
  }, []);

  const handleUpdateQuantity = useCallback((id: string, quantity: number, type: 'material' | 'work') => {
    console.log('🔢 Updating quantity:', { id, quantity, type });
    if (type === 'material') {
      setSelectedMaterials(prev => {
        const newMap = new Map(prev);
        const item = newMap.get(id);
        if (item) {
          newMap.set(id, { ...item, quantity });
        }
        return newMap;
      });
    } else {
      setSelectedWorks(prev => {
        const newMap = new Map(prev);
        const item = newMap.get(id);
        if (item) {
          newMap.set(id, { ...item, quantity });
        }
        return newMap;
      });
    }
  }, []);

  const handleConfirm = useCallback(() => {
    console.log('✅ Confirming selection...');
    
    const boqItems: BOQItemInsert[] = [];
    
    // Add selected materials
    selectedMaterials.forEach(material => {
      boqItems.push({
        tender_id: 'temp', // Will be set by parent
        item_type: 'material',
        description: material.name,
        unit: material.unit,
        quantity: material.quantity || 1,
        unit_rate: 0,
        material_id: material.id,
        library_material_id: material.id
      });
    });

    // Add selected works
    selectedWorks.forEach(work => {
      boqItems.push({
        tender_id: 'temp', // Will be set by parent
        item_type: 'work',
        description: work.name,
        unit: work.unit,
        quantity: work.quantity || 1,
        unit_rate: 0,
        work_id: work.id,
        library_work_id: work.id
      });
    });

    if (boqItems.length === 0) {
      message.warning('Выберите хотя бы один элемент');
      return;
    }

    console.log('📤 Sending items to parent:', boqItems.length);
    onSelect(boqItems);
    onClose();
  }, [selectedMaterials, selectedWorks, onSelect, onClose]);

  // Material columns
  const materialColumns: ColumnsType<Material> = [
    {
      title: '',
      key: 'select',
      width: 50,
      render: (_, record) => (
        <input
          type="checkbox"
          checked={selectedMaterials.has(record.id)}
          onChange={() => handleSelectMaterial(record)}
        />
      )
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category) => category && <Tag>{category}</Tag>
    },
    {
      title: 'Количество',
      key: 'quantity',
      width: 120,
      render: (_, record) => 
        selectedMaterials.has(record.id) ? (
          <InputNumber
            value={selectedMaterials.get(record.id)?.quantity || 1}
            min={0.01}
            precision={2}
            onChange={(val) => val && handleUpdateQuantity(record.id, val, 'material')}
          />
        ) : null
    }
  ];

  // Work columns
  const workColumns: ColumnsType<WorkItem> = [
    {
      title: '',
      key: 'select',
      width: 50,
      render: (_, record) => (
        <input
          type="checkbox"
          checked={selectedWorks.has(record.id)}
          onChange={() => handleSelectWork(record)}
        />
      )
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category) => category && <Tag color="green">{category}</Tag>
    },
    {
      title: 'Количество',
      key: 'quantity',
      width: 120,
      render: (_, record) => 
        selectedWorks.has(record.id) ? (
          <InputNumber
            value={selectedWorks.get(record.id)?.quantity || 1}
            min={0.01}
            precision={2}
            onChange={(val) => val && handleUpdateQuantity(record.id, val, 'work')}
          />
        ) : null
    }
  ];

  const selectedCount = selectedMaterials.size + selectedWorks.size;

  return (
    <Modal
      title="Выбор из справочника"
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Отмена
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleConfirm}
          disabled={selectedCount === 0}
        >
          Добавить выбранные ({selectedCount})
        </Button>
      ]}
      destroyOnClose
    >
      <div className="space-y-4">
        <Search
          placeholder="Поиск по наименованию..."
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          onSearch={handleSearch}
        />

        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key as 'materials' | 'works')}
        >
          <TabPane 
            tab={`Материалы ${selectedMaterials.size > 0 ? `(${selectedMaterials.size})` : ''}`} 
            key="materials"
          >
            <Table
              columns={materialColumns}
              dataSource={materials}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: false
              }}
              scroll={{ y: 400 }}
            />
          </TabPane>
          
          <TabPane 
            tab={`Работы ${selectedWorks.size > 0 ? `(${selectedWorks.size})` : ''}`} 
            key="works"
          >
            <Table
              columns={workColumns}
              dataSource={works}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: false
              }}
              scroll={{ y: 400 }}
            />
          </TabPane>
        </Tabs>
      </div>
    </Modal>
  );
};

export default SimpleLibrarySelector;