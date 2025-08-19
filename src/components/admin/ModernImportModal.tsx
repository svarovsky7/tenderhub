import React from 'react';
import {
  Modal,
  Button,
  Upload,
  Progress,
  Alert,
  Card,
  Avatar,
  Typography,
  Spin
} from 'antd';
import {
  UploadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface ModernImportModalProps {
  visible: boolean;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  logs: string[];
  onCancel: () => void;
  onUpload: (file: File) => boolean;
}

const ModernImportModal: React.FC<ModernImportModalProps> = ({
  visible,
  status,
  progress,
  logs,
  onCancel,
  onUpload
}) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UploadOutlined style={{ fontSize: 20 }} />
          <span>Импорт данных из Excel</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={
        status === 'completed' || status === 'error' ? [
          <Button 
            key="close" 
            type="primary"
            size="large"
            onClick={onCancel}
          >
            Закрыть
          </Button>
        ] : null
      }
      width={800}
      destroyOnClose
    >
      <div style={{ padding: '8px 0' }}>
        {status === 'idle' && (
          <>
            <Alert
              message="Формат Excel файла (6 колонок)"
              description="Убедитесь, что ваш файл соответствует указанному формату для корректного импорта данных."
              type="info"
              showIcon
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
            
            <table style={{ width: '100%', fontSize: '12px', border: '1px solid #d9d9d9', marginBottom: 16 }}>
              <thead>
                <tr style={{ backgroundColor: '#fafafa' }}>
                  <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>A: №</th>
                  <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>B: Категория</th>
                  <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>C: Ед.изм. категории</th>
                  <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>D: Вид затрат</th>
                  <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>E: Ед.изм. детали</th>
                  <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>F: Локализация</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>1</td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>Материалы</td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>т</td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>Цемент М500</td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>кг</td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>Россия</td>
                </tr>
              </tbody>
            </table>

            <Card size="small" style={{ marginTop: 16, background: '#f8f9ff', border: '1px solid #d9efff' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <InfoCircleOutlined style={{ color: '#1890ff', marginTop: 2 }} />
                <div>
                  <Text strong style={{ color: '#1890ff' }}>Структура импорта данных:</Text>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 16 }}>
                    <li><strong>Категория</strong> (столбец B) → таблица <code>cost_categories</code></li>
                    <li><strong>Вид затрат</strong> (столбец D) → таблица <code>detail_cost_categories</code></li>
                    <li><strong>Локализация</strong> (столбец F) → таблица <code>location</code></li>
                  </ul>
                </div>
              </div>
            </Card>

            <Upload.Dragger
              accept=".xlsx,.xls"
              beforeUpload={onUpload}
              showUploadList={false}
              style={{
                background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)',
                border: '2px dashed #1890ff',
                borderRadius: 12,
                padding: '40px 20px',
                marginTop: 20
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <UploadOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 16 }} />
                <Title level={4} style={{ color: '#1890ff', margin: '0 0 8px 0' }}>
                  Выберите файл Excel
                </Title>
                <Text style={{ fontSize: 16, color: '#666' }}>
                  Нажмите или перетащите файл сюда для загрузки
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Поддерживаются файлы: .xlsx, .xls
                </Text>
              </div>
            </Upload.Dragger>
          </>
        )}

        {(status === 'processing' || status === 'completed' || status === 'error') && (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Text strong style={{ fontSize: 16 }}>
                  {status === 'processing' && 'Обработка файла...'}
                  {status === 'completed' && 'Импорт завершен успешно!'}
                  {status === 'error' && 'Возникли ошибки при импорте'}
                </Text>
              </div>
              <Progress
                percent={progress}
                status={
                  status === 'error' ? 'exception' : 
                  status === 'completed' ? 'success' : 
                  'active'
                }
                strokeColor={
                  status === 'error' ? '#ff4d4f' :
                  status === 'completed' ? '#52c41a' :
                  'linear-gradient(90deg, #1890ff 0%, #722ed1 100%)'
                }
                strokeWidth={8}
              />
            </Card>

            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar size="small" icon={<InfoCircleOutlined />} style={{ background: '#1890ff' }} />
                  <span>Журнал импорта</span>
                </div>
              }
              size="small"
              style={{ background: '#fafbfc' }}
            >
              <div style={{
                maxHeight: '250px',
                overflowY: 'auto',
                fontSize: '13px',
                fontFamily: 'SF Mono, Monaco, monospace',
                lineHeight: '1.6'
              }}>
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      marginBottom: '6px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: log.includes('❌') ? '#fff2f0' : 
                                 log.includes('✅') ? '#f6ffed' : 
                                 log.includes('📍') ? '#f0f5ff' : 'transparent',
                      color: log.includes('❌') ? '#ff4d4f' : 
                             log.includes('✅') ? '#52c41a' : 
                             log.includes('📍') ? '#1890ff' : '#595959',
                      border: '1px solid ' + (log.includes('❌') ? '#ffccc7' : 
                                              log.includes('✅') ? '#d9f7be' : 
                                              log.includes('📍') ? '#d9efff' : 'transparent')
                    }}
                  >
                    {log}
                  </div>
                ))}
                {status === 'processing' && (
                  <div style={{ 
                    color: '#1890ff', 
                    marginTop: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    padding: '8px',
                    background: '#f0f5ff',
                    borderRadius: '6px',
                    border: '1px solid #d9efff'
                  }}>
                    <Spin size="small" />
                    <span>Обработка данных...</span>
                  </div>
                )}
              </div>
            </Card>

            {status === 'completed' && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: '#f6ffed', 
                borderRadius: '8px',
                border: '1px solid #b7eb8f'
              }}>
                <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  ✅ Импорт успешно завершен!
                </div>
              </div>
            )}

            {status === 'error' && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: '#fff2f0', 
                borderRadius: '8px',
                border: '1px solid #ffccc7'
              }}>
                <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                  ❌ Импорт завершен с ошибками
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default ModernImportModal;