import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Empty, 
  Spin, 
  message, 
  Card,
  Space,
  Typography,
  Table,
  Row,
  Col,
  Statistic,
  InputNumber,
  Tooltip,
  Tag
} from 'antd';
import { ReloadOutlined, BuildOutlined, ToolOutlined, DollarOutlined, PercentageOutlined, DownloadOutlined } from '@ant-design/icons';
import { clientPositionsApi, boqApi, tendersApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import { getActiveTenderMarkup } from '../../lib/supabase/api/tender-markup';
import type { ClientPositionInsert, ClientPositionType } from '../../lib/supabase/types';
import type { TenderMarkupPercentages } from '../../lib/supabase/types/tender-markup';
import { formatQuantity } from '../../utils/formatters';
import { 
  calculateBOQItemCommercialCost,
  calculateMainMaterialCommercialCost,
  calculateAuxiliaryMaterialCommercialCost,
  calculateWorkCommercialCost,
  calculateSubcontractWorkCommercialCost,
  calculateSubcontractMaterialCommercialCost,
  calculateAuxiliarySubcontractMaterialCommercialCost,
  calculateMaterialCommercialCost
} from '../../utils/calculateCommercialCost';
import { exportCommercialCostsToExcel } from '../../utils/excel-templates';

const { Title, Text } = Typography;

interface TenderCommercialManagerProps {
  tenderId: string;
  onStatsUpdate?: (stats: { 
    totalBaseCost: number; 
    totalCommercialCost: number; 
    totalMarkup: number; 
    positions: number 
  }) => void;
}

interface ClientPositionWithCommercial {
  id: string;
  tender_id: string;
  position_number: number;
  item_no: string;
  work_name: string;
  unit?: string;                   // Единица измерения из client_positions таблицы
  total_materials_cost: number;
  total_works_cost: number;
  total_commercial_materials_cost?: number;
  total_commercial_works_cost?: number;
  created_at: string;
  updated_at: string;
  position_type?: ClientPositionType;
  boq_items?: any[];
  base_total_cost?: number;
  commercial_total_cost?: number;
  markup_percentage?: number;
  // Новые поля для детализации
  works_unit_price?: number;       // Средняя цена работ за единицу
  materials_unit_price?: number;   // Средняя цена материалов за единицу
  works_total_volume?: number;     // Общий объем работ
  materials_total_volume?: number; // Общий объем материалов
  works_total_cost?: number;       // Итого работы (руб)
  materials_total_cost?: number;   // Итого материалы (руб)
  // Дополнительные поля для количеств
  client_quantity?: number;        // Кол-во Заказчика (area_client)
  gp_quantity?: number;            // Кол-во ГП (area_sp)
  manual_volume?: number;          // Ручной объем
  // Детализация компонентов работ для подсказок
  works_breakdown?: {
    ownWorksCost: number;          // Коммерческая стоимость собственных работ
    subcontractWorksCost: number;  // Коммерческая стоимость субподрядных работ
    auxiliaryMaterialsCost: number; // Полная стоимость вспомогательных материалов
    mainMaterialsMarkup: number;   // Наценки от основных материалов
    subMaterialsMarkup: number;    // Наценки от субматериалов
    ownWorksBaseCost: number;      // Базовая стоимость собственных работ
    subcontractWorksBaseCost: number; // Базовая стоимость субподрядных работ
  };
}

const TenderCommercialManager: React.FC<TenderCommercialManagerProps> = ({ 
  tenderId,
  onStatsUpdate 
}) => {
  console.log('🚀 TenderCommercialManager MOUNTED/RENDERED for tender:', tenderId, 'at', new Date().toISOString());

  const [positions, setPositions] = useState<ClientPositionWithCommercial[]>([]);
  const [loading, setLoading] = useState(false);
  const [tenderName, setTenderName] = useState<string>('');
  const [markups, setMarkups] = useState<TenderMarkupPercentages | null>(null);
  
  // Sort positions by position number
  const sortPositionsByNumber = useCallback((positions: ClientPositionWithCommercial[]): ClientPositionWithCommercial[] => {
    return [...positions].sort((a, b) => a.position_number - b.position_number);
  }, []);

  // Calculate and update stats
  const updateStats = useCallback((positionsList: ClientPositionWithCommercial[]) => {
    const stats = {
      positions: positionsList.length,
      totalBaseCost: 0,
      totalCommercialCost: 0,
      totalMarkup: 0
    };

    positionsList.forEach(position => {
      const baseCost = (position.total_materials_cost || 0) + (position.total_works_cost || 0);
      const commercialCost = (position.total_commercial_materials_cost || 0) + (position.total_commercial_works_cost || 0);
      
      stats.totalBaseCost += baseCost;
      stats.totalCommercialCost += commercialCost;
    });

    stats.totalMarkup = stats.totalCommercialCost - stats.totalBaseCost;

    console.log('📊 Commercial Stats calculated:', stats);
    onStatsUpdate?.(stats);
  }, [onStatsUpdate]);

  // Load positions with commercial data
  const loadPositions = useCallback(async () => {
    console.log('📡 Loading commercial positions for tender:', tenderId);
    console.log('🔍 TENDER ID FOR DISPLAY:', tenderId);
    setLoading(true);
    try {
      // Загружаем информацию о тендере
      const tenderResult = await tendersApi.getById(tenderId);
      if (tenderResult.data) {
        setTenderName(tenderResult.data.title || '');
        console.log('✅ Tender info loaded:', tenderResult.data.title);
      }

      // Загружаем проценты накруток для тендера
      const markupsData = await getActiveTenderMarkup(tenderId);
      if (!markupsData) {
        console.warn('⚠️ No markup percentages found for tender:', tenderId);
        message.warning('Не найдены проценты накруток для тендера');
      }
      setMarkups(markupsData);
      console.log('✅ Markup percentages loaded:', markupsData);

      const result = await clientPositionsApi.getByTenderId(tenderId, {}, { limit: 1000 });
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ Positions loaded:', result.data?.length);

      // Load BOQ items for each position to calculate commercial costs
      const positionsWithCommercial = await Promise.all(
        (result.data || []).map(async (pos) => {
          // Load BOQ items for this position
          const { data: boqItems } = await boqApi.getByClientPositionId(
            pos.id,
            {}, // filters
            { limit: 1000 } // получить все BOQ items для позиции
          );
          
          const items = boqItems || [];
          
          // Calculate base costs
          const baseMaterialsCost = items
            .filter(item => item.item_type === 'material' || item.item_type === 'sub_material')
            .reduce((sum, item) => {
              // Используем total_amount - всегда правильная сумма в рублях
              const baseCost = item.total_amount || 0;
              
              console.log('💰 Material base cost calculation:', {
                description: item.description,
                type: item.item_type,
                baseCost,
                totalAmount: item.total_amount
              });
              
              return sum + baseCost;
            }, 0);
          
          const baseWorksCost = items
            .filter(item => item.item_type === 'work' || item.item_type === 'sub_work')
            .reduce((sum, item) => {
              // Используем total_amount - всегда правильная сумма в рублях
              const baseCost = item.total_amount || 0;
              
              console.log('💰 Work base cost calculation:', {
                description: item.description,
                type: item.item_type,
                baseCost,
                totalAmount: item.total_amount
              });
              
              return sum + baseCost;
            }, 0);

          // Рассчитываем коммерческую стоимость материалов
          // Для основных материалов - остается базовая стоимость
          // Для вспомогательных - остается 0
          const commercialMaterialsCost = items
            .filter(item => item.item_type === 'material' || item.item_type === 'sub_material')
            .reduce((sum, item) => {
              const isAuxiliary = item.material_type === 'auxiliary';
              const quantity = item.quantity || 0;
              const baseCost = item.total_amount || 0;
              
              if (isAuxiliary) {
                // Вспомогательный материал: в материалах остается 0
                console.log('💰 Auxiliary material (stays in materials):', {
                  description: item.description,
                  type: item.item_type,
                  baseCost,
                  staysInMaterials: 0
                });
                return sum + 0;
              } else {
                // Основной материал: в материалах остается только базовая стоимость
                console.log('💰 Main material (stays in materials):', {
                  description: item.description,
                  type: item.item_type,
                  baseCost,
                  staysInMaterials: baseCost
                });
                return sum + baseCost;
              }
            }, 0);

          console.log('📊 Materials cost breakdown:', {
            totalMaterialsCost: commercialMaterialsCost
          });

          // Разделяем расчет собственных и субподрядных работ для детального логирования
          const ownWorksBaseCost = items
            .filter(item => item.item_type === 'work')
            .reduce((sum, item) => {
              const baseCost = item.total_amount || 0;
              return sum + baseCost;
            }, 0);

          const ownWorksCost = items
            .filter(item => item.item_type === 'work')
            .reduce((sum, item) => {
              const commercialTotalCost = item.commercial_cost || 0;
              console.log('💰 Own work commercial cost:', {
                description: item.description,
                type: item.item_type,
                commercialCost: commercialTotalCost
              });
              return sum + commercialTotalCost;
            }, 0);

          const subcontractWorksBaseCost = items
            .filter(item => item.item_type === 'sub_work')
            .reduce((sum, item) => {
              const baseCost = item.total_amount || 0;
              return sum + baseCost;
            }, 0);

          const subcontractWorksCost = items
            .filter(item => item.item_type === 'sub_work')
            .reduce((sum, item) => {
              const commercialTotalCost = item.commercial_cost || 0;
              console.log('💰 Subcontract work commercial cost:', {
                description: item.description,
                type: item.item_type,
                commercialCost: commercialTotalCost
              });
              return sum + commercialTotalCost;
            }, 0);

          const commercialWorksOnlyCost = ownWorksCost + subcontractWorksCost;

          // Рассчитываем наценку от материалов, которая переходит в работы
          let auxiliaryMaterialsCost = 0;
          let mainMaterialsMarkup = 0;
          let subMaterialsMarkup = 0;
          
          items.filter(item => item.item_type === 'material' || item.item_type === 'sub_material')
            .forEach(item => {
              const isAuxiliary = item.material_type === 'auxiliary';
              const quantity = item.quantity || 0;
              const baseCost = item.total_amount || 0;
              const coefficient = item.commercial_markup_coefficient || 1;
              const fullCommercialCost = baseCost * coefficient;
              const markup = fullCommercialCost - baseCost;
              
              if (item.item_type === 'material') {
                if (isAuxiliary) {
                  // Вспомогательный материал: вся коммерческая стоимость переходит в работы
                  auxiliaryMaterialsCost += fullCommercialCost;
                  console.log('💰 Auxiliary material (full cost to works):', {
                    description: item.description,
                    type: item.item_type,
                    baseCost,
                    coefficient,
                    fullCommercialCost,
                    toWorks: fullCommercialCost
                  });
                } else {
                  // Основной материал: только наценка переходит в работы
                  mainMaterialsMarkup += markup;
                  console.log('💰 Main material (markup to works):', {
                    description: item.description,
                    type: item.item_type,
                    baseCost,
                    coefficient,
                    fullCommercialCost,
                    markupToWorks: markup
                  });
                }
              } else if (item.item_type === 'sub_material') {
                if (isAuxiliary) {
                  // Вспомогательный СУБМАТ: вся коммерческая стоимость переходит в субработы
                  subMaterialsMarkup += fullCommercialCost;
                  console.log('💰 Auxiliary sub-material (full cost to subcontract works):', {
                    description: item.description,
                    type: item.item_type,
                    baseCost,
                    coefficient,
                    fullCommercialCost,
                    toSubWorks: fullCommercialCost
                  });
                } else {
                  // Основной СУБМАТ: только наценка переходит в субработы
                  subMaterialsMarkup += markup;
                  console.log('💰 Main sub-material (markup to subcontract works):', {
                    description: item.description,
                    type: item.item_type,
                    baseCost,
                    coefficient,
                    fullCommercialCost,
                    markupToSubWorks: markup
                  });
                }
              }
            });
            
          const totalWorksMarkupFromMaterials = auxiliaryMaterialsCost + mainMaterialsMarkup + subMaterialsMarkup;

          console.log('📊 Works cost breakdown:', {
            ownWorksCost,
            subcontractWorksCost,
            auxiliaryMaterialsCost,
            mainMaterialsMarkup,
            subMaterialsMarkup,
            totalWorksOnly: commercialWorksOnlyCost,
            totalMarkupFromMaterials: totalWorksMarkupFromMaterials,
            grandTotal: commercialWorksOnlyCost + totalWorksMarkupFromMaterials
          });

          
          // Коммерческая стоимость работ = работы + наценки от материалов
          const commercialWorksCost = commercialWorksOnlyCost + totalWorksMarkupFromMaterials;

          const baseTotalCost = baseMaterialsCost + baseWorksCost;
          const commercialTotalCost = commercialMaterialsCost + commercialWorksCost;
          const markupPercentage = baseTotalCost > 0 ? ((commercialTotalCost - baseTotalCost) / baseTotalCost) * 100 : 0;

          // Расчет детализации по работам и материалам
          const workItems = items.filter(item => item.item_type === 'work' || item.item_type === 'sub_work');
          const materialItems = items.filter(item => item.item_type === 'material' || item.item_type === 'sub_material');

          // Для работ - используем рассчитанную коммерческую стоимость
          const worksTotalVolume = workItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
          const worksTotalCost = commercialWorksCost; // Используем уже рассчитанную коммерческую стоимость работ
          const worksUnitPrice = worksTotalVolume > 0 ? worksTotalCost / worksTotalVolume : 0;

          // Для материалов - используем рассчитанную коммерческую стоимость  
          let materialsTotalVolume = 0;

          materialItems.forEach(item => {
            let quantity = item.quantity || 0;
            
            // Для связанных материалов, рассчитываем количество на основе работ
            if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
              const work = items.find(procItem => {
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
                const consumptionCoef = item.consumption_coefficient || 
                                       item.work_link.material_quantity_per_work || 1;
                const conversionCoef = item.conversion_coefficient || 
                                      item.work_link.usage_coefficient || 1;
                const workQuantity = work.quantity || 0;
                quantity = workQuantity * consumptionCoef * conversionCoef;
              }
            }

            materialsTotalVolume += quantity;
          });

          const materialsTotalCost = commercialMaterialsCost; // Используем уже рассчитанную коммерческую стоимость материалов
          const materialsUnitPrice = materialsTotalVolume > 0 ? materialsTotalCost / materialsTotalVolume : 0;
          
          // Сохраняем коммерческие стоимости в БД и обновляем коэффициенты BOQ items
          const saveCommercialCosts = async () => {
            try {
              // Сохраняем коммерческие стоимости позиции
              await clientPositionsApi.updateCommercialCosts(
                pos.id,
                materialsTotalCost,
                worksTotalCost
              );
              
              // Обновляем коэффициенты для каждого BOQ item
              for (const item of items) {
                const baseCost = item.total_amount || 0;
                if (baseCost === 0) continue;
                
                let fullCommercialCost = 0;
                const isAuxiliary = item.material_type === 'auxiliary';
                
                // Рассчитываем полную коммерческую стоимость
                switch (item.item_type) {
                  case 'work':
                    fullCommercialCost = calculateWorkCommercialCost(baseCost, markupsData);
                    break;
                  case 'material':
                    if (isAuxiliary) {
                      const auxResult = calculateAuxiliaryMaterialCommercialCost(baseCost, markupsData);
                      fullCommercialCost = auxResult.materialCost + auxResult.workMarkup;
                    } else {
                      const mainResult = calculateMainMaterialCommercialCost(baseCost, markupsData);
                      fullCommercialCost = mainResult.materialCost + mainResult.workMarkup;
                    }
                    break;
                  case 'sub_work':
                    fullCommercialCost = calculateSubcontractWorkCommercialCost(baseCost, markupsData);
                    break;
                  case 'sub_material':
                    if (isAuxiliary) {
                      const subAuxResult = calculateAuxiliarySubcontractMaterialCommercialCost(baseCost, markupsData);
                      fullCommercialCost = subAuxResult.materialCost + subAuxResult.workMarkup;
                    } else {
                      const subMainResult = calculateSubcontractMaterialCommercialCost(baseCost, markupsData);
                      fullCommercialCost = subMainResult.materialCost + subMainResult.workMarkup;
                    }
                    break;
                }
                
                const coefficient = baseCost > 0 ? fullCommercialCost / baseCost : 1;
                
                // Обновляем коэффициенты в БД
                await boqApi.updateCommercialFields(item.id, fullCommercialCost, coefficient);
                console.log(`✅ Updated coefficients for item ${item.item_number}: cost=${fullCommercialCost}, coef=${coefficient}`);
              }
            } catch (error) {
              console.error('❌ Failed to save commercial costs for position:', pos.id, error);
            }
          };
          
          // Сохраняем асинхронно, не блокируя UI
          saveCommercialCosts();

          return {
            ...pos,
            boq_items: items,
            total_materials_cost: baseMaterialsCost,  // BASE cost for tooltips
            total_works_cost: baseWorksCost,          // BASE cost for tooltips
            total_commercial_materials_cost: commercialMaterialsCost,
            total_commercial_works_cost: commercialWorksCost,
            base_total_cost: baseTotalCost,
            commercial_total_cost: commercialTotalCost,
            markup_percentage: markupPercentage,
            // Новые поля для детализации
            works_unit_price: worksUnitPrice,
            materials_unit_price: materialsUnitPrice,
            works_total_volume: worksTotalVolume,
            materials_total_volume: materialsTotalVolume,
            works_total_cost: worksTotalCost,         // COMMERCIAL cost for display
            materials_total_cost: materialsTotalCost, // COMMERCIAL cost for display
            // Детализация компонентов работ для подсказок
            works_breakdown: {
              ownWorksCost,                           // Коммерческая стоимость собственных работ
              subcontractWorksCost,                   // Коммерческая стоимость субподрядных работ
              auxiliaryMaterialsCost,                 // Полная стоимость вспомогательных материалов
              mainMaterialsMarkup,                    // Наценки от основных материалов
              subMaterialsMarkup,                     // Наценки от субматериалов
              ownWorksBaseCost,                       // Базовая стоимость собственных работ
              subcontractWorksBaseCost                // Базовая стоимость субподрядных работ
            },
            // Данные из позиции заказчика (не из тендера)
            client_quantity: pos.volume || 0,        // Кол-во Заказчика из Excel
            gp_quantity: pos.manual_volume || 0,     // Кол-во ГП (объем, заданный вручную ГП)
            manual_volume: pos.manual_volume || 0    // Дублируем для совместимости
          };
        })
      );
      
      console.log('✅ Positions with commercial data loaded:', positionsWithCommercial);
      setPositions(positionsWithCommercial);
      updateStats(positionsWithCommercial);
    } catch (error) {
      console.error('❌ Load commercial positions error:', error);
      message.error('Ошибка загрузки коммерческих позиций');
    } finally {
      setLoading(false);
    }
  }, [tenderId, updateStats]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Export commercial costs to Excel
  const handleExportToExcel = () => {
    try {
      console.log('🚀 Starting Excel export for positions:', positions.length);
      
      if (positions.length === 0) {
        message.warning('Нет данных для экспорта');
        return;
      }

      const fileName = `Коммерческие_стоимости_${tenderName || 'Тендер'}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
      
      exportCommercialCostsToExcel(positions, tenderName, fileName);
      message.success(`Экспорт в Excel завершен: ${fileName}`);
    } catch (error) {
      console.error('❌ Excel export error:', error);
      message.error('Ошибка экспорта в Excel');
    }
  };

  // Update commercial markup coefficient for BOQ item
  const updateCommercialMarkup = async (positionId: string, itemId: string, newCoefficient: number) => {
    try {
      console.log('🔄 Updating commercial markup:', { positionId, itemId, newCoefficient });
      
      // Update via API (you'll need to implement this in your BOQ API)
      // await boqApi.updateCommercialMarkup(itemId, newCoefficient);
      
      // Reload positions to reflect changes
      loadPositions();
      message.success('Коммерческая наценка обновлена');
    } catch (error) {
      console.error('❌ Update commercial markup error:', error);
      message.error('Ошибка обновления коммерческой наценки');
    }
  };

  // Helper function to format numbers as integers
  const formatAsInteger = (value: number): string => {
    return Math.round(value).toLocaleString('ru-RU');
  };

  // Table columns for commercial positions
  const columns = [
    {
      title: <div style={{textAlign: 'center'}}>№</div>,
      dataIndex: 'position_number',
      key: 'position_number',
      width: 60,
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => a.position_number - b.position_number,
      fixed: 'left' as const,
    },
    {
      title: <div style={{textAlign: 'center'}}>Наименование позиции</div>,
      dataIndex: 'work_name',
      key: 'work_name',
      ellipsis: true,
      width: 200,
      fixed: 'left' as const,
    },
    {
      title: <div style={{textAlign: 'center'}}>Кол-во Заказчика</div>,
      key: 'client_quantity',
      width: 140,
      align: 'center' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text>
          {record.client_quantity && record.client_quantity > 0 
            ? `${formatQuantity(record.client_quantity, 2)} ${record.unit || ''}`
            : '—'}
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.client_quantity || 0) - (b.client_quantity || 0),
    },
    {
      title: <div style={{textAlign: 'center'}}>Кол-во ГП</div>,
      key: 'gp_quantity',
      width: 120,
      align: 'center' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text>
          {record.gp_quantity && record.gp_quantity > 0 
            ? `${formatQuantity(record.gp_quantity, 2)} ${record.unit || ''}`
            : '—'}
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.gp_quantity || 0) - (b.gp_quantity || 0),
    },
    {
      title: <div style={{textAlign: 'center'}}>Цена работ за ед.изм</div>,
      key: 'works_unit_price',
      width: 140,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => {
        const unitPrice = record.gp_quantity && record.gp_quantity > 0 
          ? (record.works_total_cost || 0) / record.gp_quantity
          : 0;
        return (
          <Text>
            {unitPrice > 0 
              ? `${formatAsInteger(unitPrice)} ₽/${record.unit || 'ед.'}`
              : '—'}
          </Text>
        );
      },
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.works_unit_price || 0) - (b.works_unit_price || 0),
    },
    {
      title: <div style={{textAlign: 'center'}}>Цена материала за ед.изм</div>,
      key: 'materials_unit_price',
      width: 140,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => {
        const unitPrice = record.gp_quantity && record.gp_quantity > 0 
          ? (record.materials_total_cost || 0) / record.gp_quantity
          : 0;
        return (
          <Text>
            {unitPrice > 0 
              ? `${formatAsInteger(unitPrice)} ₽/${record.unit || 'ед.'}`
              : '—'}
          </Text>
        );
      },
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.materials_unit_price || 0) - (b.materials_unit_price || 0),
    },
    {
      title: <div style={{textAlign: 'center'}}>Итого работа, руб</div>,
      key: 'works_total_cost',
      width: 130,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => {
        if (!record.works_total_cost || record.works_total_cost <= 0) {
          return <Text style={{ color: '#999' }}>—</Text>;
        }

        if (!markups) {
          return (
            <Text strong style={{ color: '#1890ff' }}>
              {`${formatAsInteger(record.works_total_cost)} ₽`}
            </Text>
          );
        }

        // Рассчитываем базовую стоимость работ (приблизительно)
        const baseCost = (record.total_works_cost || 0);
        
        // Консольный вывод для отладки
        console.log('🔍 Tooltip debug info:', {
          positionId: record.id,
          positionNumber: record.position_number,
          workName: record.work_name,
          baseCost: baseCost,
          commercialCost: record.works_total_cost,
          totalWorksCost: record.total_works_cost,
          worksCommercialCost: record.total_commercial_works_cost
        });
        
        // Создаем детальную подсказку расчета
        const tooltipContent = (baseCost > 0 || (record.works_breakdown && Object.values(record.works_breakdown).some(v => v > 0))) ? (
          <div style={{ maxWidth: '500px' }}>
            <div><strong>Детализация итоговой стоимости работ:</strong></div>
            
            {record.works_breakdown && (
              <>
                <div style={{ marginTop: '8px' }}>
                  <div><strong>Компоненты стоимости:</strong></div>
                  <div style={{ fontSize: '13px', marginLeft: '8px' }}>
                    {record.works_breakdown.ownWorksCost > 0 && (
                      <div>• Собственные работы: <strong>{formatQuantity(record.works_breakdown.ownWorksCost, 2)} ₽</strong></div>
                    )}
                    {record.works_breakdown.subcontractWorksCost > 0 && (
                      <div>• Субподрядные работы: <strong>{formatQuantity(record.works_breakdown.subcontractWorksCost, 2)} ₽</strong></div>
                    )}
                    {record.works_breakdown.auxiliaryMaterialsCost > 0 && (
                      <div>• Вспомогательные материалы → работы: <strong>{formatQuantity(record.works_breakdown.auxiliaryMaterialsCost, 2)} ₽</strong></div>
                    )}
                    {record.works_breakdown.mainMaterialsMarkup > 0 && (
                      <div>• Наценки основных материалов → работы: <strong>{formatQuantity(record.works_breakdown.mainMaterialsMarkup, 2)} ₽</strong></div>
                    )}
                    {record.works_breakdown.subMaterialsMarkup > 0 && (
                      <div>• Наценки субматериалов → субработы: <strong>{formatQuantity(record.works_breakdown.subMaterialsMarkup, 2)} ₽</strong></div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '8px', borderTop: '1px solid #d9d9d9', paddingTop: '8px' }}>
                  <div><strong>Базовые стоимости:</strong></div>
                  <div style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                    <div>Общая базовая стоимость работ (ПЗ): {formatQuantity(baseCost, 2)} ₽</div>
                    {record.works_breakdown.ownWorksBaseCost > 0 && (
                      <div>• Базовая стоимость собственных работ: {formatQuantity(record.works_breakdown.ownWorksBaseCost, 2)} ₽</div>
                    )}
                    {record.works_breakdown.subcontractWorksBaseCost > 0 && (
                      <div>• Базовая стоимость субподрядных работ: {formatQuantity(record.works_breakdown.subcontractWorksBaseCost, 2)} ₽</div>
                    )}
                    {record.works_breakdown.ownWorksCost > 0 && record.works_breakdown.ownWorksBaseCost > 0 && (
                      <div style={{ color: '#52c41a', fontWeight: 'bold' }}>Коэффициент собственных работ: {(record.works_breakdown.ownWorksCost / record.works_breakdown.ownWorksBaseCost).toFixed(2)}x</div>
                    )}
                    {record.works_breakdown.subcontractWorksCost > 0 && record.works_breakdown.subcontractWorksBaseCost > 0 && (
                      <div style={{ color: '#52c41a', fontWeight: 'bold' }}>Коэффициент субподрядных работ: {(record.works_breakdown.subcontractWorksCost / record.works_breakdown.subcontractWorksBaseCost).toFixed(2)}x</div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {baseCost > 0 && markups && (
              <div style={{ marginTop: '8px', borderTop: '1px solid #d9d9d9', paddingTop: '8px' }}>
                <div><strong>Формулы расчета собственных работ:</strong></div>
                <div style={{ fontSize: '11px', color: '#555', marginLeft: '8px' }}>
                  <div>1. СМ = {formatQuantity(baseCost, 2)} × {markups.mechanization_service}% = {formatQuantity(baseCost * markups.mechanization_service / 100, 2)} ₽</div>
                  <div>2. МБП+ГСМ = {formatQuantity(baseCost, 2)} × {markups.mbp_gsm}% = {formatQuantity(baseCost * markups.mbp_gsm / 100, 2)} ₽</div>
                  <div>3. Гарантия = {formatQuantity(baseCost, 2)} × {markups.warranty_period}% = {formatQuantity(baseCost * markups.warranty_period / 100, 2)} ₽</div>
                  <div>+ Рост работ, Непредвиденные, ООЗ, ОФЗ, Прибыль...</div>
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '8px', borderTop: '1px solid #d9d9d9', paddingTop: '8px' }}>
              <div><strong>Итого работы:</strong> <span style={{ color: '#1890ff', fontSize: '16px' }}>{formatQuantity(record.works_total_cost, 2)} ₽</span></div>
              {baseCost > 0 && (
                <div style={{ color: '#52c41a', fontSize: '12px' }}>
                  Общий коэффициент: {((record.works_total_cost || 0) / baseCost).toFixed(2)}x
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>Коммерческая стоимость работ: {formatQuantity(record.works_total_cost, 2)} ₽</div>
        );

        return (
          <Tooltip title={tooltipContent} placement="topRight">
            <Text strong style={{ color: '#1890ff', cursor: 'help' }}>
              {`${formatAsInteger(record.works_total_cost)} ₽`}
            </Text>
          </Tooltip>
        );
      },
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.works_total_cost || 0) - (b.works_total_cost || 0),
    },
    {
      title: <div style={{textAlign: 'center'}}>Итого материал, руб</div>,
      key: 'materials_total_cost',
      width: 140,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => {
        if (!record.materials_total_cost || record.materials_total_cost <= 0) {
          return <Text style={{ color: '#999' }}>—</Text>;
        }

        if (!markups) {
          return (
            <Text strong style={{ color: '#722ed1' }}>
              {`${formatAsInteger(record.materials_total_cost)} ₽`}
            </Text>
          );
        }

        // Рассчитываем базовую стоимость материалов (приблизительно)
        const baseCost = (record.total_materials_cost || 0);
        
        // Создаем детальную подсказку расчета
        const tooltipContent = baseCost > 0 ? (
          <div style={{ maxWidth: '450px' }}>
            <div><strong>Расчет коммерческой стоимости материалов:</strong></div>
            <div style={{ marginTop: '8px' }}>
              <div><strong>Исходные данные:</strong></div>
              <div>Материал ПЗ (базовая): {formatQuantity(baseCost, 2)} ₽</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                <div>• <strong>Основные материалы:</strong> базовая стоимость остается в материалах, наценка переходит в работы</div>
                <div>• <strong>Вспомогательные материалы:</strong> вся стоимость переходит в работы (в материалах = 0)</div>
              </div>
            </div>
            
            <div style={{ marginTop: '8px' }}>
              <div><strong>Коммерческий расчет материалов:</strong></div>
              {(() => {
                // Расчет по той же логике что и в calculateMainMaterialCommercialCost
                const materialsGrowth = baseCost * (1 + markups.materials_cost_growth / 100);
                const contingencyMaterials = baseCost * (1 + markups.contingency_costs / 100);
                const oozMat = (materialsGrowth + contingencyMaterials - baseCost) * (1 + markups.overhead_own_forces / 100);
                const ofzMat = oozMat * (1 + markups.general_costs_without_subcontract / 100);
                const profitMat = ofzMat * (1 + markups.profit_own_forces / 100);
                const totalCommercialCost = profitMat;
                const totalMarkup = totalCommercialCost - baseCost;
                
                return (
                  <>
                    <div>1. Материалы РОСТ = {formatQuantity(baseCost, 2)} × {(1 + markups.materials_cost_growth / 100).toFixed(2)} = {formatQuantity(materialsGrowth, 2)} ₽</div>
                    <div>2. Непредвиденные мат = {formatQuantity(baseCost, 2)} × {(1 + markups.contingency_costs / 100).toFixed(2)} = {formatQuantity(contingencyMaterials, 2)} ₽</div>
                    <div>3. ООЗ мат = ({formatQuantity(materialsGrowth, 2)} + {formatQuantity(contingencyMaterials, 2)} - {formatQuantity(baseCost, 2)}) × {(1 + markups.overhead_own_forces / 100).toFixed(2)} = {formatQuantity(oozMat, 2)} ₽</div>
                    <div>4. ОФЗ мат = {formatQuantity(oozMat, 2)} × {(1 + markups.general_costs_without_subcontract / 100).toFixed(2)} = {formatQuantity(ofzMat, 2)} ₽</div>
                    <div>5. Прибыль мат = {formatQuantity(ofzMat, 2)} × {(1 + markups.profit_own_forces / 100).toFixed(2)} = {formatQuantity(profitMat, 2)} ₽</div>
                  </>
                );
              })()}
            </div>
            
            <div style={{ marginTop: '8px', borderTop: '1px solid #d9d9d9', paddingTop: '8px' }}>
              <div><strong>Распределение стоимости:</strong></div>
              {(() => {
                // Пример расчета распределения между основными и вспомогательными материалами
                const materialsGrowth = baseCost * (1 + markups.materials_cost_growth / 100);
                const contingencyMaterials = baseCost * (1 + markups.contingency_costs / 100);
                const oozMat = (materialsGrowth + contingencyMaterials - baseCost) * (1 + markups.overhead_own_forces / 100);
                const ofzMat = oozMat * (1 + markups.general_costs_without_subcontract / 100);
                const profitMat = ofzMat * (1 + markups.profit_own_forces / 100);
                const totalMarkup = profitMat - baseCost;
                
                return (
                  <>
                    <div>• Остается в материалах (основные): <strong>{formatQuantity(baseCost, 2)} ₽</strong></div>
                    <div>• Наценка переходит в работы: {formatQuantity(totalMarkup, 2)} ₽</div>
                    <div>• Вспомогательные переходят в работы полностью</div>
                    <div style={{ color: '#722ed1', fontWeight: 'bold', marginTop: '4px' }}>
                      Итого в материалах: {formatQuantity(record.materials_total_cost, 2)} ₽
                    </div>
                    <div style={{ color: '#52c41a' }}>
                      Коэффициент: {baseCost > 0 ? ((record.materials_total_cost || 0) / baseCost).toFixed(2) : '0.00'}x
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          <div>Коммерческая стоимость: {formatQuantity(record.materials_total_cost, 2)} ₽</div>
        );

        return (
          <Tooltip title={tooltipContent} placement="topRight">
            <Text strong style={{ color: '#722ed1', cursor: 'help' }}>
              {`${formatAsInteger(record.materials_total_cost)} ₽`}
            </Text>
          </Tooltip>
        );
      },
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.materials_total_cost || 0) - (b.materials_total_cost || 0),
    },
    {
      title: <div style={{textAlign: 'center'}}>Базовая стоимость</div>,
      key: 'base_cost',
      width: 140,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text strong>
          {formatAsInteger(record.base_total_cost || 0)} ₽
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.base_total_cost || 0) - (b.base_total_cost || 0),
    },
    {
      title: <div style={{textAlign: 'center'}}>Коммерческая стоимость</div>,
      key: 'commercial_cost',
      width: 160,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatAsInteger(record.commercial_total_cost || 0)} ₽
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.commercial_total_cost || 0) - (b.commercial_total_cost || 0),
    },
    {
      title: <div style={{textAlign: 'center'}}>Наценка</div>,
      key: 'markup',
      width: 120,
      align: 'right' as const,
      fixed: 'right' as const,
      render: (record: ClientPositionWithCommercial) => {
        const markup = (record.commercial_total_cost || 0) - (record.base_total_cost || 0);
        const percentage = record.markup_percentage || 0;
        return (
          <div className="text-right">
            <div>
              <Text strong style={{ color: markup >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {markup >= 0 ? '+' : ''}{formatAsInteger(markup)} ₽
              </Text>
            </div>
            <div>
              <Tag color={percentage >= 0 ? 'green' : 'red'} size="small">
                {percentage >= 0 ? '+' : ''}{percentage.toFixed(1)}%
              </Tag>
            </div>
          </div>
        );
      },
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.markup_percentage || 0) - (b.markup_percentage || 0),
    },
  ];

  return (
    <div className="w-full">
      {/* Header with Reload and Export Buttons */}
      <Card className="shadow-sm mb-3 w-full" bodyStyle={{ padding: '10px 16px' }}>
        <div className="flex justify-between items-center">
          <div>
            {tenderName && (
              <Typography.Title level={5} className="m-0 text-gray-600">
                {tenderName}
              </Typography.Title>
            )}
          </div>
          <Space>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleExportToExcel}
              disabled={loading || positions.length === 0}
              size="middle"
            >
              Экспорт в Excel
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadPositions}
              loading={loading}
              size="middle"
            >
              Обновить
            </Button>
          </Space>
        </div>
      </Card>

      {/* Positions Table */}
      {loading && positions.length === 0 ? (
        <Card className="text-center py-12 w-full">
          <Spin size="large" />
        </Card>
      ) : positions.length === 0 ? (
        <Card className="w-full">
          <Empty
            description="Нет позиций для отображения коммерческих стоимостей"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <Table
          dataSource={sortPositionsByNumber(positions)}
          columns={columns}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1620 }}
          size="small"
          bordered
          sticky
        />
      )}
    </div>
  );
};

export default TenderCommercialManager;