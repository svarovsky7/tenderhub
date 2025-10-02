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
  DollarOutlined,
  LineChartOutlined,
  CalculatorOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';
import ConnectionStatus from './ConnectionStatus';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface MenuItem {
  key: string;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  path?: string;
  type?: 'divider';
  children?: MenuItem[];
}

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(['libraries', 'construction-costs', 'admin']);
  const location = useLocation();

  // Add styles for dropdown menus when collapsed and smooth animations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .ant-menu-submenu-popup {
        background-color: #ffffff !important;
        opacity: 1 !important;
        transition: opacity 0.1s ease-out !important;
      }
      .ant-menu-submenu-popup .ant-menu {
        background-color: #ffffff !important;
        opacity: 1 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
      }
      .ant-menu-submenu-popup .ant-menu-item {
        opacity: 1 !important;
      }
      .ant-menu-vertical.ant-menu-sub {
        background-color: #ffffff !important;
        opacity: 1 !important;
      }
      .ant-menu-sub.ant-menu-inline {
        background-color: #ffffff !important;
      }
      /* Override Ant Design's default slow animations */
      .ant-motion-collapse {
        transition-duration: 0.2s !important;
      }
      .ant-menu-inline .ant-menu-submenu-title {
        transition: all 0.2s;
      }
      .ant-menu-submenu-arrow {
        transition: transform 0.2s ease;
      }
      /* Fix double flash on hover for collapsed menu */
      .ant-menu-inline-collapsed .ant-menu-submenu-popup {
        animation: none !important;
      }
      .ant-menu-inline-collapsed .ant-menu-submenu-popup-hidden {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      /* Disable Ant Design's fade animations for popup menus */
      .ant-menu-submenu-popup.ant-slide-up-enter,
      .ant-menu-submenu-popup.ant-slide-up-enter-active {
        animation: none !important;
        opacity: 1 !important;
      }
      .ant-menu-submenu-popup.ant-slide-up-leave,
      .ant-menu-submenu-popup.ant-slide-up-leave-active {
        animation: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        display: none !important;
        visibility: hidden !important;
      }
      /* Force hide when not open */
      .ant-menu-submenu-popup:not(.ant-menu-submenu-popup-open) {
        display: none !important;
      }
      /* Cleanup stuck popups */
      .ant-menu-submenu-popup[style*="display: none"] {
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Clean up stuck popup menus when menu state changes
  React.useEffect(() => {
    // Remove all stuck popup menus whenever collapsed state changes
    const cleanupPopups = () => {
      const popups = document.querySelectorAll('.ant-menu-submenu-popup');
      popups.forEach(popup => {
        // Check if popup is not actively open
        if (!popup.classList.contains('ant-menu-submenu-popup-open')) {
          (popup as HTMLElement).style.display = 'none';
          (popup as HTMLElement).style.visibility = 'hidden';
          (popup as HTMLElement).style.opacity = '0';
        }
      });
    };

    // Clean up immediately on state change
    cleanupPopups();

    // Also clean up after a short delay to catch any animations
    const timer = setTimeout(cleanupPopups, 150);

    return () => clearTimeout(timer);
  }, [collapsed]);

  // Menu items configuration
  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Дашборд</Link>,
      path: '/dashboard',
    },
    {
      key: 'boq',
      icon: <TableOutlined />,
      label: <Link to="/boq">Позиции заказчика</Link>,
      path: '/boq',
    },
    {
      key: 'commerce',
      icon: <ShopOutlined />,
      label: 'Коммерция',
      path: '/commerce',
      children: [
        {
          key: 'commercial-costs',
          icon: null,
          label: <Link to="/commercial-costs">Коммерческие стоимости</Link>,
          path: '/commercial-costs',
        },
        {
          key: 'financial',
          icon: null,
          label: <Link to="/financial">Финансовые показатели</Link>,
          path: '/financial',
        },
      ],
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
        {
          key: 'work-materials',
          icon: null,
          label: <Link to="/libraries/work-materials">Шаблоны</Link>,
          path: '/libraries/work-materials',
        },
      ],
    },
    {
      key: 'construction-costs',
      icon: <DollarOutlined />,
      label: 'Затраты на строительство',
      path: '/construction-costs',
      children: [
        {
          key: 'tender-costs',
          icon: null,
          label: <Link to="/construction-costs/tender">Затраты тендера</Link>,
          path: '/construction-costs/tender',
        },
        {
          key: 'cost-management',
          icon: null,
          label: <Link to="/construction-costs/management">Структура затрат</Link>,
          path: '/construction-costs/management',
        },
      ],
    },
    {
      key: 'tender-markup',
      icon: <CalculatorOutlined />,
      label: <Link to="/tender-markup">Накрутки тендера</Link>,
      path: '/tender-markup',
    },
    {
      key: 'admin',
      icon: <SettingOutlined />,
      label: 'Администрирование',
      path: '/admin',
      children: [
        {
          key: 'tenders',
          icon: null,
          label: <Link to="/tenders">Тендеры</Link>,
          path: '/tenders',
        },
        {
          key: 'cost-edit',
          icon: null,
          label: <Link to="/construction-costs/edit">Редактирование Затрат</Link>,
          path: '/construction-costs/edit',
        },
        {
          type: 'divider',
          key: 'admin-divider',
        },
        {
          key: 'users',
          icon: null,
          label: <Link to="/admin/users">Пользователи</Link>,
          path: '/admin/users',
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
    console.log('🚀 [getCurrentMenuKey] called with pathname:', pathname);
    
    // Special handling for paths now under admin
    if (pathname.startsWith('/tenders') || pathname.startsWith('/tender/')) {
      console.log('✅ [getCurrentMenuKey] Found tenders match under admin');
      return ['tenders'];
    }
    
    if (pathname.startsWith('/construction-costs/edit')) {
      console.log('✅ [getCurrentMenuKey] Found cost-edit match under admin');
      return ['cost-edit'];
    }
    
    // Find matching menu item and parent keys
    const findMenuKeys = (items: MenuItem[], parentKey?: string): { selectedKey: string | null, parentKey: string | null } => {
      for (const item of items) {
        // Check children first for more specific matches
        if (item.children) {
          for (const child of item.children) {
            if (child.type !== 'divider' && child.path && pathname.startsWith(child.path)) {
              console.log('✅ [getCurrentMenuKey] Found child match:', child.key, 'Parent:', item.key);
              return { selectedKey: child.key, parentKey: item.key };
            }
          }
        }
        
        // Then check parent item
        if (item.path && pathname.startsWith(item.path)) {
          console.log('✅ [getCurrentMenuKey] Found parent match:', item.key);
          return { selectedKey: item.key, parentKey: null };
        }
      }
      return { selectedKey: null, parentKey: null };
    };

    const { selectedKey, parentKey } = findMenuKeys(menuItems);
    
    // Return array with selected key
    const result = selectedKey ? [selectedKey] : ['dashboard'];
    console.log('✅ [getCurrentMenuKey] Result:', result);
    return result;
  };
  
  // Update open keys when location changes
  React.useEffect(() => {
    console.log('🚀 [useEffect] Location changed:', location.pathname);
    
    const pathname = location.pathname;
    const newOpenKeys: string[] = [...openKeys];
    
    // Special handling for paths now under admin
    if (pathname.startsWith('/tenders') || pathname.startsWith('/tender/')) {
      if (!newOpenKeys.includes('admin')) {
        newOpenKeys.push('admin');
        console.log('✅ [useEffect] Auto-opening admin menu for tenders');
      }
    } else if (pathname.startsWith('/construction-costs/edit')) {
      if (!newOpenKeys.includes('admin')) {
        newOpenKeys.push('admin');
        console.log('✅ [useEffect] Auto-opening admin menu for cost edit');
      }
    } else {
      // Check if we need to open a parent menu
      for (const item of menuItems) {
        if (item.children) {
          for (const child of item.children) {
            if (child.type !== 'divider' && child.path && pathname.startsWith(child.path)) {
              if (!newOpenKeys.includes(item.key)) {
                newOpenKeys.push(item.key);
                console.log('✅ [useEffect] Auto-opening parent menu:', item.key);
              }
              break;
            }
          }
        }
      }
    }
    
    setOpenKeys(newOpenKeys);
  }, [location.pathname]);

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
          breadcrumbItems.push({ title: <span>Администрирование</span> });
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
          } else if (pathSegments[1] === 'work-materials') {
            breadcrumbItems.push({ title: <span>Работы и Материалы</span> });
          }
          break;
        case 'construction-costs':
          if (pathSegments[1] === 'edit') {
            // Special handling for edit page - it's now under admin
            breadcrumbItems.push({ title: <span>Администрирование</span> });
            breadcrumbItems.push({ title: <span>Редактирование Затрат</span> });
          } else {
            breadcrumbItems.push({ title: <span>Затраты на строительство</span> });
            if (pathSegments[1] === 'tender') {
              breadcrumbItems.push({ title: <span>Затраты тендера</span> });
            } else if (pathSegments[1] === 'management') {
              breadcrumbItems.push({ title: <span>Структура затрат</span> });
            }
          }
          break;
        case 'financial':
          breadcrumbItems.push({ title: <span>Финансовые показатели</span> });
          break;
        case 'commercial-costs':
          breadcrumbItems.push({ title: <span>Коммерческие стоимости</span> });
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
          openKeys={openKeys}
          onOpenChange={(keys) => {
            console.log('🔄 [Menu] onOpenChange:', keys);
            setOpenKeys(keys);
          }}
          style={{ borderRight: 0, marginTop: 8 }}
          items={menuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            children: item.children?.map(child => 
              child.type === 'divider' 
                ? { type: 'divider', key: child.key }
                : {
                    key: child.key,
                    icon: child.icon,
                    label: child.label,
                  }
            ),
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