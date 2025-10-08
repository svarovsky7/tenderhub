import React, { useState } from 'react';
import { Typography, Card, Table, Button, Space, Input, message, Tag, Statistic, Row, Col, Form, Select, InputNumber, AutoComplete, Modal, ConfigProvider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, ToolOutlined, SaveOutlined, BuildOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { worksWithNamesApi } from '../lib/supabase/api/works-with-names';
import type { Work } from '../lib/supabase/types';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;

const WorksPage: React.FC = () => {
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [nameOptions, setNameOptions] = useState<Array<{ value: string; label: string; unit?: string }>>([]);
  const [isUnitLocked, setIsUnitLocked] = useState(false);

  // Загрузка списка работ
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['works', searchText, currentPage, pageSize],
    queryFn: async () => {
      const result = await worksWithNamesApi.getAll(
        searchText ? { search: searchText } : {},
        { page: currentPage, limit: pageSize }
      );
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Загрузка существующих наименований для автодополнения
  const { data: existingNames } = useQuery({
    queryKey: ['work-names'],
    queryFn: async () => {
      const result = await worksWithNamesApi.getNames();
      return result.data || [];
    },
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

  // Мутация для создания работы
  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const result = await worksWithNamesApi.create(values);
      if (result.error) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Ошибка при создании работы');
      }
      if (!result.data) {
        throw new Error('Не удалось получить данные созданной работы');
      }
      return result.data;
    },
    onSuccess: () => {
      message.success('Работа успешно создана');
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['work-names'] });
      setEditingWorkId(null);
      setIsAdding(false);
      setIsUnitLocked(false);
      form.resetFields();
    },
    onError: (error: any) => {
      console.error('❌ Ошибка создания работы:', error);
      const errorMessage = error.message || 'Ошибка при создании работы';
      message.error(errorMessage);
      // Очищаем только поле наименования, не сбрасываем всю форму
      form.setFieldValue('name', '');
      setIsUnitLocked(false);
      // Обновляем список на случай если запись все же была создана
      queryClient.invalidateQueries({ queryKey: ['works'] });
    },
  });

  // Мутация для обновления работы
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const result = await worksWithNamesApi.update(id, values);
      if (result.error) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Ошибка при обновлении работы');
      }
      if (!result.data) {
        throw new Error('Не удалось получить данные обновленной работы');
      }
      return result.data;
    },
    onSuccess: () => {
      message.success('Работа успешно обновлена');
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['work-names'] });
      setEditingWorkId(null);
      setIsUnitLocked(false);
      form.resetFields();
    },
    onError: (error) => {
      console.error('❌ Ошибка обновления работы:', error);
      message.error('Ошибка при обновлении работы');
    },
  });

  // Мутация для удаления работы
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await worksWithNamesApi.delete(id);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      message.success('Работа успешно удалена');
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['work-names-list'] });
    },
    onError: (error) => {
      console.error('❌ Ошибка удаления работы:', error);
      message.error('Ошибка при удалении работы');
    },
  });

  const handleDelete = (work: Work) => {
    Modal.confirm({
      title: 'Подтверждение удаления',
      content: `Вы уверены, что хотите удалить работу "${work.name}"?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(work.id),
    });
  };

  const handleEdit = (work: Work) => {
    setEditingWorkId(work.id);
    setIsUnitLocked(true); // Блокируем при редактировании существующего
    form.setFieldsValue({
      name: work.name,
      unit: work.unit,
      item_type: work.item_type || 'work',
      unit_rate: work.unit_rate || 0,
      currency_type: work.currency_type || 'RUB',
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingWorkId('new');
    setIsUnitLocked(false); // Разблокируем при добавлении нового
    form.setFieldsValue({
      unit: 'м2',
      item_type: 'work',
      currency_type: 'RUB',
      unit_rate: 0,
    });
  };

  const handleSaveInlineEdit = async (values: any) => {
    console.log('🚀 Сохранение inline формы:', values);

    if (editingWorkId === 'new') {
      await createMutation.mutateAsync(values);
    } else if (editingWorkId) {
      await updateMutation.mutateAsync({ id: editingWorkId, ...values });
    }
  };

  const handleCancelInlineEdit = () => {
    setEditingWorkId(null);
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

  const columns: ColumnsType<Work> = [
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 85,
      align: 'center',
      render: (type) => {
        const isWork = type === 'work' || !type;
        const typeIcon = isWork ?
          <ToolOutlined style={{ color: '#ff9800', fontSize: '12px' }} /> :
          <ToolOutlined style={{ color: '#9c27b0', fontSize: '12px' }} />;
        const typeColor = isWork ? 'orange' : 'purple';
        const typeLabel = isWork ? 'Работа' : 'Суб-раб';

        const tagStyle = {
          padding: '0 4px',
          fontSize: '11px',
          lineHeight: '18px',
          height: '18px',
          display: 'inline-flex',
          alignItems: 'center'
        };

        return (
          <Tag color={typeColor} icon={typeIcon} style={tagStyle}>
            {typeLabel}
          </Tag>
        );
      },
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
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
      unit: 'м2',
      unit_rate: 0,
      currency_type: 'RUB',
      item_type: 'work',
    } as Work] : []),
    ...(data?.data || [])
  ];

  const selectedCurrency = Form.useWatch('currency_type', form) || 'RUB';

  return (
      <div className="w-full">
        <style>
          {`
            .row-type-work {
              background-color: rgba(255, 152, 0, 0.1) !important;
            }
            .row-type-work:hover td {
              background-color: rgba(255, 152, 0, 0.15) !important;
            }
            .row-type-subwork {
              background-color: rgba(156, 39, 176, 0.1) !important;
            }
            .row-type-subwork:hover td {
              background-color: rgba(156, 39, 176, 0.15) !important;
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
        <div className="max-w-none">
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
                    title="Всего работ"
                    value={data?.pagination?.total || 0}
                    prefix={<ToolOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="На текущей странице"
                    value={data?.data?.length || 0}
                    prefix={<ToolOutlined />}
                  />
                </Col>
              </Row>
            </div>

            {/* Works List with expandable inline form */}
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
                  .configure-works-table .ant-table-thead > tr > th {
                    background: linear-gradient(135deg, rgba(30, 58, 138, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%);
                    font-weight: 600;
                    color: #1890ff;
                    border-bottom: 2px solid rgba(30, 58, 138, 0.1);
                  }
                  .configure-works-table .ant-table-tbody > tr {
                    transition: all 0.3s ease;
                  }
                  .configure-works-table .ant-table-tbody > tr:nth-child(odd) {
                    background: linear-gradient(90deg, rgba(30, 58, 138, 0.02) 0%, rgba(5, 150, 105, 0.02) 100%);
                  }
                  .configure-works-table .ant-table-tbody > tr:nth-child(even) {
                    background: linear-gradient(90deg, rgba(5, 150, 105, 0.02) 0%, rgba(13, 148, 136, 0.02) 100%);
                  }
                  .configure-works-table .ant-table-tbody > tr:hover > td {
                    background: linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%) !important;
                    transform: translateX(2px);
                  }
                  .gradient-border-animation-works {
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
              <div className="gradient-border-animation-works" />

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
                    placeholder="Поиск работ по наименованию..."
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
                      Добавить работу
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
                    return record.item_type === 'sub_work' ? 'row-type-subwork' : 'row-type-work';
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
                    expandedRowKeys: editingWorkId && editingWorkId !== 'new' ? [editingWorkId] : isAdding ? ['new'] : [],
                    expandedRowRender: (record) => {
                      if ((editingWorkId === record.id) || (isAdding && record.id === 'new')) {
                        const isNewRecord = record.id === 'new';
                        const currencySymbol = getCurrencySymbol(selectedCurrency);

                        const itemType = form.getFieldValue('item_type') || record.item_type || 'work';

                        // Цветовые схемы для разных типов
                        const colorScheme = {
                          'work': { bg: 'rgba(255, 152, 0, 0.05)', border: '#ff9800' }, // оранжевый
                          'sub_work': { bg: 'rgba(156, 39, 176, 0.05)', border: '#9c27b0' } // фиолетовый
                        };

                        const colors = colorScheme[itemType] || colorScheme['work'];

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
                                  >
                                    <Select size="small">
                                      <Select.Option value="work">Работа</Select.Option>
                                      <Select.Option value="sub_work">Суб-раб</Select.Option>
                                    </Select>
                                  </Form.Item>
                                </Col>
                                <Col span={7}>
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
                                      placeholder="Введите наименование работы"
                                      allowClear
                                    />
                                  </Form.Item>
                                </Col>
                                <Col span={3}>
                                  <Form.Item
                                    name="unit"
                                    label="Ед. изм."
                                    rules={[{ required: true, message: 'Выберите единицу' }]}
                                  >
                                    <Select
                                      disabled={isUnitLocked}
                                      suffixIcon={isUnitLocked ? null : undefined}
                                      style={isUnitLocked ? { cursor: 'not-allowed' } : undefined}
                                    >
                                      <Select.Option value="м2">м²</Select.Option>
                                      <Select.Option value="м">м</Select.Option>
                                      <Select.Option value="м3">м³</Select.Option>
                                      <Select.Option value="шт">шт</Select.Option>
                                      <Select.Option value="кг">кг</Select.Option>
                                      <Select.Option value="т">т</Select.Option>
                                      <Select.Option value="час">час</Select.Option>
                                      <Select.Option value="смена">смена</Select.Option>
                                      <Select.Option value="комплект">комплект</Select.Option>
                                    </Select>
                                  </Form.Item>
                                </Col>
                                <Col span={2}>
                                  <Form.Item
                                    name="currency_type"
                                    label="Валюта"
                                  >
                                    <Select>
                                      <Select.Option value="RUB">₽</Select.Option>
                                      <Select.Option value="USD">$</Select.Option>
                                      <Select.Option value="EUR">€</Select.Option>
                                      <Select.Option value="CNY">¥</Select.Option>
                                    </Select>
                                  </Form.Item>
                                </Col>
                                <Col span={10}>
                                  <Form.Item
                                    name="unit_rate"
                                    label={`Стоимость (${currencySymbol})`}
                                  >
                                    <InputNumber
                                      min={0}
                                      step={0.01}
                                      placeholder="0.00"
                                      className="w-full"
                                    />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Row gutter={[8, 8]}>
                                <Col span={24}>
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
                    rowExpandable: (record) => editingWorkId === record.id
                  }}
                  className="configure-works-table"
                />
              </div>
        </div>
      </div>
  );
};

export default WorksPage;