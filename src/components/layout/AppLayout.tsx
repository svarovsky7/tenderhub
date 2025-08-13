import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Typography, Breadcrumb } from 'antd';
import '../../layout/Layout.css';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  FileTextOutlined,
  TableOutlined,
  BookOutlined,
  SettingOutlined,
  UserOutlined,
  BellOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';
import ConnectionStatus from './ConnectionStatus';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: React.ReactNode;
  path: string;
  children?: MenuItem[];
}

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
    },
    {
      key: 'boq',
      icon: <TableOutlined />,
      label: <Link to="/boq">Позиции заказчика</Link>,
      path: '/boq',
    },
    {
      key: 'libraries',
      icon: <BookOutlined />,
      label: 'Библиотеки',
      path: '/libraries',
      children: [
        {
          key: 'materials',
          icon: null,
          label: <Link to="/libraries/materials">Материалы</Link>,
          path: '/libraries/materials',
        },
        {
          key: 'works',
          icon: null,
          label: <Link to="/libraries/works">Работы</Link>,
          path: '/libraries/works',
        },
      ],
    },
    {
      key: 'admin',
      icon: <SettingOutlined />,
      label: 'Администрирование',
      path: '/admin',
      children: [
        {
          key: 'users',
          icon: null,
          label: <Link to="/admin/users">Пользователи</Link>,
          path: '/admin/users',
        },
        {
          key: 'construction-costs',
          icon: null,
          label: <Link to="/admin/construction-costs">Затраты на строительство</Link>,
          path: '/admin/construction-costs',
        },
        {
          key: 'settings',
          icon: null,
          label: <Link to="/admin/settings">Настройки</Link>,
          path: '/admin/settings',
        },
      ],
    },
  ];

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

    const selectedKey = findMenuKey(menuItems);
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
          } else if (pathSegments[1] === 'construction-costs') {
            breadcrumbItems.push({ title: <span>Затраты на строительство</span> });
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

  // User dropdown menu
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Профиль',
      onClick: () => window.location.href = '/profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Настройки',
      onClick: () => window.location.href = '/settings',
    },
  ];

  return (
    <Layout className="layout">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="light"
        width={250}
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
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
          items={menuItems.map(item => ({
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

      <Layout className={`page ${collapsed ? 'collapsed' : ''}`}>
        <Header 
          className={`page__header ${collapsed ? 'collapsed' : ''}`}
          style={{ 
            padding: 0, 
            background: '#fff',
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
                      Пользователь
                    </div>
                    <div className="text-xs text-gray-500">
                      Администратор
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

        <Content className="page__content">
          <div className="page__inner">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <Breadcrumb items={getBreadcrumbItems()} />
            </div>
            
            <div className="page__content-inner">
              {/* Connection status bar */}
              <div className="mb-4">
                <ConnectionStatus />
              </div>
              
              <Outlet />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;