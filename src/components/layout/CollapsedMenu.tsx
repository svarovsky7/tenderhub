import React, { useState, useEffect } from 'react';
import { Popover } from 'antd';
import { Link } from 'react-router-dom';

interface MenuItem {
  key: string;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  path?: string;
  type?: 'divider';
  children?: MenuItem[];
}

interface CollapsedMenuProps {
  menuItems: MenuItem[];
  selectedKeys: string[];
}

const CollapsedMenu: React.FC<CollapsedMenuProps> = ({ menuItems, selectedKeys }) => {
  const [visiblePopover, setVisiblePopover] = useState<string | null>(null);

  // Clean up popovers when component unmounts or re-renders
  useEffect(() => {
    return () => {
      setVisiblePopover(null);
    };
  }, []);

  // Reset popover state when component re-mounts
  useEffect(() => {
    setVisiblePopover(null);
  }, [menuItems]);

  const handlePopoverChange = (visible: boolean, key: string) => {
    setVisiblePopover(visible ? key : null);
  };

  const renderSubmenuContent = (children: MenuItem[]) => {
    return (
      <div className="ant-menu-submenu-popup-content" style={{ minWidth: '200px' }}>
        {children.map((child) => {
          if (child.type === 'divider') {
            return <div key={child.key} className="ant-menu-item-divider" />;
          }

          const isSelected = selectedKeys.includes(child.key);

          return (
            <div
              key={child.key}
              className={`ant-menu-item ${isSelected ? 'ant-menu-item-selected' : ''}`}
              style={{
                padding: '5px 12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                borderRadius: '4px',
                marginBottom: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isSelected ? '#e6f4ff' : 'transparent';
              }}
            >
              {child.label}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ul className="ant-menu ant-menu-root ant-menu-inline ant-menu-light ant-menu-inline-collapsed">
      {menuItems.map((item) => {
        const isSelected = selectedKeys.includes(item.key);
        const hasChildren = item.children && item.children.length > 0;

        if (hasChildren) {
          return (
            <Popover
              key={item.key}
              placement="right"
              content={renderSubmenuContent(item.children!)}
              trigger="hover"
              open={visiblePopover === item.key}
              onOpenChange={(visible) => handlePopoverChange(visible, item.key)}
              destroyTooltipOnHide={true}
              overlayClassName="collapsed-menu-popover"
              overlayStyle={{
                paddingLeft: '4px',
              }}
            >
              <li
                className={`ant-menu-submenu ant-menu-submenu-inline ${
                  isSelected ? 'ant-menu-submenu-selected' : ''
                }`}
                style={{ paddingLeft: 0 }}
              >
                <div
                  className="ant-menu-submenu-title"
                  style={{
                    padding: '0 16px',
                    height: '40px',
                    lineHeight: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="ant-menu-item-icon">{item.icon}</span>
                </div>
              </li>
            </Popover>
          );
        }

        // Direct menu item (no children)
        return (
          <li
            key={item.key}
            className={`ant-menu-item ${isSelected ? 'ant-menu-item-selected' : ''}`}
            style={{
              padding: '0 16px',
              height: '40px',
              lineHeight: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="ant-menu-item-icon">{item.icon}</span>
            <span style={{ display: 'none' }}>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
};

export default CollapsedMenu;