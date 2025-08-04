import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const requiredRoles = (location.state as any)?.requiredRoles || [];
  
  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'Administrator':
        return 'Администратор';
      case 'Engineer':
        return 'Инженер';
      case 'View-only':
        return 'Просмотр';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Result
        status="403"
        title="Доступ запрещен"
        subTitle={
          requiredRoles.length > 0
            ? `Для доступа к данной странице требуется роль: ${requiredRoles.map(getRoleDisplayName).join(', ')}. Ваша текущая роль: ${user?.role ? getRoleDisplayName(user.role) : 'Не определена'}.`
            : 'У вас нет прав доступа к данной странице.'
        }
        extra={
          <div className="space-x-2">
            <Button type="primary" onClick={() => navigate('/dashboard')}>
              На главную
            </Button>
            <Button onClick={() => navigate(-1)}>
              Назад
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default UnauthorizedPage;