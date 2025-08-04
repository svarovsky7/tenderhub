import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Typography, Breadcrumb, message } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  FileTextOutlined,
  TableOutlined,
  BookOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useHasPermission } from '../../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: React.ReactNode;
  path: string;
  permission?: keyof ReturnType<typeof useHasPermission>;
  children?: MenuItem[];
}

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const permissions = useHasPermission();
  const location = useLocation();
  const navigate = useNavigate();

  // Menu items configuration
  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Дашборд</Link>,
      path: '/dashboard',
    },
    {
      key: 'tenders',
      icon: <FileTextOutlined />,
      label: <Link to="/tenders">Тендеры</Link>,
      path: '/tenders',
      permission: 'canViewTenders',
    },
    {
      key: 'boq',
      icon: <TableOutlined />,
      label: <Link to="/boq">BOQ Управление</Link>,
      path: '/boq',
      permission: 'canManageBOQ',
    },
    {
      key: 'libraries',
      icon: <BookOutlined />,
      label: 'Библиотеки',
      path: '/libraries',
      permission: 'canManageLibraries',
      children: [
        {
          key: 'materials',
          icon: null,
          label: <Link to="/libraries/materials">Материалы</Link>,
          path: '/libraries/materials',
          permission: 'canManageLibraries',
        },
        {
          key: 'works',
          icon: null,
          label: <Link to="/libraries/works">Работы</Link>,
          path: '/libraries/works',
          permission: 'canManageLibraries',
        },
      ],
    },
    {
      key: 'admin',
      icon: <SettingOutlined />,
      label: 'Администрирование',
      path: '/admin',
      permission: 'canManageUsers',
      children: [
        {
          key: 'users',
          icon: null,
          label: <Link to="/admin/users">Пользователи</Link>,
          path: '/admin/users',
          permission: 'canManageUsers',
        },
        {
          key: 'settings',
          icon: null,
          label: <Link to="/admin/settings">Настройки</Link>,
          path: '/admin/settings',
          permission: 'canManageUsers',
        },
      ],
    },
  ];

  // Filter menu items based on permissions
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter((item) => {
      if (item.permission && !permissions[item.permission]) {
        return false;
      }
      if (item.children) {
        item.children = filterMenuItems(item.children);
        return item.children.length > 0;
      }
      return true;
    });
  };

  const filteredMenuItems = filterMenuItems(menuItems);

  // Get current selected menu key based on location
  const getCurrentMenuKey = (): string[] => {
    const pathname = location.pathname;
    
    // Find matching menu item
    const findMenuKey = (items: MenuItem[]): string | null => {
      for (const item of items) {
        if (pathname.startsWith(item.path)) {
          return item.key;
        }
        if (item.children) {
          const childKey = findMenuKey(item.children);
          if (childKey) return childKey;
        }
      }
      return null;
    };

    const selectedKey = findMenuKey(filteredMenuItems);
    return selectedKey ? [selectedKey] : ['dashboard'];
  };

  // Generate breadcrumb items
  const getBreadcrumbItems = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    const breadcrumbItems = [
      {
        title: <Link to="/dashboard">Главная</Link>,
      },
    ];

    // Add segments based on current path
    if (pathSegments.length > 0) {
      const segment = pathSegments[0];
      switch (segment) {
        case 'tenders':
          breadcrumbItems.push({ title: <span>Тендеры</span> });
          break;
        case 'boq':
          breadcrumbItems.push({ title: <span>BOQ Управление</span> });
          break;
        case 'libraries':
          breadcrumbItems.push({ title: <span>Библиотеки</span> });
          if (pathSegments[1] === 'materials') {
            breadcrumbItems.push({ title: <span>Материалы</span> });
          } else if (pathSegments[1] === 'works') {
            breadcrumbItems.push({ title: <span>Работы</span> });
          }
          break;
        case 'admin':
          breadcrumbItems.push({ title: <span>Администрирование</span> });
          if (pathSegments[1] === 'users') {
            breadcrumbItems.push({ title: <span>Пользователи</span> });
          } else if (pathSegments[1] === 'settings') {
            breadcrumbItems.push({ title: <span>Настройки</span> });
          }
          break;
        default:
          break;
      }
    }

    return breadcrumbItems;
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await logout();
      if (response.error) {
        message.error('Ошибка при выходе из системы');
      } else {
        message.success('Вы успешно вышли из системы');
        navigate('/auth/login');
      }
    } catch (error) {
      message.error('Произошла ошибка при выходе');
    }
  };

  // User dropdown menu
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Профиль',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Настройки',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: handleLogout,
    },
  ];

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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="light"
        width={250}
        style={{
          boxShadow: '2px 0 6px rgba(0,21,41,.1)',
        }}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileTextOutlined className="text-white text-lg" />
            </div>
            {!collapsed && (
              <div>
                <Title level={4} className="m-0 text-gray-800">
                  TenderHub
                </Title>
              </div>
            )}
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={getCurrentMenuKey()}
          defaultOpenKeys={['libraries', 'admin']}
          style={{ borderRight: 0, marginTop: 8 }}
          items={filteredMenuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            children: item.children?.map(child => ({
              key: child.key,
              icon: child.icon,
              label: child.label,
            })),
          }))}
        />
      </Sider>

      <Layout>
        <Header 
          style={{ 
            padding: 0, 
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            zIndex: 1,
          }}
        >
          <div className="flex items-center justify-between h-full px-6">
            <div className="flex items-center space-x-4">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: '16px',
                  width: 48,
                  height: 48,
                }}
              />
            </div>

            <div className="flex items-center space-x-4">
              <Button
                type="text"
                icon={<SearchOutlined />}
                className="text-gray-600 hover:text-blue-600"
              />
              
              <Button
                type="text"
                icon={<BellOutlined />}
                className="text-gray-600 hover:text-blue-600"
              />

              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.full_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user?.role && getRoleDisplayName(user.role)}
                    </div>
                  </div>
                  <Avatar 
                    icon={<UserOutlined />} 
                    className="bg-blue-600"
                  />
                </div>
              </Dropdown>
            </div>
          </div>
        </Header>

        <Content style={{ margin: '0' }}>
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <Breadcrumb items={getBreadcrumbItems()} />
          </div>
          
          <div className="p-6">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;