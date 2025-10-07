import React, { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface GradientHeaderProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

/**
 * GradientHeader component that adapts gradient backgrounds for light/dark theme
 *
 * Usage:
 * <GradientHeader variant="primary">
 *   <div>Your header content</div>
 * </GradientHeader>
 */
const GradientHeader: React.FC<GradientHeaderProps> = ({
  children,
  className = '',
  style = {},
  variant = 'primary',
}) => {
  const { theme } = useTheme();

  // Define gradients for each variant
  const gradients = {
    light: {
      primary: 'linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%)',
      success: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
      warning: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)',
      danger: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
      info: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
    },
    dark: {
      primary: 'linear-gradient(135deg, #1a2e6e 0%, #047857 50%, #0f766e 100%)',
      success: 'linear-gradient(135deg, #4aa717 0%, #2e7d0b 100%)',
      warning: 'linear-gradient(135deg, #d87414 0%, #b55d08 100%)',
      danger: 'linear-gradient(135deg, #d93d3f 0%, #b01520 100%)',
      info: 'linear-gradient(135deg, #177ddc 0%, #085db7 100%)',
    },
  };

  const gradient = gradients[theme][variant];

  const combinedStyle: CSSProperties = {
    background: gradient,
    color: 'white',
    transition: 'background 0.3s ease',
    ...style,
  };

  return (
    <div className={className} style={combinedStyle}>
      {children}
    </div>
  );
};

export default GradientHeader;
