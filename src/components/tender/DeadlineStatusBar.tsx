import React, { useEffect, useState } from 'react';
import { Alert, Progress, Space, Typography } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text } = Typography;

interface DeadlineStatusBarProps {
  deadline: string | null;
  className?: string;
}

const DeadlineStatusBar: React.FC<DeadlineStatusBarProps> = ({ deadline, className = '' }) => {
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  if (!deadline) {
    return null;
  }

  const deadlineDate = dayjs(deadline);
  const now = currentTime;
  const daysLeft = deadlineDate.diff(now, 'day');
  const hoursLeft = deadlineDate.diff(now, 'hour');
  const totalDuration = deadlineDate.diff(dayjs(deadline).subtract(30, 'day'), 'day'); // Assume 30 day period
  const progress = Math.max(0, Math.min(100, ((totalDuration - daysLeft) / totalDuration) * 100));

  // Determine status and colors
  let status: 'success' | 'warning' | 'error' | 'info' = 'info';
  let icon = <ClockCircleOutlined />;
  let progressColor = '#1890ff';
  let message = '';

  if (daysLeft < 0) {
    status = 'error';
    icon = <CloseCircleOutlined />;
    progressColor = '#ff4d4f';
    message = `Дедлайн истек ${Math.abs(daysLeft)} ${getDayWord(Math.abs(daysLeft))} назад`;
  } else if (daysLeft === 0) {
    status = 'error';
    icon = <ExclamationCircleOutlined />;
    progressColor = '#ff4d4f';
    message = `Дедлайн сегодня! Осталось ${hoursLeft} ${getHourWord(hoursLeft)}`;
  } else if (daysLeft <= 3) {
    status = 'error';
    icon = <ExclamationCircleOutlined />;
    progressColor = '#ff4d4f';
    message = `Критично! Осталось ${daysLeft} ${getDayWord(daysLeft)}`;
  } else if (daysLeft <= 7) {
    status = 'warning';
    icon = <ExclamationCircleOutlined />;
    progressColor = '#faad14';
    message = `Внимание! Осталось ${daysLeft} ${getDayWord(daysLeft)}`;
  } else if (daysLeft <= 14) {
    status = 'warning';
    icon = <ClockCircleOutlined />;
    progressColor = '#faad14';
    message = `Осталось ${daysLeft} ${getDayWord(daysLeft)} до дедлайна`;
  } else {
    status = 'success';
    icon = <CheckCircleOutlined />;
    progressColor = '#52c41a';
    message = `Осталось ${daysLeft} ${getDayWord(daysLeft)} до дедлайна`;
  }

  // Format deadline date
  const formattedDeadline = deadlineDate.format('DD MMMM YYYY, HH:mm');
  const relativeTime = deadlineDate.fromNow();
  
  return (
    <div 
      className={`w-full relative ${className}`} 
      style={{ 
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '0 0 16px 16px',
        overflow: 'hidden',
        position: 'relative',
        backdropFilter: 'brightness(0.9)'
      }}
    >
        {/* Background for unfilled area */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255,255,255,0.05)',
            pointerEvents: 'none'
          }}
        />
        
        {/* Progress bar with vivid colors based on status */}
        <div 
          style={{ 
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress}%`,
            background: status === 'error' 
              ? 'linear-gradient(135deg, rgba(220,38,38,0.8) 0%, rgba(239,68,68,0.8) 100%)' 
              : status === 'warning'
              ? 'linear-gradient(135deg, rgba(217,119,6,0.8) 0%, rgba(245,158,11,0.8) 100%)'
              : 'linear-gradient(135deg, rgba(5,150,105,0.8) 0%, rgba(34,197,94,0.8) 100%)',
            transition: 'width 0.5s ease',
            borderRadius: progress >= 100 ? '0 0 16px 16px' : '0',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
          }}
        />
      
      <div className="relative z-10 py-1">
        <div className="text-center flex items-center justify-center" style={{ cursor: 'default', minHeight: '32px' }}>
          <Space size="middle" align="center">
            {React.cloneElement(icon, { style: { fontSize: 16, color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', verticalAlign: 'middle' } })}
            <Text strong style={{ fontSize: 14, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)', cursor: 'default', lineHeight: '16px' }}>{message}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.95)', textShadow: '0 2px 4px rgba(0,0,0,0.3)', cursor: 'default', lineHeight: '16px' }}>
              Дедлайн: {formattedDeadline}
            </Text>
            <div style={{ 
              background: 'rgba(0,0,0,0.3)', 
              padding: '2px 8px', 
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 12, color: 'white', fontWeight: 'bold', cursor: 'default' }}>
                {Math.round(progress)}%
              </Text>
            </div>
          </Space>
        </div>
      </div>
    </div>
  );
};

// Helper functions for Russian word forms
function getDayWord(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'дней';
  }

  if (lastDigit === 1) {
    return 'день';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня';
  }

  return 'дней';
}

function getHourWord(hours: number): string {
  const lastDigit = hours % 10;
  const lastTwoDigits = hours % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'часов';
  }

  if (lastDigit === 1) {
    return 'час';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'часа';
  }

  return 'часов';
}

export default DeadlineStatusBar;