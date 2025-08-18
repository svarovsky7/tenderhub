import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Modal, message, Space, InputNumber, Dropdown, Checkbox, Tag, Tooltip } from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CopyOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  MoreOutlined,
  AppstoreOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { workMaterialLinksApi } from '../lib/supabase/api/work-material-links';
import { materialsApi } from '../lib/supabase/api/materials';
import { worksApi } from '../lib/supabase/api/works';
import type { MenuProps } from 'antd';

interface Work {
  id: string;
  name: string;
  description?: string;
  unit: string;
  area?: number;
  price?: number;
}

interface Material {
  id: string;
  name: string;
  description?: string;
  unit: string;
  category?: string;
}

interface WorkMaterialLink {
  id: string;
  work_id: string;
  material_id: string;
  delivery_price_type: 'included' | 'not_included' | 'amount';
  delivery_amount: number;
  notes?: string;
  work?: Work;
  material?: Material;
}

const WorkMaterialsPage: React.FC = () => {
  console.log('🚀 WorkMaterialsPage загружена');
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchWork, setSearchWork] = useState('');
  const [searchMaterial, setSearchMaterial] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddWorkModal, setShowAddWorkModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [itemToMove, setItemToMove] = useState<any>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [newWork, setNewWork] = useState({ name: '', description: '', unit: 'м²' });
  const [newMaterial, setNewMaterial] = useState({ name: '', description: '', unit: 'шт', category: '' });
  const [newLink, setNewLink] = useState({
    work_id: '',
    material_id: '',
    delivery_price_type: 'included' as const,
    delivery_amount: 0,
    notes: ''
  });

  const queryClient = useQueryClient();

  // Загрузка работ из библиотеки
  const { data: works = [], isLoading: worksLoading, error: worksError } = useQuery({
    queryKey: ['works-library'],
    queryFn: async () => {
      console.log('📡 Загрузка работ из библиотеки');
      try {
        const response = await worksApi.getAll();
        console.log('✅ Ответ API работ:', response);
        
        // API возвращает PaginatedResponse с полями data и pagination
        if (response.error) {
          console.error('❌ Ошибка от API работ:', response.error);
          throw new Error(response.error);
        }
        
        const data = response.data || [];
        console.log('✅ Загружено работ:', data.length);
        console.log('✅ Данные работ:', data);
        
        return data;
      } catch (error) {
        console.error('❌ Ошибка загрузки работ:', error);
        throw error;
      }
    }
  });

  // Загрузка материалов из библиотеки
  const { data: materials = [], isLoading: materialsLoading, error: materialsError } = useQuery({
    queryKey: ['materials-library'],
    queryFn: async () => {
      console.log('📡 Загрузка материалов из библиотеки');
      try {
        const response = await materialsApi.getAll();
        console.log('✅ Ответ API материалов:', response);
        
        // API возвращает PaginatedResponse с полями data и pagination
        if (response.error) {
          console.error('❌ Ошибка от API материалов:', response.error);
          throw new Error(response.error);
        }
        
        const data = response.data || [];
        console.log('✅ Загружено материалов:', data.length);
        console.log('✅ Данные материалов:', data);
        
        return data;
      } catch (error) {
        console.error('❌ Ошибка загрузки материалов:', error);
        throw error;
      }
    }
  });

  // Загрузка связей работ и материалов
  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['work-material-links-all'],
    queryFn: async () => {
      console.log('📡 Загрузка связей работ и материалов');
      const { data, error } = await supabase
        .from('work_material_links_detailed')
        .select('*')
        .order('work_description', { ascending: true });
        
      if (error) {
        console.error('❌ Ошибка загрузки связей:', error);
        throw error;
      }
      
      console.log('✅ Загружено связей:', data?.length || 0);
      return data || [];
    }
  });

  // Группировка связей по работам
  const groupedLinks = React.useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    links.forEach((link: any) => {
      const workKey = link.work_boq_item_id || 'no-work';
      if (!grouped[workKey]) {
        grouped[workKey] = [];
      }
      grouped[workKey].push(link);
    });
    
    return grouped;
  }, [links]);

  // Создание новой работы
  const createWorkMutation = useMutation({
    mutationFn: async (work: typeof newWork) => {
      console.log('🚀 Создание новой работы:', work);
      const response = await worksApi.create(work);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    onSuccess: () => {
      console.log('✅ Работа успешно создана');
      message.success('Работа успешно добавлена');
      queryClient.invalidateQueries({ queryKey: ['works-library'] });
      setShowAddWorkModal(false);
      setNewWork({ name: '', description: '', unit: 'м²' });
    },
    onError: (error) => {
      console.error('❌ Ошибка создания работы:', error);
      message.error(`Ошибка при добавлении работы: ${error.message}`);
    }
  });

  // Создание нового материала
  const createMaterialMutation = useMutation({
    mutationFn: async (material: typeof newMaterial) => {
      console.log('🚀 Создание нового материала:', material);
      const response = await materialsApi.create(material);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    onSuccess: () => {
      console.log('✅ Материал успешно создан');
      message.success('Материал успешно добавлен');
      queryClient.invalidateQueries({ queryKey: ['materials-library'] });
      setShowAddMaterialModal(false);
      setNewMaterial({ name: '', description: '', unit: 'шт', category: '' });
    },
    onError: (error) => {
      console.error('❌ Ошибка создания материала:', error);
      message.error(`Ошибка при добавлении материала: ${error.message}`);
    }
  });

  // Форматирование цены
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  // Обработка выбора элементов
  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Действия над элементом
  const getItemActions = (item: any): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Редактировать',
      onClick: () => console.log('Редактирование:', item)
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Копировать',
      onClick: () => console.log('Копирование:', item)
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Удалить',
      danger: true,
      onClick: () => console.log('Удаление:', item)
    }
  ];

  // Колонки таблицы материалов
  const materialColumns = [
    {
      title: '',
      key: 'select',
      width: 50,
      render: (_: any, record: any) => (
        <Checkbox
          checked={selectedItems.has(record.id)}
          onChange={() => handleItemSelect(record.id)}
        />
      )
    },
    {
      title: 'Материал',
      dataIndex: 'material_description',
      key: 'material',
      render: (text: string) => (
        <div className="flex items-center gap-2">
          <AppstoreOutlined className="text-green-600" />
          <span className="font-medium">{text}</span>
        </div>
      )
    },
    {
      title: 'Количество',
      key: 'quantity',
      width: 150,
      render: (record: any) => (
        <span>{record.total_material_needed} {record.material_unit}</span>
      )
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'material_unit_rate',
      key: 'unit_price',
      width: 120,
      render: (price: number) => formatPrice(price || 0)
    },
    {
      title: 'Сумма',
      dataIndex: 'total_material_cost',
      key: 'total',
      width: 150,
      render: (price: number) => (
        <span className="font-semibold">{formatPrice(price || 0)}</span>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Dropdown menu={{ items: getItemActions(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  // Логирование состояния
  console.log('📊 Состояние компонента:', {
    worksLoading,
    worksError,
    works: works?.length || 0,
    materialsLoading,
    materialsError,
    materials: materials?.length || 0,
    linksLoading,
    links: links?.length || 0
  });

  // Проверка на загрузку
  if (worksLoading || materialsLoading || linksLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center">
            <div className="text-lg mb-2">Загрузка данных...</div>
            <div className="text-sm text-gray-500">
              {worksLoading && <div>Загрузка работ...</div>}
              {materialsLoading && <div>Загрузка материалов...</div>}
              {linksLoading && <div>Загрузка связей...</div>}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Проверка на ошибки
  if (worksError || materialsError) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center text-red-500">
            <div className="text-lg mb-2">Ошибка загрузки данных</div>
            <div className="text-sm">
              {worksError && <div>Ошибка загрузки работ: {String(worksError)}</div>}
              {materialsError && <div>Ошибка загрузки материалов: {String(materialsError)}</div>}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Заголовок */}
      <Card className="mb-6">
        <h1 className="text-2xl font-bold mb-6">Управление работами и материалами</h1>
        
        {/* Быстрое добавление */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold">Быстрое добавление</h3>
          
          {/* Добавление работы */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <ToolOutlined className="text-blue-600 text-xl" />
            <Select
              placeholder="Выберите работу"
              className="flex-1"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={(Array.isArray(works) ? works : []).map(w => ({ value: w.id, label: w.name }))}
              onSelect={(value) => setSelectedWork(value)}
            />
            <Input
              placeholder="Или введите название новой работы..."
              value={searchWork}
              onChange={(e) => setSearchWork(e.target.value)}
              prefix={<SearchOutlined />}
              className="flex-1"
            />
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setShowAddWorkModal(true)}
            >
              Добавить работу
            </Button>
          </div>

          {/* Добавление материала */}
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <AppstoreOutlined className="text-green-600 text-xl" />
            <Select
              placeholder="Выберите материал"
              className="flex-1"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={(Array.isArray(materials) ? materials : []).map(m => ({ value: m.id, label: m.name }))}
            />
            <Input
              placeholder="Или введите название нового материала..."
              value={searchMaterial}
              onChange={(e) => setSearchMaterial(e.target.value)}
              prefix={<SearchOutlined />}
              className="flex-1"
            />
            <InputNumber
              placeholder="Кол-во"
              min={0}
              className="w-24"
            />
            <InputNumber
              placeholder="Цена"
              min={0}
              className="w-32"
            />
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowAddMaterialModal(true)}
            >
              Добавить материал
            </Button>
          </div>

          {/* Связывание работ и материалов */}
          {selectedWork && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Выбрана работа для добавления материалов</span>
                <Button 
                  type="primary"
                  onClick={() => setShowLinkModal(true)}
                >
                  Связать с материалами
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Массовые действия */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-yellow-800">Выбрано: {selectedItems.size}</span>
            <Space>
              <Button size="small" type="primary" className="bg-yellow-600">
                Переместить в...
              </Button>
              <Button size="small" type="primary">
                Копировать
              </Button>
              <Button size="small" danger>
                Удалить
              </Button>
            </Space>
          </div>
        )}
      </Card>

      {/* Список работ с материалами */}
      <div className="space-y-6">
        {Object.entries(groupedLinks).map(([workId, workLinks]) => {
          const firstLink = workLinks[0];
          const workName = firstLink?.work_description || 'Без работы';
          const totalPrice = workLinks.reduce((sum, link) => 
            sum + (link.total_material_cost || 0), 0
          );

          return (
            <Card key={workId}>
              {/* Заголовок работы */}
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 -m-6 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">{workName}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {firstLink?.work_quantity} {firstLink?.work_unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatPrice(totalPrice)}
                    </p>
                    <p className="text-sm text-gray-500">{workLinks.length} поз.</p>
                  </div>
                </div>
              </div>

              {/* Таблица материалов */}
              <Table
                columns={materialColumns}
                dataSource={workLinks}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          );
        })}
      </div>

      {/* Модальное окно добавления работы */}
      <Modal
        title="Добавить новую работу"
        open={showAddWorkModal}
        onOk={() => createWorkMutation.mutate(newWork)}
        onCancel={() => setShowAddWorkModal(false)}
        confirmLoading={createWorkMutation.isPending}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название работы</label>
            <Input
              value={newWork.name}
              onChange={(e) => setNewWork({ ...newWork, name: e.target.value })}
              placeholder="Введите название работы"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <Input.TextArea
              value={newWork.description}
              onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
              placeholder="Введите описание работы"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Единица измерения</label>
            <Select
              value={newWork.unit}
              onChange={(value) => setNewWork({ ...newWork, unit: value })}
              className="w-full"
              options={[
                { value: 'м²', label: 'м²' },
                { value: 'м³', label: 'м³' },
                { value: 'м', label: 'м' },
                { value: 'шт', label: 'шт' },
                { value: 'компл', label: 'компл' }
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* Модальное окно добавления материала */}
      <Modal
        title="Добавить новый материал"
        open={showAddMaterialModal}
        onOk={() => createMaterialMutation.mutate(newMaterial)}
        onCancel={() => setShowAddMaterialModal(false)}
        confirmLoading={createMaterialMutation.isPending}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название материала</label>
            <Input
              value={newMaterial.name}
              onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
              placeholder="Введите название материала"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <Input.TextArea
              value={newMaterial.description}
              onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
              placeholder="Введите описание материала"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Категория</label>
            <Input
              value={newMaterial.category}
              onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
              placeholder="Введите категорию"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Единица измерения</label>
            <Select
              value={newMaterial.unit}
              onChange={(value) => setNewMaterial({ ...newMaterial, unit: value })}
              className="w-full"
              options={[
                { value: 'шт', label: 'шт' },
                { value: 'м²', label: 'м²' },
                { value: 'м³', label: 'м³' },
                { value: 'м', label: 'м' },
                { value: 'кг', label: 'кг' },
                { value: 'т', label: 'т' },
                { value: 'л', label: 'л' },
                { value: 'компл', label: 'компл' }
              ]}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkMaterialsPage;