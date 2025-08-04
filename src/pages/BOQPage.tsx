import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const BOQPage: React.FC = () => {
  return (
    <Card>
      <Title level={2}>BOQ Управление</Title>
      <p>Страница управления BOQ (Bill of Quantities) будет реализована в следующих версиях.</p>
    </Card>
  );
};

export default BOQPage;