import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import BOQItemRow from './BOQItemRow';

interface BOQItemsListProps {
  position: any;
  tender: any;
  tenderMarkup: any;
  onUpdate: () => void;
}

const BOQItemsList: React.FC<BOQItemsListProps> = ({
  position,
  tender,
  tenderMarkup,
  onUpdate
}) => {
  const boqItems = useMemo(() => {
    return position.boq_items || [];
  }, [position.boq_items]);

  const ItemRenderer = ({ index, style }: { index: number; style: any }) => {
    const item = boqItems[index];
    const isWork = item.item_type === 'work' || item.item_type === 'sub_work';

    return (
      <div style={style}>
        <BOQItemRow
          item={item}
          isWork={isWork}
          onEdit={() => console.log('Edit item:', item.id)}
          onDelete={() => console.log('Delete item:', item.id)}
          onLink={isWork ? () => console.log('Link materials:', item.id) : undefined}
        />
      </div>
    );
  };

  if (boqItems.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Элементы не добавлены
      </div>
    );
  }

  // For small lists, render normally. For large lists, use virtualization
  if (boqItems.length < 20) {
    return (
      <div className="space-y-1">
        {boqItems.map((item: any, index: number) => {
          const isWork = item.item_type === 'work' || item.item_type === 'sub_work';
          return (
            <BOQItemRow
              key={item.id}
              item={item}
              isWork={isWork}
              onEdit={() => console.log('Edit item:', item.id)}
              onDelete={() => console.log('Delete item:', item.id)}
              onLink={isWork ? () => console.log('Link materials:', item.id) : undefined}
            />
          );
        })}
      </div>
    );
  }

  return (
    <List
      height={Math.max(60, Math.min(400, boqItems.length * 60))}
      itemCount={boqItems.length}
      itemSize={60}
    >
      {ItemRenderer}
    </List>
  );
};

export default memo(BOQItemsList);