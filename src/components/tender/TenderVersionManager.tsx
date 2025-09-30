import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Table, Button, Tag, Space, Progress, Alert, Badge, Descriptions, Typography, Tooltip, Upload, Select, Radio, InputNumber, Row, Col } from 'antd';
import {
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  SwapOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { clientWorksVersioningApi } from '../../lib/supabase/api/client-works-versioning';
import { tenderVersioningApi, type TenderVersionMapping } from '../../lib/supabase/api/tender-versioning';
import { supabase } from '../../lib/supabase/client';
import { message } from 'antd';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface TenderVersionManagerProps {
  parentTenderId: string;
  parentTenderName: string;
  onVersionCreated?: (newTenderId: string) => void;
  onCancel?: () => void;
}

interface MappingTableRow extends TenderVersionMapping {
  key: string;
}

export const TenderVersionManager: React.FC<TenderVersionManagerProps> = ({
  parentTenderId,
  parentTenderName,
  onVersionCreated,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [mappings, setMappings] = useState<MappingTableRow[]>([]);
  const [newTenderId, setNewTenderId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    matched: 0,
    new: 0,
    deleted: 0,
    dop: 0
  });
  const [availablePositions, setAvailablePositions] = useState<any[]>([]);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<Record<string, string | null>>({});
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [confidenceFilter, setConfidenceFilter] = useState<number | null>(null);
  const [mappingTypeFilter, setMappingTypeFilter] = useState<string>('all');
  const [actualDopCount, setActualDopCount] = useState(0);

  // Загрузка фактического количества ДОП позиций
  useEffect(() => {
    const loadDopCount = async () => {
      if (parentTenderId) {
        const { count } = await supabase
          .from('client_positions')
          .select('*', { count: 'exact', head: true })
          .eq('tender_id', parentTenderId)
          .eq('is_additional', true);

        setActualDopCount(count || 0);
      }
    };
    loadDopCount();
  }, [parentTenderId]);

  // Обновление статистики
  const updateStatistics = useCallback((mappingsList: MappingTableRow[]) => {
    const stats = {
      total: mappingsList.length,
      matched: mappingsList.filter(m => m.mapping_type === 'exact' || m.mapping_type === 'fuzzy' || m.mapping_type === 'manual').length,
      new: mappingsList.filter(m => m.mapping_type === 'new').length,
      deleted: mappingsList.filter(m => m.mapping_type === 'deleted').length,
      dop: actualDopCount // Используем реальное количество ДОП позиций из БД
    };
    setStatistics(stats);
  }, [actualDopCount]);

  // Обработка загрузки файла
  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    setUploadProgress(0);
    setUploadStep('Начинаем загрузку...');

    try {
      const result = await clientWorksVersioningApi.uploadAsNewVersion(
        file,
        {
          parentTenderId,
          autoMatch: true,
          matchingThreshold: 0.7
        },
        (progress, step) => {
          setUploadProgress(progress);
          setUploadStep(step);
        }
      );

      if (result.error) {
        message.error(result.error);
        return;
      }

      if (result.data) {
        setNewTenderId(result.data.tenderId);

        // Загружаем количество ДОП позиций после загрузки файла
        if (parentTenderId) {
          const { count } = await supabase
            .from('client_positions')
            .select('*', { count: 'exact', head: true })
            .eq('tender_id', parentTenderId)
            .eq('is_additional', true);

          setActualDopCount(count || 0);
          console.log('🚀 [handleFileUpload] DOP count loaded:', count);
        }

        // Преобразуем маппинги для таблицы
        const tableData: MappingTableRow[] = (result.data.mappings || []).map((m, index) => ({
          ...m,
          key: m.id || `mapping-${index}`
        }));

        setMappings(tableData);

        // Маппинги уже сохранены в БД в client-works-versioning.ts, просто показываем их

        // Подсчитываем статистику
        updateStatistics(tableData);

        // Данные уже перенесены автоматически в client-works-versioning.ts
        // Показываем пользователю результат
        setCurrentStep('review');

        // Проверяем, были ли перенесены данные
        const hasMatchedPositions = result.data.matchedCount && result.data.matchedCount > 0;

        if (hasMatchedPositions) {
          message.success(
            <span>
              Загружено {result.data.positionsCount} позиций.
              <br />
              BOQ items, ДОП позиции и связи перенесены автоматически!
            </span>,
            5
          );
        } else {
          message.success(`Загружено ${result.data.positionsCount} позиций`);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error('Ошибка при загрузке файла');
    } finally {
      setLoading(false);
    }
  }, [parentTenderId, updateStatistics]);

  // Изменение статуса маппинга
  const handleMappingStatusChange = useCallback(async (mappingId: string, status: 'confirmed' | 'rejected') => {
    // Находим маппинг
    const mapping = mappings.find(m => m.id === mappingId || m.key === mappingId);
    if (!mapping) {
      message.error('Маппинг не найден');
      return;
    }

    // Если у маппинга нет id, значит маппинги еще не сохранены или что-то пошло не так
    if (!mapping.id) {
      // Получаем маппинги из БД для этого тендера
      const getResult = await tenderVersioningApi.getMappings(newTenderId!);

      if (getResult.data && getResult.data.length > 0) {
        // Маппинги уже есть в БД, обновляем локальное состояние
        const dbMappings = getResult.data;
        const updatedMappings = mappings.map(m => {
          const dbMapping = dbMappings.find(
            db => db.old_position_id === m.old_position_id &&
                  db.new_position_id === m.new_position_id
          );
          return dbMapping ? { ...m, id: dbMapping.id } : m;
        });
        setMappings(updatedMappings);

        // Находим обновленный маппинг и меняем его статус
        const updatedMapping = updatedMappings.find(m => m.key === mappingId || m.id === mappingId);
        if (updatedMapping?.id) {
          const statusResult = await tenderVersioningApi.updateMappingStatus(updatedMapping.id, status);
          if (statusResult.error) {
            message.error(statusResult.error);
            return;
          }

          setMappings(prev => prev.map(m =>
            m.id === updatedMapping.id ? { ...m, mapping_status: status } : m
          ));
          message.success('Статус обновлен');
        }
      } else {
        message.error('Маппинги не найдены в базе данных');
      }
    } else {
      // Если id есть, обновляем статус напрямую
      const result = await tenderVersioningApi.updateMappingStatus(mapping.id, status);
      if (result.error) {
        message.error(result.error);
        return;
      }

      // Обновляем локальное состояние
      setMappings(prev => prev.map(m =>
        m.id === mapping.id ? { ...m, mapping_status: status } : m
      ));
      message.success('Статус обновлен');
    }
  }, [mappings, newTenderId]);

  // Применение маппингов и перенос данных
  const handleApplyMappings = useCallback(async () => {
    if (!newTenderId) return;

    setLoading(true);
    setUploadStep('Применение сопоставлений и перенос данных...');

    try {
      // Проверяем, есть ли маппинги без id (не сохранены в БД)
      const unsavedMappings = mappings.filter(m => !m.id);
      if (unsavedMappings.length > 0) {
        // Попытка получить маппинги из БД (они могли быть сохранены ранее)
        const getResult = await tenderVersioningApi.getMappings(newTenderId);

        if (getResult.data && getResult.data.length > 0) {
          // Маппинги уже есть в БД, обновляем локальное состояние
          const dbMappings = getResult.data;
          const updatedMappings = mappings.map(m => {
            const dbMapping = dbMappings.find(
              db => db.old_position_id === m.old_position_id &&
                    db.new_position_id === m.new_position_id
            );
            return dbMapping ? { ...m, id: dbMapping.id } : m;
          });
          setMappings(updatedMappings);
        } else {
          message.error('Маппинги не найдены в базе данных');
          setLoading(false);
          return;
        }
      }

      // Подтверждаем все маппинги с высокой уверенностью
      const autoConfirm = mappings.filter(m =>
        m.confidence_score && m.confidence_score >= 0.9 && m.mapping_status === 'suggested'
      );

      for (const mapping of autoConfirm) {
        // Используем id из БД, а не key
        const mappingId = mapping.id || mapping.key;
        await tenderVersioningApi.updateMappingStatus(mappingId, 'confirmed');
      }

      // Проверяем, что маппинги действительно существуют в БД
      const { data: confirmedMappings, error: checkError } = await tenderVersioningApi.getMappings(newTenderId);

      if (checkError || !confirmedMappings || confirmedMappings.length === 0) {
        message.error('Ошибка: маппинги не найдены в базе данных');
        return;
      }

      console.log(`📊 Found ${confirmedMappings.length} mappings in database ready to apply`);

      // Применяем маппинги
      const result = await tenderVersioningApi.applyMappings(newTenderId);

      if (result.error) {
        message.error(result.error);
        return;
      }

      setCurrentStep('complete');
      message.success(result.message || 'Данные успешно перенесены');

      // Уведомляем родительский компонент
      if (onVersionCreated) {
        onVersionCreated(newTenderId);
      }
    } catch (error) {
      console.error('Error applying mappings:', error);
      message.error('Ошибка при применении сопоставлений');
    } finally {
      setLoading(false);
    }
  }, [newTenderId, mappings, onVersionCreated]);

  // Загрузка доступных позиций для сопоставления
  useEffect(() => {
    if (newTenderId && currentStep === 'review') {
      loadAvailablePositions();
    }
  }, [newTenderId, currentStep]);

  const loadAvailablePositions = async () => {
    if (!newTenderId) return;

    const result = await tenderVersioningApi.getAvailablePositionsForMapping(newTenderId);
    if (result.data) {
      setAvailablePositions(result.data);
    } else if (result.error) {
      console.error('Failed to load available positions:', result.error);
    }
  };

  // Обработка ручного сопоставления позиций
  const handleManualMapping = useCallback(async (mappingId: string, newPositionId: string | null) => {
    console.log('🚀 handleManualMapping called:', { mappingId, newPositionId });
    console.log('Current mappings:', mappings.map(m => ({ id: m.id, key: m.key })));

    setLoading(true);
    try {
      // Находим текущий маппинг
      console.log('🔍 Looking for mapping with ID:', mappingId);
      console.log('Available mappings keys:', mappings.map(m => ({ id: m.id, key: m.key })));

      const mapping = mappings.find(m => {
        const matchById = m.id === mappingId;
        const matchByKey = m.key === mappingId;
        if (matchById || matchByKey) {
          console.log(`✅ Match found: id=${m.id}, key=${m.key}, matchById=${matchById}, matchByKey=${matchByKey}`);
        }
        return matchById || matchByKey;
      });

      if (!mapping) {
        console.error('❌ Mapping not found for ID:', mappingId);
        console.error('Available mappings:', mappings);
        message.error('Сопоставление не найдено');
        return;
      }

      console.log('✅ Found mapping:', {
        id: mapping.id,
        key: mapping.key,
        oldPosition: mapping.old_position_id,
        newPosition: mapping.new_position_id,
        mappingType: mapping.mapping_type
      });

      // Сохраняем старую позицию из текущего маппинга (если есть)
      const oldPositionInCurrentMapping = mapping.new_position_id;

      // Если выбрана новая позиция, проверяем не используется ли она где-то еще
      if (newPositionId) {
        // Находим маппинг, где эта позиция уже используется
        const existingMappingWithPosition = mappings.find(
          m => m.new_position_id === newPositionId && m.id !== mappingId && m.key !== mappingId
        );

        if (existingMappingWithPosition) {
          // Если позиция используется в маппинге типа "new" - удаляем его
          if (existingMappingWithPosition.mapping_type === 'new') {
            // Удаляем маппинг типа "new" из списка
            setMappings(prev => prev.filter(m =>
              m.id !== existingMappingWithPosition.id &&
              m.key !== existingMappingWithPosition.key
            ));

            // Удаляем из базы если есть id
            if (existingMappingWithPosition.id) {
              await supabase
                .from('tender_version_mappings')
                .delete()
                .eq('id', existingMappingWithPosition.id);
            }
          } else {
            // Если позиция используется в обычном маппинге - освобождаем её
            const updatedMappings = mappings.map(m => {
              if (m.id === existingMappingWithPosition.id || m.key === existingMappingWithPosition.key) {
                return {
                  ...m,
                  new_position_id: undefined,
                  new_position_number: undefined,
                  new_work_name: undefined,
                  new_volume: undefined,
                  new_unit: undefined,
                  new_client_note: undefined,
                  new_item_no: undefined,
                  mapping_type: 'deleted' as const,
                  confidence_score: 0,
                  mapping_status: 'suggested' as const
                };
              }
              return m;
            });

            setMappings(updatedMappings);

            // Обновляем в базе
            if (existingMappingWithPosition.id) {
              await tenderVersioningApi.updateMapping(existingMappingWithPosition.id, null);
            }
          }
        }
      }

      // Обновляем текущий маппинг в базе
      // Для deleted маппингов всегда есть id, так как они создаются при автоматическом сопоставлении
      if (mapping.id || mapping.mapping_type === 'deleted') {
        // Если id нет, но тип deleted - нужно сначала найти его в БД
        let mappingIdToUpdate = mapping.id;

        if (!mappingIdToUpdate && mapping.mapping_type === 'deleted') {
          // Получаем маппинг из БД по old_position_id
          const getResult = await tenderVersioningApi.getMappings(mapping.new_tender_id || newTenderId);
          if (getResult.data) {
            const existingMapping = getResult.data.find(m =>
              m.old_position_id === mapping.old_position_id
            );
            if (existingMapping) {
              mappingIdToUpdate = existingMapping.id;
            }
          }
        }

        if (mappingIdToUpdate) {
          // Сначала проверяем, не используется ли уже эта позиция в другом маппинге
          if (newPositionId) {
            const getResult = await tenderVersioningApi.getMappings(mapping.new_tender_id || newTenderId);
            if (getResult.data) {
              const conflictingMapping = getResult.data.find(m =>
                m.new_position_id === newPositionId && m.id !== mappingIdToUpdate
              );

              if (conflictingMapping) {
                console.log('⚠️ Found conflicting mapping, clearing it first:', conflictingMapping.id);
                // Освобождаем позицию от конфликтующего маппинга
                const clearResult = await tenderVersioningApi.updateMapping(conflictingMapping.id, null);
                if (clearResult.error) {
                  console.error('❌ Failed to clear conflicting mapping:', clearResult.error);
                } else {
                  console.log('✅ Cleared conflicting mapping');
                  // Обновляем локальный маппинг тоже
                  setMappings(prev => prev.map(m => {
                    if (m.id === conflictingMapping.id) {
                      return {
                        ...m,
                        new_position_id: undefined,
                        new_position_number: undefined,
                        new_work_name: undefined,
                        new_volume: undefined,
                        new_unit: undefined,
                        new_client_note: undefined,
                        new_item_no: undefined,
                        mapping_type: 'deleted' as const,
                        confidence_score: 0,
                        mapping_status: 'suggested' as const
                      };
                    }
                    return m;
                  }));
                }
              }
            }
          }

          const result = await tenderVersioningApi.updateMapping(mappingIdToUpdate, newPositionId);
          if (result.error) {
            message.error(result.error);
            return;
          }
        } else {
          message.error('Не удалось найти маппинг для обновления');
          return;
        }
      } else {
        // Создаем новый маппинг только если его точно нет
        const result = await tenderVersioningApi.createManualMapping(
          mapping.old_tender_id,
          mapping.new_tender_id,
          mapping.old_position_id!,
          newPositionId
        );
        if (result.error) {
          // Если ошибка дубликата - пробуем обновить существующий
          if (result.error.includes('duplicate key')) {
            const getResult = await tenderVersioningApi.getMappings(mapping.new_tender_id || newTenderId);
            if (getResult.data) {
              const existingMapping = getResult.data.find(m =>
                m.old_position_id === mapping.old_position_id
              );
              if (existingMapping) {
                const updateResult = await tenderVersioningApi.updateMapping(existingMapping.id, newPositionId);
                if (updateResult.error) {
                  message.error(updateResult.error);
                  return;
                }
              }
            }
          } else {
            message.error(result.error);
            return;
          }
        }
      }

      // Обновляем локальное состояние
      let updatedMappings = [...mappings];

      if (newPositionId) {
        const newPosition = availablePositions.find(p => p.id === newPositionId);
        console.log('🔍 Looking for new position:', newPositionId);
        console.log('Found position:', newPosition);

        if (newPosition) {
          // Обновляем текущий маппинг
          updatedMappings = updatedMappings.map(m => {
            const shouldUpdate = m.id === mappingId || m.key === mappingId;
            if (shouldUpdate) {
              console.log('📝 Updating mapping:', { oldMapping: m, newPositionId });
              const updated = {
                ...m,
                new_position_id: newPositionId,
                new_position_number: newPosition.position_number || newPosition.item_no,
                new_work_name: newPosition.work_name,
                new_volume: newPosition.volume,
                new_unit: newPosition.unit,
                new_client_note: newPosition.client_note,
                new_item_no: newPosition.item_no,
                mapping_type: 'manual' as const,
                confidence_score: 1.0,
                mapping_status: 'confirmed' as const
              };
              console.log('📝 Updated mapping:', updated);
              return updated;
            }
            return m;
          });

          // Удаляем маппинг типа "new" для этой позиции если он был
          updatedMappings = updatedMappings.filter(m =>
            !(m.mapping_type === 'new' && m.new_position_id === newPositionId)
          );
        }
      } else {
        // Если позиция очищается - помечаем как deleted
        updatedMappings = updatedMappings.map(m => {
          if (m.id === mappingId || m.key === mappingId) {
            return {
              ...m,
              new_position_id: undefined,
              new_position_number: undefined,
              new_work_name: undefined,
              new_volume: undefined,
              new_unit: undefined,
              new_client_note: undefined,
              new_item_no: undefined,
              mapping_type: 'deleted' as const,
              confidence_score: 0,
              mapping_status: 'suggested' as const
            };
          }
          return m;
        });
      }

      // Если в текущем маппинге была позиция и она освободилась - создаем для неё маппинг типа "new"
      if (oldPositionInCurrentMapping && oldPositionInCurrentMapping !== newPositionId) {
        const freedPosition = availablePositions.find(p => p.id === oldPositionInCurrentMapping);
        if (freedPosition) {
          // Проверяем, не используется ли эта позиция теперь где-то еще
          const isPositionUsedElsewhere = updatedMappings.some(m =>
            m.new_position_id === oldPositionInCurrentMapping
          );

          if (!isPositionUsedElsewhere) {
            // Создаем новый маппинг типа "new"
            const newMapping: MappingTableRow = {
              key: `new-${oldPositionInCurrentMapping}`,
              old_tender_id: mapping.old_tender_id,
              new_tender_id: mapping.new_tender_id,
              new_position_id: oldPositionInCurrentMapping,
              new_position_number: freedPosition.position_number || freedPosition.item_no,
              new_work_name: freedPosition.work_name,
              new_volume: freedPosition.volume,
              new_unit: freedPosition.unit,
              new_client_note: freedPosition.client_note,
              new_item_no: freedPosition.item_no,
              mapping_type: 'new',
              confidence_score: 0,
              mapping_status: 'suggested'
            };
            updatedMappings.push(newMapping);
          }
        }
      }

      console.log('💾 Setting updated mappings:', updatedMappings.length, 'items');
      const updatedMapping = updatedMappings.find(m => m.id === mappingId || m.key === mappingId);
      console.log('Updated mapping details:', updatedMapping);
      console.log('Mappings before update:', mappings.length);

      setMappings(updatedMappings);

      // Добавим проверку после обновления
      setTimeout(() => {
        console.log('📊 Mappings after update (delayed check):', mappings.length);
      }, 100);

      // Обновляем статистику
      updateStatistics(updatedMappings);

      // Перезагружаем доступные позиции
      await loadAvailablePositions();

      message.success('Сопоставление обновлено');
      setEditingMappingId(null);
      // Очищаем только позицию для этого конкретного маппинга
      setSelectedPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[mappingId];
        // Также пробуем удалить по ключу маппинга, если он отличается
        const mappingKey = mapping.key || mappingId;
        if (mappingKey !== mappingId) {
          delete newPositions[mappingKey];
        }
        return newPositions;
      });
    } catch (error) {
      console.error('Error in manual mapping:', error);
      message.error('Ошибка при обновлении сопоставления');
    } finally {
      setLoading(false);
    }
  }, [mappings, newTenderId, availablePositions]);

  // Колонки таблицы маппингов
  const columns: ColumnsType<MappingTableRow> = [
    // Старая версия - колонки
    {
      title: '№ раздела',
      key: 'old_number',
      width: 80,
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>
          {record.old_item_no || record.old_position_number || '-'}
        </Text>
      )
    },
    {
      title: 'Наименование (старая)',
      key: 'old_name',
      width: 200,
      ellipsis: true,
      render: (_, record) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Text style={{ fontSize: '12px' }}>{record.old_work_name || 'Позиция удалена'}</Text>
          {record.is_dop && <Tag color="purple" style={{ fontSize: '10px' }}>ДОП</Tag>}
        </Space>
      )
    },
    {
      title: 'Объем',
      key: 'old_volume',
      width: 70,
      align: 'right' as const,
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>{record.old_volume || '-'}</Text>
      )
    },
    {
      title: 'Ед. изм.',
      key: 'old_unit',
      width: 60,
      align: 'center' as const,
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>{record.old_unit || '-'}</Text>
      )
    },
    {
      title: 'Примечание',
      key: 'old_note',
      width: 150,
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.old_client_note}>
          <Text style={{ fontSize: '12px' }}>{record.old_client_note || '-'}</Text>
        </Tooltip>
      )
    },
    // Соответствие
    {
      title: 'Соответствие',
      key: 'match',
      width: 100,
      align: 'center' as const,
      fixed: 'center' as const,
      render: (_, record) => {
        const getIcon = () => {
          if (record.mapping_type === 'exact') return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
          if (record.mapping_type === 'fuzzy') return <QuestionCircleOutlined style={{ color: '#faad14' }} />;
          if (record.mapping_type === 'new') return <PlusCircleOutlined style={{ color: '#1890ff' }} />;
          if (record.mapping_type === 'deleted') return <DeleteOutlined style={{ color: '#ff4d4f' }} />;
          return <SwapOutlined />;
        };

        const getColor = () => {
          if (!record.confidence_score) return 'default';
          if (record.confidence_score >= 0.9) return 'success';
          if (record.confidence_score >= 0.7) return 'warning';
          return 'error';
        };

        return (
          <Space direction="vertical" size={0} align="center">
            {getIcon()}
            {record.confidence_score ? (
              <Text style={{ fontSize: '11px' }}>
                {Math.round(record.confidence_score * 100)}%
              </Text>
            ) : (
              <Text style={{ fontSize: '11px' }}>{record.mapping_type}</Text>
            )}
          </Space>
        );
      }
    },
    // Новая версия - колонки
    {
      title: '№ раздела',
      key: 'new_number',
      width: 80,
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>
          {record.new_item_no || record.new_position_number || '-'}
        </Text>
      )
    },
    {
      title: 'Наименование (новая)',
      key: 'new_name',
      width: 250,
      ellipsis: true,
      render: (_, record) => {
        const isEditing = editingMappingId === (record.id || record.key);
        const isDeleted = record.mapping_type === 'deleted';

        // Для удаленных строк всегда показываем селектор
        if (isEditing || isDeleted) {
          return (
            <Select
              size="small"
              style={{ width: '100%' }}
              placeholder="Выберите позицию для сопоставления"
              value={selectedPositions[record.key] !== undefined ? selectedPositions[record.key] : record.new_position_id}
              onChange={(value) => {
                console.log('📝 Select onChange:', { recordKey: record.key, value });
                setSelectedPositions(prev => ({ ...prev, [record.key]: value }));
              }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={[
                { value: '', label: '-- Не сопоставлено --' },
                ...availablePositions.map(pos => ({
                  value: pos.id,
                  label: pos.isUsed && pos.id !== record.new_position_id
                    ? `${pos.label} (уже используется)`
                    : pos.label,
                  disabled: false // Разрешаем выбор любой позиции для ручного сопоставления
                }))
              ]}
              onBlur={() => {
                // Не очищаем состояние для удаленных строк, так как они всегда редактируемые
                if (!isDeleted) {
                  setEditingMappingId(null);
                  setSelectedPositions(prev => {
                    const newPositions = { ...prev };
                    delete newPositions[record.key];
                    return newPositions;
                  });
                }
              }}
            />
          );
        }

        return (
          <Text style={{ fontSize: '12px' }}>
            {record.new_work_name || (record.mapping_type === 'deleted' ? 'Удалена' : 'Не сопоставлено')}
          </Text>
        );
      }
    },
    {
      title: 'Объем',
      key: 'new_volume',
      width: 70,
      align: 'right' as const,
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>{record.new_volume || '-'}</Text>
      )
    },
    {
      title: 'Ед. изм.',
      key: 'new_unit',
      width: 60,
      align: 'center' as const,
      render: (_, record) => (
        <Text style={{ fontSize: '12px' }}>{record.new_unit || '-'}</Text>
      )
    },
    {
      title: 'Примечание',
      key: 'new_note',
      width: 150,
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.new_client_note}>
          <Text style={{ fontSize: '12px' }}>{record.new_client_note || '-'}</Text>
        </Tooltip>
      )
    },
    // Действия
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_, record) => {
        const isEditing = editingMappingId === (record.id || record.key);
        const isDeleted = record.mapping_type === 'deleted';

        // Для удаленных строк всегда показываем кнопки сохранения
        if (isEditing || isDeleted) {
          return (
            <Space size={0}>
              <Tooltip title="Сохранить">
                <Button
                  size="small"
                  type="link"
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  onClick={() => {
                    const selectedId = selectedPositions[record.key] !== undefined
                      ? selectedPositions[record.key]
                      : record.new_position_id;
                    console.log('✅ Confirm clicked:', { recordKey: record.key, selectedId, recordId: record.id });
                    handleManualMapping(record.id || record.key, selectedId || null);
                  }}
                  style={{ padding: '0 4px' }}
                />
              </Tooltip>
              <Tooltip title="Отмена">
                <Button
                  size="small"
                  type="link"
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    // Для удаленных строк не сбрасываем editingMappingId, так как они всегда редактируемые
                    if (!isDeleted) {
                      setEditingMappingId(null);
                    }
                    // Сбрасываем выбранное значение
                    setSelectedPositions(prev => {
                      const newPositions = { ...prev };
                      delete newPositions[record.key];
                      return newPositions;
                    });
                  }}
                  style={{ padding: '0 4px' }}
                />
              </Tooltip>
            </Space>
          );
        }

        return (
          <Space size={0}>
            {/* Кнопка редактирования сопоставления (не показываем для deleted, так как у них селектор всегда доступен) */}
            {record.mapping_type !== 'new' && record.mapping_type !== 'deleted' && (
              <Tooltip title="Изменить сопоставление">
                <Button
                  size="small"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingMappingId(record.id || record.key);
                    setSelectedPositions(prev => ({ ...prev, [record.key]: record.new_position_id || null }));
                  }}
                  style={{ padding: '0 4px' }}
                />
              </Tooltip>
            )}

            {/* Кнопки подтверждения/отклонения для автоматических сопоставлений */}
            {record.mapping_type !== 'new' && record.mapping_type !== 'deleted' && record.mapping_type !== 'manual' && (
              <>
                {record.mapping_status !== 'confirmed' && (
                  <Tooltip title="Подтвердить">
                    <Button
                      size="small"
                      type="link"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleMappingStatusChange(record.id || record.key, 'confirmed')}
                      style={{ padding: '0 4px' }}
                    />
                  </Tooltip>
                )}
                {record.mapping_status !== 'rejected' && (
                  <Tooltip title="Отклонить">
                    <Button
                      size="small"
                      type="link"
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => handleMappingStatusChange(record.id || record.key, 'rejected')}
                      style={{ padding: '0 4px' }}
                    />
                  </Tooltip>
                )}
              </>
            )}
          </Space>
        );
      }
    }
  ];

  // Функция для удаления черновой версии при отмене
  const handleCancel = useCallback(async () => {
    // Если была создана новая версия, но пользователь отменил - удаляем её
    if (newTenderId && currentStep !== 'complete') {
      try {
        console.log('🗑️ Deleting draft version:', newTenderId);
        const { error } = await supabase
          .from('tenders')
          .delete()
          .eq('id', newTenderId);

        if (error) {
          console.error('Error deleting draft version:', error);
        } else {
          message.info('Черновая версия удалена');
        }
      } catch (error) {
        console.error('Error deleting draft version:', error);
      }
    }
    onCancel?.();
  }, [newTenderId, currentStep, onCancel]);

  return (
    <Modal
      title={`Создание новой версии тендера: ${parentTenderName}`}
      open={true}
      onCancel={handleCancel}
      width="95%"
      style={{ maxWidth: 1800 }}
      footer={
        currentStep === 'upload' ? [
          <Button key="cancel" onClick={handleCancel}>
            Отмена
          </Button>
        ] : currentStep === 'review' ? [
          <Button key="back" onClick={() => setCurrentStep('upload')}>
            Назад
          </Button>,
          <Button
            key="apply"
            type="primary"
            loading={loading}
            onClick={handleApplyMappings}
          >
            Применить и перенести данные
          </Button>
        ] : [
          <Button key="close" type="primary" onClick={handleCancel}>
            Закрыть
          </Button>
        ]
      }
    >
      {/* Шаг 1: Загрузка файла */}
      {currentStep === 'upload' && (
        <div>
          <Alert
            message="Загрузите Excel файл с новой версией от заказчика"
            description="Файл должен содержать столбец 'Тип позиции' с указанием типа для каждой позиции. Система автоматически сопоставит позиции между версиями."
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />

          <Dragger
            accept=".xlsx,.xls"
            beforeUpload={(file) => {
              handleFileUpload(file);
              return false;
            }}
            disabled={loading}
            style={{ padding: 40 }}
          >
            <p className="ant-upload-drag-icon">
              <FileTextOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">Нажмите или перетащите Excel файл для загрузки</p>
            <p className="ant-upload-hint">
              Поддерживаются файлы .xlsx и .xls
            </p>
          </Dragger>

          {loading && (
            <div style={{ marginTop: 20 }}>
              <Progress percent={uploadProgress} status="active" />
              <Text type="secondary">{uploadStep}</Text>
            </div>
          )}
        </div>
      )}

      {/* Шаг 2: Проверка сопоставлений */}
      {currentStep === 'review' && (
        <div>
          <Descriptions bordered style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Всего позиций">
              <Badge count={statistics.total} showZero style={{ backgroundColor: '#1890ff' }} />
            </Descriptions.Item>
            <Descriptions.Item label="Сопоставлено">
              <Badge count={statistics.matched} showZero style={{ backgroundColor: '#52c41a' }} />
            </Descriptions.Item>
            <Descriptions.Item label="Новые">
              <Badge count={statistics.new} showZero style={{ backgroundColor: '#faad14' }} />
            </Descriptions.Item>
            <Descriptions.Item label="Удалены">
              <Badge count={statistics.deleted} showZero style={{ backgroundColor: '#ff4d4f' }} />
            </Descriptions.Item>
            <Descriptions.Item label="ДОП позиции">
              <Space>
                <Badge count={statistics.dop} showZero style={{ backgroundColor: '#722ed1' }} />
                {statistics.dop > 0 && <Text type="secondary" style={{ fontSize: '12px' }}>(переносятся автоматически)</Text>}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          <Alert
            message="Проверьте автоматические сопоставления"
            description="Позиции с высокой уверенностью (>90%) будут подтверждены автоматически. Вы можете изменить статус любого сопоставления вручную."
            type="warning"
            showIcon
            style={{ marginBottom: 20 }}
          />

          {/* Панель фильтров */}
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={12}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text strong>Тип сопоставления:</Text>
                <Radio.Group value={mappingTypeFilter} onChange={(e) => setMappingTypeFilter(e.target.value)}>
                  <Radio.Button value="all">Все</Radio.Button>
                  <Radio.Button value="matched">Сопоставлено</Radio.Button>
                  <Radio.Button value="new">Добавлено</Radio.Button>
                  <Radio.Button value="deleted">Удалено</Radio.Button>
                </Radio.Group>
              </Space>
            </Col>
            <Col span={12}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text strong>Показать только с уверенностью менее:</Text>
                <Space>
                  <InputNumber
                    value={confidenceFilter ? confidenceFilter * 100 : null}
                    onChange={(value) => setConfidenceFilter(value ? value / 100 : null)}
                    min={0}
                    max={100}
                    formatter={(value) => value ? `${value}%` : ''}
                    parser={(value) => value ? parseFloat(value.replace('%', '')) : 0}
                    style={{ width: 100 }}
                    placeholder="Нет"
                  />
                  {confidenceFilter && (
                    <Button size="small" onClick={() => setConfidenceFilter(null)}>Сбросить</Button>
                  )}
                </Space>
              </Space>
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={(() => {
              // Применяем фильтры к данным
              let filtered = [...mappings];

              // Фильтр по типу маппинга
              if (mappingTypeFilter !== 'all') {
                switch (mappingTypeFilter) {
                  case 'matched':
                    filtered = filtered.filter(m =>
                      m.mapping_type === 'exact' ||
                      m.mapping_type === 'fuzzy' ||
                      m.mapping_type === 'manual'
                    );
                    break;
                  case 'new':
                    filtered = filtered.filter(m => m.mapping_type === 'new');
                    break;
                  case 'deleted':
                    filtered = filtered.filter(m => m.mapping_type === 'deleted');
                    break;
                }
              }

              // Фильтр по уверенности (показываем только с низкой уверенностью)
              if (confidenceFilter !== null) {
                filtered = filtered.filter(m =>
                  m.confidence_score !== null &&
                  m.confidence_score !== undefined &&
                  m.confidence_score < confidenceFilter
                );
              }

              return filtered;
            })()}
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['50', '100', '500', '1000'],
              showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} позиций`,
              onChange: (page, size) => {
                setCurrentPage(page);
                if (size && size !== pageSize) {
                  setPageSize(size);
                }
              },
              onShowSizeChange: (current, size) => {
                setPageSize(size);
                setCurrentPage(1);
              }
            }}
            scroll={{ x: 1400, y: 400 }}
            size="small"
            bordered
          />
        </div>
      )}

      {/* Шаг 3: Завершение */}
      {currentStep === 'complete' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <Title level={3} style={{ marginTop: 20 }}>
            Новая версия успешно создана!
          </Title>
          <Text type="secondary">
            Данные из предыдущей версии были перенесены согласно сопоставлениям.
            ДОП позиции сохранены со всеми BOQ элементами.
          </Text>
        </div>
      )}
    </Modal>
  );
};