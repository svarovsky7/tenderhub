import React from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { PlusOutlined, FormOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ActionButtonsProps {
  canAddItems: boolean;
  quickAddMode: boolean;
  templateAddMode: boolean;
  setQuickAddMode: (value: boolean) => void;
  setTemplateAddMode: (value: boolean) => void;
  positionIcon: React.ReactNode;
  positionLabel: string;
}

/**
 * Компонент кнопок действий для добавления работ/материалов и шаблонов
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  canAddItems,
  quickAddMode,
  templateAddMode,
  setQuickAddMode,
  setTemplateAddMode,
  positionIcon,
  positionLabel
}) => {
  // Если форма быстрого добавления или шаблона открыта, показываем пустое место
  if (quickAddMode || templateAddMode) {
    return <div className="flex-1" />;
  }

  // Если можно добавлять элементы, показываем кнопки
  if (canAddItems) {
    return (
      <>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setQuickAddMode(true)}
          className="h-10 border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:text-blue-700 transition-colors duration-200"
          style={{
            borderStyle: 'dashed',
            fontSize: '14px',
            fontWeight: '500',
            flex: 1
          }}
        >
          Добавить работу или материал
        </Button>
        <Button
          type="dashed"
          icon={<FormOutlined />}
          onClick={() => setTemplateAddMode(true)}
          className="h-10 border-2 border-dashed border-green-300 text-green-600 hover:border-green-400 hover:text-green-700 transition-colors duration-200"
          style={{
            borderStyle: 'dashed',
            fontSize: '14px',
            fontWeight: '500',
            flex: 1
          }}
        >
          Добавить по шаблону
        </Button>
      </>
    );
  }

  // Если нельзя добавлять элементы (структурная позиция), показываем информационное сообщение
  return (
    <div className="flex-1 h-10 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
      <Text className="text-gray-500 flex items-center gap-2">
        <Tooltip title={positionLabel}>
          <span className="text-lg cursor-help">{positionIcon}</span>
        </Tooltip>
        Структурный элемент - нельзя добавлять работы/материалы
      </Text>
    </div>
  );
};