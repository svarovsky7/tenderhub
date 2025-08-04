import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const SettingsPage: React.FC = () => {
  return (
    <Card>
      <Title level={2}>Настройки системы</Title>
      <p>Страница настроек системы будет реализована в следующих версиях.</p>
    </Card>
  );
};

export default SettingsPage;