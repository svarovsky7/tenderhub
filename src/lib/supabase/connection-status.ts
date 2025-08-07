/**
 * Connection status monitoring and utilities for Supabase
 */

import { supabase } from './client';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';

let connectionStatus: ConnectionStatus = 'disconnected';
let connectionListeners: Array<(status: ConnectionStatus) => void> = [];

/**
 * Get current connection status
 */
export const getConnectionStatus = (): ConnectionStatus => connectionStatus;

/**
 * Subscribe to connection status changes
 */
export const onConnectionStatusChange = (callback: (status: ConnectionStatus) => void) => {
  connectionListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    connectionListeners = connectionListeners.filter(listener => listener !== callback);
  };
};

/**
 * Update connection status and notify listeners
 */
const setConnectionStatus = (status: ConnectionStatus) => {
  if (connectionStatus !== status) {
    console.log(`🔌 Connection status changed: ${connectionStatus} → ${status}`);
    connectionStatus = status;
    connectionListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }
};

/**
 * Test connection to Supabase
 */
export const testConnection = async (): Promise<boolean> => {
  console.log('🔍 Testing Supabase connection...');
  setConnectionStatus('reconnecting');
  
  try {
    // Simple query to test connection
    const { data, error } = await supabase
      .from('tenders')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Connection test failed:', error);
      setConnectionStatus('error');
      return false;
    }
    
    console.log('✅ Connection test successful');
    setConnectionStatus('connected');
    return true;
  } catch (error) {
    console.error('💥 Connection test error:', error);
    setConnectionStatus('error');
    return false;
  }
};

/**
 * Check if we're currently online
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Initialize connection monitoring
 */
export const initConnectionMonitoring = () => {
  console.log('🚀 Initializing connection monitoring...');
  
  // Test initial connection
  testConnection();
  
  // Monitor online/offline status
  window.addEventListener('online', () => {
    console.log('🌐 Browser came online');
    testConnection();
  });
  
  window.addEventListener('offline', () => {
    console.log('📱 Browser went offline');
    setConnectionStatus('disconnected');
  });
  
  // Periodic connection checks (every 30 seconds when status is error)
  setInterval(() => {
    if (connectionStatus === 'error' && isOnline()) {
      console.log('🔄 Periodic connection recheck...');
      testConnection();
    }
  }, 30000);
};

/**
 * Get user-friendly status message
 */
export const getConnectionMessage = (status: ConnectionStatus): string => {
  switch (status) {
    case 'connected':
      return 'Подключение установлено';
    case 'disconnected':
      return 'Нет подключения к интернету';
    case 'reconnecting':
      return 'Подключение...';
    case 'error':
      return 'Ошибка подключения к серверу';
    default:
      return 'Неизвестный статус';
  }
};

/**
 * Get status color for UI
 */
export const getConnectionColor = (status: ConnectionStatus): string => {
  switch (status) {
    case 'connected':
      return 'green';
    case 'disconnected':
      return 'orange';
    case 'reconnecting':
      return 'blue';
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
};