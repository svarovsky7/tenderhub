import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const BOQPage: React.FC = () => {
  return (
    <div className="w-full min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 py-6 border-b border-gray-200">
        <div className="max-w-none">
          <Title level={2}>BOQ Управление</Title>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-none">
        <Card>
          <p>Страница управления BOQ (Bill of Quantities) будет реализована в следующих версиях.</p>
        </Card>
      </div>
    </div>
  );
};

export default BOQPage;