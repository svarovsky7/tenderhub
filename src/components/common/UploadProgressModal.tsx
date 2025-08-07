import React from 'react';
import { Modal, Progress, Spin } from 'antd';
import { FileExcelOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface UploadProgressModalProps {
  visible: boolean;
  progress: number;
  fileName: string;
  currentStep: string;
  elapsedTime: number;
  estimatedTime?: number;
  isCompleted?: boolean;
  onClose?: () => void;
}

const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  visible,
  progress,
  fileName,
  currentStep,
  elapsedTime,
  estimatedTime,
  isCompleted = false,
  onClose
}) => {
  console.log('🚀 UploadProgressModal rendered:', { visible, progress, currentStep, elapsedTime });

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)} сек`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes} мин ${remainingSeconds} сек`;
  };

  const getProgressColor = () => {
    if (isCompleted) return '#52c41a'; // green
    if (progress > 75) return '#1890ff'; // blue
    if (progress > 50) return '#faad14'; // orange
    return '#722ed1'; // purple
  };

  return (
    <Modal
      title={null}
      open={visible}
      footer={null}
      closable={false}
      centered
      width={480}
      maskClosable={false}
      className="upload-progress-modal"
    >
      <div className="text-center p-6">
        {/* Header with file icon and name */}
        <div className="mb-6">
          <div className="flex justify-center mb-3">
            {isCompleted ? (
              <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
            ) : (
              <FileExcelOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isCompleted ? 'Загрузка завершена!' : 'Загрузка Excel файла'}
          </h3>
          <p className="text-sm text-gray-600 break-all">
            {fileName}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress 
            percent={Math.round(progress)} 
            strokeColor={getProgressColor()}
            trailColor="#f0f0f0"
            strokeWidth={12}
            format={(percent) => (
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: getProgressColor()
              }}>
                {percent}%
              </span>
            )}
          />
        </div>

        {/* Current step */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            {!isCompleted && <Spin size="small" />}
            <span className="text-sm font-medium text-gray-700">
              {currentStep}
            </span>
          </div>
        </div>

        {/* Time information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ClockCircleOutlined style={{ color: '#1890ff' }} />
              <span className="font-medium text-blue-900">Прошло времени</span>
            </div>
            <div className="text-blue-700 font-bold">
              {formatTime(elapsedTime)}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ClockCircleOutlined style={{ color: '#666' }} />
              <span className="font-medium text-gray-700">
                {isCompleted ? 'Общее время' : 'Осталось'}
              </span>
            </div>
            <div className="text-gray-700 font-bold">
              {isCompleted ? formatTime(elapsedTime) : (
                estimatedTime ? formatTime(estimatedTime) : '...'
              )}
            </div>
          </div>
        </div>

        {/* Completion message */}
        {isCompleted && onClose && (
          <div className="mt-6">
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UploadProgressModal;