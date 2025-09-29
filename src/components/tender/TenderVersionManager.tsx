import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Table, Button, Tag, Space, Progress, Alert, Badge, Descriptions, Typography, Tooltip, Upload, Select } from 'antd';
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
  const [selectedNewPositionId, setSelectedNewPositionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

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

        // Преобразуем маппинги для таблицы
        const tableData: MappingTableRow[] = (result.data.mappings || []).map((m, index) => ({
          ...m,
          key: m.id || `mapping-${index}`
        }));

        setMappings(tableData);

        // Маппинги уже сохранены в БД в client-works-versioning.ts, просто показываем их

        // Подсчитываем статистику
        updateStatistics(tableData);

        setCurrentStep('review');
        message.success(`Загружено ${result.data.positionsCount} позиций`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error('Ошибка при загрузке файла');
    } finally {
      setLoading(false);
    }
  }, [parentTenderId]);

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
    setLoading(true);
    try {
      // Находим маппинг
      const mapping = mappings.find(m => m.id === mappingId || m.key === mappingId);
      if (!mapping) {
        message.error('Сопоставление не найдено');
        return;
      }

      // Если у маппинга есть id - обновляем существующий
      if (mapping.id) {
        const result = await tenderVersioningApi.updateMapping(mapping.id, newPositionId);
        if (result.error) {
          message.error(result.error);
          return;
        }
      } else {
        // Создаем новый маппинг
        const result = await tenderVersioningApi.createManualMapping(
          mapping.old_tender_id,
          mapping.new_tender_id,
          mapping.old_position_id!,
          newPositionId
        );
        if (result.error) {
          message.error(result.error);
          return;
        }
      }

      // Обновляем локальное состояние
      if (newPositionId) {
        const newPosition = availablePositions.find(p => p.id === newPositionId);
        if (newPosition) {
          setMappings(prev => prev.map(m => {
            if (m.id === mappingId || m.key === mappingId) {
              return {
                ...m,
                new_position_id: newPositionId,
                new_position_number: newPosition.position_number || newPosition.item_no,
                new_work_name: newPosition.work_name,
                new_volume: newPosition.volume,
                new_unit: newPosition.unit,
                mapping_type: 'manual' as const,
                confidence_score: 1.0,
                mapping_status: 'confirmed' as const
              };
            }
            return m;
          }));
        }
      } else {
        // Удаление сопоставления
        setMappings(prev => prev.map(m => {
          if (m.id === mappingId || m.key === mappingId) {
            return {
              ...m,
              new_position_id: undefined,
              new_position_number: undefined,
              new_work_name: undefined,
              new_volume: undefined,
              new_unit: undefined,
              mapping_type: 'deleted' as const,
              confidence_score: 0,
              mapping_status: 'suggested' as const
            };
          }
          return m;
        }));
      }

      // Обновляем статистику
      updateStatistics(mappings);

      // Перезагружаем доступные позиции
      await loadAvailablePositions();

      message.success('Сопоставление обновлено');
      setEditingMappingId(null);
      setSelectedNewPositionId(null);
    } catch (error) {
      console.error('Error in manual mapping:', error);
      message.error('Ошибка при обновлении сопоставления');
    } finally {
      setLoading(false);
    }
  }, [mappings, newTenderId, availablePositions]);

  // Обновление статистики
  const updateStatistics = (mappingsList: MappingTableRow[]) => {
    const stats = {
      total: mappingsList.length,
      matched: mappingsList.filter(m => m.mapping_type === 'exact' || m.mapping_type === 'fuzzy' || m.mapping_type === 'manual').length,
      new: mappingsList.filter(m => m.mapping_type === 'new').length,
      deleted: mappingsList.filter(m => m.mapping_type === 'deleted').length,
      dop: mappingsList.filter(m => m.is_dop).length
    };
    setStatistics(stats);
  };

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

        if (isEditing) {
          return (
            <Select
              size="small"
              style={{ width: '100%' }}
              placeholder="Выберите позицию для сопоставления"
              value={selectedNewPositionId || record.new_position_id}
              onChange={(value) => setSelectedNewPositionId(value)}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={[
                { value: null, label: '-- Не сопоставлено --' },
                ...availablePositions.map(pos => ({
                  value: pos.id,
                  label: pos.label,
                  disabled: pos.isUsed && pos.id !== record.new_position_id
                }))
              ]}
              onBlur={() => {
                setEditingMappingId(null);
                setSelectedNewPositionId(null);
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

        if (isEditing) {
          return (
            <Space size={0}>
              <Tooltip title="Сохранить">
                <Button
                  size="small"
                  type="link"
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  onClick={() => {
                    handleManualMapping(record.id || record.key, selectedNewPositionId || null);
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
                    setEditingMappingId(null);
                    setSelectedNewPositionId(null);
                  }}
                  style={{ padding: '0 4px' }}
                />
              </Tooltip>
            </Space>
          );
        }

        return (
          <Space size={0}>
            {/* Кнопка редактирования сопоставления */}
            {record.mapping_type !== 'new' && (
              <Tooltip title="Изменить сопоставление">
                <Button
                  size="small"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingMappingId(record.id || record.key);
                    setSelectedNewPositionId(record.new_position_id || null);
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
            <Descriptions.Item label="ДОП">
              <Badge count={statistics.dop} showZero style={{ backgroundColor: '#722ed1' }} />
            </Descriptions.Item>
          </Descriptions>

          <Alert
            message="Проверьте автоматические сопоставления"
            description="Позиции с высокой уверенностью (>90%) будут подтверждены автоматически. Вы можете изменить статус любого сопоставления вручную."
            type="warning"
            showIcon
            style={{ marginBottom: 20 }}
          />

          <Table
            columns={columns}
            dataSource={mappings}
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
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