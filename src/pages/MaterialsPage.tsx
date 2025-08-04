import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const MaterialsPage: React.FC = () => {
  return (
    <Card>
      <Title level={2}>Библиотека материалов</Title>
      <p>Страница управления библиотекой материалов будет реализована в следующих версиях.</p>
    </Card>
  );
};

export default MaterialsPage;