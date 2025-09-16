import React, { useState, useMemo } from 'react';
import { Table, Tag, Button, Empty, Form, Input, Select, Space, message, Modal } from 'antd';
import { DeleteOutlined, EditOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsWithNamesApi } from '../../lib/supabase/api/materials-with-names';
import { worksWithNamesApi } from '../../lib/supabase/api/works-with-names';
import type { ColumnsType } from 'antd/es/table';

interface NamesListProps {
  type: 'material' | 'work';
}

interface NameItem {
  id: string;
  name: string;
  unit?: string;
  material_count?: number;
  work_count?: number;
}

const NamesList: React.FC<NamesListProps> = ({ type }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: [type === 'material' ? 'material-names-list' : 'work-names-list'],
    queryFn: async () => {
      const api = type === 'material' ? materialsWithNamesApi : worksWithNamesApi;
      const result = await api.getAllNames();
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Мутация для обновления наименования
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, unit }: { id: string; name: string; unit?: string }) => {
      const api = type === 'material' ? materialsWithNamesApi : worksWithNamesApi;
      const result = await api.updateName(id, name, unit);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      message.success(`Наименование ${type === 'material' ? 'материала' : 'работы'} успешно обновлено`);
      queryClient.invalidateQueries({
        queryKey: [type === 'material' ? 'material-names-list' : 'work-names-list']
      });
      queryClient.invalidateQueries({
        queryKey: [type === 'material' ? 'material-names' : 'work-names']
      });
      setEditingId(null);
      form.resetFields();
    },
    onError: (error: any) => {
      console.error('❌ Ошибка обновления наименования:', error);
      message.error(error.message || 'Ошибка при обновлении наименования');
    },
  });

  // Мутация для удаления наименования
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const api = type === 'material' ? materialsWithNamesApi : worksWithNamesApi;
      const result = await api.deleteName(id);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      message.success(`Наименование ${type === 'material' ? 'материала' : 'работы'} успешно удалено`);
      queryClient.invalidateQueries({
        queryKey: [type === 'material' ? 'material-names-list' : 'work-names-list']
      });
      queryClient.invalidateQueries({
        queryKey: [type === 'material' ? 'material-names' : 'work-names']
      });
    },
    onError: (error: any) => {
      console.error('❌ Ошибка удаления наименования:', error);
      message.error(error.message || 'Ошибка при удалении наименования');
    },
  });

  const handleEdit = (record: NameItem) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      unit: record.unit,
    });
  };

  const handleSave = async (id: string) => {
    try {
      const values = await form.validateFields();
      await updateMutation.mutateAsync({
        id,
        name: values.name.trim(),
        unit: values.unit,
      });
    } catch (error) {
      console.error('❌ Validation error:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    form.resetFields();
  };

  const handleDelete = (record: NameItem) => {
    const itemType = type === 'material' ? 'материала' : 'работы';
    const count = type === 'material' ? record.material_count : record.work_count;

    Modal.confirm({
      title: 'Подтверждение удаления',
      content: count && count > 0
        ? `Вы уверены, что хотите удалить наименование "${record.name}"? Это наименование используется в ${count} ${itemType === 'материала' ? 'материалах' : 'работах'}.`
        : `Вы уверены, что хотите удалить наименование "${record.name}"?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  // Фильтрация данных по поисковому запросу
  const filteredData = useMemo(() => {
    if (!data) return [];

    if (!searchText) return data;

    const searchLower = searchText.toLowerCase();
    return data.filter(item =>
      item.name.toLowerCase().includes(searchLower) ||
      (item.unit && item.unit.toLowerCase().includes(searchLower))
    );
  }, [data, searchText]);

  // Получаем опции единиц измерения в зависимости от типа
  const getUnitOptions = () => {
    if (type === 'material') {
      return [
        { label: 'шт', value: 'шт' },
        { label: 'м', value: 'м' },
        { label: 'м²', value: 'м2' },
        { label: 'м³', value: 'м3' },
        { label: 'кг', value: 'кг' },
        { label: 'т', value: 'т' },
        { label: 'л', value: 'л' },
        { label: 'комплект', value: 'комплект' },
      ];
    } else {
      return [
        { label: 'м²', value: 'м2' },
        { label: 'м', value: 'м' },
        { label: 'м³', value: 'м3' },
        { label: 'шт', value: 'шт' },
        { label: 'кг', value: 'кг' },
        { label: 'т', value: 'т' },
        { label: 'час', value: 'час' },
        { label: 'смена', value: 'смена' },
        { label: 'комплект', value: 'комплект' },
      ];
    }
  };

  const columns: ColumnsType<NameItem> = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: NameItem) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="name"
              style={{ margin: 0 }}
              rules={[{ required: true, message: 'Введите наименование' }]}
            >
              <Input placeholder="Введите наименование" />
            </Form.Item>
          );
        }
        return text;
      },
    },
    {
      title: 'Единица измерения',
      dataIndex: 'unit',
      key: 'unit',
      width: 150,
      align: 'center',
      render: (unit: string, record: NameItem) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="unit"
              style={{ margin: 0 }}
              rules={[{ required: true, message: 'Выберите единицу' }]}
            >
              <Select
                placeholder="Выберите единицу"
                options={getUnitOptions()}
                size="small"
              />
            </Form.Item>
          );
        }
        return unit || '-';
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record: NameItem) => {
        if (editingId === record.id) {
          return (
            <Space size="small">
              <Button
                icon={<SaveOutlined />}
                size="small"
                type="primary"
                loading={updateMutation.isPending}
                onClick={() => handleSave(record.id)}
              />
              <Button
                size="small"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                Отмена
              </Button>
            </Space>
          );
        }
        return (
          <Space size="small">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
              disabled={!!editingId}
            />
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={() => handleDelete(record)}
              disabled={!!editingId}
              loading={deleteMutation.isPending}
            />
          </Space>
        );
      },
    },
  ];

  if (!data || data.length === 0) {
    return (
      <Empty
        description={`Нет созданных ${type === 'material' ? 'материалов' : 'работ'}`}
        style={{ marginTop: 24 }}
      />
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      border: '1px solid rgba(30, 58, 138, 0.08)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>
        {`
          .names-table .ant-table {
            font-size: 14px;
          }
          .names-table .ant-table-thead > tr > th {
            background: linear-gradient(135deg, rgba(30, 58, 138, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%);
            font-weight: 600;
            color: #1e3a8a;
            border-bottom: 2px solid rgba(30, 58, 138, 0.1);
          }
          .names-table .ant-table-tbody > tr {
            transition: all 0.3s ease;
          }
          .names-table .ant-table-tbody > tr:nth-child(odd) {
            background: linear-gradient(90deg, rgba(30, 58, 138, 0.02) 0%, rgba(5, 150, 105, 0.02) 100%);
          }
          .names-table .ant-table-tbody > tr:nth-child(even) {
            background: linear-gradient(90deg, rgba(5, 150, 105, 0.02) 0%, rgba(13, 148, 136, 0.02) 100%);
          }
          .names-table .ant-table-tbody > tr:hover > td {
            background: linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%) !important;
            transform: translateX(2px);
          }
          .names-table .ant-pagination {
            margin-top: 16px;
          }
          .gradient-border-animation {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #1e3a8a, #059669, #0d9488, #1e3a8a);
            background-size: 200% 100%;
            animation: gradient-shift 4s ease infinite;
          }
          @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
          .search-container {
            margin-bottom: 16px;
            padding: 12px;
            background: linear-gradient(135deg, rgba(30, 58, 138, 0.02) 0%, rgba(5, 150, 105, 0.02) 100%);
            border-radius: 8px;
            border: 1px solid rgba(30, 58, 138, 0.06);
          }
        `}
      </style>
      <div className="gradient-border-animation" />

      {/* Поле поиска */}
      <div className="search-container">
        <Input
          placeholder={`Поиск ${type === 'material' ? 'материалов' : 'работ'} по наименованию или единице измерения`}
          prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="large"
          style={{
            borderRadius: '8px',
            fontSize: '15px',
          }}
        />
        {searchText && (
          <div style={{ marginTop: '8px', color: '#8c8c8c', fontSize: '14px' }}>
            Найдено: {filteredData.length} из {data?.length || 0}
          </div>
        )}
      </div>

      <Form form={form} component={false}>
        <Table
          className="names-table"
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading || updateMutation.isPending}
          size="middle"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
            style: {
              marginTop: '16px'
            }
          }}
          style={{
            marginTop: '8px'
          }}
        />
      </Form>
    </div>
  );
};

export default NamesList;