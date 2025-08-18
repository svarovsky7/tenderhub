import React, { useEffect, useState } from 'react';
import { CheckCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

const { Text } = Typography;

interface SuccessNotificationProps {
  visible: boolean;
  title: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  visible,
  title,
  description,
  duration = 4000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 50);
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    } else {
      handleClose();
    }
  }, [visible, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-green-200 overflow-hidden transform transition-all duration-300 ${
        isAnimating 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
      }`}
      style={{
        minWidth: '320px',
        maxWidth: '400px'
      }}
    >
      {/* Success animation background */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-emerald-50 opacity-90" />
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Success icon with animation */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleOutlined 
                className="text-2xl text-green-600 animate-bounce" 
                style={{ animationDuration: '0.6s', animationIterationCount: '1' }}
              />
            </div>
          </div>
          
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <Text strong className="text-gray-800 text-lg block mb-1">
              {title}
            </Text>
            {description && (
              <Text className="text-gray-600 text-sm">
                {description}
              </Text>
            )}
          </div>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-200"
          >
            <CloseOutlined className="text-gray-400 text-sm" />
          </button>
        </div>
        
        {/* Progress bar */}
        {duration > 0 && (
          <div className="mt-4 w-full bg-green-100 rounded-full h-1 overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all ease-linear"
              style={{
                width: isAnimating ? '0%' : '100%',
                transitionDuration: `${duration}ms`
              }}
            />
          </div>
        )}
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-2 right-2 w-16 h-16 bg-green-200 rounded-full opacity-20 -translate-y-8 translate-x-8" />
      <div className="absolute bottom-2 left-2 w-8 h-8 bg-emerald-300 rounded-full opacity-30 translate-y-4 -translate-x-4" />
    </div>
  );
};

export default SuccessNotification;