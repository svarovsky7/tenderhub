import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Select, 
  Button, 
  Space, 
  Typography, 
  Card, 
  Descriptions, 
  message,
  Spin,
  Tag,
  Tooltip,
  Input,
  Form
} from 'antd';
import { 
  SaveOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined,
  PlusOutlined,
  StarOutlined,
  StarFilled
} from '@ant-design/icons';
import {
  getAllMarkupTemplates,
  applyTemplateToTender,
  createTemplateFromTenderMarkup,
  setDefaultMarkupTemplate
} from '../../lib/supabase/api/markup-templates';
import { getActiveTenderMarkup } from '../../lib/supabase/api/tender-markup';
import type { MarkupTemplate } from '../../lib/supabase/types/tender-markup';

const { Text, Title } = Typography;
const { Option } = Select;

interface MarkupTemplateSelectorProps {
  tenderId: string;
  onTemplateApplied?: () => void;
}

export const MarkupTemplateSelector: React.FC<MarkupTemplateSelectorProps> = ({
  tenderId,
  onTemplateApplied
}) => {
  const [templates, setTemplates] = useState<MarkupTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MarkupTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      setSelectedTemplate(template || null);
    } else {
      setSelectedTemplate(null);
    }
  }, [selectedTemplateId, templates]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      console.log('🚀 [MarkupTemplateSelector] Loading templates');
      const data = await getAllMarkupTemplates();
      setTemplates(data);
      
      // Выбираем шаблон по умолчанию при загрузке
      const defaultTemplate = data.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      }
      
      console.log('✅ [MarkupTemplateSelector] Templates loaded:', data.length);
    } catch (error) {
      console.error('❌ [MarkupTemplateSelector] Error loading templates:', error);
      message.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) {
      message.warning('Выберите шаблон для применения');
      return;
    }

    setApplying(true);
    try {
      console.log('🚀 [MarkupTemplateSelector] Applying template:', selectedTemplateId);
      await applyTemplateToTender(tenderId, selectedTemplateId);
      message.success('Шаблон успешно применен');
      
      if (onTemplateApplied) {
        onTemplateApplied();
      }
      
      console.log('✅ [MarkupTemplateSelector] Template applied successfully');
    } catch (error) {
      console.error('❌ [MarkupTemplateSelector] Error applying template:', error);
      message.error('Ошибка применения шаблона');
    } finally {
      setApplying(false);
    }
  };

  const handleSaveAsTemplate = async (values: { name: string; description?: string }) => {
    try {
      console.log('🚀 [MarkupTemplateSelector] Saving current markup as template');
      
      const template = await createTemplateFromTenderMarkup(
        tenderId,
        values.name,
        values.description
      );
      
      message.success('Шаблон успешно сохранен');
      setSaveModalVisible(false);
      form.resetFields();
      
      // Перезагружаем список шаблонов
      await loadTemplates();
      
      // Выбираем новый шаблон
      setSelectedTemplateId(template.id);
      
      console.log('✅ [MarkupTemplateSelector] Template saved:', template);
    } catch (error) {
      console.error('❌ [MarkupTemplateSelector] Error saving template:', error);
      message.error('Ошибка сохранения шаблона');
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      console.log('🚀 [MarkupTemplateSelector] Setting default template:', templateId);
      await setDefaultMarkupTemplate(templateId);
      message.success('Шаблон установлен по умолчанию');
      await loadTemplates();
      console.log('✅ [MarkupTemplateSelector] Default template set');
    } catch (error) {
      console.error('❌ [MarkupTemplateSelector] Error setting default:', error);
      message.error('Ошибка установки шаблона по умолчанию');
    }
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0%';
    return `${value}%`;
  };

  return (
    <>
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>Шаблоны накруток</span>
          </div>
        }
        extra={
          <Button
            icon={<SaveOutlined />}
            onClick={() => setSaveModalVisible(true)}
            type="link"
          >
            Сохранить текущие настройки как шаблон
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Spin spinning={loading}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space style={{ width: '100%' }}>
              <Select
                style={{ width: 300 }}
                placeholder="Выберите шаблон накруток"
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                loading={loading}
              >
                {templates.map(template => (
                  <Option key={template.id} value={template.id}>
                    {template.is_default && <StarFilled style={{ color: '#faad14', marginRight: 4 }} />}
                    {template.name}
                  </Option>
                ))}
              </Select>
              
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleApplyTemplate}
                loading={applying}
                disabled={!selectedTemplateId}
              >
                Применить шаблон
              </Button>
              
              {selectedTemplate && !selectedTemplate.is_default && (
                <Tooltip title="Установить как шаблон по умолчанию">
                  <Button
                    icon={<StarOutlined />}
                    onClick={() => handleSetDefault(selectedTemplate.id)}
                  >
                    По умолчанию
                  </Button>
                </Tooltip>
              )}
            </Space>

            {selectedTemplate && (
              <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                <Title level={5} style={{ marginBottom: 16 }}>
                  {selectedTemplate.name}
                  {selectedTemplate.is_default && (
                    <Tag color="gold" style={{ marginLeft: 8 }}>По умолчанию</Tag>
                  )}
                </Title>
                
                {selectedTemplate.description && (
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    {selectedTemplate.description}
                  </Text>
                )}

                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Работы 1,6">
                    {formatPercentage(selectedTemplate.works_16_markup)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Служба механизации">
                    {formatPercentage(selectedTemplate.mechanization_service)}
                  </Descriptions.Item>
                  <Descriptions.Item label="МБП+ГСМ">
                    {formatPercentage(selectedTemplate.mbp_gsm)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Гарантийный период">
                    {formatPercentage(selectedTemplate.warranty_period)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Рост стоимости работ">
                    {formatPercentage(selectedTemplate.works_cost_growth)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Рост стоимости материалов">
                    {formatPercentage(selectedTemplate.materials_cost_growth)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Рост работ субподряда">
                    {formatPercentage(selectedTemplate.subcontract_works_cost_growth)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Рост материалов субподряда">
                    {formatPercentage(selectedTemplate.subcontract_materials_cost_growth)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Непредвиденные затраты">
                    {formatPercentage(selectedTemplate.contingency_costs)}
                  </Descriptions.Item>
                  <Descriptions.Item label="ООЗ собств. силы">
                    {formatPercentage(selectedTemplate.overhead_own_forces)}
                  </Descriptions.Item>
                  <Descriptions.Item label="ООЗ Субподряд">
                    {formatPercentage(selectedTemplate.overhead_subcontract)}
                  </Descriptions.Item>
                  <Descriptions.Item label="ОФЗ">
                    {formatPercentage(selectedTemplate.general_costs_without_subcontract)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Прибыль собств. силы">
                    {formatPercentage(selectedTemplate.profit_own_forces)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Прибыль субподряд">
                    {formatPercentage(selectedTemplate.profit_subcontract)}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </Space>
        </Spin>
      </Card>

      <Modal
        title="Сохранить текущие настройки как шаблон"
        open={saveModalVisible}
        onCancel={() => {
          setSaveModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveAsTemplate}
        >
          <Form.Item
            name="name"
            label="Название шаблона"
            rules={[
              { required: true, message: 'Введите название шаблона' },
              { max: 100, message: 'Максимум 100 символов' }
            ]}
          >
            <Input 
              placeholder="Например: Шаблон для крупных проектов"
              prefix={<FileTextOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание (опционально)"
            rules={[
              { max: 500, message: 'Максимум 500 символов' }
            ]}
          >
            <Input.TextArea 
              rows={3}
              placeholder="Краткое описание назначения шаблона"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setSaveModalVisible(false);
                form.resetFields();
              }}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                Сохранить шаблон
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};