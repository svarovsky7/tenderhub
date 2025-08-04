import React, { useState } from 'react';
import { Button, Form, Input, Card, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import type { LoginCredentials } from '../../lib/supabase/types';

const { Title, Text, Link } = Typography;

interface LoginFormProps {
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onSwitchToRegister, 
  onForgotPassword 
}) => {
  const { login, loading, error, clearError } = useAuth();
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleSubmit = async (values: LoginCredentials) => {
    setSubmitLoading(true);
    clearError();

    try {
      const response = await login(values);
      
      if (response.error) {
        // Error is handled by the auth context
        console.error('Login failed:', response.error);
      }
      // Success handling is managed by the auth context and routing
    } catch (err) {
      console.error('Unexpected login error:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleValuesChange = () => {
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg">
          <div className="text-center mb-8">
            <Title level={2} className="text-gray-900">
              Вход в TenderHub
            </Title>
            <Text type="secondary">
              Войдите в свою учетную запись для управления тендерами
            </Text>
          </div>

          {error && (
            <Alert
              message="Ошибка входа"
              description={error}
              type="error"
              showIcon
              closable
              onClose={clearError}
              className="mb-4"
            />
          )}

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            onValuesChange={handleValuesChange}
            size="large"
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                {
                  required: true,
                  message: 'Пожалуйста, введите ваш email',
                },
                {
                  type: 'email',
                  message: 'Пожалуйста, введите корректный email',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="Введите ваш email"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Пароль"
              rules={[
                {
                  required: true,
                  message: 'Пожалуйста, введите ваш пароль',
                },
                {
                  min: 6,
                  message: 'Пароль должен быть не менее 6 символов',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Введите ваш пароль"
                autoComplete="current-password"
                iconRender={(visible) => 
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitLoading || loading}
                block
                className="h-12 text-base font-medium"
              >
                {submitLoading || loading ? 'Вход...' : 'Войти'}
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center space-y-4">
            {onForgotPassword && (
              <div>
                <Link onClick={onForgotPassword} className="text-sm">
                  Забыли пароль?
                </Link>
              </div>
            )}
            
            {onSwitchToRegister && (
              <div>
                <Text type="secondary" className="text-sm">
                  Нет учетной записи?{' '}
                </Text>
                <Link onClick={onSwitchToRegister} className="text-sm font-medium">
                  Зарегистрироваться
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;