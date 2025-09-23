import { useCallback } from 'react';
import { message } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { workMaterialTemplatesApi } from '../../../../lib/supabase/api';

interface UseTemplateHandlersProps {
  position: any;
  tenderId: string;
  selectedTemplateName: string;
  templateAddForm: FormInstance;
  setLoading: (loading: boolean) => void;
  setSelectedTemplateName: (name: string) => void;
  setTemplateAddMode: (mode: boolean) => void;
  setTemplateOptions: (options: any[]) => void;
  onUpdate: () => void;
}

export const useTemplateHandlers = ({
  position,
  tenderId,
  selectedTemplateName,
  templateAddForm,
  setLoading,
  setSelectedTemplateName,
  setTemplateAddMode,
  setTemplateOptions,
  onUpdate
}: UseTemplateHandlersProps) => {

  // Handle template addition to position
  const handleTemplateAdd = useCallback(async () => {
    if (!selectedTemplateName) {
      message.warning('Выберите шаблон');
      return;
    }

    console.log('🚀 Adding template to position:', {
      templateName: selectedTemplateName,
      tenderId,
      positionId: position.id
    });

    setLoading(true);
    try {
      // Convert template to BOQ items with links
      const convertResult = await workMaterialTemplatesApi.convertTemplateToBOQItems(
        selectedTemplateName,
        tenderId,
        position.id // Pass client position ID for proper insertion
      );

      if (convertResult.error) {
        throw new Error(convertResult.error);
      }

      if (!convertResult.data) {
        throw new Error('Нет элементов для добавления');
      }

      console.log('📌 Convert result structure:', {
        hasItems: !!convertResult.data.items,
        itemsCount: convertResult.data.items?.length,
        hasLinks: !!convertResult.data.links,
        linksCount: convertResult.data.links?.length,
        links: convertResult.data.links
      });

      // Insert items using bulk API
      const { boqBulkApi } = await import('../../../../lib/supabase/api/boq/bulk');
      const bulkResult = await boqBulkApi.bulkCreateInPosition(position.id, convertResult.data);

      if (bulkResult.error) {
        throw new Error(bulkResult.error);
      }

      message.success(`Шаблон "${selectedTemplateName}" добавлен (${bulkResult.data} элементов)`);

      // Reset form and close inline mode
      templateAddForm.resetFields();
      setSelectedTemplateName('');
      setTemplateAddMode(false);
      setTemplateOptions([]);

      // Refresh the position data
      onUpdate();
    } catch (error: any) {
      console.error('❌ Error adding template:', error);
      message.error(`Ошибка добавления шаблона: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedTemplateName, tenderId, position.id, templateAddForm, onUpdate,
      setLoading, setSelectedTemplateName, setTemplateAddMode, setTemplateOptions]);

  return {
    handleTemplateAdd
  };
};