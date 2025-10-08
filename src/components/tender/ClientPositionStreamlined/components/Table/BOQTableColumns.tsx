import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Tag, Tooltip, Button, Space, Popconfirm, Typography } from 'antd';
import {
  BuildOutlined,
  ToolOutlined,
  LinkOutlined,
  FormOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { BOQItemWithLibrary } from '../../../../../lib/supabase/types';
import type { ClientPosition } from '../../../../../lib/supabase/api';
import CostCategoryDisplay from '../../../CostCategoryDisplay';

const { Text } = Typography;

interface GetColumnsProps {
  position: ClientPosition;
  handleEditMaterial: (item: BOQItemWithLibrary) => void;
  handleEditWork: (item: BOQItemWithLibrary) => void;
  handleDeleteItem: (id: string) => void;
}

export const getTableColumns = ({
  position,
  handleEditMaterial,
  handleEditWork,
  handleDeleteItem
}: GetColumnsProps): ColumnsType<BOQItemWithLibrary> => {
  return [
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 85,
      render: (type, record) => {
        switch(type) {
          case 'work':
            return (
              <div className="flex justify-center">
                <Tag icon={<BuildOutlined />} color="orange" className="text-xs">Работа</Tag>
              </div>
            );
          case 'sub_work':
            return (
              <div className="flex justify-center">
                <Tag icon={<BuildOutlined />} color="purple" className="text-xs">Суб-раб</Tag>
              </div>
            );
          case 'material':
            const isMainMaterial = record.material_type !== 'auxiliary';
            return (
              <div className="flex flex-col gap-0.5 items-center">
                <Tag icon={<ToolOutlined />} color="blue" className="text-xs">Материал</Tag>
                <Tag
                  color={isMainMaterial ? "cyan" : "gold"}
                  className="text-xs"
                  style={{ fontSize: '10px', padding: '0 4px', height: '18px', lineHeight: '18px' }}
                >
                  {isMainMaterial ? <>📦 Основной</> : <>🔧 Вспомог.</>}
                </Tag>
              </div>
            );
          case 'sub_material':
            const isMainSubMaterial = record.material_type !== 'auxiliary';
            return (
              <div className="flex flex-col gap-0.5 items-center">
                <Tag icon={<ToolOutlined />} color="green" className="text-xs">Суб-мат</Tag>
                <Tag
                  color={isMainSubMaterial ? "cyan" : "gold"}
                  className="text-xs"
                  style={{ fontSize: '10px', padding: '0 4px', height: '18px', lineHeight: '18px' }}
                >
                  {isMainSubMaterial ? <>📦 Основной</> : <>🔧 Вспомог.</>}
                </Tag>
              </div>
            );
          default:
            return <Tag className="text-xs">{type}</Tag>;
        }
      }
    },
    {
      title: 'Наименование',
      dataIndex: 'description',
      key: 'description',
      width: 240,
      render: (text, record) => {
        let linkedWork = null;
        if ((record.item_type === 'material' || record.item_type === 'sub_material') && record.work_link) {
          linkedWork = position.boq_items?.find(item => {
            if (record.work_link.work_boq_item_id && item.id === record.work_link.work_boq_item_id && item.item_type === 'work') {
              return true;
            }
            if (record.work_link.sub_work_boq_item_id && item.id === record.work_link.sub_work_boq_item_id && item.item_type === 'sub_work') {
              return true;
            }
            return false;
          });

          if (position.is_additional && !linkedWork && record.work_link) {
            console.log('⚠️ Material has work_link but work not found in ДОП:', {
              material: record.description,
              work_link: record.work_link,
              available_works: position.boq_items?.filter(i => i.item_type === 'work').map(w => ({ id: w.id, name: w.description }))
            });
          }
        }

        const isLinkedMaterial = (record.item_type === 'material' || record.item_type === 'sub_material') && record.work_link;

        return (
          <div className={isLinkedMaterial ? 'pl-6' : ''}>
            <div className="py-1 text-sm whitespace-normal break-words">{text}</div>
            {isLinkedMaterial && linkedWork && (
              <div className="text-xs text-gray-500 mt-1 whitespace-normal break-words">
                <LinkOutlined className="mr-1" />
                {linkedWork.description}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: (
        <Tooltip title="Коэффициент перевода единиц измерения">
          <span className="cursor-help text-xs">К.пер</span>
        </Tooltip>
      ),
      key: 'conversion_coef',
      width: 60,
      align: 'center',
      render: (_, record) => {
        if (record.item_type === 'material' || record.item_type === 'sub_material') {
          const coef = record.conversion_coefficient ||
                      record.work_link?.usage_coefficient || 1;
          return (
            <div className={`text-center py-1 font-medium text-sm ${coef !== 1 ? 'text-green-600' : 'text-gray-400'}`}>
              {coef}
            </div>
          );
        }
        return <div className="text-center text-gray-300 text-sm">—</div>;
      }
    },
    {
      title: (
        <Tooltip title="Коэффициент расхода материала на единицу работы">
          <span className="cursor-help text-xs">К.расх</span>
        </Tooltip>
      ),
      key: 'consumption_coef',
      width: 60,
      align: 'center',
      render: (_, record) => {
        if (record.item_type === 'material' || record.item_type === 'sub_material') {
          const coef = record.consumption_coefficient ||
                      record.work_link?.material_quantity_per_work || 1;
          return (
            <div className={`text-center py-1 font-medium text-sm ${coef !== 1 ? 'text-orange-600' : 'text-gray-400'}`}>
              {coef}
            </div>
          );
        }
        return <div className="text-center text-gray-300 text-sm">—</div>;
      }
    },
    {
      title: 'Кол-во',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 85,
      align: 'center',
      render: (value, record) => {
        if ((record.item_type === 'material' || record.item_type === 'sub_material') && record.work_link) {
          const work = position.boq_items?.find(item => {
            if (record.work_link.work_boq_item_id &&
                item.id === record.work_link.work_boq_item_id &&
                item.item_type === 'work') {
              return true;
            }
            if (record.work_link.sub_work_boq_item_id &&
                item.id === record.work_link.sub_work_boq_item_id &&
                item.item_type === 'sub_work') {
              return true;
            }
            return false;
          });

          if (work) {
            const consumptionCoef = record.consumption_coefficient ||
                                   record.work_link.material_quantity_per_work || 1;
            const conversionCoef = record.conversion_coefficient ||
                                  record.work_link.usage_coefficient || 1;
            const workQuantity = work.quantity || 0;
            const calculatedQuantity = workQuantity * consumptionCoef * conversionCoef;

            return (
              <Tooltip title={`${workQuantity} × ${consumptionCoef} × ${conversionCoef}`}>
                <div className="text-center py-1">
                  <div className="font-medium text-blue-600 text-sm">
                    {calculatedQuantity.toLocaleString('ru-RU', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3
                    })}
                  </div>
                </div>
              </Tooltip>
            );
          }
        }

        if ((record.item_type === 'material' || record.item_type === 'sub_material') && !record.work_link) {
          const consumptionCoef = record.consumption_coefficient || 1;
          const hasCoefficients = consumptionCoef > 1;

          if (hasCoefficients && record.base_quantity !== null && record.base_quantity !== undefined) {
            return (
              <Tooltip title={`Базовое: ${record.base_quantity.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} × Коэф: ${consumptionCoef} = ${value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}`}>
                <div className="text-center py-1">
                  <div className="font-medium text-green-600 text-sm">
                    {value?.toLocaleString('ru-RU', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3
                    })}
                  </div>
                </div>
              </Tooltip>
            );
          }
        }

        return (
          <div className="text-center py-1 text-sm">
            {value?.toLocaleString('ru-RU', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            })}
          </div>
        );
      }
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      align: 'center',
      render: (text) => (
        <div className="text-center py-1 text-sm">{text}</div>
      )
    },
    {
      title: 'Цена',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 85,
      align: 'center',
      render: (value, record) => {
        const currencySymbols = {
          'RUB': '₽',
          'USD': '$',
          'EUR': '€',
          'CNY': '¥'
        };

        const displayCurrency = record.currency_type || 'RUB';
        const displaySymbol = currencySymbols[displayCurrency] || displayCurrency;

        const priceDisplay = (
          <div className="text-center py-1 text-sm">
            {value?.toLocaleString('ru-RU', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            })} {displaySymbol}
          </div>
        );

        if (record.currency_type && record.currency_type !== 'RUB' && record.currency_rate) {
          const currencySymbol = currencySymbols[record.currency_type] || record.currency_type;
          const priceInRubles = value * record.currency_rate;
          const tooltipContent = `${value?.toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })} ${currencySymbol} × ${record.currency_rate} = ${priceInRubles?.toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })} ₽`;

          return (
            <Tooltip title={tooltipContent}>
              {priceDisplay}
            </Tooltip>
          );
        }

        return priceDisplay;
      }
    },
    {
      title: 'Доставка',
      key: 'delivery',
      width: 100,
      align: 'center',
      render: (_, record) => {
        if (record.item_type === 'material' || record.item_type === 'sub_material') {
          const deliveryType = record.delivery_price_type || 'included';
          const deliveryAmount = record.delivery_amount || 0;

          if (deliveryType === 'included') {
            return (
              <Tag color="green" className="text-xs">
                Включена
              </Tag>
            );
          } else if (deliveryType === 'not_included') {
            const unitRate = record.unit_rate || 0;
            const deliveryPerUnit = deliveryAmount;
            return (
              <Tooltip title={`Доставка: ${deliveryPerUnit.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽ за единицу (3% от цены ${unitRate.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽)`}>
                <Tag color="orange" className="text-xs">
                  Не включена (3%)
                </Tag>
              </Tooltip>
            );
          } else if (deliveryType === 'amount') {
            return (
              <Tooltip title="Фиксированная сумма доставки">
                <Tag color="blue" className="text-xs">
                  {deliveryAmount.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })} ₽
                </Tag>
              </Tooltip>
            );
          }
        }
        return <div className="text-xs text-gray-400 text-center">—</div>;
      }
    },
    {
      title: 'Сумма',
      key: 'total',
      width: 110,
      align: 'center',
      render: (_, record) => {
        let quantity = record.quantity || 0;
        const unitRate = record.unit_rate || 0;

        if ((record.item_type === 'material' || record.item_type === 'sub_material') && record.work_link) {
          const work = position.boq_items?.find(item => {
            if (record.work_link.work_boq_item_id &&
                item.id === record.work_link.work_boq_item_id &&
                item.item_type === 'work') {
              return true;
            }
            if (record.work_link.sub_work_boq_item_id &&
                item.id === record.work_link.sub_work_boq_item_id &&
                item.item_type === 'sub_work') {
              return true;
            }
            return false;
          });

          if (work) {
            const consumptionCoef = record.consumption_coefficient ||
                                   record.work_link.material_quantity_per_work || 1;
            const conversionCoef = record.conversion_coefficient ||
                                  record.work_link.usage_coefficient || 1;
            const workQuantity = work.quantity || 0;
            quantity = workQuantity * consumptionCoef * conversionCoef;
          }
        }

        const currencyMultiplier = record.currency_type && record.currency_type !== 'RUB' && record.currency_rate
          ? record.currency_rate
          : 1;
        const baseTotal = quantity * unitRate * currencyMultiplier;
        let total = baseTotal;

        if ((record.item_type === 'material' || record.item_type === 'sub_material')) {
          const deliveryType = record.delivery_price_type || 'included';
          const deliveryAmount = record.delivery_amount || 0;

          if (deliveryType === 'amount') {
            total = baseTotal + (deliveryAmount * quantity);
          } else if (deliveryType === 'not_included') {
            total = baseTotal + (baseTotal * 0.03);
          }
        }

        let tooltipContent = null;

        const currencySymbols = {
          'RUB': '₽',
          'USD': '$',
          'EUR': '€',
          'CNY': '¥'
        };
        const currencySymbol = currencySymbols[record.currency_type || 'RUB'] || record.currency_type || '₽';

        const formulaParts = [];
        const unit = record.unit || '';

        formulaParts.push(`${quantity.toLocaleString('ru-RU', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 3
        })} ${unit} × ${unitRate.toLocaleString('ru-RU', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        })} ${currencySymbol}`);

        if (record.currency_type && record.currency_type !== 'RUB' && record.currency_rate) {
          formulaParts.push(`× ${record.currency_rate}`);
        }

        const baseFormula = formulaParts.join(' ');
        const baseTotalForDisplay = `${baseTotal.toLocaleString('ru-RU', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        })} ₽`;

        if ((record.item_type === 'material' || record.item_type === 'sub_material')) {
          const deliveryType = record.delivery_price_type || 'included';
          const deliveryAmount = record.delivery_amount || 0;

          if (deliveryType === 'amount' && deliveryAmount > 0) {
            const deliveryTotal = deliveryAmount * quantity;
            tooltipContent = (
              <div>
                <div>{baseFormula} = {baseTotalForDisplay}</div>
                <div>Доставка: {quantity.toLocaleString('ru-RU')} {unit} × {deliveryAmount.toLocaleString('ru-RU')} ₽ = {deliveryTotal.toLocaleString('ru-RU')} ₽</div>
                <div className="border-t pt-1 mt-1">
                  <strong>Итого: {total.toLocaleString('ru-RU')} ₽</strong>
                </div>
              </div>
            );
          } else if (deliveryType === 'not_included') {
            const deliveryTotal = baseTotal * 0.03;
            tooltipContent = (
              <div>
                <div>{baseFormula} = {baseTotalForDisplay}</div>
                <div>Доставка (3%): {deliveryTotal.toLocaleString('ru-RU')} ₽</div>
                <div className="border-t pt-1 mt-1">
                  <strong>Итого: {total.toLocaleString('ru-RU')} ₽</strong>
                </div>
              </div>
            );
          } else {
            tooltipContent = `${baseFormula} = ${baseTotalForDisplay}`;
          }
        } else {
          tooltipContent = `${baseFormula} = ${baseTotalForDisplay}`;
        }

        const totalElement = (
          <div className="whitespace-nowrap text-center">
            <Text strong className="text-green-600 text-sm">
              {Math.round(total).toLocaleString('ru-RU')} ₽
            </Text>
          </div>
        );

        return tooltipContent ? (
          <Tooltip title={tooltipContent} placement="left">
            {totalElement}
          </Tooltip>
        ) : totalElement;
      }
    },
    {
      title: 'Категория затрат',
      dataIndex: 'detail_cost_category_id',
      key: 'detail_cost_category_id',
      width: 140,
      align: 'center',
      render: (detailCategoryId) => (
        <CostCategoryDisplay detailCategoryId={detailCategoryId} />
      )
    },
    {
      title: 'Ссылка на КП',
      dataIndex: 'quote_link',
      key: 'quote_link',
      width: 150,
      align: 'center',
      render: (value) => {
        if (!value) return <div className="text-center">-</div>;
        if (value.startsWith('http')) {
          return (
            <div className="text-center">
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                {value}
              </a>
            </div>
          );
        }
        return (
          <div className="text-center">
            <span className="text-xs">{value}</span>
          </div>
        );
      }
    },
    {
      title: 'Примечание',
      dataIndex: 'note',
      key: 'note',
      width: 160,
      align: 'center',
      render: (value) => {
        if (!value) return <div className="text-center">-</div>;
        return (
          <div className="text-center">
            <span className="text-xs whitespace-pre-wrap">{value}</span>
          </div>
        );
      }
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <div className="whitespace-nowrap">
          <Space size="small">
            {(record.item_type === 'material' || record.item_type === 'sub_material') && (
              <Tooltip title={record.item_type === 'sub_material' ? "Редактировать суб-материал / Связать с работой" : "Редактировать материал / Связать с работой"}>
                <Button
                  type="text"
                  size="small"
                  icon={<FormOutlined />}
                  onClick={() => handleEditMaterial(record)}
                  className="text-xs"
                />
              </Tooltip>
            )}
            {(record.item_type === 'work' || record.item_type === 'sub_work') && (
              <Tooltip title={record.item_type === 'sub_work' ? "Редактировать суб-работу" : "Редактировать работу"}>
                <Button
                  type="text"
                  size="small"
                  icon={<FormOutlined />}
                  onClick={() => handleEditWork(record)}
                  className="text-xs"
                />
              </Tooltip>
            )}
            <Popconfirm
              title="Удалить элемент?"
              onConfirm={() => handleDeleteItem(record.id)}
              okText="Да"
              cancelText="Нет"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                className="text-xs"
              />
            </Popconfirm>
          </Space>
        </div>
      )
    }
  ];
};