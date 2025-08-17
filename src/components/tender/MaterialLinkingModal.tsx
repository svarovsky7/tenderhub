import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  Table,
  Input,
  Button,
  Space,
  message,
  InputNumber,
  Tag,
  Typography,
  Form,
  Row,
  Col
} from 'antd';
import { SearchOutlined, PlusOutlined, LinkOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { materialsApi, boqApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import type { 
  Material, 
  BOQItemInsert
} from '../../lib/supabase/types';

const { Title, Text } = Typography;
const { Search } = Input;

interface MaterialLinkingModalProps {
  visible: boolean;
  workId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface LinkableMaterial extends Material {
  consumption_coefficient?: number;
  conversion_coefficient?: number;
  quantity?: number;
}

const MaterialLinkingModal: React.FC<MaterialLinkingModalProps> = ({
  visible,
  workId,
  onClose,
  onSuccess
}) => {
  console.log('🚀 MaterialLinkingModal rendered for work:', workId);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<Map<string, LinkableMaterial>>(new Map());
  const [workInfo, setWorkInfo] = useState<any>(null);
  const [form] = Form.useForm();

  // Load work information
  const loadWorkInfo = useCallback(async () => {
    console.log('📡 Loading work info:', workId);
    try {
      const result = await boqApi.getById(workId);
      if (result.data) {
        setWorkInfo(result.data);
        console.log('✅ Work info loaded:', result.data);
      }
    } catch (error) {
      console.error('❌ Failed to load work info:', error);
    }
  }, [workId]);

  // Load materials
  const loadMaterials = useCallback(async () => {
    console.log('📡 Loading materials...');
    setLoading(true);
    try {
      const result = await materialsApi.getAll(
        { search: searchText },
        { limit: 50 }
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

  useEffect(() => {
    if (visible) {
      loadWorkInfo();
      loadMaterials();
      setSelectedMaterials(new Map());
      setSearchText('');
    }
  }, [visible, loadWorkInfo, loadMaterials]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    console.log('🔍 Searching:', value);
    setSearchText(value);
    setTimeout(() => loadMaterials(), 300);
  }, [loadMaterials]);

  // Toggle material selection
  const handleSelectMaterial = useCallback((material: Material) => {
    console.log('📦 Toggling material:', material.name);
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      if (newMap.has(material.id)) {
        newMap.delete(material.id);
      } else {
        newMap.set(material.id, {
          ...material,
          consumption_coefficient: 1,
          conversion_coefficient: 1,
          quantity: workInfo?.quantity || 1
        });
      }
      return newMap;
    });
  }, [workInfo]);

  // Update coefficient
  const handleUpdateCoefficient = useCallback((
    materialId: string, 
    field: 'consumption_coefficient' | 'conversion_coefficient', 
    value: number
  ) => {
    console.log('🔢 Updating coefficient:', { materialId, field, value });
    setSelectedMaterials(prev => {
      const newMap = new Map(prev);
      const material = newMap.get(materialId);
      if (material) {
        newMap.set(materialId, { ...material, [field]: value });
      }
      return newMap;
    });
  }, []);

  // Save linked materials
  const handleSave = useCallback(async () => {
    console.log('💾 Saving linked materials...');
    if (selectedMaterials.size === 0) {
      message.warning('Выберите хотя бы один материал');
      return;
    }

    setLoading(true);
    try {
      // Create material items and links
      for (const [materialId, material] of selectedMaterials) {
        // Create BOQ item for material
        const materialItem: BOQItemInsert = {
          tender_id: workInfo.tender_id,
          client_position_id: workInfo.client_position_id,
          item_type: 'material',
          description: material.name,
          unit: material.unit,
          quantity: (workInfo.quantity || 1) * (material.consumption_coefficient || 1) * (material.conversion_coefficient || 1),
          unit_rate: 0,
          material_id: materialId,
          library_material_id: materialId,
          item_number: `${workInfo.item_number}.M${Date.now()}`,
          sub_number: workInfo.sub_number + 0.1,
          sort_order: workInfo.sort_order + 0.1
        };

        const itemResult = await boqApi.create(materialItem);
        if (itemResult.error) {
          throw new Error(itemResult.error);
        }

        // Create link between work and material
        const linkData = {
          client_position_id: workInfo.client_position_id,
          work_boq_item_id: workId,
          material_boq_item_id: itemResult.data!.id,
          material_quantity_per_work: material.consumption_coefficient || 1,
          usage_coefficient: material.conversion_coefficient || 1
        };

        const linkResult = await workMaterialLinksApi.create(linkData);
        if (linkResult.error) {
          throw new Error(linkResult.error);
        }
      }

      console.log('✅ Materials linked successfully');
      message.success(`Привязано материалов: ${selectedMaterials.size}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Failed to link materials:', error);
      message.error('Ошибка привязки материалов');
    } finally {
      setLoading(false);
    }
  }, [selectedMaterials, workId, workInfo, onSuccess, onClose]);

  // Table columns
  const columns: ColumnsType<Material> = [
    {
      title: '',
      key: 'select',
      width: 50,
      fixed: 'left',
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
      ellipsis: true,
      render: (text, record) => (
        <div>
          <Text>{text}</Text>
          {record.category && (
            <div>
              <Tag color="blue" className="mt-1">{record.category}</Tag>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center'
    },
    {
      title: 'Коэф. расхода',
      key: 'consumption',
      width: 120,
      render: (_, record) => 
        selectedMaterials.has(record.id) ? (
          <InputNumber
            value={selectedMaterials.get(record.id)?.consumption_coefficient || 1}
            min={0.01}
            precision={2}
            size="small"
            onChange={(val) => val && handleUpdateCoefficient(record.id, 'consumption_coefficient', val)}
          />
        ) : null
    },
    {
      title: 'Коэф. перевода',
      key: 'conversion',
      width: 120,
      render: (_, record) => 
        selectedMaterials.has(record.id) ? (
          <InputNumber
            value={selectedMaterials.get(record.id)?.conversion_coefficient || 1}
            min={0.01}
            precision={2}
            size="small"
            onChange={(val) => val && handleUpdateCoefficient(record.id, 'conversion_coefficient', val)}
          />
        ) : null
    },
    {
      title: 'Итоговое кол-во',
      key: 'total_quantity',
      width: 120,
      align: 'right',
      render: (_, record) => {
        if (!selectedMaterials.has(record.id)) return null;
        const material = selectedMaterials.get(record.id)!;
        const workQuantity = workInfo?.quantity || 1;
        const total = workQuantity * (material.consumption_coefficient || 1) * (material.conversion_coefficient || 1);
        return (
          <Text strong>
            {total.toFixed(2)} {record.unit}
          </Text>
        );
      }
    }
  ];

  return (
    <Modal
      title={
        <div>
          <LinkOutlined className="mr-2" />
          Привязка материалов к работе
        </div>
      }
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
          onClick={handleSave}
          loading={loading}
          disabled={selectedMaterials.size === 0}
        >
          Привязать выбранные ({selectedMaterials.size})
        </Button>
      ]}
      destroyOnClose
    >
      <div className="space-y-4">
        {/* Work Info */}
        {workInfo && (
          <div className="p-3 bg-blue-50 rounded">
            <Row gutter={16}>
              <Col span={16}>
                <Text strong>Работа:</Text> {workInfo.description}
              </Col>
              <Col span={4}>
                <Text strong>Количество:</Text> {workInfo.quantity} {workInfo.unit}
              </Col>
              <Col span={4}>
                <Text strong>№:</Text> {workInfo.item_number}
              </Col>
            </Row>
          </div>
        )}

        {/* Search */}
        <Search
          placeholder="Поиск материалов по наименованию..."
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          onSearch={handleSearch}
        />

        {/* Info */}
        <div className="p-2 bg-gray-50 rounded">
          <Text type="secondary">
            Выберите материалы и укажите коэффициенты. 
            Итоговое количество = Кол-во работы × Коэф. расхода × Коэф. перевода
          </Text>
        </div>

        {/* Materials Table */}
        <Table
          columns={columns}
          dataSource={materials}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: false
          }}
          scroll={{ y: 400, x: 900 }}
          size="small"
        />
      </div>
    </Modal>
  );
};

export default MaterialLinkingModal;