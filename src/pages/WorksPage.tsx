import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const WorksPage: React.FC = () => {
  return (
    <Card>
      <Title level={2}>Библиотека работ</Title>
      <p>Страница управления библиотекой работ будет реализована в следующих версиях.</p>
    </Card>
  );
};

export default WorksPage;