import React from 'react';
import { Result, Button } from 'antd';
import { useAuth } from '../contexts/AuthContext';

const InactivePage: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Result
        status="warning"
        title="Аккаунт деактивирован"
        subTitle="Ваш аккаунт был деактивирован администратором. Для восстановления доступа обратитесь к администратору системы."
        extra={
          <Button type="primary" onClick={handleLogout}>
            Выйти из системы
          </Button>
        }
      />
    </div>
  );
};

export default InactivePage;