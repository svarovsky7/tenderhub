import React from 'react';
import { Card, Skeleton, Space } from 'antd';

interface ClientPositionSkeletonProps {
  count?: number;
  showSearch?: boolean;
  className?: string;
}

const ClientPositionSkeletonCard: React.FC = () => (
  <Card className="mb-4" size="small">
    <div className="space-y-3">
      {/* Title and position number */}
      <div className="flex justify-between items-start">
        <Skeleton.Input style={{ width: 300, height: 20 }} active />
        <Skeleton.Input style={{ width: 60, height: 16 }} active />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton.Input style={{ width: 100, height: 16 }} active />
          <Skeleton.Input style={{ width: 120, height: 16 }} active />
          <Skeleton.Input style={{ width: 80, height: 16 }} active />
        </div>
        <div className="space-y-2">
          <Skeleton.Input style={{ width: 90, height: 16 }} active />
          <Skeleton.Input style={{ width: 110, height: 16 }} active />
          <Skeleton.Input style={{ width: 100, height: 16 }} active />
        </div>
      </div>

      {/* Optional note area */}
      <div className="mt-3">
        <Skeleton.Input style={{ width: '100%', height: 14 }} active />
      </div>
    </div>
  </Card>
);

const ClientPositionSkeleton: React.FC<ClientPositionSkeletonProps> = ({
  count = 5,
  showSearch = true,
  className = '',
}) => {
  return (
    <div className={className}>
      {showSearch && (
        <Card className="mb-4">
          <Space className="w-full justify-between">
            <Skeleton.Input style={{ width: 400, height: 32 }} active />
            <Skeleton.Input style={{ width: 150, height: 20 }} active />
          </Space>
        </Card>
      )}

      <div className="space-y-0">
        {Array.from({ length: count }, (_, index) => (
          <ClientPositionSkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
};

export { ClientPositionSkeleton, ClientPositionSkeletonCard };