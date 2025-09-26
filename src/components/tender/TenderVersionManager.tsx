import React, { useState, useCallback } from 'react';
import { Modal, Table, Button, Tag, Space, Progress, Alert, Badge, Descriptions, Typography, Tooltip, Upload } from 'antd';
import {
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  SwapOutlined,
  PlusCircleOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { clientWorksVersioningApi } from '../../lib/supabase/api/client-works-versioning';
import { tenderVersioningApi, type TenderVersionMapping } from '../../lib/supabase/api/tender-versioning';
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
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'complete'>('upload');

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

        // Подсчитываем статистику
        setStatistics({
          total: tableData.length,
          matched: result.data.matchedCount || 0,
          new: result.data.newCount || 0,
          deleted: result.data.deletedCount || 0,
          dop: tableData.filter(m => m.is_dop).length
        });

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
    const result = await tenderVersioningApi.updateMappingStatus(mappingId, status);

    if (result.error) {
      message.error(result.error);
      return;
    }

    // Обновляем локальное состояние
    setMappings(prev => prev.map(m =>
      m.key === mappingId ? { ...m, mapping_status: status } : m
    ));

    message.success('Статус обновлен');
  }, []);

  // Применение маппингов и перенос данных
  const handleApplyMappings = useCallback(async () => {
    if (!newTenderId) return;

    setLoading(true);
    setUploadStep('Применение сопоставлений и перенос данных...');

    try {
      // Сначала подтверждаем все маппинги с высокой уверенностью
      const autoConfirm = mappings.filter(m =>
        m.confidence_score && m.confidence_score >= 0.9 && m.mapping_status === 'suggested'
      );

      for (const mapping of autoConfirm) {
        await tenderVersioningApi.updateMappingStatus(mapping.key, 'confirmed');
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

  // Колонки таблицы маппингов
  const columns: ColumnsType<MappingTableRow> = [
    {
      title: 'Старая позиция',
      key: 'old',
      width: '35%',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{record.old_position_number || '-'}</Text>
          <Text>{record.old_work_name || 'Позиция удалена'}</Text>
          {record.is_dop && <Tag color="purple">ДОП</Tag>}
        </Space>
      )
    },
    {
      title: 'Соответствие',
      key: 'match',
      width: '20%',
      align: 'center',
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
          <Space direction="vertical" size="small" align="center">
            {getIcon()}
            {record.confidence_score ? (
              <Badge
                count={`${Math.round(record.confidence_score * 100)}%`}
                style={{ backgroundColor: getColor() === 'success' ? '#52c41a' : getColor() === 'warning' ? '#faad14' : '#ff4d4f' }}
              />
            ) : (
              <Tag color={getColor()}>{record.mapping_type}</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Новая позиция',
      key: 'new',
      width: '35%',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{record.new_position_number || '-'}</Text>
          <Text>{record.new_work_name || 'Новая позиция'}</Text>
        </Space>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: '10%',
      align: 'center',
      render: (_, record) => {
        if (record.mapping_type === 'new' || record.mapping_type === 'deleted') {
          return null;
        }

        return (
          <Space>
            {record.mapping_status !== 'confirmed' && (
              <Tooltip title="Подтвердить">
                <Button
                  size="small"
                  type="link"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleMappingStatusChange(record.key, 'confirmed')}
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
                  onClick={() => handleMappingStatusChange(record.key, 'rejected')}
                />
              </Tooltip>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <Modal
      title={`Создание новой версии тендера: ${parentTenderName}`}
      open={true}
      onCancel={onCancel}
      width={1200}
      footer={
        currentStep === 'upload' ? [
          <Button key="cancel" onClick={onCancel}>
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
          <Button key="close" type="primary" onClick={onCancel}>
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
            pagination={{ pageSize: 10 }}
            scroll={{ y: 400 }}
            size="small"
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