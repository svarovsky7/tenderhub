import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Tooltip, Modal, message, Empty, Form, Input, Select, InputNumber, AutoComplete, Switch } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ToolOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  BuildOutlined,
  LinkOutlined,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workMaterialTemplatesApi, type TemplateGroup } from '../../lib/supabase/api/work-material-templates';
import { materialsApi, worksApi } from '../../lib/supabase/api';
import { DecimalInput } from '../common';
import { supabase } from '../../lib/supabase/client';
import type { ColumnsType } from 'antd/es/table';

interface TemplateListProps {
  onAddToTemplate?: (templateName: string, templateNote?: string) => void;
  showContent?: boolean;
  searchQuery?: string;
}

interface TemplateItem {
  id: string;
  template_item_id?: string;  // Реальный ID записи из БД для удаления
  template_name: string;
  template_description?: string;

  // Work data
  work_id?: string;
  work_library_id?: string;
  sub_work_library_id?: string;
  work_name?: string;
  work_type?: 'work' | 'sub_work';
  work_unit?: string;
  work_unit_rate?: number;
  work_currency_type?: string;
  work_category?: string;

  // Material data
  material_id?: string;
  material_library_id?: string;
  sub_material_library_id?: string;
  material_name?: string;
  material_type?: 'material' | 'sub_material';
  material_unit?: string;
  material_unit_rate?: number;
  material_currency_type?: string;
  material_category?: string;
  material_material_type?: 'main' | 'auxiliary';  // Тип материала (основной/вспомогательный)
  material_consumption_coefficient?: number;
  material_delivery_price_type?: string;
  material_delivery_amount?: number;
  material_quote_link?: string;

  // Template item data
  conversion_coefficient: number;
  is_linked_to_work: boolean;

  // UI helpers
  item_type: 'work' | 'sub_work' | 'material' | 'sub_material';
  display_order?: number;
  indent?: boolean;
  linked_work_name?: string;
}

