import React, { useState } from 'react';
import { Button, Form, Input, Card, Alert, Typography, Select } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone, MailOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import type { RegisterCredentials, UserRole } from '../../lib/supabase/types';

const { Title, Text, Link } = Typography;
const { Option } = Select;

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, loading, error, clearError } = useAuth();
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const roleOptions: { value: UserRole; label: string; description: string }[] = [
    {
      value: 'View-only',
      label: 'Просмотр',
      description: 'Только просмотр тендеров и данных'
    },
    {
      value: 'Engineer',
      label: 'Инженер',
      description: 'Создание и редактирование тендеров, управление BOQ'
    },
    {
      value: 'Administrator',
      label: 'Администратор',
      description: 'Полный доступ ко всем функциям системы'
    }
  ];

  const handleSubmit = async (values: RegisterCredentials) => {
    setSubmitLoading(true);
    clearError();
    setShowSuccess(false);

    try {
      const response = await register(values);
      
      if (response.error) {
        // Error is handled by the auth context
        console.error('Registration failed:', response.error);
      } else {
        // Show success message
        setShowSuccess(true);
        form.resetFields();
      }
    } catch (err) {
      console.error('Unexpected registration error:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleValuesChange = () => {
    // Clear error and success when user starts typing
    if (error) {
      clearError();
    }
    if (showSuccess) {
      setShowSuccess(false);
    }
  };

  const validateConfirmPassword = (_: any, value: string) => {
    if (!value || form.getFieldValue('password') === value) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('Пароли не совпадают'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg">
          <div className="text-center mb-8">
            <Title level={2} className="text-gray-900">
              Регистрация в TenderHub
            </Title>
            <Text type="secondary">
              Создайте учетную запись для управления тендерами
            </Text>
          </div>

          {error && (
            <Alert
              message="Ошибка регистрации"
              description={error}
              type="error"
              showIcon
              closable
              onClose={clearError}
              className="mb-4"
            />
          )}

          {showSuccess && (
            <Alert
              message="Регистрация успешна!"
              description="Аккаунт создан успешно. Проверьте вашу почту для подтверждения email адреса."
              type="success"
              showIcon
              closable
              onClose={() => setShowSuccess(false)}
              className="mb-4"
            />
          )}

          <Form
            form={form}
            name="register"
            onFinish={handleSubmit}
            onValuesChange={handleValuesChange}
            size="large"
            layout="vertical"
            requiredMark={false}
            scrollToFirstError
          >
            <Form.Item
              name="full_name"
              label="Полное имя"
              rules={[
                {
                  required: true,
                  message: 'Пожалуйста, введите ваше полное имя',
                },
                {
                  min: 2,
                  message: 'Имя должно быть не менее 2 символов',
                },
                {
                  max: 100,
                  message: 'Имя не должно превышать 100 символов',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="Введите ваше полное имя"
                autoComplete="name"
              />
            </Form.Item>

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
                prefix={<MailOutlined className="text-gray-400" />}
                placeholder="Введите ваш email"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="role"
              label="Роль"
              rules={[
                {
                  required: true,
                  message: 'Пожалуйста, выберите роль',
                },
              ]}
              initialValue="View-only"
            >
              <Select
                placeholder="Выберите вашу роль"
                suffixIcon={<TeamOutlined className="text-gray-400" />}
                optionLabelProp="label"
              >
                {roleOptions.map((option) => (
                  <Option key={option.value} value={option.value} label={option.label}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="password"
              label="Пароль"
              rules={[
                {
                  required: true,
                  message: 'Пожалуйста, введите пароль',
                },
                {
                  min: 6,
                  message: 'Пароль должен быть не менее 6 символов',
                },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Пароль должен содержать строчные, прописные буквы и цифры',
                },
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Введите пароль"
                autoComplete="new-password"
                iconRender={(visible) => 
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Подтвердите пароль"
              dependencies={['password']}
              rules={[
                {
                  required: true,
                  message: 'Пожалуйста, подтвердите пароль',
                },
                {
                  validator: validateConfirmPassword,
                },
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Подтвердите пароль"
                autoComplete="new-password"
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
                {submitLoading || loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center">
            {onSwitchToLogin && (
              <div>
                <Text type="secondary" className="text-sm">
                  Уже есть учетная запись?{' '}
                </Text>
                <Link onClick={onSwitchToLogin} className="text-sm font-medium">
                  Войти
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterForm;