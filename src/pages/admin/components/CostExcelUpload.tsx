import React, { useState } from 'react';
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { UploadRequestOption as RcUploadRequestOption } from 'rc-upload/lib/interface';
import UploadProgressModal from '../../../components/common/UploadProgressModal';
import { costsApi } from '../../../lib/supabase/api';

interface CostExcelUploadProps {
  onUploaded?: () => void;
}

const CostExcelUpload: React.FC<CostExcelUploadProps> = ({ onUploaded }) => {
  const [uploadState, setUploadState] = useState({
    visible: false,
    progress: 0,
    fileName: '',
    currentStep: '',
    startTime: 0,
    elapsedTime: 0,
    isCompleted: false
  });

  console.log('🚀 [CostExcelUpload] rendered');

  const uploadProps: UploadProps = {
    showUploadList: false,
    accept: '.xlsx,.xls',
    customRequest: async (options: RcUploadRequestOption) => {
      const { file, onError, onSuccess } = options;
      const excelFile = file as File;

      console.log('📤 [CostExcelUpload] upload started:', excelFile.name);

      try {
        const startTime = Date.now();
        setUploadState({
          visible: true,
          progress: 0,
          fileName: excelFile.name,
          currentStep: 'Начало загрузки...',
          startTime,
          elapsedTime: 0,
          isCompleted: false
        });

        const timer = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          setUploadState(prev => ({ ...prev, elapsedTime: elapsed }));
        }, 100);

        const result = await costsApi.importFromXlsx(
          excelFile,
          (progress: number, step: string) => {
            console.log('📈 [CostExcelUpload] progress:', { progress, step });
            setUploadState(prev => ({ ...prev, progress, currentStep: step }));
          }
        );

        clearInterval(timer);

        if (result.error) {
          console.error('❌ [CostExcelUpload] failed:', result.error);
          setUploadState(prev => ({ ...prev, visible: false }));
          message.error(`Ошибка: ${result.error}`);
          onError?.(new Error(result.error));
          return;
        }

        setUploadState(prev => ({ ...prev, isCompleted: true }));

        onSuccess?.(result, new XMLHttpRequest());

        setTimeout(() => {
          setUploadState(prev => ({ ...prev, visible: false }));
          message.success('Импорт завершен');
          onUploaded?.();
        }, 1500);
      } catch (error) {
        console.error('💥 [CostExcelUpload] exception:', error);
        setUploadState(prev => ({ ...prev, visible: false }));
        message.error('Ошибка при загрузке файла');
        onError?.(error as Error);
      }
    }
  };

  return (
    <>
      <Upload {...uploadProps}>
        <Button size="small" icon={<UploadOutlined />} disabled={uploadState.visible}>
          {uploadState.visible ? 'Загрузка...' : 'Загрузить Excel'}
        </Button>
      </Upload>
      <UploadProgressModal
        visible={uploadState.visible}
        progress={uploadState.progress}
        fileName={uploadState.fileName}
        currentStep={uploadState.currentStep}
        elapsedTime={uploadState.elapsedTime}
        isCompleted={uploadState.isCompleted}
        onClose={() => {
          if (uploadState.isCompleted) {
            setUploadState(prev => ({ ...prev, visible: false }));
          }
        }}
      />
    </>
  );
};

export default CostExcelUpload;

