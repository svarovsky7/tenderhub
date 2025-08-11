import React, { useState } from 'react';
import { Upload, Button, message, Modal } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { UploadRequestOption as RcUploadRequestOption } from 'rc-upload/lib/interface';
import { useNavigate } from 'react-router-dom';
import { clientWorksApi } from '../../../lib/supabase/api';
import UploadProgressModal from '../../../components/common/UploadProgressModal';
import type { ExcelUploadProps } from '../types';

const ExcelUpload: React.FC<ExcelUploadProps> = ({ tenderId, onUpload }) => {
  const navigate = useNavigate();
  const [uploadProgress, setUploadProgress] = useState({
    visible: false,
    progress: 0,
    fileName: '',
    currentStep: '',
    startTime: 0,
    elapsedTime: 0,
    isCompleted: false
  });

  console.log('🚀 ExcelUpload component rendered for tender:', tenderId);

  const uploadProps: UploadProps = {
    showUploadList: false,
    accept: '.xlsx,.xls',
    customRequest: async (options: RcUploadRequestOption) => {
      const { file, onSuccess, onError } = options;
      
      console.log('📤 Excel upload started for tender:', tenderId);
      console.log('📁 File info:', { 
        name: (file as File).name, 
        size: (file as File).size,
        type: (file as File).type 
      });
      
      try {
        // Initialize progress tracking
        const startTime = Date.now();
        setUploadProgress({
          visible: true,
          progress: 0,
          fileName: (file as File).name,
          currentStep: 'Начало загрузки...',
          startTime,
          elapsedTime: 0,
          isCompleted: false
        });

        // Start elapsed time tracking
        const timeInterval = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          setUploadProgress(prev => ({ ...prev, elapsedTime: elapsed }));
        }, 100);

        console.log('📡 Calling clientWorksApi.uploadFromXlsx...');
        const result = await clientWorksApi.uploadFromXlsx(
          tenderId, 
          file as File,
          (progress: number, step: string) => {
            console.log('📈 Progress update:', { progress, step });
            setUploadProgress(prev => ({
              ...prev,
              progress,
              currentStep: step
            }));
          }
        );
        
        clearInterval(timeInterval);
        
        console.log('📦 Upload result:', result);
        
        if (result.error) {
          console.error('❌ Upload failed:', result.error);
          setUploadProgress(prev => ({ ...prev, visible: false }));
          message.error(`Ошибка загрузки: ${result.error}`);
          onError?.(new Error(result.error));
        } else {
          console.log('✅ Upload successful:', result.data);
          
          // Mark as completed
          setUploadProgress(prev => ({ ...prev, isCompleted: true }));
          
          // Show detailed success message
          const { positionsCount } = result.data || { positionsCount: 0 };
          
          onSuccess?.(result, new XMLHttpRequest());
          
          // Delay before showing success modal
          setTimeout(() => {
            setUploadProgress(prev => ({ ...prev, visible: false }));
            
            // Show success modal with updated message
            Modal.success({
              title: '✅ Файл успешно загружен!',
              content: (
                <div>
                  <p><strong>Файл:</strong> {(file as File).name}</p>
                  <p><strong>Импортировано:</strong></p>
                  <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                    <li>{positionsCount} позиций заказчика</li>
                  </ul>
                  <p style={{ marginTop: '12px', color: '#666', fontSize: '14px' }}>
                    📝 <strong>Важно:</strong> Позиции созданы без работ и материалов. 
                    Добавьте их вручную через интерфейс ВОР.
                  </p>
                </div>
              ),
              okText: 'Перейти к управлению ВОР',
              onOk: () => {
                console.log('🔄 User clicked OK, navigating to BOQ management page...');
                navigate('/BOQ');
              },
              centered: true,
              width: 450
            });
          }, 1500);
          
          // Show brief message
          message.success(`Импортировано: ${positionsCount} позиций`);
          
          // Call parent upload handler
          if (onUpload) {
            await onUpload(file as File);
          }
        }
      } catch (error) {
        console.error('💥 Upload exception:', error);
        setUploadProgress(prev => ({ ...prev, visible: false }));
        message.error('Произошла ошибка при загрузке файла');
        onError?.(error as Error);
      }
    }
  };

  return (
    <>
      <Upload {...uploadProps}>
        <Button size="small" icon={<UploadOutlined />} disabled={uploadProgress.visible}>
          {uploadProgress.visible ? 'Загрузка...' : 'Загрузить'}
        </Button>
      </Upload>
      
      <UploadProgressModal
        visible={uploadProgress.visible}
        progress={uploadProgress.progress}
        fileName={uploadProgress.fileName}
        currentStep={uploadProgress.currentStep}
        elapsedTime={uploadProgress.elapsedTime}
        isCompleted={uploadProgress.isCompleted}
        onClose={() => {
          if (uploadProgress.isCompleted) {
            setUploadProgress(prev => ({ ...prev, visible: false }));
          }
        }}
      />
    </>
  );
};

export default ExcelUpload;