const TemplateList: React.FC<TemplateListProps> = ({ onAddToTemplate, showContent = false, searchQuery = '' }) => {
  console.log('🚀 TemplateList render', { showContent, searchQuery });

  const [expandedTemplates, setExpandedTemplates] = useState<string[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [addingToTemplate, setAddingToTemplate] = useState<string | null>(null);
  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();
  const [libraryData, setLibraryData] = useState<{ materials: any[]; works: any[] }>({
    materials: [],
    works: []
  });
  const [collapsedTemplates, setCollapsedTemplates] = useState<Set<string>>(new Set());
  const [editingTemplateName, setEditingTemplateName] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [editingTemplateDescription, setEditingTemplateDescription] = useState<string | null>(null);
  const [newTemplateDescription, setNewTemplateDescription] = useState<string>('');

  const queryClient = useQueryClient();

  // Загрузка шаблонов
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['work-material-templates'],
    queryFn: async () => {
      console.log('📡 Загрузка шаблонов');
      const response = await workMaterialTemplatesApi.getTemplates();
      if (response.error) {
        throw new Error(response.error);
      }
      console.log('✅ Шаблоны загружены:', response.data?.length);
      return response.data || [];
    }
  });

  // Update collapsed state when showContent changes
  useEffect(() => {
    if (!templates || templates.length === 0) return;

    if (showContent) {
      // Show content - clear collapsed templates
      setCollapsedTemplates(new Set());
    } else {
      // Hide content - collapse all templates
      setCollapsedTemplates(new Set(templates.map((t: TemplateGroup) => t.template_name)));
    }
  }, [showContent]); // Убираем templates из зависимостей, чтобы не сворачивать при обновлении данных

  // Load library data
  useEffect(() => {
    const loadLibraryData = async () => {
      try {
        const [materialsResult, worksResult] = await Promise.all([
          materialsApi.getAll(),
          worksApi.getAll()
        ]);
        console.log('📚 Library data loaded:', {
          materials: materialsResult.data?.slice(0, 2),
          works: worksResult.data?.slice(0, 2)
        });
        setLibraryData({
          materials: materialsResult.data || [],
          works: worksResult.data || []
        });
      } catch (error) {
        console.error('Error loading library data:', error);
      }
    };
    loadLibraryData();
  }, []);

  // Transform template data for hierarchical display
  const transformedTemplates = useMemo(() => {
    return templates.map((template: TemplateGroup) => {
      const items: TemplateItem[] = [];

      // Process all items (works and materials are now all in materials array)
      const allItems = template.materials || [];

      console.log(`📋 Transforming template "${template.template_name}":`, {
        total_items: allItems.length,
        items: allItems.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          linked_work_id: item.linked_work_id
        }))
      });

      // Separate works and materials
      const works = allItems.filter(item => item.type === 'work' || item.type === 'sub_work');
      const materials = allItems.filter(item => item.type === 'material' || item.type === 'sub_material');

      console.log(`  📊 Found ${works.length} works and ${materials.length} materials`);
      console.log(`  Works:`, works.map(w => ({ id: w.id, name: w.name, type: w.type })));
      console.log(`  Materials:`, materials.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        linked_work_id: m.linked_work_id,
        is_linked: m.is_linked_to_work
      })));

      // Process items to create proper hierarchy
      const processedMaterialIds = new Set<string>();
      const processedWorkIds = new Set<string>();

      // First, process combined records (work+material in one DB record)
      materials.forEach((material: any) => {
        if (material.is_combined_record && material.linked_work_id) {
          // This material record contains both work and material info
          const workId = material.linked_work_id;

          // Add the work part if not already added
          if (!processedWorkIds.has(workId)) {
            const workItemId = `${template.template_name}-work-${workId}`;
            console.log('🔨 Adding work from combined record:', {
              workItemId,
              template_item_id: material.template_item_id,
              work_name: material.linked_work_name,
              work_type: material.linked_work_type
            });

            // Debug linked work unit
            if (!material.linked_work_unit) {
              console.warn('⚠️ Material linked work without unit:', {
                work_name: material.linked_work_name,
                material_name: material.name,
                raw_material: material
              });
            }

            items.push({
              id: workItemId,
              template_item_id: material.template_item_id,  // Same DB record ID
              template_name: template.template_name,
              template_description: template.template_description,
              work_id: workId,
              work_library_id: material.work_library_id,
              sub_work_library_id: material.sub_work_library_id,
              work_name: material.linked_work_name,
              work_type: material.linked_work_type || 'work',
              work_unit: material.linked_work_unit,  // Use the unit from linked work
              work_unit_rate: material.work_library?.unit_rate || material.sub_work_library?.unit_rate,
              work_currency_type: material.work_library?.currency_type || material.sub_work_library?.currency_type || 'RUB',
              item_type: material.linked_work_type || 'work',
              is_from_combined: true,  // Flag to know this work is from a combined record
              indent: false
            });

            processedWorkIds.add(workId);
          }

          // Add the material part (linked to the work)
          const materialItemId = `${template.template_name}-material-${material.id}`;
          console.log('📦 Adding material from combined record:', {
            materialItemId,
            template_item_id: material.template_item_id,
            material_name: material.name,
            linked_work_id: material.linked_work_id
          });

          items.push({
            id: materialItemId,
            template_item_id: material.template_item_id,  // Same DB record ID
            template_name: template.template_name,
            template_description: template.template_description,
            material_id: material.id,
            material_library_id: material.material_library_id,
            sub_material_library_id: material.sub_material_library_id,
            material_name: material.name,
            material_type: material.material_type,
            material_material_type: material.material_type,  // Добавляем тип материала (основной/вспомогательный)
            material_unit: material.unit,
            material_consumption_coefficient: material.consumption_coefficient || 1,
            material_unit_rate: material.unit_rate,
            material_currency_type: material.currency_type || 'RUB',
            material_delivery_price_type: material.delivery_price_type,
            material_delivery_amount: material.delivery_amount,
            material_quote_link: material.quote_link,
            conversion_coefficient: material.conversion_coefficient || 1,
            is_linked_to_work: true,
            linked_work_id: material.linked_work_id,
            linked_work_name: material.linked_work_name,
            item_type: material.type,
            is_from_combined: true,  // Flag to know this material is from a combined record
            indent: true
          });

          processedMaterialIds.add(material.id);
        }
      });

      // Then add standalone works (not part of combined records)
      works.forEach((work: any) => {
        if (!processedWorkIds.has(work.id)) {
          // Add the work
          const workItemId = `${template.template_name}-work-${work.work_library_id || work.sub_work_library_id}`;
          console.log('🔨 Adding standalone work to items:', {
            workItemId,
            template_item_id: work.template_item_id,
            work_name: work.name,
            work_type: work.type
          });
          const workItem = {
            id: workItemId,
            template_item_id: work.template_item_id,  // Реальный ID записи из БД (приходит из API)
            template_name: template.template_name,
            template_description: template.template_description,
            work_id: work.work_library_id || work.sub_work_library_id,
            work_library_id: work.work_library_id,
            sub_work_library_id: work.sub_work_library_id,
            work_name: work.name,
            work_type: work.type,
            work_unit: work.unit,
            work_unit_rate: work.unit_rate,
            work_currency_type: work.currency_type,
            work_category: work.category,
            item_type: work.type,
            conversion_coefficient: 1,
            is_linked_to_work: false,
            display_order: items.length + 1,  // Dynamic order based on position
            indent: false
          };

          // Debug log for work unit
          if (!work.unit) {
            console.warn('⚠️ Work without unit:', {
              name: work.name,
              type: work.type,
              raw: work
            });
          } else {
            console.log('✅ Work with unit:', {
              name: work.name,
              unit: work.unit,
              type: work.type
            });
          }

          items.push(workItem);

          processedWorkIds.add(work.id);

          // Immediately add materials linked to this work (skip already processed)
          const linkedToThisWork = materials.filter(m => {
            if (processedMaterialIds.has(m.id)) return false;
            const isLinked = m.linked_work_id === work.id;
            if (isLinked) {
              console.log(`    ✅ Material "${m.name}" is linked to work "${work.name}"`);
            }
            return isLinked;
          });
          console.log(`  🔗 Work "${work.name}" (${work.id}) has ${linkedToThisWork.length} linked materials`);

          linkedToThisWork.forEach((material: any) => {
          const materialItemId = `${template.template_name}-material-${material.material_library_id || material.sub_material_library_id}`;
          console.log('📦 Adding linked material to items:', {
            materialItemId,
            template_item_id: material.template_item_id,
            material_name: material.name,
            linked_work_id: material.linked_work_id
          });
          items.push({
            id: materialItemId,
            template_item_id: material.template_item_id,  // Реальный ID записи из БД (приходит из API)
            template_name: template.template_name,
            template_description: template.template_description,
            material_id: material.id,
            material_library_id: material.material_library_id,
            sub_material_library_id: material.sub_material_library_id,
            material_name: material.name,
            material_type: material.type,
            material_unit: material.unit,
            material_unit_rate: material.unit_rate,
            material_currency_type: material.currency_type,
            material_category: material.category,
            material_material_type: material.material_type,
            material_consumption_coefficient: material.consumption_coefficient,
            material_delivery_price_type: material.delivery_price_type,
            material_delivery_amount: material.delivery_amount,
            material_quote_link: material.quote_link,
            conversion_coefficient: material.conversion_coefficient,
            is_linked_to_work: true,
            linked_work_id: work.id,  // Add linked_work_id for statistics
            item_type: material.type,
            display_order: items.length + 1,  // Dynamic order based on position
            indent: true,
            linked_work_name: work.name
          });
          processedMaterialIds.add(material.id);
        });
        }  // Close the if (!processedWorkIds.has(work.id))
      });

      // Add unlinked materials at the end
      const unlinkedMaterials = materials.filter(m => !m.linked_work_id && !processedMaterialIds.has(m.id));
      console.log(`  📦 ${unlinkedMaterials.length} unlinked materials`);

      unlinkedMaterials.forEach((material: any) => {
        const materialItemId = `${template.template_name}-unlinked-material-${material.material_library_id || material.sub_material_library_id}`;
        console.log('📦 Adding unlinked material to items:', {
          materialItemId,
          template_item_id: material.template_item_id,
          material_name: material.name
        });
        items.push({
          id: materialItemId,
          template_item_id: material.template_item_id,  // Реальный ID записи из БД (приходит из API)
          template_name: template.template_name,
          template_description: template.template_description,
          material_id: material.id,
          material_library_id: material.material_library_id,
          sub_material_library_id: material.sub_material_library_id,
          material_name: material.name,
          material_type: material.type,
          material_unit: material.unit,
          material_unit_rate: material.unit_rate,
          material_currency_type: material.currency_type,
          material_category: material.category,
          material_material_type: material.material_type,
          material_consumption_coefficient: material.consumption_coefficient,
          material_delivery_price_type: material.delivery_price_type,
          material_delivery_amount: material.delivery_amount,
          material_quote_link: material.quote_link,
          conversion_coefficient: material.conversion_coefficient,
          is_linked_to_work: false,
          item_type: material.type,
          display_order: items.length + 1,  // Dynamic order based on position
          indent: false
        });
      });

      // Items are already in correct order, no need to sort
      console.log(`  📝 Final items order for "${template.template_name}":`,
        items.map(item => ({
          name: item.work_name || item.material_name,
          type: item.item_type,
          indent: item.indent
        }))
      );

      // Count linked items for debugging
      const linkedCount = items.filter(item => item.linked_work_id).length;
      console.log(`  📊 Template "${template.template_name}" statistics:`, {
        total_items: items.length,
        works: items.filter(i => i.item_type === 'work' || i.item_type === 'sub_work').length,
        materials: items.filter(i => i.item_type === 'material' || i.item_type === 'sub_material').length,
        linked: linkedCount
      });

      return {
        template_name: template.template_name,
        template_description: template.template_description,
        items: items
      };
    });
  }, [templates]);

  // Список всех элементов для поиска и редактирования
  const flattenedTemplates = useMemo(() => {
    const allItems: TemplateItem[] = [];
    transformedTemplates.forEach(template => {
      template.items.forEach(item => {
        allItems.push(item);
      });
    });
    return allItems;
  }, [transformedTemplates]);

  // Удаление шаблона
  const deleteMutation = useMutation({
    mutationFn: async (templateName: string) => {
      return await workMaterialTemplatesApi.deleteTemplate(templateName);
    },
    onSuccess: () => {
      message.success('Шаблон удален');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
    },
    onError: (error: any) => {
      message.error(`Ошибка удаления: ${error.message}`);
    }
  });

  // Дублирование шаблона
  const duplicateMutation = useMutation({
    mutationFn: async ({ originalName, newName }: { originalName: string; newName: string }) => {
      return await workMaterialTemplatesApi.duplicateTemplate(originalName, newName);
    },
    onSuccess: () => {
      message.success('Шаблон скопирован');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
    },
    onError: (error: any) => {
      message.error(`Ошибка копирования: ${error.message}`);
    }
  });

  // Update template item
  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      return await workMaterialTemplatesApi.updateTemplateItem(values.id, values);
    },
    onSuccess: () => {
      message.success('Элемент обновлен');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
      setEditingItemId(null);
      editForm.resetFields();
    },
    onError: (error: any) => {
      message.error(`Ошибка обновления: ${error.message}`);
    }
  });

  // Delete template item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await workMaterialTemplatesApi.deleteTemplateItem(itemId);
    },
    onSuccess: () => {
      message.success('Элемент удален');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
    },
    onError: (error: any) => {
      message.error(`Ошибка удаления: ${error.message}`);
    }
  });

  const handleDeleteTemplate = (templateName: string) => {
    Modal.confirm({
      title: 'Удалить шаблон?',
      icon: <ExclamationCircleOutlined />,
      content: `Вы уверены, что хотите удалить шаблон "${templateName}" и все его элементы?`,
      onOk: () => deleteMutation.mutate(templateName),
    });
  };

  const handleDuplicateTemplate = (templateName: string) => {
    Modal.confirm({
      title: 'Копировать шаблон',
      content: (
        <div>
          <p>Введите название для нового шаблона:</p>
          <input
            id="new-template-name"
            type="text"
            className="w-full p-2 border rounded mt-2"
            placeholder={`Копия ${templateName}`}
            defaultValue={`Копия ${templateName}`}
          />
        </div>
      ),
      onOk: () => {
        const newName = (document.getElementById('new-template-name') as HTMLInputElement)?.value;
        if (newName && newName.trim()) {
          duplicateMutation.mutate({ originalName: templateName, newName: newName.trim() });
        } else {
          message.error('Введите название шаблона');
          return Promise.reject();
        }
      },
    });
  };

  const handleEditItem = useCallback((item: TemplateItem) => {
    console.log('✏️ Starting edit for item:', item);
    setEditingItemId(item.id);

    // Populate form based on item type
    if (item.item_type === 'work' || item.item_type === 'sub_work') {
      editForm.setFieldsValue({
        id: item.id,
        description: item.work_name,
        unit: item.work_unit,
        item_type: item.item_type,
        unit_rate: item.work_unit_rate,
        currency_type: item.work_currency_type
      });
    } else {
      // Определяем linked_work_id из данных элемента
      const linkedWorkId = item.linked_work_id || item.work_library_id || item.sub_work_library_id;

      editForm.setFieldsValue({
        id: item.id,
        description: item.material_name,
        unit: item.material_unit,
        item_type: item.item_type,
        material_material_type: item.material_material_type || 'main',
        is_linked_to_work: item.is_linked_to_work || false,
        linked_work_id: linkedWorkId,
        unit_rate: item.material_unit_rate,
        currency_type: item.material_currency_type,
        consumption_coefficient: item.material_consumption_coefficient,
        conversion_coefficient: item.conversion_coefficient,
        delivery_price_type: item.material_delivery_price_type || 'included',
        delivery_amount: item.material_delivery_amount,
        quote_link: item.material_quote_link
      });
    }
  }, [editForm]);

  const handleSaveEdit = useCallback(async () => {
    try {
      const values = await editForm.validateFields();
      console.log('💾 Saving edit:', values);

      // Находим редактируемый элемент
      const itemToEdit = flattenedTemplates.find(item => item.id === values.id);
      if (!itemToEdit) {
        message.error('Элемент не найден');
        return;
      }

      // Проверяем, есть ли template_item_id для обновления
      if (!itemToEdit.template_item_id) {
        console.error('❌ No template_item_id for update');
        message.error('Не удается обновить элемент: отсутствует идентификатор');
        return;
      }

      // Подготавливаем данные для обновления в БД (объявляем снаружи всех условных блоков)
      const updateData: any = {};

      // Обрабатываем изменение типа элемента отдельно от изменения наименования
      const typeChanged = values.item_type !== itemToEdit.item_type;
      const nameChanged = values.description !== (itemToEdit.work_name || itemToEdit.material_name);

      // Если изменился тип элемента
      if (typeChanged && !nameChanged) {
        console.log('🔄 Type changed without name change:', {
          oldType: itemToEdit.item_type,
          newType: values.item_type,
          name: values.description
        });

        // При изменении типа используем существующий элемент из библиотеки
        // Важно: элемент остается тот же, меняется только какое поле ID используется
        const oldIsWork = itemToEdit.item_type === 'work' || itemToEdit.item_type === 'sub_work';
        const newIsWork = values.item_type === 'work' || values.item_type === 'sub_work';

        // Если меняем между work/sub_work или между material/sub_material
        if (oldIsWork === newIsWork) {
          // Меняем только тип в рамках одной категории (work<->sub_work или material<->sub_material)
          // Используем существующий ID элемента
          const existingId = oldIsWork
            ? (itemToEdit.work_library_id || itemToEdit.sub_work_library_id || itemToEdit.work_id)
            : (itemToEdit.material_library_id || itemToEdit.sub_material_library_id || itemToEdit.material_id);

          if (existingId) {
            if (values.item_type === 'work') {
              updateData.work_library_id = existingId;
              updateData.sub_work_library_id = null;
            } else if (values.item_type === 'sub_work') {
              updateData.sub_work_library_id = existingId;
              updateData.work_library_id = null;
            } else if (values.item_type === 'material') {
              updateData.material_library_id = existingId;
              updateData.sub_material_library_id = null;
            } else if (values.item_type === 'sub_material') {
              updateData.sub_material_library_id = existingId;
              updateData.material_library_id = null;
            }
          }
        } else {
          // Переход между категориями (work/sub_work <-> material/sub_material)
          // Нужно найти элемент с таким же именем в новой категории
          let newLibraryItem;
          if (newIsWork) {
            // Переход на работу - ищем работу с таким именем
            newLibraryItem = libraryData.works.find(w => w.name === values.description);
            if (newLibraryItem) {
              if (values.item_type === 'work') {
                updateData.work_library_id = newLibraryItem.id;
                updateData.sub_work_library_id = null;
              } else {
                updateData.sub_work_library_id = newLibraryItem.id;
                updateData.work_library_id = null;
              }
              // Очищаем ссылки на материал
              updateData.material_library_id = null;
              updateData.sub_material_library_id = null;
            }
          } else {
            // Переход на материал - ищем материал с таким именем
            newLibraryItem = libraryData.materials.find(m => m.name === values.description);
            if (newLibraryItem) {
              if (values.item_type === 'material') {
                updateData.material_library_id = newLibraryItem.id;
                updateData.sub_material_library_id = null;
              } else {
                updateData.sub_material_library_id = newLibraryItem.id;
                updateData.material_library_id = null;
              }
              // Очищаем ссылки на работу
              updateData.work_library_id = null;
              updateData.sub_work_library_id = null;
            }
          }

          if (!newLibraryItem) {
            message.error('Элемент с таким именем не найден в новой категории');
            return;
          }
        }
      }
      // Если изменилось наименование (с или без изменения типа)
      else if (nameChanged) {
        console.log('🔄 Type or name changed:', {
          oldType: itemToEdit.item_type,
          newType: values.item_type,
          oldName: itemToEdit.work_name || itemToEdit.material_name,
          newName: values.description
        });

        // Для изменения типа или имени нужно найти новый элемент в библиотеке
        let newLibraryItem;
        if (values.item_type === 'work' || values.item_type === 'sub_work') {
          newLibraryItem = libraryData.works.find(w => w.name === values.description && w.item_type === values.item_type);
          if (newLibraryItem) {
            // Обновляем ссылки на работу
            if (values.item_type === 'work') {
              updateData.work_library_id = newLibraryItem.id;
              updateData.sub_work_library_id = null;
            } else {
              updateData.sub_work_library_id = newLibraryItem.id;
              updateData.work_library_id = null;
            }
            // Очищаем ссылки на материал, если был материал
            if (itemToEdit.item_type === 'material' || itemToEdit.item_type === 'sub_material') {
              updateData.material_library_id = null;
              updateData.sub_material_library_id = null;
            }
          }
        } else {
          newLibraryItem = libraryData.materials.find(m => m.name === values.description && m.item_type === values.item_type);
          if (newLibraryItem) {
            // Обновляем ссылки на материал
            if (values.item_type === 'material') {
              updateData.material_library_id = newLibraryItem.id;
              updateData.sub_material_library_id = null;
            } else {
              updateData.sub_material_library_id = newLibraryItem.id;
              updateData.material_library_id = null;
            }
            // Очищаем ссылки на работу, если была работа
            if (itemToEdit.item_type === 'work' || itemToEdit.item_type === 'sub_work') {
              updateData.work_library_id = null;
              updateData.sub_work_library_id = null;
            }
          }
        }

        if (!newLibraryItem) {
          message.error('Элемент не найден в библиотеке');
          return;
        }
      }

      // Обновляем библиотеку работ или материалов (только цены и другие параметры, НЕ имена)
      // Имена изменяются только через выбор из библиотеки
      if (values.item_type === 'work' || values.item_type === 'sub_work') {
        // Обновляем только данные работы (без имени)
        const workId = itemToEdit.work_id || itemToEdit.work_library_id || itemToEdit.sub_work_library_id;
        if (workId && (values.unit_rate !== itemToEdit.work_unit_rate || values.currency_type !== itemToEdit.work_currency_type)) {
          const updateResult = await workMaterialTemplatesApi.updateWorkFromTemplate(
            workId,
            values.item_type === 'sub_work',
            {
              // НЕ обновляем name и unit - они берутся из библиотеки
              unit_rate: values.unit_rate,
              currency_type: values.currency_type
            }
          );

          if (updateResult.error) {
            message.error(`Ошибка обновления работы: ${updateResult.error}`);
            return;
          }
        }
      } else if (values.item_type === 'material' || values.item_type === 'sub_material') {
        // Обновляем только данные материала (без имени)
        const materialId = itemToEdit.material_id || itemToEdit.material_library_id || itemToEdit.sub_material_library_id;
        if (materialId) {
          const updateResult = await workMaterialTemplatesApi.updateMaterialFromTemplate(
            materialId,
            values.item_type === 'sub_material',
            {
              // НЕ обновляем name и unit - они берутся из библиотеки
              unit_rate: values.unit_rate,
              currency_type: values.currency_type,
              consumption_coefficient: values.consumption_coefficient,
              conversion_coefficient: values.conversion_coefficient,
              delivery_price_type: values.delivery_price_type,
              delivery_amount: values.delivery_amount,
              material_type: values.material_material_type || 'main'
            }
          );

          if (updateResult.error) {
            message.error(`Ошибка обновления материала: ${updateResult.error}`);
            return;
          }
        }

        // Обновляем привязку к работе в work_material_templates
        if (values.is_linked_to_work !== itemToEdit.is_linked_to_work || values.linked_work_id !== itemToEdit.linked_work_id) {
          console.log('🔄 Updating material link status:', {
            was_linked: itemToEdit.is_linked_to_work,
            now_linked: values.is_linked_to_work,
            template_item_id: itemToEdit.template_item_id,
            is_from_combined: itemToEdit.is_from_combined
          });

          // Если есть template_item_id, обновляем существующую запись
          if (itemToEdit.template_item_id) {
            // Проверяем, была ли запись привязана к работе до редактирования
            // Используем itemToEdit, который содержит состояние ДО редактирования
            const wasLinkedToWork = itemToEdit.is_linked_to_work &&
              (itemToEdit.work_library_id || itemToEdit.sub_work_library_id || itemToEdit.linked_work_id);

            // Если отвязываем материал от работы (был привязан, теперь не привязан)
            if (wasLinkedToWork && !values.is_linked_to_work) {
              console.log('🔓 Unlinking material from work (splitting record)');
              console.log('📊 Item before unlinking:', {
                template_item_id: itemToEdit.template_item_id,
                was_linked: wasLinkedToWork,
                work_id: itemToEdit.work_library_id || itemToEdit.sub_work_library_id,
                material_id: itemToEdit.material_library_id || itemToEdit.sub_material_library_id
              });

              const unlinkResult = await workMaterialTemplatesApi.unlinkMaterialFromWork(
                itemToEdit.template_item_id
              );

              if (unlinkResult.error) {
                message.error(`Ошибка отвязки материала: ${unlinkResult.error}`);
                return;
              }

              console.log('✅ Material unlinked successfully');
            }
            // Иначе просто обновляем запись
            else {
              // Используем внешнюю updateData, а не создаем новую локальную
              updateData.is_linked_to_work = values.is_linked_to_work || false;

              // При отвязке материала от работы - убираем ссылки на работу
              if (!values.is_linked_to_work) {
                updateData.work_library_id = null;
                updateData.sub_work_library_id = null;
              }
              // При привязке материала к работе - добавляем ссылку на работу
              else if (values.linked_work_id) {
                const linkedWork = libraryData.works.find(w => w.id === values.linked_work_id);
                if (linkedWork) {
                  if (linkedWork.item_type === 'work') {
                    updateData.work_library_id = values.linked_work_id;
                    updateData.sub_work_library_id = null;
                  } else {
                    updateData.sub_work_library_id = values.linked_work_id;
                    updateData.work_library_id = null;
                  }

                  // Находим и удаляем отдельную запись работы, если она существует
                  // ВАЖНО: удаляем только truly standalone работы, которые НЕ являются частью combined записей
                  console.log('🔍 Looking for standalone work record to delete:', values.linked_work_id);
                  const workItem = flattenedTemplates.find(item =>
                    (item.work_library_id === values.linked_work_id || item.sub_work_library_id === values.linked_work_id) &&
                    !item.material_library_id && !item.sub_material_library_id &&
                    !item.is_from_combined &&  // Проверяем, что это НЕ часть combined записи
                    item.template_name === itemToEdit.template_name
                  );

                  if (workItem && workItem.template_item_id) {
                    console.log('🗑️ Deleting standalone work record:', workItem.template_item_id, {
                      is_from_combined: workItem.is_from_combined,
                      has_material: !!(workItem.material_library_id || workItem.sub_material_library_id)
                    });
                    const deleteResult = await workMaterialTemplatesApi.deleteTemplateItem(workItem.template_item_id);
                    if (deleteResult.error) {
                      console.error('❌ Failed to delete standalone work record:', deleteResult.error);
                    } else {
                      console.log('✅ Standalone work record deleted');
                    }
                  } else {
                    console.log('ℹ️ No standalone work record found to delete (work may be part of combined record)');
                  }
                }
              }

              // Обновляем запись в БД (все изменения будут внесены позже через общий вызов)
              // Убираем этот вызов, так как все изменения будут внесены через общий updateData

              console.log('🔄 Material link will be updated via updateData');
            }
          } else {
            // Если нет template_item_id, нужно создать новую запись (это не должно происходить в нормальной ситуации)
            console.warn('⚠️ No template_item_id found, creating new record');

            const templateName = itemToEdit.template_name;
            // Извлекаем материал ID из itemToEdit
            const materialId = itemToEdit.material_library_id || itemToEdit.sub_material_library_id || itemToEdit.material_id;

            // Создаем новую запись в шаблоне
            updateData.template_name = templateName;
            updateData.template_description = itemToEdit.template_description;
            updateData.is_linked_to_work = values.is_linked_to_work || false;

            // Добавляем правильное поле для материала
            if (itemToEdit.item_type === 'material') {
              updateData.material_library_id = materialId;
              updateData.sub_material_library_id = null;
            } else {
              updateData.sub_material_library_id = materialId;
              updateData.material_library_id = null;
            }

            // Если материал привязан к работе, обновляем ссылку на работу
            if (values.is_linked_to_work && values.linked_work_id) {
              // Определяем тип работы по ID
              const linkedWork = libraryData.works.find(w => w.id === values.linked_work_id);
              if (linkedWork) {
                if (linkedWork.item_type === 'work') {
                  updateData.work_library_id = values.linked_work_id;
                  updateData.sub_work_library_id = null;
                } else {
                  updateData.sub_work_library_id = values.linked_work_id;
                  updateData.work_library_id = null;
                }
              }
            } else {
              // Если привязка убрана, очищаем ссылки на работы
              updateData.work_library_id = null;
              updateData.sub_work_library_id = null;
            }

          // Убираем создание новой записи, так как все изменения должны быть в updateData
          console.log('📦 Template changes will be handled via updateData');
        }
      }  // Close link status change if
    }  // Close materials section else-if

      // Если есть изменения в полях шаблона, обновляем запись в БД
      if (Object.keys(updateData).length > 0) {
        console.log('📝 Updating template item with data:', updateData);
        const updateResult = await workMaterialTemplatesApi.updateTemplateItem(
          itemToEdit.template_item_id,
          updateData
        );

        if (updateResult.error) {
          message.error(`Ошибка обновления шаблона: ${updateResult.error}`);
          return;
        }
      }

      // Сохраняем состояние развернутых шаблонов перед обновлением
      const preservedCollapsedState = new Set(collapsedTemplates);

      // Обновляем данные в шаблоне (ссылки на работы/материалы остаются те же)
      // Важно: сначала инвалидируем библиотеки, потом шаблоны, чтобы шаблоны получили свежие данные
      await queryClient.invalidateQueries({ queryKey: ['materials-library'] });
      await queryClient.invalidateQueries({ queryKey: ['works-library'] });
      await queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });

      // Принудительно обновляем данные шаблонов для отображения изменений material_type
      await queryClient.refetchQueries({ queryKey: ['work-material-templates'] });

      // Восстанавливаем состояние развернутых шаблонов
      setCollapsedTemplates(preservedCollapsedState);

      message.success('Данные успешно обновлены');
      setEditingItemId(null);
      editForm.resetFields();
    } catch (error) {
      console.error('❌ Error saving edit:', error);
      message.error('Ошибка сохранения');
    }
  }, [editForm, flattenedTemplates, queryClient, libraryData, collapsedTemplates]);

  const handleCancelEdit = useCallback(() => {
    setEditingItemId(null);
    editForm.resetFields();
  }, [editForm]);

  const handleDeleteItem = useCallback((item: TemplateItem) => {
    console.log('🗑️ handleDeleteItem called with item:', {
      id: item.id,
      template_item_id: item.template_item_id,
      template_name: item.template_name,
      item_type: item.item_type,
      work_name: item.work_name,
      material_name: item.material_name
    });

    if (!item.template_item_id) {
      console.error('❌ No template_item_id found in item:', item);
      message.error('Не удалось получить ID элемента для удаления');
      return;
    }

    Modal.confirm({
      title: 'Удалить элемент?',
      content: 'Вы уверены, что хотите удалить этот элемент шаблона?',
      onOk: () => {
        console.log('✅ User confirmed deletion, calling mutation with ID:', item.template_item_id);
        deleteItemMutation.mutate(item.template_item_id!);
      },
      onCancel: () => {
        console.log('❌ User cancelled deletion');
      }
    });
  }, [deleteItemMutation]);

  const toggleTemplateCollapse = (templateName: string) => {
    setCollapsedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateName)) {
        newSet.delete(templateName);
      } else {
        newSet.add(templateName);
      }
      return newSet;
    });
  };

  const handleRenameTemplate = async (oldName: string, newName: string) => {
    if (!newName || newName.trim() === '') {
      message.error('Название шаблона не может быть пустым');
      return;
    }

    // TODO: Implement API call to rename template
    message.info('Функция переименования шаблона в разработке');
    setEditingTemplateName(null);
    setNewTemplateName('');
  };

  const handleUpdateTemplateDescription = async (templateName: string, newDescription: string) => {
    try {
      console.log('🚀 Updating template description:', { templateName, newDescription });

      // Update all items for this template
      const { error } = await supabase
        .from('work_material_templates')
        .update({ template_description: newDescription || null })
        .eq('template_name', templateName);

      if (error) {
        throw error;
      }

      message.success('Описание шаблона обновлено');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
      setEditingTemplateDescription(null);
      setNewTemplateDescription('');
    } catch (error: any) {
      console.error('❌ Error updating template description:', error);
      message.error(`Ошибка обновления описания: ${error.message}`);
    }
  };

  // Inline edit row component
  const EditRow = ({ item }: { item: TemplateItem }) => {
    const [selectedFromList, setSelectedFromList] = useState(true);
    const [isLinkedToWork, setIsLinkedToWork] = useState(item.is_linked_to_work || false);
    const [deliveryType, setDeliveryType] = useState(item.material_delivery_price_type || 'included');
    const [currentItemType, setCurrentItemType] = useState(item.item_type);

    const isMaterial = currentItemType === 'material' || currentItemType === 'sub_material';
    const isWork = currentItemType === 'work' || currentItemType === 'sub_work';

    // Получаем опции для автокомплита - БЕЗ фильтрации по типу
    const getNameOptions = useMemo(() => {
      if (isWork) {
        // Показываем ВСЕ работы (и обычные, и суб-работы)
        return libraryData.works
          .map(w => ({
            value: w.name,
            label: `${w.name} (${w.item_type === 'work' ? 'работа' : 'суб-работа'})`,
            unit: w.unit,
            type: w.item_type
          }));
      } else {
        // Показываем ВСЕ материалы (и обычные, и суб-материалы)
        return libraryData.materials
          .map(m => ({
            value: m.name,
            label: `${m.name} (${m.item_type === 'material' ? 'материал' : 'суб-материал'})`,
            unit: m.unit,
            type: m.item_type
          }));
      }
    }, [isWork, libraryData]);

    // Опции для выбора работы при привязке материала - только работы из текущего шаблона
    const workOptionsForLinking = useMemo(() => {
      // Найдем текущий шаблон
      const currentTemplate = transformedTemplates.find(t =>
        t.items.some(i => i.id === item.id)
      );

      if (!currentTemplate) return [];

      // Получаем только работы из этого шаблона
      const worksInTemplate = currentTemplate.items
        .filter(i => i.item_type === 'work' || i.item_type === 'sub_work')
        .map(i => ({
          value: i.work_id || i.work_library_id || i.sub_work_library_id || i.id,
          label: `${i.work_name} (${i.item_type === 'work' ? 'работа' : 'суб-работа'})`
        }));

      return worksInTemplate;
    }, [item.id, transformedTemplates]);

    // Обработчик выбора наименования из автокомплита
    const handleNameSelect = (value: string, option: any) => {
      setSelectedFromList(true);
      // Автоматически заполняем единицу измерения
      if (option.unit) {
        editForm.setFieldValue('unit', option.unit);
      }
      // Также обновляем тип элемента если он изменился
      if (option.type) {
        editForm.setFieldValue('item_type', option.type);
        setCurrentItemType(option.type); // Обновляем локальное состояние для реактивности
      }
    };

    // Обработчик потери фокуса для автокомплита
    const handleNameBlur = () => {
      const currentValue = editForm.getFieldValue('description');
      const exists = getNameOptions.some(opt => opt.value === currentValue);

      if (currentValue && !exists) {
        message.warning('Выберите наименование из библиотеки');
        editForm.setFieldValue('description', '');
        setSelectedFromList(false);
      }
    };

    return (
      <tr>
        <td colSpan={12} style={{ padding: 0 }}>
          <Form
            form={editForm}
            layout="vertical"
            className="w-full p-3"
            style={{
              backgroundColor: item.item_type === 'work' ? 'rgba(251, 191, 36, 0.1)' :
                              item.item_type === 'sub_work' ? 'rgba(168, 85, 247, 0.1)' :
                              item.item_type === 'material' ? 'rgba(59, 130, 246, 0.1)' :
                              'rgba(34, 197, 94, 0.1)',
              borderLeft: `4px solid ${
                item.item_type === 'work' ? '#f59e0b' :
                item.item_type === 'sub_work' ? '#a855f7' :
                item.item_type === 'material' ? '#3b82f6' :
                '#22c55e'
              }`
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Form.Item name="id" hidden>
                <Input />
              </Form.Item>

              <Form.Item
                name="description"
                label="Наименование"
                rules={[{ required: true, message: 'Выберите наименование из библиотеки' }]}
                style={{ marginBottom: 0 }}
              >
                <AutoComplete
                  style={{ width: 350 }}
                  options={getNameOptions}
                  onSelect={handleNameSelect}
                  onBlur={handleNameBlur}
                  onChange={() => setSelectedFromList(false)}
                  filterOption={(inputValue, option) =>
                    option?.label?.toLowerCase().includes(inputValue.toLowerCase()) || false
                  }
                  placeholder="Начните вводить для поиска..."
                />
              </Form.Item>

              <Form.Item name="unit" label={<div style={{ textAlign: 'center', width: '100%' }}>Единица</div>} style={{ marginBottom: 0 }}>
                <Input
                  style={{ width: 100 }}
                  disabled
                  placeholder="-"
                />
              </Form.Item>

              <Form.Item name="item_type" label={<div style={{ textAlign: 'center', width: '100%' }}>Тип</div>} style={{ marginBottom: 0 }}>
                <Select
                  style={{ width: 120 }}
                  onChange={(value) => {
                    setCurrentItemType(value);
                    // При смене типа также очищаем поля привязки для материалов
                    if (value === 'work' || value === 'sub_work') {
                      setIsLinkedToWork(false);
                      editForm.setFieldValue('is_linked_to_work', false);
                      editForm.setFieldValue('linked_work_id', undefined);
                    }

                    // Сбрасываем выбор только если меняется основной тип
                    const oldIsWork = item.item_type === 'work' || item.item_type === 'sub_work';
                    const newIsWork = value === 'work' || value === 'sub_work';
                    if (oldIsWork !== newIsWork) {
                      editForm.setFieldValue('description', '');
                      editForm.setFieldValue('unit', undefined);
                      setSelectedFromList(false);
                    }
                  }}
                >
                  {/* Ограничиваем выбор типа в зависимости от исходного типа */}
                  {(item.item_type === 'work' || item.item_type === 'sub_work') ? (
                    <>
                      <Select.Option value="work">Работа</Select.Option>
                      <Select.Option value="sub_work">Суб-работа</Select.Option>
                    </>
                  ) : (
                    <>
                      <Select.Option value="material">Материал</Select.Option>
                      <Select.Option value="sub_material">Суб-материал</Select.Option>
                    </>
                  )}
                </Select>
              </Form.Item>

              {isMaterial && (
                <>
                  <Form.Item name="material_material_type" label={<div style={{ textAlign: 'center', width: '100%' }}>Тип материала</div>} style={{ marginBottom: 0 }}>
                    <Select style={{ width: 140 }}>
                      <Select.Option value="main">Основной</Select.Option>
                      <Select.Option value="auxiliary">Вспомогательный</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="is_linked_to_work"
                    label="Привязка к работе"
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch
                      checkedChildren="Да"
                      unCheckedChildren="Нет"
                      onChange={(checked) => {
                        setIsLinkedToWork(checked);
                        if (!checked) {
                          editForm.setFieldValue('linked_work_id', undefined);
                        }
                      }}
                    />
                  </Form.Item>

                  {isLinkedToWork && (
                    <Form.Item
                      name="linked_work_id"
                      label="Выбор работы"
                      rules={[{ required: true, message: 'Выберите работу для привязки' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        showSearch
                        style={{ width: 250 }}
                        placeholder="Выберите работу"
                        options={workOptionsForLinking}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  )}

                  <Form.Item name="consumption_coefficient" label={<div style={{ textAlign: 'center', width: '100%' }}>Коэф. расхода</div>} style={{ marginBottom: 0 }}>
                    <DecimalInput
                      min={1.0}
                      precision={4}
                      style={{ width: 120 }}
                      onChange={(value) => {
                        if (value && value < 1) {
                          message.warning('Коэффициент расхода не может быть меньше 1.0');
                          editForm.setFieldValue('consumption_coefficient', 1.0);
                          return 1.0;
                        }
                        return value;
                      }}
                    />
                  </Form.Item>

                  {isLinkedToWork && (
                    <Form.Item name="conversion_coefficient" label={<div style={{ textAlign: 'center', width: '100%' }}>Коэф. перевода</div>} style={{ marginBottom: 0 }}>
                      <DecimalInput min={0.0001} precision={4} style={{ width: 120 }} />
                    </Form.Item>
                  )}
                </>
              )}

              <Form.Item name="unit_rate" label={<div style={{ textAlign: 'center', width: '100%' }}>Цена за ед.</div>} style={{ marginBottom: 0 }}>
                <DecimalInput min={0} precision={2} style={{ width: 120 }} />
              </Form.Item>

              <Form.Item name="currency_type" label={<div style={{ textAlign: 'center', width: '100%' }}>Валюта</div>} style={{ marginBottom: 0 }}>
                <Select style={{ width: 100 }}>
                  <Select.Option value="RUB">₽</Select.Option>
                  <Select.Option value="USD">$</Select.Option>
                  <Select.Option value="EUR">€</Select.Option>
                  <Select.Option value="CNY">¥</Select.Option>
                </Select>
              </Form.Item>

              {isMaterial && (
                <>
                  <Form.Item
                    name="delivery_price_type"
                    label={<div style={{ textAlign: 'center', width: '100%' }}>Тип доставки</div>}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      style={{ width: 150 }}
                      onChange={(value) => setDeliveryType(value)}
                    >
                      <Select.Option value="included">Включена</Select.Option>
                      <Select.Option value="not_included">3% от суммы</Select.Option>
                      <Select.Option value="amount">Фикс. сумма</Select.Option>
                    </Select>
                  </Form.Item>

                  {deliveryType === 'amount' && (
                    <Form.Item name="delivery_amount" label={<div style={{ textAlign: 'center', width: '100%' }}>Сумма доставки</div>} style={{ marginBottom: 0 }}>
                      <DecimalInput min={0} precision={2} style={{ width: 130 }} />
                    </Form.Item>
                  )}

                  <Form.Item name="quote_link" label={<div style={{ textAlign: 'center', width: '100%' }}>Ссылка на КП</div>} style={{ marginBottom: 0, textAlign: 'center' }}>
                    <Input style={{ width: 350 }} placeholder="URL" />
                  </Form.Item>
                </>
              )}

              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Tooltip title="Сохранить">
                    <Button type="text" icon={<CheckOutlined />} onClick={handleSaveEdit} />
                  </Tooltip>
                  <Tooltip title="Отмена">
                    <Button type="text" icon={<CloseOutlined />} onClick={handleCancelEdit} />
                  </Tooltip>
                </Space>
              </Form.Item>
            </div>
          </Form>
        </td>
      </tr>
    );
  };

  // Колонки таблицы
  const columns: ColumnsType<TemplateItem> = [
    {
      title: 'Тип',
      key: 'type',
      width: 85,
      align: 'center',
      render: (item: TemplateItem) => {
        const tags = [];

        // Основной тег типа элемента
        switch(item.item_type) {
          case 'work':
            tags.push(<Tag key="type" color="orange" style={{ fontSize: '10px', padding: '0 4px' }}>Работа</Tag>);
            break;
          case 'sub_work':
            tags.push(<Tag key="type" color="purple" style={{ fontSize: '10px', padding: '0 4px' }}>Суб-раб</Tag>);
            break;
          case 'material':
            tags.push(<Tag key="type" color="blue" style={{ fontSize: '10px', padding: '0 4px' }}>Материал</Tag>);
            break;
          case 'sub_material':
            tags.push(<Tag key="type" color="green" style={{ fontSize: '10px', padding: '0 4px' }}>Суб-мат</Tag>);
            break;
        }

        // Для материалов добавляем тег вида (основной/вспомогательный)
        if (item.item_type === 'material' || item.item_type === 'sub_material') {
          const isMain = item.material_material_type !== 'auxiliary';
          tags.push(
            <Tag key="material-type" color={isMain ? 'default' : 'warning'} style={{ fontSize: '9px', padding: '0 3px', marginTop: '2px' }}>
              {isMain ? 'Основной' : 'Вспомог.'}
            </Tag>
          );
        }

        return (
          <div className="flex flex-col gap-0.5 items-center">
            {tags}
          </div>
        );
      }
    },
    {
      title: 'Наименование',
      key: 'name',
      width: 300,
      render: (item: TemplateItem) => {
        const name = item.work_name || item.material_name || '-';
        const isLinkedMaterial = item.is_linked_to_work && (item.item_type === 'material' || item.item_type === 'sub_material');

        return (
          <div className={isLinkedMaterial ? 'pl-6' : ''}>
            <div>{name}</div>
            {isLinkedMaterial && item.linked_work_name && (
              <div className="text-xs text-gray-500 mt-1">
                <LinkOutlined className="mr-1" />
                {item.linked_work_name}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Ед. изм.',
      key: 'unit',
      width: 60,
      align: 'center',
      render: (item: TemplateItem) => item.work_unit || item.material_unit || '-'
    },
    {
      title: 'К.расх',
      key: 'consumption',
      width: 70,
      align: 'center',
      render: (item: TemplateItem) => {
        if (item.item_type === 'material' || item.item_type === 'sub_material') {
          return item.material_consumption_coefficient?.toFixed(2) || '1.00';
        }
        return '-';
      }
    },
    {
      title: 'К.пер',
      key: 'conversion',
      width: 70,
      align: 'center',
      render: (item: TemplateItem) => {
        if (item.item_type === 'material' || item.item_type === 'sub_material') {
          return item.conversion_coefficient?.toFixed(4) || '1.0000';
        }
        return '-';
      }
    },
    {
      title: 'Цена',
      key: 'price',
      width: 100,
      align: 'center',
      render: (item: TemplateItem) => {
        const price = item.work_unit_rate || item.material_unit_rate;
        const currency = item.work_currency_type || item.material_currency_type || 'RUB';
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'CNY' ? '¥' : '₽';

        if (price) {
          return <span className="font-medium">{price.toLocaleString()} {symbol}</span>;
        }
        return '-';
      }
    },
    {
      title: 'Доставка',
      key: 'delivery',
      width: 100,
      align: 'center',
      render: (item: TemplateItem) => {
        if (item.item_type === 'material' || item.item_type === 'sub_material') {
          if (item.material_delivery_price_type === 'included') {
            return <Tag color="green">Включена</Tag>;
          } else if (item.material_delivery_price_type === 'not_included') {
            return <Tag color="orange">3%</Tag>;
          } else if (item.material_delivery_price_type === 'amount' && item.material_delivery_amount) {
            return <Tag color="blue">{item.material_delivery_amount} ₽</Tag>;
          }
        }
        return '-';
      }
    },
    {
      title: 'Ссылка на КП',
      key: 'quote',
      width: 120,
      align: 'center',
      render: (item: TemplateItem) => {
        if (item.material_quote_link) {
          return (
            <a href={item.material_quote_link} target="_blank" rel="noopener noreferrer">
              Открыть
            </a>
          );
        }
        return '-';
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (item: TemplateItem) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditItem(item)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteItem(item)}
          />
        </Space>
      )
    }
  ];

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="text-lg">Загрузка шаблонов...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8 text-red-500">
          <div className="text-lg">Ошибка загрузки шаблонов</div>
          <div className="text-sm">{String(error)}</div>
        </div>
      </Card>
    );
  }

  // Quick add row component
  const QuickAddRow = ({ templateName }: { templateName: string }) => {
    const [quickAddForm] = Form.useForm();
    const [quickAddType, setQuickAddType] = useState<'work' | 'material' | 'sub_work' | 'sub_material'>('work');
    const [isLinkedToWork, setIsLinkedToWork] = useState<boolean>(true);

    // Получаем текущий шаблон и список работ в нем
    const currentTemplate = templates.find(t => t.template_name === templateName);
    const templateWorkIds = new Set<string>();

    // Собираем ID всех работ в текущем шаблоне
    if (currentTemplate) {
      currentTemplate.materials?.forEach(item => {
        if (item.type === 'work' && item.work_library_id) {
          templateWorkIds.add(item.work_library_id);
        } else if (item.type === 'sub_work' && item.sub_work_library_id) {
          templateWorkIds.add(item.sub_work_library_id);
        }
      });
    }

    const handleQuickAdd = async (values: any) => {
      console.log('🚀 Quick adding template item:', values);
      try {
        let payload: any = {
          template_name: templateName,
          template_description: templates.find(t => t.template_name === templateName)?.template_description
        };

        // Для работ
        if (values.item_type === 'work' || values.item_type === 'sub_work') {
          if (values.item_type === 'work') {
            payload.work_library_id = values.work_id;
          } else {
            payload.sub_work_library_id = values.work_id;
          }
        }
        // Для материалов
        else if (values.item_type === 'material' || values.item_type === 'sub_material') {
          if (values.item_type === 'material') {
            payload.material_library_id = values.material_id;
          } else {
            payload.sub_material_library_id = values.material_id;
          }

          payload.conversion_coefficient = values.conversion_coefficient || 1.0;
          payload.is_linked_to_work = values.is_linked_to_work === true;

          // Если материал привязан к работе, добавляем work_id
          if (values.is_linked_to_work && values.linked_work_id) {
            const isSubWork = libraryData.works.find(w => w.id === values.linked_work_id)?.item_type === 'sub_work';
            if (isSubWork) {
              payload.sub_work_library_id = values.linked_work_id;
            } else {
              payload.work_library_id = values.linked_work_id;
            }
          } else if (values.is_linked_to_work) {
            console.error('❌ No work selected for linked material');
            message.error('Выберите работу для привязки материала');
            return;
          }
          // Для непривязанных материалов work_id не нужен
        }

        const result = await workMaterialTemplatesApi.createTemplateItem(payload);
        if (result.error) {
          message.error(`Ошибка: ${result.error}`);
          return;
        }

        message.success('Элемент добавлен в шаблон');
        quickAddForm.resetFields();
        setAddingToTemplate(null);
        queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
      } catch (error) {
        console.error('💥 Error adding template item:', error);
        message.error('Не удалось добавить элемент');
      }
    };

    const getAddBackgroundColor = () => {
      switch(quickAddType) {
        case 'work': return 'rgba(254, 215, 170, 0.2)';
        case 'sub_work': return 'rgba(233, 213, 255, 0.2)';
        case 'material': return 'rgba(219, 234, 254, 0.2)';
        case 'sub_material': return 'rgba(187, 247, 208, 0.2)';
        default: return '#f9f9f9';
      }
    };

    const getBorderColor = () => {
      switch(quickAddType) {
        case 'work': return '#fb923c';
        case 'sub_work': return '#c084fc';
        case 'material': return '#60a5fa';
        case 'sub_material': return '#34d399';
        default: return '#d9d9d9';
      }
    };

    const workOptions = libraryData.works
      .filter(w => w.item_type === (quickAddType === 'work' ? 'work' : 'sub_work'))
      .map(w => ({ value: w.id, label: w.name }));

    const materialOptions = libraryData.materials
      .filter(m => m.item_type === (quickAddType === 'material' ? 'material' : 'sub_material'))
      .map(m => ({ value: m.id, label: m.name }));

    return (
      <Form
        form={quickAddForm}
        layout="inline"
        onFinish={handleQuickAdd}
        style={{
          padding: '12px',
          backgroundColor: getAddBackgroundColor(),
          borderRadius: '4px',
          border: `2px solid ${getBorderColor()}`,
          marginBottom: '16px'
        }}
      >
        <Form.Item
          name="item_type"
          initialValue={quickAddType}
          label="Тип элемента"
        >
          <Select
            style={{ width: 120 }}
            onChange={(value) => {
              setQuickAddType(value);
              quickAddForm.setFieldValue('item_type', value);
              quickAddForm.resetFields(['work_id', 'material_id', 'linked_work_id']);
              // При смене на материал устанавливаем значения по умолчанию
              if (value === 'material' || value === 'sub_material') {
                quickAddForm.setFieldValue('is_linked_to_work', true);
                setIsLinkedToWork(true);
              } else {
                // Для работ скрываем поле привязки
                setIsLinkedToWork(false);
              }
            }}
          >
            <Select.Option value="work">Работа</Select.Option>
            <Select.Option value="sub_work">Суб-работа</Select.Option>
            <Select.Option value="material">Материал</Select.Option>
            <Select.Option value="sub_material">Суб-материал</Select.Option>
          </Select>
        </Form.Item>

        {(quickAddType === 'work' || quickAddType === 'sub_work') ? (
          <Form.Item
            name="work_id"
            label="Наименование"
            rules={[{ required: true, message: 'Выберите работу' }]}
          >
            <Select
              showSearch
              placeholder="Выберите работу"
              style={{ width: 250 }}
              options={workOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item
              name="material_id"
              label="Наименование"
              rules={[{ required: true, message: 'Выберите материал' }]}
            >
              <Select
                showSearch
                placeholder="Выберите материал"
                style={{ width: 250 }}
                options={materialOptions}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>

            <Form.Item
              name="is_linked_to_work"
              label="Привязка к работе"
              initialValue={true}
            >
              <Select
                style={{ width: 120 }}
                onChange={(value) => {
                  setIsLinkedToWork(value);
                  if (!value) {
                    quickAddForm.setFieldValue('linked_work_id', undefined);
                    quickAddForm.setFieldValue('conversion_coefficient', 1.0);
                  }
                }}
              >
                <Select.Option value={true}>Привязан</Select.Option>
                <Select.Option value={false}>Не привязан</Select.Option>
              </Select>
            </Form.Item>

            {isLinkedToWork && (
              <>
                <Form.Item
                  name="linked_work_id"
                  label="Работа"
                  rules={[{ required: true, message: 'Выберите работу для привязки' }]}
                >
                  <Select
                    showSearch
                    placeholder="Выберите работу"
                    style={{ width: 200 }}
                    options={[...libraryData.works]
                      .filter(w => templateWorkIds.has(w.id))  // Фильтруем только работы из текущего шаблона
                      .map(w => ({ value: w.id, label: `${w.name} (${w.item_type === 'work' ? 'Работа' : 'Суб-работа'})` }))}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>

                <Form.Item
                  name="conversion_coefficient"
                  label="Коэф. перевода"
                  initialValue={1.0}>
                  <DecimalInput
                    min={0.0001}
                    precision={4}
                    placeholder="Коэф."
                    style={{ width: 100 }}
                  />
                </Form.Item>
              </>
            )}
          </>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
              Добавить
            </Button>
            <Button onClick={() => setAddingToTemplate(null)} icon={<CloseOutlined />}>
              Отмена
            </Button>
          </Space>
        </Form.Item>
      </Form>
    );
  };

  return (
    <>
      <style>
        {`
          .template-card {
            background: linear-gradient(135deg, #fdf4ff 0%, #f0f9ff 50%, #f0fdfa 100%);
            border-radius: 16px !important;
            overflow: hidden;
            position: relative;
            border: 1px solid rgba(139, 92, 246, 0.2) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .template-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%);
            animation: shimmer 3s ease infinite;
          }

          @keyframes shimmer {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }

          .template-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(139, 92, 246, 0.15) !important;
            border-color: rgba(139, 92, 246, 0.3) !important;
          }

          .template-card .ant-card-head {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
            border-bottom: 1px solid rgba(139, 92, 246, 0.1) !important;
            padding: 16px 20px;
          }

          .template-card .ant-card-head-title {
            padding: 0;
          }

          .template-card-header {
            position: relative;
            z-index: 1;
          }

          .template-card-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
            margin-right: 12px;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
            animation: float 3s ease-in-out infinite;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }

          .template-name {
            font-size: 18px;
            font-weight: 600;
            background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .template-card .ant-btn-primary {
            background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%) !important;
            border: none !important;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
            transition: all 0.3s ease;
          }

          .template-card .ant-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
          }

          .template-card .ant-btn:not(.ant-btn-primary):not(.ant-btn-dangerous) {
            border-color: rgba(139, 92, 246, 0.3);
            color: #8b5cf6;
          }

          .template-card .ant-btn:not(.ant-btn-primary):not(.ant-btn-dangerous):hover {
            border-color: #8b5cf6;
            color: #8b5cf6;
            background: rgba(139, 92, 246, 0.05);
          }

          .template-stats {
            display: flex;
            gap: 16px;
            padding: 8px 16px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(59, 130, 246, 0.03) 100%);
            border-radius: 8px;
            margin-top: 8px;
          }

          .template-stat-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #6b7280;
          }

          .template-stat-value {
            font-weight: 600;
            color: #8b5cf6;
          }

          /* Анимированный фон для карточки при наведении */
          .template-card::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
            animation: rotate 30s linear infinite;
            pointer-events: none;
          }

          .template-card:hover::after {
            opacity: 1;
          }

          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div className="space-y-4">
      {transformedTemplates.length === 0 ? (
        <Card>
          <Empty description="Нет созданных шаблонов" />
        </Card>
      ) : (
        transformedTemplates
          .filter((template: any) => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return template.template_name.toLowerCase().includes(query);
          })
          .map((template: any) => (
          <Card
            key={template.template_name}
            className="template-card"
            title={
              <div className="template-card-header flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="template-card-icon">
                    <BuildOutlined />
                  </div>
                  <Tooltip title={collapsedTemplates.has(template.template_name) ? "Развернуть" : "Свернуть"}>
                    <Button
                      size="small"
                      type="text"
                      icon={collapsedTemplates.has(template.template_name) ? <DownOutlined /> : <UpOutlined />}
                      onClick={() => toggleTemplateCollapse(template.template_name)}
                    />
                  </Tooltip>
                  {editingTemplateName === template.template_name ? (
                    <Space>
                      <Input
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        onPressEnter={() => handleRenameTemplate(template.template_name, newTemplateName)}
                        style={{ width: 200 }}
                        autoFocus
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<CheckOutlined />}
                        onClick={() => handleRenameTemplate(template.template_name, newTemplateName)}
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={() => {
                          setEditingTemplateName(null);
                          setNewTemplateName('');
                        }}
                      />
                    </Space>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="template-name">{template.template_name}</span>
                      <Tooltip title="Редактировать название">
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingTemplateName(template.template_name);
                            setNewTemplateName(template.template_name);
                          }}
                        />
                      </Tooltip>
                      {editingTemplateDescription === template.template_name ? (
                        <Space>
                          <Input
                            value={newTemplateDescription}
                            onChange={(e) => setNewTemplateDescription(e.target.value)}
                            onPressEnter={() => handleUpdateTemplateDescription(template.template_name, newTemplateDescription)}
                            placeholder="Описание шаблона"
                            style={{ width: 300 }}
                            autoFocus
                          />
                          <Button
                            size="small"
                            type="text"
                            icon={<CheckOutlined />}
                            onClick={() => handleUpdateTemplateDescription(template.template_name, newTemplateDescription)}
                          />
                          <Button
                            size="small"
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={() => {
                              setEditingTemplateDescription(null);
                              setNewTemplateDescription('');
                            }}
                          />
                        </Space>
                      ) : (
                        <div className="flex items-center gap-1">
                          {template.template_description ? (
                            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">📝 {template.template_description}</span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Без описания</span>
                          )}
                          <Tooltip title="Редактировать описание">
                            <Button
                              size="small"
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setEditingTemplateDescription(template.template_name);
                                setNewTemplateDescription(template.template_description || '');
                              }}
                            />
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Space>
                  {onAddToTemplate && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => onAddToTemplate(template.template_name, template.template_description)}
                      style={{ minWidth: 200 }}
                    >
                      Добавить шаблон в строку
                    </Button>
                  )}
                  <Tooltip title="Добавить элемент">
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setAddingToTemplate(template.template_name)}
                    />
                  </Tooltip>
                  <Tooltip title="Копировать шаблон">
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleDuplicateTemplate(template.template_name)}
                    />
                  </Tooltip>
                  <Tooltip title="Удалить шаблон">
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteTemplate(template.template_name)}
                    />
                  </Tooltip>
                </Space>
              </div>
            }
          >
            {/* Template statistics */}
            <div className="template-stats">
              <div className="template-stat-item">
                <ToolOutlined style={{ color: '#8b5cf6' }} />
                <span>Работ: <span className="template-stat-value">{template.items.filter((i: any) => i.item_type === 'work' || i.item_type === 'sub_work').length}</span></span>
              </div>
              <div className="template-stat-item">
                <AppstoreOutlined style={{ color: '#3b82f6' }} />
                <span>Материалов: <span className="template-stat-value">{template.items.filter((i: any) => i.item_type === 'material' || i.item_type === 'sub_material').length}</span></span>
              </div>
              <div className="template-stat-item">
                <LinkOutlined style={{ color: '#06b6d4' }} />
                <span>Связей: <span className="template-stat-value">{template.items.filter((i: any) => i.linked_work_id).length}</span></span>
              </div>
            </div>

            {/* Show quick add form when adding to this template */}
            {addingToTemplate === template.template_name && (
              <QuickAddRow templateName={template.template_name} />
            )}

            <style jsx>{`
              .template-table .ant-table-tbody > tr.bg-orange-100:hover > td {
                background-color: #fed7aa !important;
              }
              .template-table .ant-table-tbody > tr.bg-purple-100:hover > td {
                background-color: #e9d5ff !important;
              }
              .template-table .ant-table-tbody > tr.bg-blue-100:hover > td {
                background-color: #bfdbfe !important;
              }
              .template-table .ant-table-tbody > tr.bg-blue-50:hover > td {
                background-color: #dbeafe !important;
              }
              .template-table .ant-table-tbody > tr.bg-green-100:hover > td {
                background-color: #bbf7d0 !important;
              }
            `}</style>

            {!collapsedTemplates.has(template.template_name) && (
              <Table
                columns={columns}
                dataSource={template.items}
                rowKey="id"
                pagination={false}
                size="small"
                className="template-table"
                rowClassName={(record) => {
                  if (record.item_type === 'work') return 'bg-orange-100';
                  if (record.item_type === 'sub_work') return 'bg-purple-100';
                  if (record.item_type === 'material') {
                    return record.is_linked_to_work ? 'bg-blue-100' : 'bg-blue-50';
                  }
                  if (record.item_type === 'sub_material') return 'bg-green-100';
                  return '';
                }}
                components={{
                  body: {
                    row: ({ children, ...props }: any) => {
                      const record = template.items.find((item: TemplateItem) =>
                        item.id === props['data-row-key']
                      );

                      if (record && editingItemId === record.id) {
                        return <EditRow item={record} />;
                      }

                      return <tr {...props}>{children}</tr>;
                    }
                  }
                }}
                onRow={(record) => ({
                  'data-row-key': record.id,
                })}
              />
            )}
          </Card>
        ))
      )}
      </div>
    </>
  );
};

export default TemplateList;