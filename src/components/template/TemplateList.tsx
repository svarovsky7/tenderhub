import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Tooltip, Modal, message, Empty, Form, Input, Select, InputNumber } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ToolOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  BuildOutlined,
  LinkOutlined,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workMaterialTemplatesApi, type TemplateGroup } from '../../lib/supabase/api/work-material-templates';
import { materialsApi, worksApi } from '../../lib/supabase/api';
import { DecimalInput } from '../common';
import type { ColumnsType } from 'antd/es/table';

interface TemplateListProps {
  onAddToTemplate?: (templateName: string) => void;
}

interface TemplateItem {
  id: string;
  template_name: string;
  template_description?: string;

  // Work data
  work_id?: string;
  work_name?: string;
  work_type?: 'work' | 'sub_work';
  work_unit?: string;
  work_unit_rate?: number;
  work_currency_type?: string;
  work_category?: string;

  // Material data
  material_id?: string;
  material_name?: string;
  material_type?: 'material' | 'sub_material';
  material_unit?: string;
  material_unit_rate?: number;
  material_currency_type?: string;
  material_category?: string;
  material_material_type?: 'main' | 'auxiliary';  // Тип материала (основной/вспомогательный)
  material_consumption_coefficient?: number;
  material_delivery_price_type?: string;
  material_delivery_amount?: number;
  material_quote_link?: string;

  // Template item data
  conversion_coefficient: number;
  is_linked_to_work: boolean;

  // UI helpers
  item_type: 'work' | 'sub_work' | 'material' | 'sub_material';
  display_order?: number;
  indent?: boolean;
  linked_work_name?: string;
}

