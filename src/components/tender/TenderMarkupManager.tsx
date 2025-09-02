import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, Space, Typography, Row, Col, message, Tooltip, Divider, Tag, Select, Modal, Input } from 'antd';
import { SaveOutlined, ReloadOutlined, CalculatorOutlined, CopyOutlined, HistoryOutlined, CheckCircleOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getActiveTenderMarkup,
  getAllTenderMarkups,
  updateTenderMarkup,
  createTenderMarkup,
  activateTenderMarkup,
  deleteTenderMarkup,
  calculateMarkupFinancials
} from '../../lib/supabase/api/tender-markup';
import {
  getAllMarkupTemplates,
  applyTemplateToTender,
  createTemplateFromTenderMarkup
} from '../../lib/supabase/api/markup-templates';
import type { TenderMarkupPercentages, MarkupTemplate } from '../../lib/supabase/types/tender-markup';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TenderMarkupManagerProps {
  tenderId: string;
  tenderName?: string;
  baseCosts?: {
    materials: number;
    works: number;
    submaterials: number;
    subworks: number;
  };
}

export const TenderMarkupManager: React.FC<TenderMarkupManagerProps> = ({
  tenderId,
  tenderName,
  baseCosts = {
    materials: 0,
    works: 0,
    submaterials: 0,
    subworks: 0
  }
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [calculatedFinancials, setCalculatedFinancials] = useState<any>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Queries
  const { data: activeMarkup, isLoading: isLoadingActive } = useQuery({
    queryKey: ['tenderMarkup', tenderId],
    queryFn: () => getActiveTenderMarkup(tenderId),
    enabled: !!tenderId
  });

  const { data: allMarkups = [] } = useQuery({
    queryKey: ['tenderMarkupHistory', tenderId],
    queryFn: () => getAllTenderMarkups(tenderId),
    enabled: !!tenderId && isHistoryVisible
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['markupTemplates'],
    queryFn: getAllMarkupTemplates
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      updateTenderMarkup(id, updates),
    onSuccess: () => {
      message.success('Накрутки успешно обновлены');
      queryClient.invalidateQueries({ queryKey: ['tenderMarkup', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['tenderMarkupHistory', tenderId] });
    },
    onError: (error: any) => {
      message.error(`Ошибка обновления: ${error.message}`);
    }
  });

  const createMutation = useMutation({
    mutationFn: (markup: any) => createTenderMarkup(markup),
    onSuccess: () => {
      message.success('Новая конфигурация накруток создана');
      queryClient.invalidateQueries({ queryKey: ['tenderMarkup', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['tenderMarkupHistory', tenderId] });
    },
    onError: (error: any) => {
      message.error(`Ошибка создания: ${error.message}`);
    }
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateTenderMarkup(id, tenderId),
    onSuccess: () => {
      message.success('Конфигурация активирована');
      queryClient.invalidateQueries({ queryKey: ['tenderMarkup', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['tenderMarkupHistory', tenderId] });
    },
    onError: (error: any) => {
      message.error(`Ошибка активации: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenderMarkup,
    onSuccess: () => {
      message.success('Конфигурация удалена');
      queryClient.invalidateQueries({ queryKey: ['tenderMarkup', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['tenderMarkupHistory', tenderId] });
    },
    onError: (error: any) => {
      message.error(`Ошибка удаления: ${error.message}`);
    }
  });

  const applyTemplateMutation = useMutation({
    mutationFn: ({ templateId }: { templateId: string }) =>
      applyTemplateToTender(tenderId, templateId),
    onSuccess: () => {
      message.success('Шаблон успешно применен');
      queryClient.invalidateQueries({ queryKey: ['tenderMarkup', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['tenderMarkupHistory', tenderId] });
    },
    onError: (error: any) => {
      message.error(`Ошибка применения шаблона: ${error.message}`);
    }
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createTemplateFromTenderMarkup(tenderId, name, description),
    onSuccess: () => {
      message.success('Шаблон успешно создан');
      queryClient.invalidateQueries({ queryKey: ['markupTemplates'] });
      setIsTemplateModalVisible(false);
      setTemplateName('');
      setTemplateDescription('');
    },
    onError: (error: any) => {
      message.error(`Ошибка создания шаблона: ${error.message}`);
    }
  });

  // Set form values when active markup loads
  useEffect(() => {
    if (activeMarkup) {
      form.setFieldsValue({
        works_16_markup: activeMarkup.works_16_markup,
        mechanization_service: activeMarkup.mechanization_service,
        mbp_gsm: activeMarkup.mbp_gsm,
        warranty_period: activeMarkup.warranty_period,
        works_cost_growth: activeMarkup.works_cost_growth,
        materials_cost_growth: activeMarkup.materials_cost_growth,
        subcontract_works_cost_growth: activeMarkup.subcontract_works_cost_growth,
        subcontract_materials_cost_growth: activeMarkup.subcontract_materials_cost_growth,
        contingency_costs: activeMarkup.contingency_costs,
        overhead_own_forces: activeMarkup.overhead_own_forces,
        overhead_subcontract: activeMarkup.overhead_subcontract,
        general_costs_without_subcontract: activeMarkup.general_costs_without_subcontract,
        profit_own_forces: activeMarkup.profit_own_forces,
        profit_subcontract: activeMarkup.profit_subcontract,
        notes: activeMarkup.notes
      });
      calculateFinancials();
    }
  }, [activeMarkup]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (activeMarkup) {
        await updateMutation.mutateAsync({
          id: activeMarkup.id,
          updates: values
        });
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCreateNew = async () => {
    try {
      const values = await form.validateFields();
      await createMutation.mutateAsync({
        tender_id: tenderId,
        ...values,
        is_active: true
      });
    } catch (error) {
      console.error('Creation failed:', error);
    }
  };

  const handleApplyTemplate = async () => {
    if (selectedTemplateId) {
      await applyTemplateMutation.mutateAsync({ templateId: selectedTemplateId });
      setSelectedTemplateId(null);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (templateName) {
      await saveAsTemplateMutation.mutateAsync({
        name: templateName,
        description: templateDescription
      });
    }
  };

  const calculateFinancials = () => {
    const values = form.getFieldsValue();
    if (activeMarkup) {
      const result = calculateMarkupFinancials(baseCosts, {
        ...activeMarkup,
        ...values
      });
      setCalculatedFinancials(result);
    }
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="p-4">
      <Card
        title={
          <Space>
            <CalculatorOutlined />
            <span>Управление накрутками тендера</span>
            {tenderName && <Tag color="blue">{tenderName}</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Select
              placeholder="Применить шаблон"
              style={{ width: 200 }}
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              options={templates.map(t => ({
                label: t.name,
                value: t.id,
                description: t.description
              }))}
            />
            {selectedTemplateId && (
              <Button type="primary" onClick={handleApplyTemplate} loading={applyTemplateMutation.isPending}>
                Применить
              </Button>
            )}
            <Button
              icon={<CopyOutlined />}
              onClick={() => setIsTemplateModalVisible(true)}
            >
              Сохранить как шаблон
            </Button>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setIsHistoryVisible(!isHistoryVisible)}
            >
              История
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={calculateFinancials}
        >
          <Divider orientation="left">Основные накрутки</Divider>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="works_16_markup"
                label={
                  <Tooltip title="Коэффициент увеличения стоимости работ">
                    Работы 1,6
                  </Tooltip>
                }
                rules={[{ required: true, message: 'Обязательное поле' }]}
              >
                <InputNumber
                  min={0}
                  max={1000}
                  step={10}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="mechanization_service"
                label={
                  <Tooltip title="Служба механизации (бурильщики, автотехника, электрики)">
                    Служба механизации
                  </Tooltip>
                }
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="mbp_gsm"
                label={
                  <Tooltip title="Малоценные быстроизнашивающиеся предметы и ГСМ">
                    МБП+ГСМ
                  </Tooltip>
                }
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="warranty_period"
                label={
                  <Tooltip title="Затраты на гарантийное обслуживание (5 лет)">
                    Гарантийный период
                  </Tooltip>
                }
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Рост стоимости</Divider>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="works_cost_growth"
                label="Рост стоимости работ"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="materials_cost_growth"
                label="Рост стоимости материалов"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="subcontract_works_cost_growth"
                label="Рост работ субподряда"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="subcontract_materials_cost_growth"
                label="Рост материалов субподряда"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Затраты и прибыль</Divider>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="contingency_costs"
                label={
                  <Tooltip title="Непредвиденные затраты">
                    Непредвиденные затраты
                  </Tooltip>
                }
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="overhead_own_forces"
                label={
                  <Tooltip title="Общехозяйственные затраты собственными силами">
                    ООЗ собств. силы
                  </Tooltip>
                }
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="overhead_subcontract"
                label={
                  <Tooltip title="Общехозяйственные затраты субподряда">
                    ООЗ Субподряд
                  </Tooltip>
                }
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="general_costs_without_subcontract"
                label={
                  <Tooltip title="Общефирменные затраты (без субподряда)">
                    ОФЗ (без субподряда)
                  </Tooltip>
                }
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="profit_own_forces"
                label="Прибыль собств. силы"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="profit_subcontract"
                label="Прибыль субподряд"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Дополнительно</Divider>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item
                name="notes"
                label="Примечания"
              >
                <TextArea rows={3} placeholder="Дополнительные примечания к конфигурации" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={updateMutation.isPending}
            >
              Сохранить изменения
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={handleCreateNew}
              loading={createMutation.isPending}
            >
              Создать новую конфигурацию
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                if (activeMarkup) {
                  form.setFieldsValue(activeMarkup);
                  calculateFinancials();
                }
              }}
            >
              Сбросить
            </Button>
            <Button
              icon={<CalculatorOutlined />}
              onClick={calculateFinancials}
            >
              Пересчитать
            </Button>
          </Space>
        </Form>

        {calculatedFinancials && (
          <Card className="mt-4" title="Расчетные показатели" size="small">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8} md={6}>
                <Text type="secondary">Материалы с ростом:</Text>
                <div className="font-bold">{formatNumber(calculatedFinancials.materialsWithGrowth)} ₽</div>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Text type="secondary">Работы с ростом:</Text>
                <div className="font-bold">{formatNumber(calculatedFinancials.worksWithGrowth)} ₽</div>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Text type="secondary">Непредвиденные:</Text>
                <div className="font-bold">{formatNumber(calculatedFinancials.contingencyCost)} ₽</div>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Text type="secondary">ООЗ собств. силы:</Text>
                <div className="font-bold">{formatNumber(calculatedFinancials.overheadOwnForces)} ₽</div>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Text type="secondary">ООЗ субподряд:</Text>
                <div className="font-bold">{formatNumber(calculatedFinancials.overheadSubcontract)} ₽</div>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Text type="secondary">Общая прибыль:</Text>
                <div className="font-bold">{formatNumber(calculatedFinancials.totalProfit)} ₽</div>
              </Col>
              <Col xs={24}>
                <Divider />
                <Text strong>Итого с накрутками: </Text>
                <Text strong className="text-xl text-blue-600">
                  {formatNumber(calculatedFinancials.totalCostWithProfit)} ₽
                </Text>
              </Col>
            </Row>
          </Card>
        )}
      </Card>

      {/* History Modal */}
      <Modal
        title="История конфигураций накруток"
        open={isHistoryVisible}
        onCancel={() => setIsHistoryVisible(false)}
        width={900}
        footer={null}
      >
        <div className="space-y-2">
          {allMarkups.map(markup => (
            <Card
              key={markup.id}
              size="small"
              className={markup.is_active ? 'border-blue-500 border-2' : ''}
              extra={
                <Space>
                  {markup.is_active && <Tag color="green">Активная</Tag>}
                  {!markup.is_active && (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => activateMutation.mutate(markup.id)}
                    >
                      Активировать
                    </Button>
                  )}
                  {!markup.is_active && (
                    <Button
                      size="small"
                      type="link"
                      danger
                      onClick={() => deleteMutation.mutate(markup.id)}
                    >
                      Удалить
                    </Button>
                  )}
                </Space>
              }
            >
              <Row gutter={[8, 8]}>
                <Col span={6}>
                  <Text type="secondary">Создано:</Text><br />
                  {new Date(markup.created_at).toLocaleString('ru-RU')}
                </Col>
                <Col span={6}>
                  <Text type="secondary">Работы 1,6:</Text> {markup.works_16_markup}%
                </Col>
                <Col span={6}>
                  <Text type="secondary">Прибыль собств.:</Text> {markup.profit_own_forces}%
                </Col>
                <Col span={6}>
                  <Text type="secondary">Прибыль субподряд:</Text> {markup.profit_subcontract}%
                </Col>
                {markup.notes && (
                  <Col span={24}>
                    <Text type="secondary">Примечание:</Text> {markup.notes}
                  </Col>
                )}
              </Row>
            </Card>
          ))}
        </div>
      </Modal>

      {/* Save as Template Modal */}
      <Modal
        title="Сохранить как шаблон"
        open={isTemplateModalVisible}
        onOk={handleSaveAsTemplate}
        onCancel={() => {
          setIsTemplateModalVisible(false);
          setTemplateName('');
          setTemplateDescription('');
        }}
        confirmLoading={saveAsTemplateMutation.isPending}
      >
        <Form layout="vertical">
          <Form.Item
            label="Название шаблона"
            required
          >
            <Input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="Например: Стандартный проект"
            />
          </Form.Item>
          <Form.Item label="Описание">
            <TextArea
              value={templateDescription}
              onChange={e => setTemplateDescription(e.target.value)}
              rows={3}
              placeholder="Опишите назначение шаблона"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};