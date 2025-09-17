import React, { useState, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  message,
  Form,
  Divider,
  Typography,
  Badge,
  Alert,
  Row,
  Col
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import TemplateItemsTable, { type TemplateItem } from './TemplateItemsTable';
import InlineLibrarySelector from './InlineLibrarySelector';
import { workMaterialTemplatesApi } from '../../lib/supabase/api/work-material-templates';
import type { Material, WorkItem } from '../../lib/supabase/types';

const { TextArea } = Input;
const { Text } = Typography;

interface EnhancedInlineTemplateFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

const EnhancedInlineTemplateForm: React.FC<EnhancedInlineTemplateFormProps> = ({
  onCancel,
  onSuccess
}) => {
  console.log('🚀 EnhancedInlineTemplateForm render');

  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // State for template metadata
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateNotes, setTemplateNotes] = useState('');

  // State for template items
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 Saving template with items:', templateItems.length);

      // Separate works and materials
      const works = templateItems.filter(item => item.type === 'work' || item.type === 'sub_work');
      const materials = templateItems.filter(item => item.type === 'material' || item.type === 'sub_material');

      console.log('📋 Template composition:', {
        works: works.length,
        materials: materials.length,
        total: templateItems.length
      });

      // Создаем записи для шаблона
      const promises = [];

      // Сохраняем все материалы
      for (const material of materials) {
        if (material.is_linked_to_work && material.linked_work_id) {
          // Material linked to work
          const linkedWork = works.find(w => w.id === material.linked_work_id);
          console.log('🔗 Adding linked material:', material.name, '→', linkedWork?.name);

          const templateData = {
            template_name: templateName,
            template_description: templateDescription,
            notes: templateNotes,
            work_library_id: linkedWork?.type === 'work' ? linkedWork.id : undefined,
            sub_work_library_id: linkedWork?.type === 'sub_work' ? linkedWork.id : undefined,
            material_library_id: material.type === 'material' ? material.id : undefined,
            sub_material_library_id: material.type === 'sub_material' ? material.id : undefined,
            is_linked_to_work: true
          };
          console.log('🔗 Creating linked material template:', {
            ...templateData,
            actualTypes: {
              work_library_id: typeof templateData.work_library_id,
              material_library_id: typeof templateData.material_library_id,
              is_linked_to_work: typeof templateData.is_linked_to_work
            }
          });
          promises.push(workMaterialTemplatesApi.createTemplateItem(templateData));
        } else {
          // Standalone material
          console.log('📦 Adding standalone material:', material.name);
          const templateData = {
            template_name: templateName,
            template_description: templateDescription,
            notes: templateNotes,
            work_library_id: undefined,
            sub_work_library_id: undefined,
            material_library_id: material.type === 'material' ? material.id : undefined,
            sub_material_library_id: material.type === 'sub_material' ? material.id : undefined,
            is_linked_to_work: false
          };
          promises.push(workMaterialTemplatesApi.createTemplateItem(templateData));
        }
      }

      // Сохраняем работы без материалов
      // После изменения БД это должно работать
      for (const work of works) {
        const linkedMaterials = materials.filter(m => m.linked_work_id === work.id);

        if (linkedMaterials.length === 0) {
          // Работа без материалов
          console.log('➕ Adding work-only entry:', work.name);
          const templateData = {
            template_name: templateName,
            template_description: templateDescription,
            notes: templateNotes,
            work_library_id: work.type === 'work' ? work.id : undefined,
            sub_work_library_id: work.type === 'sub_work' ? work.id : undefined,
            material_library_id: undefined,
            sub_material_library_id: undefined,
            is_linked_to_work: false
          };
          promises.push(workMaterialTemplatesApi.createTemplateItem(templateData));
        }
      }

      console.log('💾 Saving', promises.length, 'template items');

      if (promises.length === 0) {
        throw new Error('Нет элементов для сохранения');
      }

      const results = await Promise.all(promises);

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('❌ Errors during save:', errors);
        throw new Error(errors[0].error);
      }

      return results;
    },
    onSuccess: () => {
      message.success('Шаблон успешно создан');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });

      // Reset form
      form.resetFields();
      setTemplateName('');
      setTemplateDescription('');
      setTemplateNotes('');
      setTemplateItems([]);

      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('❌ Error saving template:', error);
      message.error(`Ошибка при сохранении шаблона: ${error.message}`);
    }
  });

  // Validate form
  const validateForm = useCallback(() => {
    const errors: string[] = [];

    if (!templateName.trim()) {
      errors.push('Укажите название шаблона');
    }

    if (templateItems.length === 0) {
      errors.push('Добавьте хотя бы один элемент в шаблон');
    }

    // Check if there are materials linked to non-existent works
    const workIds = templateItems
      .filter(item => item.type === 'work' || item.type === 'sub_work')
      .map(item => item.id);

    const invalidLinkedMaterials = templateItems.filter(
      item =>
        (item.type === 'material' || item.type === 'sub_material') &&
        item.is_linked_to_work &&
        item.linked_work_id &&
        !workIds.includes(item.linked_work_id)
    );

    if (invalidLinkedMaterials.length > 0) {
      errors.push('Есть материалы, привязанные к несуществующим работам');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [templateName, templateItems]);

  // Handle adding item from inline selector
  const handleAddItem = useCallback((item: Material | WorkItem) => {
    console.log('✅ Adding item from inline selector:', item);

    const isWork = item.item_type === 'work' || item.item_type === 'sub_work';
    const type = item.item_type as TemplateItem['type'];

    // Get the last added work for auto-linking materials
    const lastWork = templateItems
      .filter(ti => ti.type === 'work' || ti.type === 'sub_work')
      .pop();

    const newItem: TemplateItem = {
      key: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      unit: item.unit,
      conversion_coefficient: 1.0,
      is_linked_to_work: !isWork && lastWork ? true : false,
      linked_work_id: !isWork && lastWork ? lastWork.id : undefined,
      linked_work_name: !isWork && lastWork ? lastWork.name : undefined,
      consumption_coefficient: 'consumption_coefficient' in item ? item.consumption_coefficient : undefined,
      unit_rate: item.unit_rate || undefined,
      currency_type: item.currency_type || undefined,
      category: item.category || undefined,
      material_type: 'material_type' in item ? (item.material_type as 'main' | 'auxiliary') : 'main'
    };

    setTemplateItems(prev => [...prev, newItem]);
  }, [templateItems]);

  // Handle item update
  const handleItemUpdate = useCallback((key: string, updates: Partial<TemplateItem>) => {
    console.log('📝 Updating item:', key, updates);
    setTemplateItems(prev =>
      prev.map(item =>
        item.key === key ? { ...item, ...updates } : item
      )
    );
  }, []);

  // Handle item deletion
  const handleItemDelete = useCallback((key: string) => {
    console.log('🗑️ Deleting item:', key);

    // Check if any materials are linked to this work
    const itemToDelete = templateItems.find(item => item.key === key);
    if (itemToDelete && (itemToDelete.type === 'work' || itemToDelete.type === 'sub_work')) {
      const linkedMaterials = templateItems.filter(
        item => item.linked_work_id === itemToDelete.id
      );

      if (linkedMaterials.length > 0) {
        // Unlink materials from the deleted work
        setTemplateItems(prev =>
          prev
            .filter(item => item.key !== key)
            .map(item =>
              item.linked_work_id === itemToDelete.id
                ? { ...item, is_linked_to_work: false, linked_work_id: undefined, linked_work_name: undefined }
                : item
            )
        );
        message.warning('Привязки материалов к удаленной работе были сброшены');
        return;
      }
    }

    setTemplateItems(prev => prev.filter(item => item.key !== key));
  }, [templateItems]);

  // Handle save
  const handleSave = async () => {
    console.log('💾 Attempting to save template...');

    if (!validateForm()) {
      message.error('Пожалуйста, исправьте ошибки в форме');
      return;
    }

    saveMutation.mutate();
  };

  return (
    <>
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .template-form-card {
            background: linear-gradient(-45deg, #f0f9ff, #ecfdf5, #f0fdfa, #eff6ff);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
            border: 1px solid rgba(59, 130, 246, 0.15);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            border-radius: 12px;
            animation: fadeIn 0.5s ease-out;
          }

          .template-form-header {
            background: linear-gradient(135deg, #3b82f6 0%, #10b981 50%, #14b8a6 100%);
            margin: -24px -24px 24px -24px;
            padding: 20px 24px;
            border-radius: 12px 12px 0 0;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            min-height: 80px;
          }

          .template-form-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
            animation: rotate 20s linear infinite;
          }

          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .template-form-title {
            color: white;
            font-size: 18px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
            position: relative;
            z-index: 1;
            height: 40px;
          }

          .template-form-icon {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
          }

          .template-form-badge {
            background: rgba(255, 255, 255, 0.3) !important;
            border: 1px solid rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(10px);
            font-weight: 600;
            animation: pulse 2s infinite;
          }

          .template-form-divider {
            border-top: 2px solid transparent;
            border-image: linear-gradient(90deg, #3b82f6, #10b981, #14b8a6) 1;
            margin: 20px 0;
          }

          .template-input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }

          .template-save-btn {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.2)) !important;
            border: 1px solid rgba(59, 130, 246, 0.4) !important;
            color: #2563eb !important;
            font-weight: 600;
            transition: all 0.3s ease;
          }

          .template-save-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(16, 185, 129, 0.3)) !important;
            border-color: rgba(59, 130, 246, 0.6) !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }

          .template-save-btn:disabled {
            background: #f5f5f5 !important;
            border-color: #d9d9d9 !important;
            color: #bfbfbf !important;
          }

          .template-form-card .ant-input {
            transition: all 0.3s ease;
          }

          .template-form-card .ant-input:hover {
            border-color: #60a5fa;
          }

          .template-form-card .ant-select-selector {
            transition: all 0.3s ease !important;
          }

          .template-form-card .ant-select-selector:hover {
            border-color: #60a5fa !important;
          }

          .template-form-card .ant-select-focused .ant-select-selector {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
          }

          .template-form-card .ant-form-item {
            animation: fadeIn 0.6s ease-out;
          }

          .template-form-card .ant-table-wrapper {
            animation: fadeIn 0.7s ease-out;
          }
        `}
      </style>
      <Card
        className="template-form-card mb-4"
        title={
          <div className="template-form-header">
            <div className="template-form-title">
              <div className="template-form-icon">
                <FileTextOutlined style={{ fontSize: 20, color: 'white' }} />
              </div>
              <span>Создание шаблона работ и материалов</span>
              <Badge
                count={templateItems.length}
                className="template-form-badge"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
              />
            </div>
          </div>
        }
        headStyle={{ padding: 0, border: 'none' }}
      >
        {/* Template metadata */}
        <div className="mb-4">
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="Название шаблона"
                  required
                  validateStatus={!templateName && validationErrors.length > 0 ? 'error' : ''}
                  help={!templateName && validationErrors.includes('Укажите название шаблона') ? 'Укажите название шаблона' : ''}
                >
                  <Input
                    className="template-input"
                    placeholder="Например: Монтаж металлоконструкций"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    maxLength={100}
                    showCount
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Описание шаблона">
                  <Input
                    className="template-input"
                    placeholder="Подробное описание шаблона"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    maxLength={500}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Примечание">
                  <Input
                    className="template-input"
                    placeholder="Дополнительные заметки"
                    value={templateNotes}
                    onChange={(e) => setTemplateNotes(e.target.value)}
                    maxLength={200}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>

        <Divider style={{
          borderTop: '2px solid transparent',
          borderImage: 'linear-gradient(90deg, #3b82f6, #10b981, #14b8a6) 1',
          marginTop: '24px',
          marginBottom: '24px'
        }}>
          <span style={{
            background: 'linear-gradient(90deg, #3b82f6, #10b981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 600
          }}>
            Элементы шаблона
          </span>
        </Divider>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <Alert
            message="Ошибки валидации"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            closable
            className="mb-4"
            onClose={() => setValidationErrors([])}
          />
        )}

        {/* Template items table */}
        <TemplateItemsTable
          items={templateItems}
          onUpdate={handleItemUpdate}
          onDelete={handleItemDelete}
        />

        {/* Inline selectors */}
        <div className="mt-4 mb-4">
          <Row gutter={16}>
            <Col span={12}>
              <InlineLibrarySelector
                type="work"
                onAdd={handleAddItem}
                placeholder="Введите название работы для поиска..."
              />
            </Col>
            <Col span={12}>
              <InlineLibrarySelector
                type="material"
                onAdd={handleAddItem}
                placeholder="Введите название материала для поиска..."
              />
            </Col>
          </Row>
        </div>

        <Divider style={{
          borderTop: '2px solid transparent',
          borderImage: 'linear-gradient(90deg, #3b82f6, #10b981, #14b8a6) 1',
          marginTop: '24px',
          marginBottom: '24px'
        }} />

        {/* Action buttons */}
        <Space>
          <Button
            className="template-save-btn"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saveMutation.isPending}
            disabled={templateItems.length === 0 || !templateName}
            size="large"
            style={{
              height: '42px',
              paddingLeft: '24px',
              paddingRight: '24px'
            }}
          >
            Сохранить шаблон
          </Button>
          <Button
            icon={<CloseOutlined />}
            onClick={onCancel}
            size="large"
            style={{
              height: '42px',
              paddingLeft: '24px',
              paddingRight: '24px'
            }}
          >
            Отмена
          </Button>
        </Space>

        {/* Statistics */}
        {templateItems.length > 0 && (
          <div className="mt-4 text-gray-600" style={{
            padding: '12px',
            background: 'rgba(59, 130, 246, 0.05)',
            borderRadius: '8px',
            marginTop: '20px'
          }}>
            <Space split={<span className="text-gray-400">•</span>}>
              <span style={{ fontWeight: 500 }}>
                <span style={{ color: '#f97316' }}>Работ:</span>{' '}
                <Badge
                  count={templateItems.filter(i => i.type === 'work' || i.type === 'sub_work').length}
                  style={{ backgroundColor: '#f97316' }}
                />
              </span>
              <span style={{ fontWeight: 500 }}>
                <span style={{ color: '#3b82f6' }}>Материалов:</span>{' '}
                <Badge
                  count={templateItems.filter(i => i.type === 'material' || i.type === 'sub_material').length}
                  style={{ backgroundColor: '#3b82f6' }}
                />
              </span>
              <span style={{ fontWeight: 500 }}>
                <span style={{ color: '#10b981' }}>Привязанных:</span>{' '}
                <Badge
                  count={templateItems.filter(i => i.is_linked_to_work).length}
                  style={{ backgroundColor: '#10b981' }}
                />
              </span>
            </Space>
          </div>
        )}
      </Card>
    </>
  );
};

export default EnhancedInlineTemplateForm;