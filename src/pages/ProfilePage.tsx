import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const ProfilePage: React.FC = () => {
  return (
    <Card>
      <Title level={2}>Профиль пользователя</Title>
      <p>Страница профиля пользователя будет реализована в следующих версиях.</p>
    </Card>
  );
};

export default ProfilePage;