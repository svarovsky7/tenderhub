import React, { lazy, Suspense, memo } from 'react';
import { Spin } from 'antd';

const BOQItemsList = lazy(() => import('./BOQItemsList'));

interface LazyPositionContentProps {
  position: any;
  isExpanded: boolean;
  tender: any;
  tenderMarkup: any;
  onUpdate: () => void;
}

const LazyPositionContent: React.FC<LazyPositionContentProps> = ({
  position,
  isExpanded,
  tender,
  tenderMarkup,
  onUpdate
}) => {
  if (!isExpanded) {
    return null;
  }

  return (
    <Suspense fallback={<div className="p-4 text-center"><Spin size="small" /></div>}>
      <BOQItemsList
        position={position}
        tender={tender}
        tenderMarkup={tenderMarkup}
        onUpdate={onUpdate}
      />
    </Suspense>
  );
};

export default memo(LazyPositionContent);