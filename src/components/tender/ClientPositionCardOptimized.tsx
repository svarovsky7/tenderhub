import React, { memo, useMemo, useCallback } from 'react';
import { Card } from 'antd';
import PositionHeader from './PositionHeader';
import LazyPositionContent from './LazyPositionContent';

interface ClientPositionCardOptimizedProps {
  position: any;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
  tenderId: string;
  tender: any;
}

const ClientPositionCardOptimized: React.FC<ClientPositionCardOptimizedProps> = ({
  position,
  isExpanded,
  onToggle,
  onUpdate,
  tenderId,
  tender
}) => {
  // Memoize position stats calculation
  const stats = useMemo(() => {
    const boqItems = position.boq_items || [];
    const worksCount = boqItems.filter((item: any) =>
      item.item_type === 'work' || item.item_type === 'sub_work'
    ).length;
    const materialsCount = boqItems.filter((item: any) =>
      item.item_type === 'material' || item.item_type === 'sub_material'
    ).length;
    const totalCost = position.total_position_cost || 0;

    return { worksCount, materialsCount, totalCost };
  }, [position.boq_items, position.total_position_cost]);

  // Memoize position colors based on type
  const positionColors = useMemo(() => {
    const type = position.position_type || 'regular';
    const colorMap: Record<string, any> = {
      regular: { borderColor: '#1890ff', backgroundColor: '#fafafa' },
      additional: { borderColor: '#faad14', backgroundColor: '#fffbe6' },
      orphaned: { borderColor: '#ff4d4f', backgroundColor: '#fff1f0' }
    };
    return colorMap[type] || colorMap.regular;
  }, [position.position_type]);

  const handleDelete = useCallback(async () => {
    // Implement delete logic here
    console.log('Delete position:', position.id);
    onUpdate();
  }, [position.id, onUpdate]);

  const handleQuickAdd = useCallback(() => {
    // Implement quick add logic here
    console.log('Quick add for position:', position.id);
  }, [position.id]);

  return (
    <Card
      className="position-card"
      size="small"
      bodyStyle={{ padding: 0 }}
    >
      <PositionHeader
        position={position}
        isExpanded={isExpanded}
        onToggle={onToggle}
        onDelete={handleDelete}
        onQuickAdd={handleQuickAdd}
        stats={stats}
        positionColors={positionColors}
      />

      <LazyPositionContent
        position={position}
        isExpanded={isExpanded}
        tender={tender}
        tenderMarkup={null} // TODO: pass actual markup
        onUpdate={onUpdate}
      />
    </Card>
  );
};

// Optimized comparison function
const areEqual = (prevProps: ClientPositionCardOptimizedProps, nextProps: ClientPositionCardOptimizedProps) => {
  return (
    prevProps.position.id === nextProps.position.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.position.updated_at === nextProps.position.updated_at &&
    prevProps.position.total_position_cost === nextProps.position.total_position_cost &&
    (prevProps.position.boq_items?.length || 0) === (nextProps.position.boq_items?.length || 0)
  );
};

export default memo(ClientPositionCardOptimized, areEqual);