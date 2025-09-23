import { useCallback } from 'react';
import { message } from 'antd';
import { clientPositionsApi } from '../../../../lib/supabase/api';

interface UsePositionHandlersProps {
  position: any;
  onUpdate: () => void;
  setTempManualVolume: (value: number | null) => void;
  setTempManualNote: (value: string) => void;
  setTempWorkName: (value: string) => void;
  setTempUnit: (value: string) => void;
}

export const usePositionHandlers = ({
  position,
  onUpdate,
  setTempManualVolume,
  setTempManualNote,
  setTempWorkName,
  setTempUnit
}: UsePositionHandlersProps) => {

  // Handle manual volume change
  const handleManualVolumeChange = useCallback(async (value: number | null) => {
    console.log('✏️ handleManualVolumeChange called:', { positionId: position.id, value });

    try {
      const result = await clientPositionsApi.update(position.id, { manual_volume: value });

      if (result.error) {
        console.error('❌ Manual volume update failed:', result.error);
        message.error('Ошибка сохранения количества ГП');
      } else {
        console.log('✅ Manual volume updated successfully');
        message.success('Количество ГП обновлено');
        onUpdate();
      }
    } catch (error) {
      console.error('💥 Manual volume update exception:', error);
      message.error('Ошибка сохранения количества ГП');
    }
  }, [position.id, onUpdate]);

  // Handle manual note change
  const handleManualNoteChange = useCallback(async (value: string) => {
    console.log('✏️ handleManualNoteChange called:', { positionId: position.id, value });

    try {
      const result = await clientPositionsApi.update(position.id, { manual_note: value || null });

      if (result.error) {
        console.error('❌ Manual note update failed:', result.error);
        message.error('Ошибка сохранения примечания ГП');
      } else {
        console.log('✅ Manual note updated successfully');
        message.success('Примечание ГП обновлено');
        onUpdate();
      }
    } catch (error) {
      console.error('💥 Manual note update exception:', error);
      message.error('Ошибка сохранения примечания ГП');
    }
  }, [position.id, onUpdate]);

  // Handle currency change
  const handleCurrencyChange = useCallback((currency: 'RUB' | 'USD' | 'EUR' | 'CNY') => {
    console.log('💱 Currency changed to:', currency);
    // Currency change logic will be handled by the parent component
  }, []);

  return {
    handleManualVolumeChange,
    handleManualNoteChange,
    handleCurrencyChange
  };
};