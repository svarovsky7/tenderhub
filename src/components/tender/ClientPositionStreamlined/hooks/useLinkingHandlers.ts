import { useCallback, useState } from 'react';
import { message } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { workMaterialTemplatesApi } from '../../../../lib/supabase/api';

interface UseLinkingHandlersProps {
  position: any;
  tenderId: string;
  templateAddForm: FormInstance;
  onUpdate: () => void;
}

export const useLinkingHandlers = ({
  position,
  tenderId,
  templateAddForm,
  onUpdate
}: UseLinkingHandlersProps) => {
  const [linkingModalVisible, setLinkingModalVisible] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [templateAddMode, setTemplateAddMode] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [templateOptions, setTemplateOptions] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loading, setLoading] = useState(false);

  // Open material linking modal
  const handleLinkMaterials = useCallback((workId: string) => {
    console.log('🔗 Opening material linking for work:', workId);
    setSelectedWorkId(workId);
    setLinkingModalVisible(true);
  }, []);

  // Handle material linking
  const handleMaterialsLinked = useCallback(() => {
    console.log('✅ Materials linked successfully');
    setLinkingModalVisible(false);
    setSelectedWorkId(null);
    onUpdate();
  }, [onUpdate]);

  // Load templates for autocomplete
  const loadTemplates = useCallback(async (searchValue: string) => {
    if (searchValue.length < 2) {
      setTemplateOptions([]);
      return;
    }

    setLoadingTemplates(true);
    try {
      console.log('🔍 Searching templates:', searchValue);
      const result = await workMaterialTemplatesApi.getTemplates();
      if (result.data) {
        const uniqueNames = [...new Set(result.data.map(t => t.template_name))]
          .filter(name => name.toLowerCase().includes(searchValue.toLowerCase()));
        setTemplateOptions(uniqueNames.map(name => ({
          value: name,
          label: name
        })));
        console.log('✅ Found templates:', uniqueNames.length);
      }
    } catch (error) {
      console.error('❌ Error loading templates:', error);
      message.error('Ошибка загрузки шаблонов');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

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
  }, [selectedTemplateName, tenderId, position.id, templateAddForm, onUpdate]);

  return {
    linkingModalVisible,
    setLinkingModalVisible,
    selectedWorkId,
    setSelectedWorkId,
    templateAddMode,
    setTemplateAddMode,
    selectedTemplateName,
    setSelectedTemplateName,
    templateOptions,
    setTemplateOptions,
    loadingTemplates,
    handleLinkMaterials,
    handleMaterialsLinked,
    loadTemplates,
    handleTemplateAdd,
    linkingLoading: loading
  };
};