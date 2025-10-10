import React, { useState, useEffect } from 'react';
import { Card, Typography, Avatar, Flex, Table, Select, message, Tag, Space, Button, Input, Popconfirm, Modal, Form } from 'antd';
import { TeamOutlined, ReloadOutlined, SearchOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getAllUsers, createUser, updateUserRole, deleteUser, type UserProfile } from '../../lib/supabase/api/users';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type UserRole } from '../../types/auth.types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

const { Title, Text } = Typography;
const { Search } = Input;

const UsersPage: React.FC = () => {
  const { theme } = useTheme();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Фильтрация по поисковой строке
    if (!searchText) {
      setFilteredUsers(users);
    } else {
      const lowerSearch = searchText.toLowerCase();
      const filtered = users.filter(
        user =>
          user.email.toLowerCase().includes(lowerSearch) ||
          user.full_name.toLowerCase().includes(lowerSearch)
      );
      setFilteredUsers(filtered);
    }
  }, [searchText, users]);

  const loadUsers = async () => {
    console.log('🚀 [UsersPage] Loading users');
    setLoading(true);

    const { data, error } = await getAllUsers();

    if (error) {
      message.error('Ошибка загрузки пользователей: ' + error.message);
      setLoading(false);
      return;
    }

    if (data) {
      console.log('✅ [UsersPage] Loaded users:', data.length);
      setUsers(data);
      setFilteredUsers(data);
    }

    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    console.log('🚀 [UsersPage] Changing role:', { userId, newRole });

    const { data, error } = await updateUserRole(userId, newRole);

    if (error) {
      message.error('Ошибка обновления роли: ' + error.message);
      return;
    }

    if (data) {
      message.success(`Роль пользователя "${data.full_name}" изменена с "${ROLE_LABELS[data.old_role!]}" на "${ROLE_LABELS[data.new_role!]}"`);
      // Обновляем данные в таблице
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    console.log('🚀 [UsersPage] Deleting user:', userId);

    const { error } = await deleteUser(userId);

    if (error) {
      message.error('Ошибка удаления пользователя: ' + error.message);
      return;
    }

    message.success(`Пользователь "${userName}" успешно удален`);
    // Удаляем из списка
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleCreateUser = async (values: any) => {
    console.log('🚀 [UsersPage] Creating user:', values);
    setCreating(true);

    const { data, error } = await createUser(
      values.email,
      values.password,
      values.full_name,
      values.role
    );

    setCreating(false);

    if (error) {
      message.error('Ошибка создания пользователя: ' + error.message);
      return;
    }

    if (data) {
      message.success(`Пользователь "${data.full_name}" успешно создан`);
      // Добавляем в список
      setUsers([...users, data]);
      // Закрываем модал и очищаем форму
      setIsModalOpen(false);
      form.resetFields();
    }
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const getRoleColor = (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
      Administrator: 'red',
      moderator: 'orange',
      engineer: 'blue',
      manager: 'green',
      director: 'purple'
    };
    return colors[role] || 'default';
  };

  const columns: ColumnsType<UserProfile> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 250,
      sorter: (a, b) => a.email.localeCompare(b.email),
      render: (email: string) => (
        <Text style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)' }}>
          {email}
        </Text>
      )
    },
    {
      title: 'ФИО',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 200,
      sorter: (a, b) => a.full_name.localeCompare(b.full_name),
      render: (name: string) => (
        <Text strong style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)' }}>
          {name}
        </Text>
      )
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      width: 200,
      filters: [
        { text: ROLE_LABELS.Administrator, value: 'Administrator' },
        { text: ROLE_LABELS.moderator, value: 'moderator' },
        { text: ROLE_LABELS.engineer, value: 'engineer' },
        { text: ROLE_LABELS.manager, value: 'manager' },
        { text: ROLE_LABELS.director, value: 'director' }
      ],
      onFilter: (value, record) => record.role === value,
      render: (role: UserRole, record) => (
        <Select
          value={role}
          onChange={(newRole) => handleRoleChange(record.id, newRole)}
          style={{ width: '100%' }}
          options={[
            { label: ROLE_LABELS.Administrator, value: 'Administrator' },
            { label: ROLE_LABELS.moderator, value: 'moderator' },
            { label: ROLE_LABELS.engineer, value: 'engineer' },
            { label: ROLE_LABELS.manager, value: 'manager' },
            { label: ROLE_LABELS.director, value: 'director' }
          ]}
        />
      )
    },
    {
      title: 'Описание роли',
      dataIndex: 'role',
      key: 'role_description',
      width: 300,
      render: (role: UserRole) => (
        <Text type="secondary" style={{ fontSize: 12, color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>
          {ROLE_DESCRIPTIONS[role]}
        </Text>
      )
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => (
        <Text style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>
          {dayjs(date).format('DD.MM.YYYY HH:mm')}
        </Text>
      )
    },
    {
      title: 'Последний вход',
      dataIndex: 'last_sign_in_at',
      key: 'last_sign_in_at',
      width: 180,
      sorter: (a, b) => {
        if (!a.last_sign_in_at) return 1;
        if (!b.last_sign_in_at) return -1;
        return new Date(a.last_sign_in_at).getTime() - new Date(b.last_sign_in_at).getTime();
      },
      render: (date: string | null) => (
        <Text style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>
          {date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '—'}
        </Text>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Popconfirm
          title="Удалить пользователя?"
          description="Это действие нельзя отменить. Все данные пользователя будут удалены."
          onConfirm={() => handleDeleteUser(record.id, record.full_name)}
          okText="Удалить"
          cancelText="Отмена"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            size="small"
          >
            Удалить
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div className="w-full min-h-full" style={{ background: theme === 'dark' ? '#141414' : '#f5f5f5' }}>
      <style>
        {`
          .users-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .users-page-header.dark {
            background: linear-gradient(135deg, #1e293b 0%, #064e3b 50%, #134e4a 100%);
          }
          .users-page-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: rotate 30s linear infinite;
          }
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div className="p-6">
        {/* Gradient Header */}
        <div className={`users-page-header ${theme === 'dark' ? 'dark' : ''}`}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={16}>
              <Avatar
                size={64}
                icon={<TeamOutlined />}
                style={{ background: 'rgba(255,255,255,0.2)' }}
              />
              <div>
                <Title level={2} style={{ margin: 0, color: 'white' }}>
                  Управление пользователями
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                  Создание, редактирование и управление ролями пользователей системы
                </Text>
              </div>
            </Flex>
            <Space>
              <Button
                type="default"
                size="large"
                icon={<UserAddOutlined />}
                onClick={() => setIsModalOpen(true)}
                style={{
                  borderRadius: 8,
                  height: 42,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white'
                }}
              >
                Добавить пользователя
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<ReloadOutlined />}
                onClick={loadUsers}
                loading={loading}
                style={{
                  borderRadius: 8,
                  height: 42
                }}
              >
                Обновить
              </Button>
            </Space>
          </Flex>
        </div>

        {/* Search Bar */}
        <Card
          style={{
            background: theme === 'dark' ? '#1f1f1f' : '#ffffff',
            borderColor: theme === 'dark' ? '#424242' : '#f0f0f0',
            marginBottom: 16,
            borderRadius: 12
          }}
        >
          <Search
            placeholder="Поиск по email или ФИО..."
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 500 }}
          />
        </Card>

        {/* Users Table */}
        <Card
          style={{
            background: theme === 'dark' ? '#1f1f1f' : '#ffffff',
            borderColor: theme === 'dark' ? '#424242' : '#f0f0f0',
            borderRadius: 12
          }}
        >
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} пользователей`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
            scroll={{ x: 1400 }}
            locale={{
              emptyText: 'Нет пользователей'
            }}
          />
        </Card>

        {/* Create User Modal */}
        <Modal
          title="Создание нового пользователя"
          open={isModalOpen}
          onCancel={handleModalCancel}
          onOk={() => form.submit()}
          confirmLoading={creating}
          okText="Создать"
          cancelText="Отмена"
          width={600}
        >
          <style>
            {`
              .ant-form-item-label > label {
                color: ${theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'} !important;
              }
            `}
          </style>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateUser}
            style={{ marginTop: 24 }}
          >
            <Form.Item
              name="full_name"
              label="ФИО"
              rules={[
                { required: true, message: 'Введите ФИО' },
                { min: 3, message: 'ФИО должно содержать минимум 3 символа' }
              ]}
            >
              <Input
                placeholder="Иванов Иван Иванович"
                size="large"
                style={{
                  backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff',
                  borderColor: theme === 'dark' ? '#434343' : '#d9d9d9',
                  color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'
                }}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Введите корректный email' }
              ]}
            >
              <Input
                placeholder="user@example.com"
                size="large"
                style={{
                  backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff',
                  borderColor: theme === 'dark' ? '#434343' : '#d9d9d9',
                  color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Пароль"
              rules={[
                { required: true, message: 'Введите пароль' },
                { min: 6, message: 'Пароль должен содержать минимум 6 символов' }
              ]}
            >
              <Input.Password
                placeholder="Минимум 6 символов"
                size="large"
                style={{
                  backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff',
                  borderColor: theme === 'dark' ? '#434343' : '#d9d9d9',
                  color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'
                }}
              />
            </Form.Item>

            <Form.Item
              name="role"
              label="Роль"
              rules={[{ required: true, message: 'Выберите роль' }]}
              initialValue="engineer"
            >
              <Select
                size="large"
                placeholder="Выберите роль"
                options={[
                  { label: ROLE_LABELS.Administrator, value: 'Administrator' },
                  { label: ROLE_LABELS.moderator, value: 'moderator' },
                  { label: ROLE_LABELS.engineer, value: 'engineer' },
                  { label: ROLE_LABELS.manager, value: 'manager' },
                  { label: ROLE_LABELS.director, value: 'director' }
                ]}
              />
            </Form.Item>

            <Form.Item noStyle shouldUpdate>
              {() => {
                const selectedRole = form.getFieldValue('role') as UserRole;
                return selectedRole ? (
                  <div style={{
                    padding: 12,
                    background: theme === 'dark' ? '#1f1f1f' : '#f5f5f5',
                    borderRadius: 8,
                    marginTop: -8
                  }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <strong>Описание роли:</strong> {ROLE_DESCRIPTIONS[selectedRole]}
                    </Text>
                  </div>
                ) : null;
              }}
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default UsersPage;