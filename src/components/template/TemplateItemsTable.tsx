import React, { useMemo } from 'react';
import { Table, InputNumber, Select, Button, Space, Tag, Tooltip, Checkbox } from 'antd';
import { DeleteOutlined, LinkOutlined, ToolOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './TemplateItemsTable.css';

export interface TemplateItem {
  key: string;
  type: 'work' | 'sub_work' | 'material' | 'sub_material';
  id: string;
  name: string;
  description?: string;
  unit: string;
  conversion_coefficient: number;
  is_linked_to_work: boolean;
  linked_work_id?: string;
  linked_work_name?: string;
  consumption_coefficient?: number;
  unit_rate?: number;
  currency_type?: string;
  category?: string;
  material_type?: 'main' | 'auxiliary';
}

interface TemplateItemsTableProps {
  items: TemplateItem[];
  onUpdate: (key: string, updates: Partial<TemplateItem>) => void;
  onDelete: (key: string) => void;
}

const TemplateItemsTable: React.FC<TemplateItemsTableProps> = ({
  items,
  onUpdate,
  onDelete
}) => {
  console.log('🚀 TemplateItemsTable render with items:', items.length);

  // Get available works for linking materials
  const availableWorks = useMemo(() => {
    const works = items.filter(item =>
      item.type === 'work' || item.type === 'sub_work'
    );
    console.log('📋 Available works for linking:', works.length, works.map(w => w.name));
    return works;
  }, [items]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'work':
        return <ToolOutlined style={{ color: '#1890ff' }} />;
      case 'sub_work':
        return <ToolOutlined style={{ color: '#52c41a' }} />;
      case 'material':
        return <AppstoreOutlined style={{ color: '#fa8c16' }} />;
      case 'sub_material':
        return <AppstoreOutlined style={{ color: '#faad14' }} />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string, record: TemplateItem) => {
    switch (type) {
      case 'work':
        return (
          <div className="flex flex-col gap-0.5 items-center">
            <Tag color="orange">Работа</Tag>
          </div>
        );
      case 'sub_work':
        return (
          <div className="flex flex-col gap-0.5 items-center">
            <Tag color="purple">Суб-раб</Tag>
          </div>
        );
      case 'material':
        const isMainMaterial = record.material_type !== 'auxiliary';
        return (
          <div className="flex flex-col gap-0.5 items-center">
            <Tag color="blue">Материал</Tag>
            <Tag
              color={isMainMaterial ? "cyan" : "gold"}
              style={{ fontSize: '10px', padding: '0 4px', height: '18px', lineHeight: '18px' }}
            >
              {isMainMaterial ? '📦 Основной' : '🔧 Вспомог.'}
            </Tag>
          </div>
        );
      case 'sub_material':
        const isMainSubMaterial = record.material_type !== 'auxiliary';
        return (
          <div className="flex flex-col gap-0.5 items-center">
            <Tag color="green">Суб-мат</Tag>
            <Tag
              color={isMainSubMaterial ? "cyan" : "gold"}
              style={{ fontSize: '10px', padding: '0 4px', height: '18px', lineHeight: '18px' }}
            >
              {isMainSubMaterial ? '📦 Основной' : '🔧 Вспомог.'}
            </Tag>
          </div>
        );
      default:
        return type;
    }
  };

  const columns: ColumnsType<TemplateItem> = useMemo(() => [
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string, record) => (
        <Space>
          {getTypeIcon(type)}
          {getTypeLabel(type, record)}
        </Space>
      )
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string, record) => (
        <Tooltip title={record.description || name}>
          <span style={{
            fontWeight: record.type === 'work' || record.type === 'sub_work' ? 600 : 400,
            paddingLeft: record.is_linked_to_work && (record.type === 'material' || record.type === 'sub_material') ? 20 : 0
          }}>
            {record.is_linked_to_work && <LinkOutlined style={{ marginRight: 8, color: '#52c41a' }} />}
            {name}
          </span>
        </Tooltip>
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
      title: 'Коэф. перевода',
      dataIndex: 'conversion_coefficient',
      key: 'conversion_coefficient',
      width: 140,
      align: 'center',
      render: (value: number, record) => {
        // Only materials have conversion coefficient
        if (record.type === 'material' || record.type === 'sub_material') {
          return (
            <InputNumber
              value={value}
              min={0.0001}
              step={0.1}
              precision={4}
              size="small"
              onChange={(val) => val && onUpdate(record.key, { conversion_coefficient: val })}
              style={{ width: '100%' }}
            />
          );
        }
        return '-';
      }
    },
    {
      title: 'Привязка к работе',
      dataIndex: 'is_linked_to_work',
      key: 'is_linked_to_work',
      width: 200,
      align: 'center',
      render: (isLinked: boolean, record) => {
        // Only materials can be linked to works
        if (record.type === 'material' || record.type === 'sub_material') {
          if (availableWorks.length === 0) {
            return <span style={{ color: '#999' }}>Нет доступных работ</span>;
          }

          return (
            <Space>
              <Checkbox
                checked={isLinked}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked && availableWorks.length > 0) {
                    // Auto-link to first available work
                    onUpdate(record.key, {
                      is_linked_to_work: true,
                      linked_work_id: availableWorks[0].id,
                      linked_work_name: availableWorks[0].name
                    });
                  } else {
                    onUpdate(record.key, {
                      is_linked_to_work: false,
                      linked_work_id: undefined,
                      linked_work_name: undefined
                    });
                  }
                }}
              />
              {isLinked && (
                <Select
                  size="small"
                  value={record.linked_work_id}
                  onChange={(workId) => {
                    const work = availableWorks.find(w => w.id === workId);
                    onUpdate(record.key, {
                      linked_work_id: workId,
                      linked_work_name: work?.name
                    });
                  }}
                  style={{ width: 150 }}
                  placeholder="Выберите работу"
                >
                  {availableWorks.map(work => (
                    <Select.Option key={work.id} value={work.id}>
                      {work.name}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </Space>
          );
        }
        return '-';
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Удалить">
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record.key)}
          />
        </Tooltip>
      )
    }
  ], [availableWorks, onUpdate, onDelete]);

  // Sort items: each work followed by its linked materials, then unlinked materials
  const sortedItems = (() => {
    const result: TemplateItem[] = [];
    const processedMaterials = new Set<string>();

    // First, add each work with its linked materials
    items.forEach(item => {
      if (item.type === 'work' || item.type === 'sub_work') {
        // Add the work
        result.push(item);

        // Find and add all materials linked to this work
        items.forEach(material => {
          if ((material.type === 'material' || material.type === 'sub_material') &&
              material.is_linked_to_work &&
              material.linked_work_id === item.id) {
            result.push(material);
            processedMaterials.add(material.key);
          }
        });
      }
    });

    // Then add all unlinked materials
    items.forEach(item => {
      if ((item.type === 'material' || item.type === 'sub_material') &&
          !processedMaterials.has(item.key) &&
          !item.is_linked_to_work) {
        result.push(item);
      }
    });

    return result;
  })();

  return (
    <Table
      columns={columns}
      dataSource={sortedItems}
      pagination={false}
      size="small"
      rowClassName={(record) => {
        // Работы - оранжевый фон
        if (record.type === 'work') {
          return 'bg-orange-50 template-work-row';
        }
        // Суб-работы - фиолетовый фон
        if (record.type === 'sub_work') {
          return 'bg-purple-50 template-sub-work-row';
        }
        // Материалы - голубой фон
        if (record.type === 'material') {
          if (record.material_type === 'auxiliary') {
            return 'bg-sky-50 template-material-aux-row';
          }
          return 'bg-blue-50 template-material-row';
        }
        // Суб-материалы - зеленый фон
        if (record.type === 'sub_material') {
          if (record.material_type === 'auxiliary') {
            return 'bg-emerald-50 template-sub-material-aux-row';
          }
          return 'bg-green-50 template-sub-material-row';
        }
        return '';
      }}
    />
  );
};

export default TemplateItemsTable;