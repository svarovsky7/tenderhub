import React, { useState } from 'react';
import { Typography, Card, Table, Button, Space, Input, message, Tag, Tooltip, Statistic, Row, Col, Form, Select, InputNumber, AutoComplete, Modal, ConfigProvider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, FileExcelOutlined, SaveOutlined, AppstoreAddOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsWithNamesApi } from '../lib/supabase/api/materials-with-names';
import SimpleNameForm from '../components/libraries/SimpleNameForm';
import NamesList from '../components/libraries/NamesList';
import type { Material } from '../lib/supabase/types';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;

const MaterialsPage: React.FC = () => {
  const [mode, setMode] = useState<'create' | 'configure'>('create');
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [nameOptions, setNameOptions] = useState<Array<{ value: string; label: string; unit?: string }>>([]);
  const [isUnitLocked, setIsUnitLocked] = useState(false);

  // Загрузка списка материалов для режима configure
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['materials', searchText, currentPage, pageSize],
    queryFn: async () => {
      const result = await materialsWithNamesApi.getAll(
        searchText ? { search: searchText } : {},
        { page: currentPage, limit: pageSize }
      );
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    enabled: mode === 'configure',
    staleTime: 5 * 60 * 1000,
  });

  // Загрузка существующих наименований для автодополнения
  const { data: existingNames } = useQuery({
    queryKey: ['material-names'],
    queryFn: async () => {
      const result = await materialsWithNamesApi.getNames();
      return result.data || [];
    },
    enabled: mode === 'configure',
    staleTime: 5 * 60 * 1000,
  });

  // Обновляем опции автодополнения
  React.useEffect(() => {
    if (existingNames) {
      setNameOptions(existingNames.map(n => ({
        value: n.name,
        label: n.name,
        unit: n.unit // Добавляем unit для автозаполнения
      })));
    }
  }, [existingNames]);

  // Мутация для создания материала
  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const result = await materialsWithNamesApi.create(values);
      if (result.error) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Ошибка при создании материала');
      }
      if (!result.data) {
        throw new Error('Не удалось получить данные созданного материала');
      }
      return result.data;
    },
    onSuccess: () => {
      message.success('Материал успешно создан');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-names'] });
      setEditingMaterialId(null);
      setIsAdding(false);
      setIsUnitLocked(false);
      form.resetFields();
    },
    onError: (error: any) => {
      console.error('❌ Ошибка создания материала:', error);
      const errorMessage = error.message || 'Ошибка при создании материала';
      message.error(errorMessage);
      // Очищаем только поле наименования, не сбрасываем всю форму
      form.setFieldValue('name', '');
      setIsUnitLocked(false);
      // Обновляем список на случай если запись все же была создана
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  // Мутация для обновления материала
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const result = await materialsWithNamesApi.update(id, values);
      if (result.error) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Ошибка при обновлении материала');
      }
      if (!result.data) {
        throw new Error('Не удалось получить данные обновленного материала');
      }
      return result.data;
    },
    onSuccess: () => {
      message.success('Материал успешно обновлен');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-names'] });
      setEditingMaterialId(null);
      form.resetFields();
    },
    onError: (error) => {
      console.error('❌ Ошибка обновления материала:', error);
      message.error('Ошибка при обновлении материала');
    },
  });

  // Мутация для удаления материала
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await materialsWithNamesApi.delete(id);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      message.success('Материал успешно удален');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-names-list'] });
    },
    onError: (error) => {
      console.error('❌ Ошибка удаления материала:', error);
      message.error('Ошибка при удалении материала');
    },
  });

  const handleDelete = (material: Material) => {
    Modal.confirm({
      title: 'Подтверждение удаления',
      content: `Вы уверены, что хотите удалить материал "${material.name}"?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(material.id),
    });
  };

  const handleEdit = (material: Material) => {
    setEditingMaterialId(material.id);
    setIsUnitLocked(true); // Блокируем при редактировании существующего
    form.setFieldsValue({
      name: material.name,
      unit: material.unit,
      item_type: material.item_type || 'material',
      material_type: material.material_type || 'основной',
      consumption_coefficient: material.consumption_coefficient || 1,
      unit_rate: material.unit_rate || 0,
      currency_type: material.currency_type || 'RUB',
      delivery_price_type: material.delivery_price_type || 'included',
      delivery_amount: material.delivery_amount || 0,
      quote_link: material.quote_link,
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingMaterialId('new');
    setIsUnitLocked(false); // Разблокируем при добавлении нового
    form.setFieldsValue({
      unit: 'шт',
      currency_type: 'RUB',
      delivery_price_type: 'included',
      consumption_coefficient: 1,
      unit_rate: 0,
      delivery_amount: 0,
      item_type: 'material',
      material_type: 'основной',
    });
  };

  const handleSaveInlineEdit = async (values: any) => {
    console.log('🚀 Сохранение inline формы:', values);

    // Ensure consumption coefficient is at least 1
    if (values.consumption_coefficient && values.consumption_coefficient < 1) {
      values.consumption_coefficient = 1;
    }

    if (editingMaterialId === 'new') {
      await createMutation.mutateAsync(values);
    } else if (editingMaterialId) {
      await updateMutation.mutateAsync({ id: editingMaterialId, ...values });
    }
  };

  const handleCancelInlineEdit = () => {
    setEditingMaterialId(null);
    setIsAdding(false);
    setIsUnitLocked(false); // Сбрасываем блокировку
    form.resetFields();
  };

  const handleSearchName = (searchText: string) => {
    if (!searchText) {
      setNameOptions(existingNames?.map(n => ({
        value: n.name,
        label: n.name,
        unit: n.unit
      })) || []);
      return;
    }

    const filtered = existingNames?.filter(n =>
      n.name.toLowerCase().includes(searchText.toLowerCase())
    ) || [];

    setNameOptions(filtered.map(n => ({
      value: n.name,
      label: n.name,
      unit: n.unit
    })));
  };

  // Обработка выбора наименования для автозаполнения unit
  const handleSelectName = (value: string, option: any) => {
    if (option && option.unit) {
      form.setFieldValue('unit', option.unit);
      setIsUnitLocked(true); // Блокируем поле после выбора
    }
  };

  // Обработка изменения наименования
  const handleChangeName = (value: string) => {
    if (!value) {
      setIsUnitLocked(false); // Разблокируем при очистке
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'CNY': return '¥';
      default: return '₽';
    }
  };

  const getDeliveryTypeLabel = (type: string) => {
    switch (type) {
      case 'included': return 'Включено';
      case 'not_included': return 'Не включено (+3%)';
      case 'amount': return 'Фиксированная';
      default: return type;
    }
  };

  const columns: ColumnsType<Material> = [
    {
      title: 'Тип',
      key: 'type_combined',
      width: 85,
      align: 'center',
      render: (_, record) => {
        const isMaterial = record.item_type === 'material' || !record.item_type;
        const isMain = record.material_type === 'основной' || record.material_type === 'main';

        // Иконка и цвет для типа элемента
        const itemColor = isMaterial ? 'blue' : 'green';
        const itemLabel = isMaterial ? 'Материал' : 'Суб-мат';

        // Цвет для типа материала
        const typeColor = isMain ? 'default' : 'warning';
        const typeLabel = isMain ? 'Основной' : 'Вспомог.';

        const tagStyle = {
          padding: '0 4px',
          fontSize: '11px',
          lineHeight: '18px',
          height: '18px',
          display: 'inline-flex',
          alignItems: 'center'
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
            <Tag color={itemColor} style={tagStyle}>
              {itemLabel}
            </Tag>
            <Tag color={typeColor} style={tagStyle}>
              {typeLabel}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      width: 345,
      align: 'left',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string) => text,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      align: 'center',
    },
    {
      title: 'Коэфф. расхода',
      dataIndex: 'consumption_coefficient',
      key: 'consumption_coefficient',
      width: 120,
      align: 'center',
      render: (value) => value ? value.toFixed(2) : '1.00',
    },
    {
      title: 'Цена',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 120,
      align: 'center',
      render: (rate, record) => {
        if (!rate) return '-';
        const symbol = getCurrencySymbol(record.currency_type || 'RUB');
        return `${rate.toFixed(2)} ${symbol}`;
      },
    },
    {
      title: 'Валюта',
      dataIndex: 'currency_type',
      key: 'currency_type',
      width: 80,
      align: 'center',
      render: (type) => type || 'RUB',
    },
    {
      title: 'Доставка',
      dataIndex: 'delivery_price_type',
      key: 'delivery_price_type',
      width: 140,
      align: 'center',
      render: (type, record) => {
        if (!type) return 'Включена';
        switch (type) {
          case 'included':
            return 'Включена';
          case 'not_included':
            return 'Не включена';
          case 'amount':
            return `Сумма: ${record.delivery_amount || 0} ₽`;
          default:
            return type;
        }
      },
    },
    {
      title: 'Ссылка на КП',
      dataIndex: 'quote_link',
      key: 'quote_link',
      width: 150,
      align: 'center',
      render: (link) => link ? (
        <a href={link} target="_blank" rel="noopener noreferrer">
          Ссылка
        </a>
      ) : '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  // Данные для таблицы с новой строкой при добавлении
  const tableData = [
    ...(isAdding ? [{
      id: 'new',
      name: '',
      unit: 'шт',
      item_type: 'material',
      material_type: 'основной',
      unit_rate: 0,
      currency_type: 'RUB',
      delivery_price_type: 'included',
      delivery_amount: 0,
      consumption_coefficient: 1,
      quote_link: null,
    } as Material] : []),
    ...(data?.data || [])
  ];

  const deliveryType = Form.useWatch('delivery_price_type', form);
  const selectedCurrency = Form.useWatch('currency_type', form) || 'RUB';

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 8,
          colorPrimary: '#1890ff'
        }
      }}
    >
      <div className="w-full min-h-full bg-gray-50">
        <style>
          {`
            .materials-header {
              background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
              border-radius: 16px;
              margin-bottom: 24px;
              padding: 32px;
              color: white;
              position: relative;
              overflow: hidden;
            }
            .materials-header::before {
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
            .mode-action-buttons {
              display: flex;
              gap: 12px;
              align-items: center;
              margin-top: 20px;
            }
            .mode-action-btn {
              height: 42px;
              padding: 0 24px;
              border-radius: 8px;
              font-size: 15px;
              font-weight: 500;
              transition: all 0.3s ease;
              border: 1px solid rgba(255, 255, 255, 0.3);
            }
            .mode-action-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .mode-action-btn-active {
              background: rgba(255, 255, 255, 0.95) !important;
              color: #1890ff !important;
              font-weight: 600;
            }
            .mode-action-btn-inactive {
              background: rgba(255, 255, 255, 0.2);
              color: white;
            }
            .row-type-material {
              background-color: rgba(33, 150, 243, 0.1) !important;
            }
            .row-type-material:hover td {
              background-color: rgba(33, 150, 243, 0.15) !important;
            }
            .row-type-auxiliary {
              background-color: rgba(139, 195, 74, 0.1) !important;
            }
            .row-type-auxiliary:hover td {
              background-color: rgba(139, 195, 74, 0.15) !important;
            }
            .row-new-hidden > td {
              padding: 0 !important;
              border: none !important;
              height: 0 !important;
              visibility: hidden !important;
            }
            .row-new-hidden {
              height: 0 !important;
            }
          `}
        </style>

        {/* Header */}
        <div className="p-6">
          <div className="materials-header">
            <div className="relative z-10">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <AppstoreAddOutlined style={{ fontSize: 32, color: 'white' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white', fontSize: 28 }}>
                    Библиотека материалов
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                    Управляйте наименованиями и базовыми данными материалов
                  </Text>
                </div>
              </div>
              <div className="mode-action-buttons">
                <Button
                  className={`mode-action-btn ${mode === 'create' ? 'mode-action-btn-active' : 'mode-action-btn-inactive'}`}
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => setMode('create')}
                >
                  Создать материал
                </Button>
                <Button
                  className={`mode-action-btn ${mode === 'configure' ? 'mode-action-btn-active' : 'mode-action-btn-inactive'}`}
                  size="large"
                  icon={<SettingOutlined />}
                  onClick={() => setMode('configure')}
                >
                  Задать базовые данные
                </Button>
              </div>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="p-6 max-w-none">
        {mode === 'create' ? (
          <div>
            {/* Simple Name Form */}
            <Card style={{ marginBottom: 24 }}>
              <SimpleNameForm type="material" />
            </Card>

            {/* Names List */}
            <Card title="Список наименований материалов">
              <NamesList type="material" />
            </Card>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(30, 58, 138, 0.08)',
            }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Всего материалов"
                    value={data?.pagination?.total || 0}
                    prefix={<FileExcelOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="На текущей странице"
                    value={data?.data?.length || 0}
                    prefix={<FileExcelOutlined />}
                  />
                </Col>
              </Row>
            </div>

            {/* Materials List with expandable inline form */}
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
                  .configure-table .ant-table-thead > tr > th {
                    background: linear-gradient(135deg, rgba(30, 58, 138, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%);
                    font-weight: 600;
                    color: #1e3a8a;
                    border-bottom: 2px solid rgba(30, 58, 138, 0.1);
                  }
                  .configure-table .ant-table-tbody > tr {
                    transition: all 0.3s ease;
                  }
                  .configure-table .ant-table-tbody > tr:nth-child(odd) {
                    background: linear-gradient(90deg, rgba(30, 58, 138, 0.02) 0%, rgba(5, 150, 105, 0.02) 100%);
                  }
                  .configure-table .ant-table-tbody > tr:nth-child(even) {
                    background: linear-gradient(90deg, rgba(5, 150, 105, 0.02) 0%, rgba(13, 148, 136, 0.02) 100%);
                  }
                  .configure-table .ant-table-tbody > tr:hover > td {
                    background: linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%) !important;
                    transform: translateX(2px);
                  }
                  .gradient-border-animation-configure {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, #1e3a8a, #059669, #0d9488, #1e3a8a);
                    background-size: 200% 100%;
                    animation: gradient-shift 4s ease infinite;
                  }
                `}
              </style>
              <div className="gradient-border-animation-configure" />

              {/* Поле поиска */}
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.02) 0%, rgba(5, 150, 105, 0.02) 100%)',
                borderRadius: '8px',
                border: '1px solid rgba(30, 58, 138, 0.06)',
              }}>
                <div className="flex justify-between items-center">
                  <Input
                    placeholder="Поиск материалов по наименованию..."
                    prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    size="large"
                    style={{
                      borderRadius: '8px',
                      fontSize: '15px',
                      width: '100%',
                      maxWidth: '500px',
                    }}
                  />
                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => refetch()}
                    >
                      Обновить
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAdd}
                    >
                      Добавить материал
                    </Button>
                  </Space>
                </div>
                {searchText && (
                  <div style={{ marginTop: '8px', color: '#8c8c8c', fontSize: '14px' }}>
                    Найдено: {data?.data?.length || 0} из {data?.pagination?.total || 0}
                  </div>
                )}
              </div>

              <Table
                  columns={columns}
                  dataSource={tableData}
                  rowKey="id"
                  loading={isLoading}
                  rowClassName={(record) => {
                    if (record.id === 'new') return 'row-new-hidden';
                    return record.item_type === 'sub_material' ? 'row-type-auxiliary' : 'row-type-material';
                  }}
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: data?.pagination?.total || 0,
                    showSizeChanger: true,
                    showTotal: (total) => `Всего: ${total}`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    onChange: (page, size) => {
                      setCurrentPage(page);
                      setPageSize(size);
                    },
                  }}
                  expandable={{
                    expandedRowKeys: editingMaterialId && editingMaterialId !== 'new' ? [editingMaterialId] : isAdding ? ['new'] : [],
                    expandedRowRender: (record) => {
                      if ((editingMaterialId === record.id) || (isAdding && record.id === 'new')) {
                        const isNewRecord = record.id === 'new';
                        const currencySymbol = getCurrencySymbol(selectedCurrency);
                        const itemType = form.getFieldValue('item_type') || record.item_type || 'material';

                        // Цветовые схемы для разных типов
                        const colorScheme = {
                          'material': { bg: 'rgba(33, 150, 243, 0.05)', border: '#2196f3' }, // голубой
                          'sub_material': { bg: 'rgba(139, 195, 74, 0.05)', border: '#8bc34a' } // зеленый
                        };

                        const colors = colorScheme[itemType] || colorScheme['material'];

                        return (
                          <div style={{
                            padding: '16px',
                            backgroundColor: colors.bg,
                            border: `2px solid ${colors.border}`,
                            borderRadius: '8px',
                            margin: '8px 0'
                          }}>
                            <Form
                              form={form}
                              layout="vertical"
                              onFinish={handleSaveInlineEdit}
                              size="small"
                            >
                              <Row gutter={[8, 8]}>
                                <Col span={2}>
                                  <Form.Item
                                    name="item_type"
                                    label="Тип элемента"
                                    rules={[{ required: true, message: 'Выберите тип' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Select size="small">
                                      <Select.Option value="material">Материал</Select.Option>
                                      <Select.Option value="sub_material">Суб-мат</Select.Option>
                                    </Select>
                                  </Form.Item>
                                </Col>
                                <Col span={3} style={{ paddingLeft: 0 }}>
                                  <Form.Item
                                    name="material_type"
                                    label="Тип материала"
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Select size="small">
                                      <Select.Option value="основной">Основной</Select.Option>
                                      <Select.Option value="вспомогательный">Вспомогательный</Select.Option>
                                    </Select>
                                  </Form.Item>
                                </Col>
                                <Col span={6}>
                                  <Form.Item
                                    name="name"
                                    label="Наименование"
                                    rules={[{ required: true, message: 'Введите наименование' }]}
                                  >
                                    <AutoComplete
                                      options={nameOptions}
                                      onSearch={handleSearchName}
                                      onSelect={handleSelectName}
                                      onChange={handleChangeName}
                                      placeholder="Введите наименование материала"
                                      allowClear
                                    />
                                  </Form.Item>
                                </Col>
                                <Col span={2}>
                                  <Form.Item
                                    name="unit"
                                    label="Ед."
                                    rules={[{ required: true, message: 'Выберите единицу' }]}
                                  >
                                    <Select
                                      disabled={isUnitLocked}
                                      size="small"
                                      suffixIcon={isUnitLocked ? null : undefined}
                                      style={isUnitLocked ? { cursor: 'not-allowed' } : undefined}
                                    >
                                      <Select.Option value="шт">шт</Select.Option>
                                      <Select.Option value="м">м</Select.Option>
                                      <Select.Option value="м2">м²</Select.Option>
                                      <Select.Option value="м3">м³</Select.Option>
                                      <Select.Option value="кг">кг</Select.Option>
                                      <Select.Option value="т">т</Select.Option>
                                      <Select.Option value="л">л</Select.Option>
                                      <Select.Option value="комплект">компл</Select.Option>
                                    </Select>
                                  </Form.Item>
                                </Col>
                                <Col span={2}>
                                  <Form.Item
                                    name="consumption_coefficient"
                                    label="К. расх"
                                    rules={[{ type: 'number', min: 1, message: 'Минимум 1' }]}
                                  >
                                    <InputNumber
                                      min={1}
                                      step={0.01}
                                      placeholder="1.00"
                                      className="w-full"
                                      size="small"
                                    />
                                  </Form.Item>
                                </Col>
                                <Col span={2}>
                                  <Form.Item
                                    name="currency_type"
                                    label="Валюта"
                                  >
                                    <Select size="small">
                                      <Select.Option value="RUB">₽</Select.Option>
                                      <Select.Option value="USD">$</Select.Option>
                                      <Select.Option value="EUR">€</Select.Option>
                                      <Select.Option value="CNY">¥</Select.Option>
                                    </Select>
                                  </Form.Item>
                                </Col>
                                <Col span={2}>
                                  <Form.Item
                                    name="unit_rate"
                                    label={`Цена`}
                                  >
                                    <InputNumber
                                      min={0}
                                      step={0.01}
                                      placeholder="0.00"
                                      className="w-full"
                                      size="small"
                                    />
                                  </Form.Item>
                                </Col>
                                <Col span={3}>
                                  <Form.Item
                                    name="delivery_price_type"
                                    label="Доставка"
                                  >
                                    <Select size="small">
                                      <Select.Option value="included">Включено</Select.Option>
                                      <Select.Option value="not_included">+3%</Select.Option>
                                      <Select.Option value="amount">Сумма</Select.Option>
                                    </Select>
                                  </Form.Item>
                                </Col>
                                {deliveryType === 'amount' && (
                                  <Col span={2}>
                                    <Form.Item
                                      name="delivery_amount"
                                      label="Сумма"
                                    >
                                      <InputNumber
                                        min={0}
                                        step={0.01}
                                        placeholder="0.00"
                                        className="w-full"
                                        size="small"
                                      />
                                    </Form.Item>
                                  </Col>
                                )}
                              </Row>

                              <Row gutter={[8, 8]}>
                                <Col span={6}>
                                  <Form.Item
                                    name="quote_link"
                                    label="Ссылка на КП"
                                  >
                                    <Input placeholder="https://..." />
                                  </Form.Item>
                                </Col>
                                <Col span={18}>
                                  <Form.Item label=" ">
                                    <Space style={{ float: 'right' }}>
                                      <Button onClick={handleCancelInlineEdit}>
                                        Отмена
                                      </Button>
                                      <Button
                                        type="primary"
                                        htmlType="submit"
                                        icon={<SaveOutlined />}
                                        loading={createMutation.isPending || updateMutation.isPending}
                                      >
                                        {isNewRecord ? 'Добавить' : 'Сохранить'}
                                      </Button>
                                    </Space>
                                  </Form.Item>
                                </Col>
                              </Row>
                            </Form>
                          </div>
                        );
                      }
                      return null;
                    },
                    expandRowByClick: false,
                    showExpandColumn: false,
                    rowExpandable: (record) => editingMaterialId === record.id
                  }}
                  className="configure-table"
                />
              </div>
          </>
        )}
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MaterialsPage;