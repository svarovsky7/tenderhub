import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Empty, 
  Spin, 
  message, 
  Modal, 
  Form, 
  Input, 
  Space,
  Typography,
  Card
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { clientPositionsApi, boqApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import ClientPositionCardStreamlined from './ClientPositionCardStreamlined';
import type { ClientPositionInsert } from '../../lib/supabase/types';

const { Title } = Typography;

interface TenderBOQManagerSimplifiedProps {
  tenderId: string;
  onStatsUpdate?: (stats: { works: number; materials: number; total: number; positions: number }) => void;
}

interface ClientPositionWithStats {
  id: string;
  tender_id: string;
  position_number: number;
  item_no: string;
  work_name: string;
  total_materials_cost: number;
  total_works_cost: number;
  created_at: string;
  updated_at: string;
  boq_items?: any[];
  materials_count?: number;
  works_count?: number;
  total_position_cost?: number;
}

const TenderBOQManagerSimplified: React.FC<TenderBOQManagerSimplifiedProps> = ({ 
  tenderId,
  onStatsUpdate 
}) => {
  console.log('🚀 TenderBOQManagerSimplified rendered for tender:', tenderId);

  const [positions, setPositions] = useState<ClientPositionWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Calculate and update stats
  const updateStats = useCallback((positionsList: ClientPositionWithStats[]) => {
    const stats = {
      positions: positionsList.length,
      works: 0,
      materials: 0,
      total: 0
    };

    positionsList.forEach(position => {
      const items = position.boq_items || [];
      stats.works += items.filter(item => item.item_type === 'work' || item.item_type === 'sub_work').length;
      stats.materials += items.filter(item => item.item_type === 'material' || item.item_type === 'sub_material').length;
      // Use the calculated total_position_cost which includes delivery
      stats.total += position.total_position_cost || 0;
    });

    console.log('📊 Stats calculated:', stats);
    onStatsUpdate?.(stats);
  }, [onStatsUpdate]);

  // Load positions
  const loadPositions = useCallback(async () => {
    console.log('📡 Loading positions for tender:', tenderId);
    setLoading(true);
    try {
      const result = await clientPositionsApi.getByTenderId(tenderId);
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ Positions loaded:', result.data?.length);
      
      // Load BOQ items for each position with work-material links
      const positionsWithItems = await Promise.all(
        (result.data || []).map(async (pos) => {
          // Load BOQ items for this position
          const { data: boqItems } = await boqApi.getByClientPositionId(pos.id);
          
          const items = boqItems || [];
          
          // Load work-material links for this position
          const { data: links } = await workMaterialLinksApi.getLinksByPosition(pos.id);
          console.log('🔗 Links loaded for position:', pos.id, links);
          
          // Process items to add link information
          const processedItems = items.map(item => {
            if ((item.item_type === 'material' || item.item_type === 'sub_material') && links && links.length > 0) {
              // Find ALL works this material is linked to (material can be linked to multiple works)
              const materialLinks = links.filter(l => {
                // Check both regular material and sub_material fields
                return l.material_boq_item_id === item.id || 
                       l.sub_material_boq_item_id === item.id ||
                       (l.material && l.material.id === item.id);
              });
              
              if (materialLinks.length > 0) {
                console.log('📎 Found links for material:', item.description, materialLinks);
                return {
                  ...item,
                  // Support multiple links
                  work_links: materialLinks.map(link => ({
                    ...link,
                    material_quantity_per_work: link.material_quantity_per_work || link.material_consumption_coefficient || 1,
                    usage_coefficient: link.usage_coefficient || link.material_conversion_coefficient || 1
                  })),
                  // Keep single link for backward compatibility
                  work_link: materialLinks[0] ? {
                    ...materialLinks[0],
                    work_boq_item_id: materialLinks[0].work_boq_item_id,
                    sub_work_boq_item_id: materialLinks[0].sub_work_boq_item_id,
                    material_boq_item_id: materialLinks[0].material_boq_item_id,
                    sub_material_boq_item_id: materialLinks[0].sub_material_boq_item_id,
                    material_quantity_per_work: materialLinks[0].material_quantity_per_work || materialLinks[0].material_consumption_coefficient || 1,
                    usage_coefficient: materialLinks[0].usage_coefficient || materialLinks[0].material_conversion_coefficient || 1
                  } : undefined
                };
              }
            } else if ((item.item_type === 'work' || item.item_type === 'sub_work') && links && links.length > 0) {
              // Find materials linked to this work
              const workLinks = links.filter(l => {
                // Check both regular work and sub_work fields
                return l.work_boq_item_id === item.id || 
                       l.sub_work_boq_item_id === item.id ||
                       (l.work && l.work.id === item.id);
              });
              if (workLinks.length > 0) {
                console.log('📎 Found materials for work:', item.description, workLinks);
                return {
                  ...item,
                  linked_materials: workLinks.map(wl => ({
                    ...wl,
                    material_quantity_per_work: wl.material_quantity_per_work || wl.material_consumption_coefficient || 1,
                    usage_coefficient: wl.usage_coefficient || wl.material_conversion_coefficient || 1
                  }))
                };
              }
            }
            return item;
          });
          
          // Calculate total position cost from actual BOQ items including delivery
          let calculatedTotal = 0;
          processedItems.forEach(item => {
            let quantity = item.quantity || 0;
            const unitRate = item.unit_rate || 0;
            
            // For linked materials, calculate quantity based on work volume and coefficients
            if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
              // Find the linked work
              const work = processedItems.find(procItem => {
                if (item.work_link.work_boq_item_id && 
                    procItem.id === item.work_link.work_boq_item_id && 
                    procItem.item_type === 'work') {
                  return true;
                }
                if (item.work_link.sub_work_boq_item_id && 
                    procItem.id === item.work_link.sub_work_boq_item_id && 
                    procItem.item_type === 'sub_work') {
                  return true;
                }
                return false;
              });
              
              if (work) {
                // Get coefficients from BOQ item first, then from work_link
                const consumptionCoef = item.consumption_coefficient || 
                                       item.work_link.material_quantity_per_work || 1;
                const conversionCoef = item.conversion_coefficient || 
                                      item.work_link.usage_coefficient || 1;
                const workQuantity = work.quantity || 0;
                quantity = workQuantity * consumptionCoef * conversionCoef;
              }
            }
            
            let itemTotal = quantity * unitRate;
            
            // Add delivery cost for materials
            if (item.item_type === 'material' || item.item_type === 'sub_material') {
              const deliveryType = item.delivery_price_type;
              const deliveryAmount = item.delivery_amount || 0;
              
              if (deliveryType === 'amount' && deliveryAmount > 0) {
                itemTotal += deliveryAmount * quantity;
              } else if (deliveryType === 'not_included') {
                itemTotal += deliveryAmount * quantity; // Используем значение из БД
              }
            }
            
            calculatedTotal += itemTotal;
          });
          
          return {
            ...pos,
            boq_items: processedItems,
            materials_count: items.filter(item => item.item_type === 'material').length,
            works_count: items.filter(item => item.item_type === 'work').length,
            total_position_cost: calculatedTotal
          };
        })
      );
      
      console.log('✅ Positions with items loaded:', positionsWithItems);
      setPositions(positionsWithItems);
      updateStats(positionsWithItems);
    } catch (error) {
      console.error('❌ Load positions error:', error);
      message.error('Ошибка загрузки позиций');
    } finally {
      setLoading(false);
    }
  }, [tenderId, updateStats]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Toggle position expansion
  const togglePosition = useCallback((positionId: string) => {
    console.log('🔄 Toggling position:', positionId);
    setExpandedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(positionId)) {
        newSet.delete(positionId);
      } else {
        newSet.add(positionId);
      }
      return newSet;
    });
  }, []);

  // Create new position
  const handleCreatePosition = useCallback(async (values: any) => {
    console.log('🚀 Creating new position:', values);
    setLoading(true);
    try {
      const nextNumber = positions.length > 0 
        ? Math.max(...positions.map(p => p.position_number)) + 1
        : 1;
        
      const positionData: ClientPositionInsert = {
        tender_id: tenderId,
        position_number: nextNumber,
        item_no: `${nextNumber}`,
        work_name: values.work_name,
        total_materials_cost: 0,
        total_works_cost: 0
      };

      const result = await clientPositionsApi.create(positionData);
      if (result.error) {
        throw new Error(result.error);
      }

      console.log('✅ Position created successfully');
      message.success('Позиция создана');
      setCreateModalVisible(false);
      form.resetFields();
      loadPositions();
    } catch (error) {
      console.error('❌ Create position error:', error);
      message.error('Ошибка создания позиции');
    } finally {
      setLoading(false);
    }
  }, [tenderId, positions, form, loadPositions]);

  return (
    <div className="w-full">
      {/* Header */}
      <Card className="shadow-sm mb-4 w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <Title level={4} className="mb-0">
            Позиции заказчика
          </Title>
          <Space className="flex-shrink-0">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadPositions}
              loading={loading}
            >
              Обновить
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              size="large"
            >
              Новая позиция
            </Button>
          </Space>
        </div>
      </Card>

      {/* Positions List */}
      {loading && positions.length === 0 ? (
        <Card className="text-center py-12 w-full">
          <Spin size="large" />
        </Card>
      ) : positions.length === 0 ? (
        <Card className="w-full">
          <Empty
            description="Нет позиций заказчика"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              size="large"
            >
              Создать первую позицию
            </Button>
          </Empty>
        </Card>
      ) : (
        <div className="space-y-3 w-full">
          {positions.map(position => (
            <ClientPositionCardStreamlined
              key={position.id}
              position={position}
              isExpanded={expandedPositions.has(position.id)}
              onToggle={() => togglePosition(position.id)}
              onUpdate={loadPositions}
              tenderId={tenderId}
            />
          ))}
        </div>
      )}

      {/* Create Position Modal */}
      <Modal
        title="Создать позицию заказчика"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreatePosition}
          autoComplete="off"
        >
          <Form.Item
            name="work_name"
            label="Название позиции"
            rules={[{ required: true, message: 'Введите название позиции' }]}
          >
            <Input 
              placeholder="Например: Земляные работы" 
              size="large"
              autoFocus
            />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}
              size="large"
            >
              Отмена
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
            >
              Создать позицию
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TenderBOQManagerSimplified;