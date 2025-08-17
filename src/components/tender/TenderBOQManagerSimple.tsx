import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Empty, 
  Spin, 
  message, 
  Modal, 
  Form, 
  Input, 
  Select,
  Space,
  Typography
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { clientPositionsApi, boqApi } from '../../lib/supabase/api';
import ClientPositionCardSimple from './ClientPositionCardSimple';
import SimpleLibrarySelector from './SimpleLibrarySelector';
import type { 
  ClientPositionInsert,
  BOQItemInsert,
  BOQItemWithLibrary
} from '../../lib/supabase/types';

// Extended type with proper fields
interface ClientPositionWithItems {
  id: string;
  tender_id: string;
  position_number: number;
  item_no: string;
  work_name: string;
  total_materials_cost: number;
  total_works_cost: number;
  created_at: string;
  updated_at: string;
  // Extended fields for UI
  title?: string;
  description?: string | null;
  category?: string | null;
  status?: 'active' | 'inactive' | 'completed';
  boq_items?: BOQItemWithLibrary[];
  materials_count?: number;
  works_count?: number;
  total_position_cost?: number;
}

const { Title } = Typography;

interface TenderBOQManagerSimpleProps {
  tenderId: string;
}

const TenderBOQManagerSimple: React.FC<TenderBOQManagerSimpleProps> = ({ tenderId }) => {
  console.log('🚀 TenderBOQManagerSimple rendered for tender:', tenderId);

  const [positions, setPositions] = useState<ClientPositionWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [libraryModalVisible, setLibraryModalVisible] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Load positions
  const loadPositions = useCallback(async () => {
    console.log('📡 Loading positions for tender:', tenderId);
    setLoading(true);
    try {
      const result = await clientPositionsApi.getByTender(tenderId);
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ Positions loaded:', result.data?.length);
      
      // Extend positions with UI fields
      const extendedPositions = (result.data || []).map(pos => ({
        ...pos,
        title: pos.work_name, // Use work_name as title
        status: 'active' as const, // Default status
        materials_count: pos.boq_items?.filter(item => item.item_type === 'material').length || 0,
        works_count: pos.boq_items?.filter(item => item.item_type === 'work').length || 0,
        total_position_cost: pos.total_materials_cost + pos.total_works_cost
      }));
      
      setPositions(extendedPositions);
    } catch (error) {
      console.error('❌ Load positions error:', error);
      message.error('Ошибка загрузки позиций');
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Toggle position expansion
  const togglePosition = useCallback((positionId: string) => {
    console.log('🔄 Toggling position:', positionId);
    setExpandedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(positionId)) {
        newSet.delete(positionId);
      } else {
        newSet.add(positionId);
      }
      return newSet;
    });
  }, []);

  // Create new position
  const handleCreatePosition = useCallback(async (values: any) => {
    console.log('🚀 Creating new position:', values);
    setLoading(true);
    try {
      // Get next position number
      const existingPositions = positions || [];
      const nextNumber = existingPositions.length > 0 
        ? Math.max(...existingPositions.map(p => p.position_number)) + 1
        : 1;
        
      const positionData: ClientPositionInsert = {
        tender_id: tenderId,
        position_number: nextNumber,
        item_no: nextNumber.toString(),
        work_name: values.title || 'Новая позиция',
        total_materials_cost: 0,
        total_works_cost: 0
      };

      const result = await clientPositionsApi.create(positionData);
      if (result.error) {
        throw new Error(result.error);
      }

      console.log('✅ Position created successfully');
      
      // Update the created position with additional UI fields
      if (result.data) {
        const extendedPosition = {
          ...result.data,
          title: values.title,
          description: values.description,
          category: values.category,
          status: values.status || 'active'
        };
        // Note: In a real app, you might want to store these in a separate table
        // or as JSON in a metadata field
      }
      
      message.success('Позиция создана');
      setCreateModalVisible(false);
      form.resetFields();
      loadPositions();
    } catch (error) {
      console.error('❌ Create position error:', error);
      message.error('Ошибка создания позиции');
    } finally {
      setLoading(false);
    }
  }, [tenderId, form, loadPositions]);

  // Open library selector for position
  const handleAddItems = useCallback((positionId: string) => {
    console.log('📚 Opening library selector for position:', positionId);
    setSelectedPositionId(positionId);
    setLibraryModalVisible(true);
  }, []);

  // Add selected items to position
  const handleLibrarySelect = useCallback(async (items: BOQItemInsert[]) => {
    console.log('🚀 Adding items to position:', { 
      positionId: selectedPositionId, 
      itemsCount: items.length 
    });

    if (!selectedPositionId) {
      message.error('Позиция не выбрана');
      return;
    }

    setLoading(true);
    try {
      // Get existing items for position to calculate item numbers
      const position = positions.find(p => p.id === selectedPositionId);
      const existingItems = position?.boq_items || [];
      const positionNumber = position?.position_number || 1;
      
      let lastItemNumber = existingItems.length > 0 
        ? Math.max(...existingItems.map(item => item.sub_number || 0))
        : 0;

      // Create BOQ items with proper numbering
      const boqItemsToCreate = items.map((item, index) => {
        lastItemNumber++;
        return {
          ...item,
          tender_id: tenderId,
          client_position_id: selectedPositionId,
          item_number: `${positionNumber}.${lastItemNumber}`,
          sub_number: lastItemNumber,
          sort_order: lastItemNumber
        };
      });

      console.log('📡 Creating BOQ items:', boqItemsToCreate);

      // Create items one by one (or in batch if API supports)
      for (const item of boqItemsToCreate) {
        const result = await boqApi.create(item);
        if (result.error) {
          console.error('❌ Failed to create item:', result.error);
          throw new Error(result.error);
        }
      }

      console.log('✅ All items created successfully');
      message.success(`Добавлено ${items.length} элементов`);
      setLibraryModalVisible(false);
      setSelectedPositionId(null);
      loadPositions();
    } catch (error) {
      console.error('❌ Add items error:', error);
      message.error('Ошибка добавления элементов');
    } finally {
      setLoading(false);
    }
  }, [selectedPositionId, positions, tenderId, loadPositions]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="mb-0">
          Позиции заказчика
        </Title>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadPositions}
            loading={loading}
          >
            Обновить
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Создать позицию
          </Button>
        </Space>
      </div>

      {/* Positions List */}
      {loading && positions.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : positions.length === 0 ? (
        <Empty
          description="Нет позиций заказчика"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Создать первую позицию
          </Button>
        </Empty>
      ) : (
        <div className="space-y-4">
          {positions.map(position => (
            <ClientPositionCardSimple
              key={position.id}
              position={position}
              isExpanded={expandedPositions.has(position.id)}
              onToggle={() => togglePosition(position.id)}
              onAddItems={() => handleAddItems(position.id)}
              onUpdate={loadPositions}
              tenderId={tenderId}
            />
          ))}
        </div>
      )}

      {/* Create Position Modal */}
      <Modal
        title="Создать позицию заказчика"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreatePosition}
        >
          <Form.Item
            name="title"
            label="Название позиции"
            rules={[{ required: true, message: 'Введите название позиции' }]}
          >
            <Input 
              placeholder="Например: Земляные работы" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea
              rows={3}
              placeholder="Подробное описание позиции (опционально)"
            />
          </Form.Item>

          <Form.Item
            name="category"
            label="Категория"
          >
            <Input 
              placeholder="Категория работ (опционально)" 
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Статус"
            initialValue="active"
          >
            <Select size="large">
              <Select.Option value="active">Активна</Select.Option>
              <Select.Option value="inactive">Неактивна</Select.Option>
              <Select.Option value="completed">Завершена</Select.Option>
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}
            >
              Отмена
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
            >
              Создать
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Library Selector Modal */}
      <SimpleLibrarySelector
        visible={libraryModalVisible}
        onClose={() => {
          setLibraryModalVisible(false);
          setSelectedPositionId(null);
        }}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
};

export default TenderBOQManagerSimple;