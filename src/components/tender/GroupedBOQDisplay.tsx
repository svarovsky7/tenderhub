import React from 'react';
import { Card, Typography, Tag, Space, Divider, Row, Col, Empty, Button, Tooltip } from 'antd';
import { BuildOutlined, ToolOutlined, LinkOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { BOQItemWithLibrary } from '../../lib/supabase/types';

const { Text, Title } = Typography;

interface GroupedBOQDisplayProps {
  items: BOQItemWithLibrary[];
  onEdit?: (item: BOQItemWithLibrary) => void;
  onDelete?: (itemId: string) => void;
}

interface WorkGroup {
  work: BOQItemWithLibrary;
  materials: BOQItemWithLibrary[];
}

const GroupedBOQDisplay: React.FC<GroupedBOQDisplayProps> = ({ items, onEdit, onDelete }) => {
  console.log('🚀 GroupedBOQDisplay rendering with items:', items.length);

  // Group items by work and their linked materials
  const groupedItems: WorkGroup[] = [];
  const standaloneMaterials: BOQItemWithLibrary[] = [];
  const processedMaterialIds = new Set<string>();

  // First, find all works and their linked materials
  items.forEach(item => {
    if (item.item_type === 'work') {
      const linkedMaterials = items.filter(material => 
        material.item_type === 'material' && 
        material.work_link?.work_boq_item_id === item.id
      );
      
      // Mark these materials as processed
      linkedMaterials.forEach(mat => processedMaterialIds.add(mat.id));
      
      groupedItems.push({
        work: item,
        materials: linkedMaterials
      });
    }
  });

  // Then, collect standalone materials
  items.forEach(item => {
    if (item.item_type === 'material' && !processedMaterialIds.has(item.id)) {
      standaloneMaterials.push(item);
    }
  });

  const formatValue = (value: number | null | undefined, suffix: string = '') => {
    if (value === null || value === undefined) return '—';
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + suffix;
  };

  const renderWorkGroup = (group: WorkGroup) => {
    const workTotal = (group.work.quantity || 0) * (group.work.unit_rate || 0);
    const materialsTotal = group.materials.reduce((sum, mat) => {
      if (mat.work_link) {
        // Get coefficients from BOQ item first, then from work_link
        const consumptionCoef = mat.consumption_coefficient || 
                               mat.work_link.material_quantity_per_work || 1;
        const conversionCoef = mat.conversion_coefficient || 
                              mat.work_link.usage_coefficient || 1;
        const workQuantity = group.work.quantity || 0;
        const calculatedQuantity = workQuantity * consumptionCoef * conversionCoef;
        return sum + (calculatedQuantity * (mat.unit_rate || 0));
      }
      return sum + ((mat.quantity || 0) * (mat.unit_rate || 0));
    }, 0);

    return (
      <Card 
        key={group.work.id}
        className="mb-4 shadow-sm hover:shadow-md transition-shadow"
        bodyStyle={{ padding: '12px 16px' }}
      >
        {/* Work Header */}
        <div className="bg-green-50 -mx-4 -mt-3 px-4 py-3 mb-3 border-b border-green-200">
          <Row gutter={[16, 8]} align="middle">
            <Col xs={24} sm={12} lg={14}>
              <Space>
                <Tag icon={<BuildOutlined />} color="green" className="text-sm">
                  Работа
                </Tag>
                <Text strong className="text-base">{group.work.item_number}</Text>
                <Text className="text-gray-700">{group.work.description}</Text>
              </Space>
            </Col>
            <Col xs={12} sm={4} lg={3}>
              <div>
                <Text type="secondary" className="text-xs">Объем:</Text>
                <div className="font-medium">
                  {formatValue(group.work.quantity)} {group.work.unit}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={4} lg={3}>
              <div>
                <Text type="secondary" className="text-xs">Цена:</Text>
                <div className="font-medium">
                  {formatValue(group.work.unit_rate, ' ₽')}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={4} lg={4}>
              <div className="text-right">
                <Text type="secondary" className="text-xs">Сумма работы:</Text>
                <div className="font-bold text-green-600 text-lg">
                  {formatValue(workTotal, ' ₽')}
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Linked Materials */}
        {group.materials.length > 0 && (
          <div className="ml-6">
            <div className="flex items-center gap-2 mb-2">
              <LinkOutlined className="text-orange-500" />
              <Text type="secondary" className="text-sm">
                Связанные материалы ({group.materials.length})
              </Text>
              <div className="flex-1 h-px bg-orange-200"></div>
            </div>
            
            {group.materials.map(material => {
              const linkInfo = material.work_link;
              // Get coefficients from BOQ item first, then from work_link
              const consumptionCoef = material.consumption_coefficient || 
                                     linkInfo?.material_quantity_per_work || 1;
              const conversionCoef = material.conversion_coefficient || 
                                    linkInfo?.usage_coefficient || 1;
              const workQuantity = group.work.quantity || 0;
              const calculatedQuantity = workQuantity * consumptionCoef * conversionCoef;
              const materialTotal = calculatedQuantity * (material.unit_rate || 0);

              return (
                <div 
                  key={material.id} 
                  className="bg-orange-50 rounded-lg p-3 mb-2 border-l-4 border-orange-300"
                >
                  <Row gutter={[12, 4]} align="middle">
                    <Col xs={24} sm={10} lg={12}>
                      <Space size="small">
                        <Tag icon={<ToolOutlined />} color="orange" className="text-xs">
                          Материал
                        </Tag>
                        <Text className="text-xs font-mono">{material.item_number}</Text>
                        <Text className="text-sm">{material.description}</Text>
                      </Space>
                    </Col>
                    <Col xs={8} sm={3} lg={2}>
                      <div>
                        <Text type="secondary" className="text-xs">К.расх:</Text>
                        <div className={`text-sm font-medium ${consumptionCoef !== 1 ? 'text-orange-600' : 'text-gray-500'}`}>
                          {consumptionCoef}
                        </div>
                      </div>
                    </Col>
                    <Col xs={8} sm={3} lg={2}>
                      <div>
                        <Text type="secondary" className="text-xs">К.пер:</Text>
                        <div className={`text-sm font-medium ${conversionCoef !== 1 ? 'text-green-600' : 'text-gray-500'}`}>
                          {conversionCoef}
                        </div>
                      </div>
                    </Col>
                    <Col xs={8} sm={4} lg={3}>
                      <div>
                        <Text type="secondary" className="text-xs">Кол-во:</Text>
                        <div className="text-sm font-medium text-blue-600">
                          {formatValue(calculatedQuantity)} {material.unit}
                        </div>
                        <div className="text-xs text-gray-500">
                          {workQuantity} × {consumptionCoef} × {conversionCoef}
                        </div>
                      </div>
                    </Col>
                    <Col xs={12} sm={4} lg={2}>
                      <div>
                        <Text type="secondary" className="text-xs">Цена:</Text>
                        <div className="text-sm font-medium">
                          {formatValue(material.unit_rate, ' ₽')}
                        </div>
                      </div>
                    </Col>
                    <Col xs={12} sm={4} lg={3}>
                      <div className="text-right">
                        <Text type="secondary" className="text-xs">Сумма:</Text>
                        <div className="text-sm font-bold text-orange-600">
                          {formatValue(materialTotal, ' ₽')}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              );
            })}

            {/* Materials Summary */}
            <div className="mt-2 pt-2 border-t border-orange-200">
              <Row>
                <Col span={12}>
                  <Text type="secondary" className="text-sm">
                    Итого материалов:
                  </Text>
                </Col>
                <Col span={12} className="text-right">
                  <Text strong className="text-orange-600">
                    {formatValue(materialsTotal, ' ₽')}
                  </Text>
                </Col>
              </Row>
            </div>
          </div>
        )}

        {/* Group Total */}
        <Divider style={{ margin: '12px 0' }} />
        <Row>
          <Col span={12}>
            <Text strong>Итого по блоку:</Text>
          </Col>
          <Col span={12} className="text-right">
            <Text strong className="text-xl text-green-700">
              {formatValue(workTotal + materialsTotal, ' ₽')}
            </Text>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderStandaloneMaterial = (material: BOQItemWithLibrary) => {
    const total = (material.quantity || 0) * (material.unit_rate || 0);
    
    return (
      <Card 
        key={material.id}
        className="mb-3 shadow-sm hover:shadow-md transition-shadow"
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Row gutter={[16, 8]} align="middle">
          <Col xs={24} sm={10} lg={12}>
            <Space>
              <Tag icon={<ToolOutlined />} color="blue" className="text-sm">
                Материал
              </Tag>
              <Text strong className="text-sm">{material.item_number}</Text>
              <Text className="text-gray-700">{material.description}</Text>
            </Space>
          </Col>
          <Col xs={8} sm={3} lg={2}>
            <div>
              <Text type="secondary" className="text-xs">Ед.изм:</Text>
              <div className="text-sm">{material.unit}</div>
            </div>
          </Col>
          <Col xs={8} sm={3} lg={3}>
            <div>
              <Text type="secondary" className="text-xs">Кол-во:</Text>
              <div className="text-sm font-medium">
                {formatValue(material.quantity)} {material.unit}
              </div>
            </div>
          </Col>
          <Col xs={8} sm={3} lg={2}>
            <div>
              <Text type="secondary" className="text-xs">Цена:</Text>
              <div className="text-sm font-medium">
                {formatValue(material.unit_rate, ' ₽')}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={3} lg={3}>
            <div className="text-right">
              <Text type="secondary" className="text-xs">Сумма:</Text>
              <div className="font-bold text-blue-600">
                {formatValue(total, ' ₽')}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={4} lg={3}>
            <Space size="small" className="float-right">
              {onEdit && (
                <Tooltip title="Редактировать">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(material)}
                  />
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Удалить">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(material.id)}
                  />
                </Tooltip>
              )}
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  if (items.length === 0) {
    return (
      <Empty
        description="Нет элементов для отображения"
        className="py-8"
      />
    );
  }

  return (
    <div className="grouped-boq-display">
      {/* Grouped Works with Materials */}
      {groupedItems.length > 0 && (
        <div className="mb-6">
          <Title level={5} className="mb-3 text-gray-700">
            <BuildOutlined className="mr-2" />
            Работы с материалами
          </Title>
          {groupedItems.map(renderWorkGroup)}
        </div>
      )}

      {/* Standalone Materials */}
      {standaloneMaterials.length > 0 && (
        <div>
          <Title level={5} className="mb-3 text-gray-700">
            <ToolOutlined className="mr-2" />
            Отдельные материалы
          </Title>
          {standaloneMaterials.map(renderStandaloneMaterial)}
        </div>
      )}
    </div>
  );
};

export default GroupedBOQDisplay;