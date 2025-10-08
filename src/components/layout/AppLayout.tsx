import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Typography, Breadcrumb, Switch, Tooltip } from 'antd';
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
  BulbOutlined,
  BulbFilled,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import ConnectionStatus from './ConnectionStatus';
import { useTheme } from '../../contexts/ThemeContext';

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
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Add styles for dropdown menus when collapsed and smooth animations
  React.useEffect(() => {
    const style = document.createElement('style');
    const isDark = theme === 'dark';
    style.textContent = `
      .ant-menu-submenu-popup {
        background-color: ${isDark ? '#1f1f1f' : '#ffffff'} !important;
        opacity: 1 !important;
        transition: opacity 0.1s ease-out, background-color 0.3s ease !important;
      }
      .ant-menu-submenu-popup .ant-menu {
        background-color: ${isDark ? '#1f1f1f' : '#ffffff'} !important;
        opacity: 1 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, ${isDark ? '0.45' : '0.15'}) !important;
      }
      .ant-menu-submenu-popup .ant-menu-item {
        opacity: 1 !important;
        color: ${isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'} !important;
      }
      .ant-menu-vertical.ant-menu-sub {
        background-color: ${isDark ? '#1f1f1f' : '#ffffff'} !important;
        opacity: 1 !important;
      }
      .ant-menu-sub.ant-menu-inline {
        background-color: ${isDark ? '#1f1f1f' : '#ffffff'} !important;
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
      /* Fix phantom letters bug during sidebar collapse/expand animation */
      .ant-layout-sider {
        overflow: hidden !important;
      }
      .ant-layout-sider-children {
        overflow: hidden !important;
      }
      /* Hide menu item text during collapse animation to prevent phantom letters */
      .ant-layout-sider-collapsed .ant-menu-item .ant-menu-title-content,
      .ant-layout-sider-collapsed .ant-menu-submenu-title .ant-menu-title-content {
        opacity: 0 !important;
        width: 0 !important;
        transition: opacity 0.1s ease-out, width 0.1s ease-out !important;
      }
      /* Show text smoothly when expanded */
      .ant-layout-sider:not(.ant-layout-sider-collapsed) .ant-menu-item .ant-menu-title-content,
      .ant-layout-sider:not(.ant-layout-sider-collapsed) .ant-menu-submenu-title .ant-menu-title-content {
        opacity: 1 !important;
        width: auto !important;
        transition: opacity 0.2s ease-in 0.1s, width 0.2s ease-in 0.1s !important;
      }
      /* Prevent text overflow during animation */
      .ant-menu-item, .ant-menu-submenu-title {
        overflow: hidden !important;
      }
      .ant-menu-title-content {
        overflow: hidden !important;
        text-overflow: clip !important;
        white-space: nowrap !important;
      }
      /* Custom submenu behavior: click on title navigates, click on arrow expands */
      .ant-menu-submenu-title {
        position: relative !important;
        cursor: pointer !important;
      }
      .ant-menu-submenu-arrow {
        cursor: pointer !important;
        z-index: 10 !important;
        position: relative !important;
      }
      /* Make title text clickable for navigation */
      .ant-menu-submenu-title .ant-menu-title-content {
        pointer-events: auto !important;
        cursor: pointer !important;
        flex: 1 !important;
      }
      /* Ensure icon doesn't interfere */
      .ant-menu-submenu-title .anticon {
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [theme]);

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

  // Menu items configuration (must be defined before useEffect that uses it)
  const menuItems: MenuItem[] = [
    {
      key: 'home',
      icon: <DashboardOutlined />,
      label: <Link to="/">Главная</Link>,
      path: '/',
    },
    {
      key: 'dashboard',
      icon: <LineChartOutlined />,
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
      label: <Link to="/commerce">Коммерция</Link>,
      path: '/commerce',
      children: [
        {
          key: 'commercial-costs',
          icon: null,
          label: <Link to="/commercial-costs">Коммерческие стоимости</Link>,
          path: '/commercial-costs',
        },
        {
          key: 'cost-redistribution',
          icon: null,
          label: <Link to="/cost-redistribution">Перераспределение сумм</Link>,
          path: '/cost-redistribution',
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
      label: <Link to="/libraries">Библиотеки</Link>,
      path: '/libraries',
      children: [
        {
          key: 'libraries-materials-works',
          icon: null,
          label: <Link to="/libraries/materials-works">Справочник</Link>,
          path: '/libraries/materials-works',
        },
        {
          key: 'work-materials',
          icon: null,
          label: <Link to="/libraries/work-materials">Шаблоны</Link>,
          path: '/libraries/work-materials',
        },
        {
          key: 'tender-materials-works',
          icon: null,
          label: <Link to="/libraries/tender-materials-works">БСМ</Link>,
          path: '/libraries/tender-materials-works',
        },
      ],
    },
    {
      key: 'construction-costs',
      icon: <DollarOutlined />,
      label: <Link to="/construction-costs">Затраты на строительство</Link>,
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
      key: 'admin',
      icon: <SettingOutlined />,
      label: <Link to="/admin">Администрирование</Link>,
      path: '/admin',
      children: [
        {
          key: 'nomenclatures',
          icon: null,
          label: <Link to="/admin/nomenclatures">Номенклатуры</Link>,
          path: '/admin/nomenclatures',
        },
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
      ],
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: <Link to="/admin/users">Пользователи</Link>,
      path: '/admin/users',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link to="/admin/settings">Настройки</Link>,
      path: '/admin/settings',
    },
  ];

  // Handle submenu title clicks for navigation (click on title navigates, click on arrow expands)
  React.useEffect(() => {
    const handleSubmenuTitleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if we clicked on submenu title (but not on arrow)
      const submenuTitle = target.closest('.ant-menu-submenu-title');
      if (!submenuTitle) return;

      // Check if we clicked on the arrow itself
      const clickedArrow = target.closest('.ant-menu-submenu-arrow');
      if (clickedArrow) {
        // Let default behavior handle arrow click (expand/collapse)
        return;
      }

      // Get the submenu key
      const submenuElement = submenuTitle.closest('.ant-menu-submenu');
      if (!submenuElement) return;

      const submenuKey = submenuElement.getAttribute('data-menu-id');
      console.log('🖱️ [Submenu] Title clicked, key:', submenuKey);

      // Find the menu item and navigate
      const menuItem = menuItems.find(item => item.key === submenuKey);
      if (menuItem && menuItem.path) {
        e.stopPropagation();
        e.preventDefault();
        console.log('🚀 [Submenu] Navigating to:', menuItem.path);
        navigate(menuItem.path);
      }
    };

    // Add event listener
    document.addEventListener('click', handleSubmenuTitleClick, true);

    return () => {
      document.removeEventListener('click', handleSubmenuTitleClick, true);
    };
  }, [navigate, menuItems]);

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
      let bestMatch: { selectedKey: string, parentKey: string | null, pathLength: number } | null = null;

      for (const item of items) {
        // Check children first for more specific matches
        if (item.children) {
          // Sort children by path length (longest first) to find most specific match
          const sortedChildren = [...item.children]
            .filter(child => child.type !== 'divider' && child.path)
            .sort((a, b) => (b.path?.length || 0) - (a.path?.length || 0));

          for (const child of sortedChildren) {
            if (child.path && pathname.startsWith(child.path)) {
              const pathLength = child.path.length;
              if (!bestMatch || pathLength > bestMatch.pathLength) {
                console.log('✅ [getCurrentMenuKey] Found child match:', child.key, 'Parent:', item.key, 'Path length:', pathLength);
                bestMatch = { selectedKey: child.key, parentKey: item.key, pathLength };
              }
            }
          }
        }

        // Then check parent item
        if (item.path && pathname.startsWith(item.path)) {
          const pathLength = item.path.length;
          if (!bestMatch || pathLength > bestMatch.pathLength) {
            console.log('✅ [getCurrentMenuKey] Found parent match:', item.key, 'Path length:', pathLength);
            bestMatch = { selectedKey: item.key, parentKey: null, pathLength };
          }
        }
      }

      return bestMatch
        ? { selectedKey: bestMatch.selectedKey, parentKey: bestMatch.parentKey }
        : { selectedKey: null, parentKey: null };
    };

    const { selectedKey, parentKey } = findMenuKeys(menuItems);
    
    // Return array with selected key
    const result = selectedKey ? [selectedKey] : ['home'];
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

  // Generate breadcrumb items with proper hierarchy
  const getBreadcrumbItems = () => {
    const pathname = location.pathname;
    const breadcrumbItems = [
      {
        title: <Link to="/">Главная</Link>,
      },
    ];

    // Breadcrumb mapping based on routes hierarchy
    const breadcrumbMap: { [key: string]: { title: string; parent?: string; link?: string } } = {
      '/dashboard': { title: 'Дашборд' },
      '/boq': { title: 'Позиции заказчика' },

      // Commerce section
      '/commerce': { title: 'Коммерция', link: '/commerce' },
      '/commercial-costs': { title: 'Коммерческие стоимости', parent: '/commerce' },
      '/cost-redistribution': { title: 'Перераспределение сумм', parent: '/commerce' },
      '/financial': { title: 'Финансовые показатели', parent: '/commerce' },
      '/financial-indicators': { title: 'Финансовые показатели', parent: '/commerce' },

      // Libraries section
      '/libraries': { title: 'Библиотеки', link: '/libraries' },
      '/libraries/materials-works': { title: 'Справочник', parent: '/libraries' },
      '/libraries/work-materials': { title: 'Шаблоны', parent: '/libraries' },
      '/libraries/tender-materials-works': { title: 'БСМ', parent: '/libraries' },

      // Construction Costs section
      '/construction-costs': { title: 'Затраты на строительство', link: '/construction-costs' },
      '/construction-costs/tender': { title: 'Затраты тендера', parent: '/construction-costs' },
      '/construction-costs/management': { title: 'Структура затрат', parent: '/construction-costs' },
      '/construction-costs/edit': { title: 'Редактирование Затрат', parent: '/admin' },

      // Admin section
      '/admin': { title: 'Администрирование', link: '/admin' },
      '/admin/nomenclatures': { title: 'Номенклатуры', parent: '/admin' },
      '/admin/users': { title: 'Пользователи', parent: '/admin' },
      '/admin/settings': { title: 'Настройки', parent: '/admin' },
      '/tenders': { title: 'Тендеры', parent: '/admin' },

      // Other
      '/profile': { title: 'Профиль' },
      '/settings': { title: 'Настройки' },
    };

    // Build breadcrumb chain
    const buildBreadcrumbChain = (path: string): void => {
      const crumb = breadcrumbMap[path];
      if (!crumb) return;

      // If has parent, add parent first
      if (crumb.parent) {
        buildBreadcrumbChain(crumb.parent);
      }

      // Add current crumb
      if (crumb.link) {
        breadcrumbItems.push({
          title: <Link to={crumb.link}>{crumb.title}</Link>,
        });
      } else {
        breadcrumbItems.push({
          title: <span>{crumb.title}</span>,
        });
      }
    };

    // Find matching route (try exact match first, then prefix match)
    let matchedPath = breadcrumbMap[pathname] ? pathname : null;
    if (!matchedPath) {
      // Try to find by prefix for dynamic routes
      const pathKeys = Object.keys(breadcrumbMap).sort((a, b) => b.length - a.length);
      matchedPath = pathKeys.find(key => pathname.startsWith(key)) || null;
    }

    if (matchedPath) {
      buildBreadcrumbChain(matchedPath);
    }

    return breadcrumbItems;
  };

  // Get parent path for "Back" button
  const getParentPath = (): string | null => {
    const pathname = location.pathname;

    const breadcrumbMap: { [key: string]: string | null } = {
      '/dashboard': '/',
      '/boq': '/',
      '/commerce': '/',
      '/commercial-costs': '/commerce',
      '/cost-redistribution': '/commerce',
      '/financial': '/commerce',
      '/financial-indicators': '/commerce',
      '/libraries': '/',
      '/libraries/materials-works': '/libraries',
      '/libraries/work-materials': '/libraries',
      '/libraries/tender-materials-works': '/libraries',
      '/construction-costs': '/',
      '/construction-costs/tender': '/construction-costs',
      '/construction-costs/management': '/construction-costs',
      '/construction-costs/edit': '/admin',
      '/admin': '/',
      '/admin/nomenclatures': '/admin',
      '/admin/users': '/admin',
      '/admin/settings': '/admin',
      '/tenders': '/admin',
      '/profile': '/',
      '/settings': '/',
    };

    // Exact match
    if (breadcrumbMap[pathname] !== undefined) {
      return breadcrumbMap[pathname];
    }

    // Prefix match for dynamic routes
    const pathKeys = Object.keys(breadcrumbMap).sort((a, b) => b.length - a.length);
    const matchedKey = pathKeys.find(key => pathname.startsWith(key));

    return matchedKey ? breadcrumbMap[matchedKey] : null;
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
    <Layout
      className="layout"
      style={{
        minHeight: '100vh',
        backgroundColor: theme === 'dark' ? '#141414' : '#f0f2f5'
      }}
    >
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={250}
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
        style={{
          boxShadow: '2px 0 6px rgba(0,21,41,.1)',
          backgroundColor: theme === 'dark' ? '#1f1f1f' : '#ffffff',
        }}
      >
        <div
          className={`flex items-center ${collapsed ? 'justify-center px-0' : 'px-4'}`}
          style={{
            height: '64px',
            borderBottom: theme === 'dark' ? '1px solid #424242' : '1px solid #e5e7eb',
            transition: 'padding 0.2s ease'
          }}
        >
          <div className="flex items-center space-x-4" style={{ height: '40px' }}>
            <div className={`${collapsed ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center flex-shrink-0`}
              style={{ transition: 'width 0.2s ease, height 0.2s ease' }}
            >
              <img
                src="/tenderhub-logo.svg"
                alt="TenderHub Logo"
                className="w-full h-full"
                style={{ objectFit: 'contain' }}
              />
            </div>
            {!collapsed && (
              <Title
                level={4}
                style={{
                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : '#1f2937',
                  margin: 0,
                  padding: 0,
                  lineHeight: '1',
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%'
                }}
              >
                TenderHub
              </Title>
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

      <Layout
        className={`page ${collapsed ? 'collapsed' : ''}`}
        style={{
          backgroundColor: theme === 'dark' ? '#141414' : '#f0f2f5'
        }}
      >
        <Header
          className={`page__header ${collapsed ? 'collapsed' : ''}`}
          style={{
            padding: 0,
            background: theme === 'dark' ? '#1f1f1f' : '#fff',
            borderBottom: theme === 'dark' ? '1px solid #424242' : '1px solid #f0f0f0',
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

              {/* Theme Toggle */}
              <Tooltip title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}>
                <div className="flex items-center space-x-2 px-3 py-2">
                  <BulbOutlined style={{ color: theme === 'dark' ? '#ffd666' : '#8c8c8c', fontSize: '18px' }} />
                  <Switch
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                    checkedChildren={<span style={{ fontSize: '14px' }}>🌙</span>}
                    unCheckedChildren={<span style={{ fontSize: '14px' }}>☀️</span>}
                    style={{ minWidth: '50px' }}
                    data-testid="theme-toggle"
                  />
                </div>
              </Tooltip>

              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <div
                  className="flex items-center space-x-3 cursor-pointer rounded-lg px-3 py-2 transition-colors"
                  style={{
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#262626' : '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="text-right">
                    <div
                      className="text-sm font-medium"
                      style={{
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : '#111827'
                      }}
                    >
                      Пользователь
                    </div>
                    <div
                      className="text-xs"
                      style={{
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.45)' : '#6b7280'
                      }}
                    >
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

        <Content
          className="page__content"
          style={{
            backgroundColor: theme === 'dark' ? '#141414' : '#f0f2f5'
          }}
        >
          <div className="page__inner">
            <div
              className="px-6 py-4 flex-shrink-0"
              style={{
                backgroundColor: theme === 'dark' ? '#1f1f1f' : '#ffffff',
                borderBottom: theme === 'dark' ? '1px solid #424242' : '1px solid #e5e7eb'
              }}
            >
              <div className="flex items-center gap-4">
                {/* Back button - only show if there's a parent path and not on home page */}
                {getParentPath() && location.pathname !== '/' && (
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => {
                      const parentPath = getParentPath();
                      if (parentPath) {
                        navigate(parentPath);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'
                    }}
                  >
                    Назад
                  </Button>
                )}
                <Breadcrumb items={getBreadcrumbItems()} />
              </div>
            </div>

            <div
              className="page__content-inner"
              style={{
                backgroundColor: theme === 'dark' ? '#141414' : '#f0f2f5'
              }}
            >
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