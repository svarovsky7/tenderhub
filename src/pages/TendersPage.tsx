import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const TendersPage: React.FC = () => {
  return (
    <Card>
      <Title level={2}>Управление тендерами</Title>
      <p>Страница управления тендерами будет реализована в следующих версиях.</p>
    </Card>
  );
};

export default TendersPage;