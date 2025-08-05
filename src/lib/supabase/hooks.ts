import { useState, useEffect } from 'react';
import { supabase } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Generic API response state management hook
export const useApiResponse = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (apiCall: () => Promise<{ data?: T; error?: string }>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      if (response.error) {
        setError(response.error);
      } else {
        setData(response.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};

// Loading state management hook
export const useLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);

  const withLoading = async <T>(
    asyncFunction: () => Promise<T>
  ): Promise<T> => {
    setLoading(true);
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    setLoading,
    withLoading,
  };
};

// Realtime subscription hook
export const useRealtime = (
  table: string,
  callback: (event: string, payload: any) => void
) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const realtimeChannel = supabase
      .channel(`realtime:${table}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        (payload) => {
          callback(payload.eventType, payload);
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    setChannel(realtimeChannel);

    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, [table, callback]);

  const unsubscribe = () => {
    if (channel) {
      channel.unsubscribe();
      setChannel(null);
      setConnected(false);
    }
  };

  return {
    connected,
    unsubscribe,
  };
};