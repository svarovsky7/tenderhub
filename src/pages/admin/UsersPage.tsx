import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const UsersPage: React.FC = () => {
  return (
    <Card>
      <Title level={2}>Управление пользователями</Title>
      <p>Страница управления пользователями будет реализована в следующих версиях.</p>
    </Card>
  );
};

export default UsersPage;