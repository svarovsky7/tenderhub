import React, { useState, useEffect } from 'react';
import { Badge, Tooltip, Button } from 'antd';
import { 
  WifiOutlined, 
  DisconnectOutlined, 
  LoadingOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { 
  getConnectionStatus,
  onConnectionStatusChange,
  getConnectionMessage,
  getConnectionColor,
  testConnection,
  type ConnectionStatus as ConnectionStatusType
} from '../../lib/supabase/connection-status';

const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatusType>(getConnectionStatus());
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = onConnectionStatusChange(setStatus);
    
    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const handleRetryConnection = async () => {
    console.log('🔄 Manual connection retry triggered');
    setIsRetrying(true);
    
    try {
      await testConnection();
    } finally {
      setIsRetrying(false);
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'connected':
        return <WifiOutlined className="text-green-500" />;
      case 'disconnected':
        return <DisconnectOutlined className="text-orange-500" />;
      case 'reconnecting':
        return <LoadingOutlined className="text-blue-500" spin />;
      case 'error':
        return <ExclamationCircleOutlined className="text-red-500" />;
      default:
        return <WifiOutlined className="text-gray-500" />;
    }
  };

  // Don't show when connected (reduce UI clutter)
  if (status === 'connected') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Tooltip title={getConnectionMessage(status)}>
        <Badge 
          color={getConnectionColor(status)}
          dot
          className="flex items-center"
        >
          {getIcon()}
        </Badge>
      </Tooltip>
      
      <span className="text-sm text-gray-600">
        {getConnectionMessage(status)}
      </span>
      
      {(status === 'error' || status === 'disconnected') && (
        <Button
          type="text"
          size="small"
          icon={isRetrying ? <LoadingOutlined spin /> : <ReloadOutlined />}
          onClick={handleRetryConnection}
          loading={isRetrying}
          className="text-blue-500 hover:text-blue-600"
        >
          Повторить
        </Button>
      )}
    </div>
  );
};

export default ConnectionStatus;