const TemplateList: React.FC<TemplateListProps> = ({ onAddToTemplate }) => {
  console.log('🚀 TemplateList render');

  const [expandedTemplates, setExpandedTemplates] = useState<string[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [addingToTemplate, setAddingToTemplate] = useState<string | null>(null);
  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();
  const [libraryData, setLibraryData] = useState<{ materials: any[]; works: any[] }>({
    materials: [],
    works: []
  });
  const [collapsedTemplates, setCollapsedTemplates] = useState<Set<string>>(new Set());
  const [editingTemplateName, setEditingTemplateName] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState<string>('');

  const queryClient = useQueryClient();

  // Load library data
  useEffect(() => {
    const loadLibraryData = async () => {
      try {
        const [materialsResult, worksResult] = await Promise.all([
          materialsApi.getAll(),
          worksApi.getAll()
        ]);
        setLibraryData({
          materials: materialsResult.data || [],
          works: worksResult.data || []
        });
      } catch (error) {
        console.error('Error loading library data:', error);
      }
    };
    loadLibraryData();
  }, []);

  // Загрузка шаблонов
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['work-material-templates'],
    queryFn: async () => {
      console.log('📡 Загрузка шаблонов');
      const response = await workMaterialTemplatesApi.getTemplates();
      if (response.error) {
        throw new Error(response.error);
      }
      console.log('✅ Шаблоны загружены:', response.data?.length);
      return response.data || [];
    }
  });

  // Transform template data for hierarchical display
  const transformedTemplates = useMemo(() => {
    return templates.map((template: TemplateGroup) => {
      const items: TemplateItem[] = [];

      // First add work if exists
      if (template.work_data) {
        const workType = template.work_data.type || 'work';
        items.push({
          id: `${template.template_name}-work`,
          template_name: template.template_name,
          template_description: template.template_description,
          work_id: template.work_data.id,
          work_name: template.work_data.name,
          work_type: workType,
          work_unit: template.work_data.unit,
          work_unit_rate: template.work_data.unit_rate,
          work_currency_type: template.work_data.currency_type,
          work_category: template.work_data.category,
          item_type: workType,
          conversion_coefficient: 1,
          is_linked_to_work: false,
          display_order: 1,
          indent: false
        });
      }

      // Group materials by whether they're linked
      const linkedMaterials = template.materials.filter(m => m.is_linked_to_work);
      const unlinkedMaterials = template.materials.filter(m => !m.is_linked_to_work);

      // Add linked materials right after work
      linkedMaterials.forEach((material: any) => {
        const materialType = material.type || 'material';
        items.push({
          id: material.template_item_id || material.id,
          template_name: template.template_name,
          template_description: template.template_description,
          material_id: material.id,
          material_name: material.name,
          material_type: materialType,
          material_unit: material.unit,
          material_unit_rate: material.unit_rate,
          material_currency_type: material.currency_type,
          material_category: material.category,
          material_material_type: material.material_type, // Add material_type from API
          material_consumption_coefficient: material.consumption_coefficient,
          material_delivery_price_type: material.delivery_price_type,
          material_delivery_amount: material.delivery_amount,
          material_quote_link: material.quote_link,
          conversion_coefficient: material.conversion_coefficient,
          is_linked_to_work: true,
          item_type: materialType,
          display_order: 2,
          indent: true,
          linked_work_name: template.work_data?.name
        });
      });

      // Add unlinked materials at the end
      unlinkedMaterials.forEach((material: any) => {
        const materialType = material.type || 'material';
        items.push({
          id: material.template_item_id || material.id,
          template_name: template.template_name,
          template_description: template.template_description,
          material_id: material.id,
          material_name: material.name,
          material_type: materialType,
          material_unit: material.unit,
          material_unit_rate: material.unit_rate,
          material_currency_type: material.currency_type,
          material_category: material.category,
          material_material_type: material.material_type, // Add material_type from API
          material_consumption_coefficient: material.consumption_coefficient,
          material_delivery_price_type: material.delivery_price_type,
          material_delivery_amount: material.delivery_amount,
          material_quote_link: material.quote_link,
          conversion_coefficient: material.conversion_coefficient,
          is_linked_to_work: false,
          item_type: materialType,
          display_order: 3,
          indent: false
        });
      });

      return {
        template_name: template.template_name,
        template_description: template.template_description,
        items: items.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      };
    });
  }, [templates]);

  // Удаление шаблона
  const deleteMutation = useMutation({
    mutationFn: async (templateName: string) => {
      return await workMaterialTemplatesApi.deleteTemplate(templateName);
    },
    onSuccess: () => {
      message.success('Шаблон удален');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
    },
    onError: (error: any) => {
      message.error(`Ошибка удаления: ${error.message}`);
    }
  });

  // Дублирование шаблона
  const duplicateMutation = useMutation({
    mutationFn: async ({ originalName, newName }: { originalName: string; newName: string }) => {
      return await workMaterialTemplatesApi.duplicateTemplate(originalName, newName);
    },
    onSuccess: () => {
      message.success('Шаблон скопирован');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
    },
    onError: (error: any) => {
      message.error(`Ошибка копирования: ${error.message}`);
    }
  });

  // Update template item
  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      return await workMaterialTemplatesApi.updateTemplateItem(values.id, values);
    },
    onSuccess: () => {
      message.success('Элемент обновлен');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
      setEditingItemId(null);
      editForm.resetFields();
    },
    onError: (error: any) => {
      message.error(`Ошибка обновления: ${error.message}`);
    }
  });

  // Delete template item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await workMaterialTemplatesApi.deleteTemplateItem(itemId);
    },
    onSuccess: () => {
      message.success('Элемент удален');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
    },
    onError: (error: any) => {
      message.error(`Ошибка удаления: ${error.message}`);
    }
  });

  const handleDeleteTemplate = (templateName: string) => {
    Modal.confirm({
      title: 'Удалить шаблон?',
      icon: <ExclamationCircleOutlined />,
      content: `Вы уверены, что хотите удалить шаблон "${templateName}" и все его элементы?`,
      onOk: () => deleteMutation.mutate(templateName),
    });
  };

  const handleDuplicateTemplate = (templateName: string) => {
    Modal.confirm({
      title: 'Копировать шаблон',
      content: (
        <div>
          <p>Введите название для нового шаблона:</p>
          <input
            id="new-template-name"
            type="text"
            className="w-full p-2 border rounded mt-2"
            placeholder={`Копия ${templateName}`}
            defaultValue={`Копия ${templateName}`}
          />
        </div>
      ),
      onOk: () => {
        const newName = (document.getElementById('new-template-name') as HTMLInputElement)?.value;
        if (newName && newName.trim()) {
          duplicateMutation.mutate({ originalName: templateName, newName: newName.trim() });
        } else {
          message.error('Введите название шаблона');
          return Promise.reject();
        }
      },
    });
  };

  const handleEditItem = useCallback((item: TemplateItem) => {
    console.log('✏️ Starting edit for item:', item);
    setEditingItemId(item.id);

    // Populate form based on item type
    if (item.item_type === 'work' || item.item_type === 'sub_work') {
      editForm.setFieldsValue({
        id: item.id,
        description: item.work_name,
        unit: item.work_unit,
        unit_rate: item.work_unit_rate,
        currency_type: item.work_currency_type
      });
    } else {
      editForm.setFieldsValue({
        id: item.id,
        description: item.material_name,
        unit: item.material_unit,
        unit_rate: item.material_unit_rate,
        currency_type: item.material_currency_type,
        consumption_coefficient: item.material_consumption_coefficient,
        conversion_coefficient: item.conversion_coefficient,
        delivery_price_type: item.material_delivery_price_type,
        delivery_amount: item.material_delivery_amount,
        quote_link: item.material_quote_link
      });
    }
  }, [editForm]);

  const handleSaveEdit = useCallback(() => {
    editForm.validateFields().then(values => {
      console.log('💾 Saving edit:', values);
      updateMutation.mutate(values);
    });
  }, [editForm, updateMutation]);

  const handleCancelEdit = useCallback(() => {
    setEditingItemId(null);
    editForm.resetFields();
  }, [editForm]);

  const handleDeleteItem = useCallback((itemId: string) => {
    Modal.confirm({
      title: 'Удалить элемент?',
      content: 'Вы уверены, что хотите удалить этот элемент шаблона?',
      onOk: () => deleteItemMutation.mutate(itemId),
    });
  }, [deleteItemMutation]);

  const toggleTemplateCollapse = (templateName: string) => {
    setCollapsedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateName)) {
        newSet.delete(templateName);
      } else {
        newSet.add(templateName);
      }
      return newSet;
    });
  };

  const handleRenameTemplate = async (oldName: string, newName: string) => {
    if (!newName || newName.trim() === '') {
      message.error('Название шаблона не может быть пустым');
      return;
    }

    // TODO: Implement API call to rename template
    message.info('Функция переименования шаблона в разработке');
    setEditingTemplateName(null);
    setNewTemplateName('');
  };

  // Inline edit row component
  const EditRow = ({ item }: { item: TemplateItem }) => {
    const isMaterial = item.item_type === 'material' || item.item_type === 'sub_material';

    return (
      <tr>
        <td colSpan={12} style={{ padding: 0 }}>
          <Form
            form={editForm}
            layout="vertical"
            className="w-full p-3"
            style={{
              backgroundColor: item.item_type === 'work' ? 'rgba(251, 191, 36, 0.1)' :
                              item.item_type === 'sub_work' ? 'rgba(168, 85, 247, 0.1)' :
                              item.item_type === 'material' ? 'rgba(59, 130, 246, 0.1)' :
                              'rgba(34, 197, 94, 0.1)',
              borderLeft: `4px solid ${
                item.item_type === 'work' ? '#f59e0b' :
                item.item_type === 'sub_work' ? '#a855f7' :
                item.item_type === 'material' ? '#3b82f6' :
                '#22c55e'
              }`
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Form.Item name="id" hidden>
                <Input />
              </Form.Item>

              <Form.Item name="description" label="Наименование" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                <Input style={{ width: 350 }} />
              </Form.Item>

              <Form.Item name="unit" label={<div style={{ textAlign: 'center', width: '100%' }}>Единица</div>} style={{ marginBottom: 0 }}>
                <Select style={{ width: 100 }}>
                  <Select.Option value="м²">м²</Select.Option>
                  <Select.Option value="м³">м³</Select.Option>
                  <Select.Option value="м">м</Select.Option>
                  <Select.Option value="шт">шт</Select.Option>
                  <Select.Option value="кг">кг</Select.Option>
                  <Select.Option value="т">т</Select.Option>
                  <Select.Option value="л">л</Select.Option>
                  <Select.Option value="компл">компл</Select.Option>
                </Select>
              </Form.Item>

              {isMaterial && (
                <>
                  <Form.Item name="consumption_coefficient" label={<div style={{ textAlign: 'center', width: '100%' }}>Коэф. расхода</div>} style={{ marginBottom: 0 }}>
                    <DecimalInput min={0.0001} precision={4} style={{ width: 120 }} />
                  </Form.Item>

                  <Form.Item name="conversion_coefficient" label={<div style={{ textAlign: 'center', width: '100%' }}>Коэф. перевода</div>} style={{ marginBottom: 0 }}>
                    <DecimalInput min={0.0001} precision={4} style={{ width: 120 }} />
                  </Form.Item>
                </>
              )}

              <Form.Item name="unit_rate" label={<div style={{ textAlign: 'center', width: '100%' }}>Цена за ед.</div>} style={{ marginBottom: 0 }}>
                <DecimalInput min={0} precision={2} style={{ width: 120 }} />
              </Form.Item>

              <Form.Item name="currency_type" label={<div style={{ textAlign: 'center', width: '100%' }}>Валюта</div>} style={{ marginBottom: 0 }}>
                <Select style={{ width: 100 }}>
                  <Select.Option value="RUB">₽</Select.Option>
                  <Select.Option value="USD">$</Select.Option>
                  <Select.Option value="EUR">€</Select.Option>
                  <Select.Option value="CNY">¥</Select.Option>
                </Select>
              </Form.Item>

              {isMaterial && (
                <>
                  <Form.Item name="delivery_price_type" label={<div style={{ textAlign: 'center', width: '100%' }}>Тип доставки</div>} style={{ marginBottom: 0 }}>
                    <Select style={{ width: 150 }}>
                      <Select.Option value="included">Включена</Select.Option>
                      <Select.Option value="not_included">3% от суммы</Select.Option>
                      <Select.Option value="amount">Фикс. сумма</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item name="delivery_amount" label={<div style={{ textAlign: 'center', width: '100%' }}>Сумма доставки</div>} style={{ marginBottom: 0 }}>
                    <DecimalInput min={0} precision={2} style={{ width: 130 }} />
                  </Form.Item>

                  <Form.Item name="quote_link" label={<div style={{ textAlign: 'center', width: '100%' }}>Ссылка на КП</div>} style={{ marginBottom: 0, textAlign: 'center' }}>
                    <Input style={{ width: 250 }} placeholder="URL" />
                  </Form.Item>
                </>
              )}

              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Tooltip title="Сохранить">
                    <Button type="text" icon={<CheckOutlined />} onClick={handleSaveEdit} />
                  </Tooltip>
                  <Tooltip title="Отмена">
                    <Button type="text" icon={<CloseOutlined />} onClick={handleCancelEdit} />
                  </Tooltip>
                </Space>
              </Form.Item>
            </div>
          </Form>
        </td>
      </tr>
    );
  };

  // Колонки таблицы
  const columns: ColumnsType<TemplateItem> = [
    {
      title: 'Тип',
      key: 'type',
      width: 85,
      align: 'center',
      render: (item: TemplateItem) => {
        const tags = [];

        // Основной тег типа элемента
        switch(item.item_type) {
          case 'work':
            tags.push(<Tag key="type" color="orange" style={{ fontSize: '10px', padding: '0 4px' }}>Работа</Tag>);
            break;
          case 'sub_work':
            tags.push(<Tag key="type" color="purple" style={{ fontSize: '10px', padding: '0 4px' }}>Суб-раб</Tag>);
            break;
          case 'material':
            tags.push(<Tag key="type" color="blue" style={{ fontSize: '10px', padding: '0 4px' }}>Материал</Tag>);
            break;
          case 'sub_material':
            tags.push(<Tag key="type" color="green" style={{ fontSize: '10px', padding: '0 4px' }}>Суб-мат</Tag>);
            break;
        }

        // Для материалов добавляем тег вида (основной/вспомогательный)
        if (item.item_type === 'material' || item.item_type === 'sub_material') {
          const isMain = item.material_material_type !== 'auxiliary';
          tags.push(
            <Tag key="material-type" color={isMain ? 'default' : 'warning'} style={{ fontSize: '9px', padding: '0 3px', marginTop: '2px' }}>
              {isMain ? 'Основной' : 'Вспомог.'}
            </Tag>
          );
        }

        return (
          <div className="flex flex-col gap-0.5 items-center">
            {tags}
          </div>
        );
      }
    },
    {
      title: 'Наименование',
      key: 'name',
      width: 300,
      render: (item: TemplateItem) => {
        const name = item.work_name || item.material_name || '-';
        const isLinkedMaterial = item.is_linked_to_work && (item.item_type === 'material' || item.item_type === 'sub_material');

        return (
          <div className={isLinkedMaterial ? 'pl-6' : ''}>
            <div>{name}</div>
            {isLinkedMaterial && item.linked_work_name && (
              <div className="text-xs text-gray-500 mt-1">
                <LinkOutlined className="mr-1" />
                {item.linked_work_name}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Ед.',
      key: 'unit',
      width: 60,
      align: 'center',
      render: (item: TemplateItem) => item.work_unit || item.material_unit || '-'
    },
    {
      title: 'К.расх',
      key: 'consumption',
      width: 70,
      align: 'center',
      render: (item: TemplateItem) => {
        if (item.item_type === 'material' || item.item_type === 'sub_material') {
          return item.material_consumption_coefficient?.toFixed(2) || '1.00';
        }
        return '-';
      }
    },
    {
      title: 'К.пер',
      key: 'conversion',
      width: 70,
      align: 'center',
      render: (item: TemplateItem) => {
        if (item.item_type === 'material' || item.item_type === 'sub_material') {
          return item.conversion_coefficient?.toFixed(4) || '1.0000';
        }
        return '-';
      }
    },
    {
      title: 'Цена',
      key: 'price',
      width: 100,
      align: 'center',
      render: (item: TemplateItem) => {
        const price = item.work_unit_rate || item.material_unit_rate;
        const currency = item.work_currency_type || item.material_currency_type || 'RUB';
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'CNY' ? '¥' : '₽';

        if (price) {
          return <span className="font-medium">{price.toLocaleString()} {symbol}</span>;
        }
        return '-';
      }
    },
    {
      title: 'Доставка',
      key: 'delivery',
      width: 100,
      align: 'center',
      render: (item: TemplateItem) => {
        if (item.item_type === 'material' || item.item_type === 'sub_material') {
          if (item.material_delivery_price_type === 'included') {
            return <Tag color="green">Включена</Tag>;
          } else if (item.material_delivery_price_type === 'not_included') {
            return <Tag color="orange">3%</Tag>;
          } else if (item.material_delivery_price_type === 'amount' && item.material_delivery_amount) {
            return <Tag color="blue">{item.material_delivery_amount} ₽</Tag>;
          }
        }
        return '-';
      }
    },
    {
      title: 'Ссылка на КП',
      key: 'quote',
      width: 120,
      align: 'center',
      render: (item: TemplateItem) => {
        if (item.material_quote_link) {
          return (
            <a href={item.material_quote_link} target="_blank" rel="noopener noreferrer">
              Открыть
            </a>
          );
        }
        return '-';
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (item: TemplateItem) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditItem(item)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteItem(item.id)}
          />
        </Space>
      )
    }
  ];

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="text-lg">Загрузка шаблонов...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8 text-red-500">
          <div className="text-lg">Ошибка загрузки шаблонов</div>
          <div className="text-sm">{String(error)}</div>
        </div>
      </Card>
    );
  }

  // Quick add row component
  const QuickAddRow = ({ templateName }: { templateName: string }) => {
    const [quickAddForm] = Form.useForm();
    const [quickAddType, setQuickAddType] = useState<'work' | 'material' | 'sub_work' | 'sub_material'>('work');
    const [isLinkedToWork, setIsLinkedToWork] = useState<boolean>(true);

    const handleQuickAdd = async (values: any) => {
      console.log('🚀 Quick adding template item:', values);
      try {
        let payload: any = {
          template_name: templateName,
          template_description: templates.find(t => t.template_name === templateName)?.template_description
        };

        // Для работ
        if (values.item_type === 'work' || values.item_type === 'sub_work') {
          if (values.item_type === 'work') {
            payload.work_library_id = values.work_id;
          } else {
            payload.sub_work_library_id = values.work_id;
          }
        }
        // Для материалов
        else if (values.item_type === 'material' || values.item_type === 'sub_material') {
          if (values.item_type === 'material') {
            payload.material_library_id = values.material_id;
          } else {
            payload.sub_material_library_id = values.material_id;
          }

          payload.conversion_coefficient = values.conversion_coefficient || 1.0;
          payload.is_linked_to_work = values.is_linked_to_work === true;

          // Если материал привязан к работе, добавляем work_id
          if (values.is_linked_to_work && values.linked_work_id) {
            const isSubWork = libraryData.works.find(w => w.id === values.linked_work_id)?.item_type === 'sub_work';
            if (isSubWork) {
              payload.sub_work_library_id = values.linked_work_id;
            } else {
              payload.work_library_id = values.linked_work_id;
            }
          } else if (values.is_linked_to_work) {
            console.error('❌ No work selected for linked material');
            message.error('Выберите работу для привязки материала');
            return;
          }
          // Для непривязанных материалов work_id не нужен
        }

        const result = await workMaterialTemplatesApi.createTemplateItem(payload);
        if (result.error) {
          message.error(`Ошибка: ${result.error}`);
          return;
        }

        message.success('Элемент добавлен в шаблон');
        quickAddForm.resetFields();
        setAddingToTemplate(null);
        queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
      } catch (error) {
        console.error('💥 Error adding template item:', error);
        message.error('Не удалось добавить элемент');
      }
    };

    const getAddBackgroundColor = () => {
      switch(quickAddType) {
        case 'work': return 'rgba(254, 215, 170, 0.2)';
        case 'sub_work': return 'rgba(233, 213, 255, 0.2)';
        case 'material': return 'rgba(219, 234, 254, 0.2)';
        case 'sub_material': return 'rgba(187, 247, 208, 0.2)';
        default: return '#f9f9f9';
      }
    };

    const getBorderColor = () => {
      switch(quickAddType) {
        case 'work': return '#fb923c';
        case 'sub_work': return '#c084fc';
        case 'material': return '#60a5fa';
        case 'sub_material': return '#34d399';
        default: return '#d9d9d9';
      }
    };

    const workOptions = libraryData.works
      .filter(w => w.item_type === (quickAddType === 'work' ? 'work' : 'sub_work'))
      .map(w => ({ value: w.id, label: w.name }));

    const materialOptions = libraryData.materials
      .filter(m => m.item_type === (quickAddType === 'material' ? 'material' : 'sub_material'))
      .map(m => ({ value: m.id, label: m.name }));

    return (
      <Form
        form={quickAddForm}
        layout="inline"
        onFinish={handleQuickAdd}
        style={{
          padding: '12px',
          backgroundColor: getAddBackgroundColor(),
          borderRadius: '4px',
          border: `2px solid ${getBorderColor()}`,
          marginBottom: '16px'
        }}
      >
        <Form.Item name="item_type" initialValue={quickAddType}>
          <Select
            style={{ width: 120 }}
            onChange={(value) => {
              setQuickAddType(value);
              quickAddForm.setFieldValue('item_type', value);
              quickAddForm.resetFields(['work_id', 'material_id', 'linked_work_id']);
              // При смене на материал устанавливаем значения по умолчанию
              if (value === 'material' || value === 'sub_material') {
                quickAddForm.setFieldValue('is_linked_to_work', true);
                setIsLinkedToWork(true);
              } else {
                // Для работ скрываем поле привязки
                setIsLinkedToWork(false);
              }
            }}
          >
            <Select.Option value="work">Работа</Select.Option>
            <Select.Option value="sub_work">Суб-работа</Select.Option>
            <Select.Option value="material">Материал</Select.Option>
            <Select.Option value="sub_material">Суб-материал</Select.Option>
          </Select>
        </Form.Item>

        {(quickAddType === 'work' || quickAddType === 'sub_work') ? (
          <Form.Item
            name="work_id"
            rules={[{ required: true, message: 'Выберите работу' }]}
          >
            <Select
              showSearch
              placeholder="Выберите работу"
              style={{ width: 250 }}
              options={workOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item
              name="material_id"
              rules={[{ required: true, message: 'Выберите материал' }]}
            >
              <Select
                showSearch
                placeholder="Выберите материал"
                style={{ width: 250 }}
                options={materialOptions}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>

            <Form.Item name="conversion_coefficient" initialValue={1.0}>
              <DecimalInput
                min={0.0001}
                precision={4}
                placeholder="Коэф. перевода"
                style={{ width: 120 }}
              />
            </Form.Item>

            <Form.Item
              name="is_linked_to_work"
              initialValue={true}
            >
              <Select
                style={{ width: 120 }}
                onChange={(value) => {
                  setIsLinkedToWork(value);
                  if (!value) {
                    quickAddForm.setFieldValue('linked_work_id', undefined);
                  }
                }}
              >
                <Select.Option value={true}>Привязан</Select.Option>
                <Select.Option value={false}>Не привязан</Select.Option>
              </Select>
            </Form.Item>

            {isLinkedToWork && (
              <Form.Item
                name="linked_work_id"
                rules={[{ required: true, message: 'Выберите работу для привязки' }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите работу"
                  style={{ width: 200 }}
                  options={[...libraryData.works]
                    .map(w => ({ value: w.id, label: `${w.name} (${w.item_type === 'work' ? 'Работа' : 'Суб-работа'})` }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            )}
          </>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
              Добавить
            </Button>
            <Button onClick={() => setAddingToTemplate(null)} icon={<CloseOutlined />}>
              Отмена
            </Button>
          </Space>
        </Form.Item>
      </Form>
    );
  };

  return (
    <div className="space-y-4">
      {transformedTemplates.length === 0 ? (
        <Card>
          <Empty description="Нет созданных шаблонов" />
        </Card>
      ) : (
        transformedTemplates.map((template: any) => (
          <Card
            key={template.template_name}
            title={
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Tooltip title={collapsedTemplates.has(template.template_name) ? "Развернуть" : "Свернуть"}>
                    <Button
                      size="small"
                      type="text"
                      icon={collapsedTemplates.has(template.template_name) ? <DownOutlined /> : <UpOutlined />}
                      onClick={() => toggleTemplateCollapse(template.template_name)}
                    />
                  </Tooltip>
                  {editingTemplateName === template.template_name ? (
                    <Space>
                      <Input
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        onPressEnter={() => handleRenameTemplate(template.template_name, newTemplateName)}
                        style={{ width: 200 }}
                        autoFocus
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<CheckOutlined />}
                        onClick={() => handleRenameTemplate(template.template_name, newTemplateName)}
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={() => {
                          setEditingTemplateName(null);
                          setNewTemplateName('');
                        }}
                      />
                    </Space>
                  ) : (
                    <>
                      <span className="text-lg font-semibold">{template.template_name}</span>
                      <Tooltip title="Редактировать название">
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingTemplateName(template.template_name);
                            setNewTemplateName(template.template_name);
                          }}
                        />
                      </Tooltip>
                      {template.template_description && (
                        <span className="text-sm text-gray-500 ml-2">{template.template_description}</span>
                      )}
                    </>
                  )}
                </div>
                <Space>
                  {onAddToTemplate && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => onAddToTemplate(template.template_name)}
                    >
                      В BOQ
                    </Button>
                  )}
                  <Tooltip title="Добавить элемент">
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setAddingToTemplate(template.template_name)}
                    />
                  </Tooltip>
                  <Tooltip title="Копировать шаблон">
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleDuplicateTemplate(template.template_name)}
                    />
                  </Tooltip>
                  <Tooltip title="Удалить шаблон">
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteTemplate(template.template_name)}
                    />
                  </Tooltip>
                </Space>
              </div>
            }
            className="shadow-sm"
          >
            {/* Show quick add form when adding to this template */}
            {addingToTemplate === template.template_name && (
              <QuickAddRow templateName={template.template_name} />
            )}

            <style jsx>{`
              .template-table .ant-table-tbody > tr.bg-orange-100:hover > td {
                background-color: #fed7aa !important;
              }
              .template-table .ant-table-tbody > tr.bg-purple-100:hover > td {
                background-color: #e9d5ff !important;
              }
              .template-table .ant-table-tbody > tr.bg-blue-100:hover > td {
                background-color: #bfdbfe !important;
              }
              .template-table .ant-table-tbody > tr.bg-blue-50:hover > td {
                background-color: #dbeafe !important;
              }
              .template-table .ant-table-tbody > tr.bg-green-100:hover > td {
                background-color: #bbf7d0 !important;
              }
            `}</style>

            {!collapsedTemplates.has(template.template_name) && (
              <Table
                columns={columns}
                dataSource={template.items}
                rowKey="id"
                pagination={false}
                size="small"
                className="template-table"
                rowClassName={(record) => {
                  if (record.item_type === 'work') return 'bg-orange-100';
                  if (record.item_type === 'sub_work') return 'bg-purple-100';
                  if (record.item_type === 'material') {
                    return record.is_linked_to_work ? 'bg-blue-100' : 'bg-blue-50';
                  }
                  if (record.item_type === 'sub_material') return 'bg-green-100';
                  return '';
                }}
                components={{
                  body: {
                    row: ({ children, ...props }: any) => {
                      const record = template.items.find((item: TemplateItem) =>
                        item.id === props['data-row-key']
                      );

                      if (record && editingItemId === record.id) {
                        return <EditRow item={record} />;
                      }

                      return <tr {...props}>{children}</tr>;
                    }
                  }
                }}
                onRow={(record) => ({
                  'data-row-key': record.id,
                })}
              />
            )}
          </Card>
        ))
      )}
    </div>
  );
};

export default TemplateList;