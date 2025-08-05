import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const WorksPage: React.FC = () => {
  return (
    <div className="w-full min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 py-6 border-b border-gray-200">
        <div className="max-w-none">
          <Title level={2}>Библиотека работ</Title>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-none">
        <Card>
          <p>Страница управления библиотекой работ будет реализована в следующих версиях.</p>
        </Card>
      </div>
    </div>
  );
};

export default WorksPage;