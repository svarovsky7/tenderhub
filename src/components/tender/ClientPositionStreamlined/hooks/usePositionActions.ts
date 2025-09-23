import { useCallback } from 'react';
import { message } from 'antd';
import { clientPositionsApi } from '../../../../lib/supabase/api';

interface UsePositionActionsProps {
  positionId: string;
  onUpdate: () => void;
}

export const usePositionActions = ({ positionId, onUpdate }: UsePositionActionsProps) => {
  const handleManualVolumeChange = useCallback(async (value: number | null) => {
    console.log('✏️ handleManualVolumeChange called:', { positionId, value });

    try {
      const result = await clientPositionsApi.update(positionId, { manual_volume: value });

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
  }, [positionId, onUpdate]);

  const handleManualNoteChange = useCallback(async (value: string) => {
    console.log('✏️ handleManualNoteChange called:', { positionId, value });

    try {
      const result = await clientPositionsApi.update(positionId, { manual_note: value || null });

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
  }, [positionId, onUpdate]);

  return {
    handleManualVolumeChange,
    handleManualNoteChange
  };
};