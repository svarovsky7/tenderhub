import React from 'react';
import { Upload, Button, message, Modal } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { UploadRequestOption as RcUploadRequestOption } from 'rc-upload/lib/interface';
import { useNavigate } from 'react-router-dom';
import { clientWorksApi } from '../../../lib/supabase/api';
import type { ExcelUploadProps } from '../types';

const ExcelUpload: React.FC<ExcelUploadProps> = ({ tenderId, onUpload }) => {
  const navigate = useNavigate();

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
        console.log('📡 Calling clientWorksApi.uploadFromXlsx...');
        const result = await clientWorksApi.uploadFromXlsx(tenderId, file as File);
        
        console.log('📦 Upload result:', result);
        
        if (result.error) {
          console.error('❌ Upload failed:', result.error);
          message.error(`Ошибка загрузки: ${result.error}`);
          onError?.(new Error(result.error));
        } else {
          console.log('✅ Upload successful:', result.data);
          
          // Show detailed success message
          const { itemsCount, positionsCount } = result.data || { itemsCount: 0, positionsCount: 0 };
          
          onSuccess?.(result, new XMLHttpRequest());
          
          // Show success modal
          Modal.success({
            title: '✅ Файл успешно загружен!',
            content: (
              <div>
                <p><strong>Файл:</strong> {(file as File).name}</p>
                <p><strong>Импортировано:</strong></p>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>{positionsCount} позиций</li>
                  <li>{itemsCount} работ</li>
                </ul>
                <p style={{ marginTop: '12px', color: '#666' }}>
                  Сейчас вы будете перенаправлены на страницу ВОР для просмотра импортированных данных.
                </p>
              </div>
            ),
            okText: 'Перейти к ВОР',
            onOk: () => {
              console.log('🔄 User clicked OK, navigating to BOQ page...');
              navigate(`/tender/${tenderId}/boq`);
            },
            centered: true,
            width: 400
          });
          
          // Also show brief message
          message.success(`Импортировано: ${positionsCount} позиций, ${itemsCount} работ`);
          
          // Call parent upload handler
          if (onUpload) {
            await onUpload(file as File);
          }
        }
      } catch (error) {
        console.error('💥 Upload exception:', error);
        message.error('Произошла ошибка при загрузке файла');
        onError?.(error as Error);
      }
    }
  };

  return (
    <Upload {...uploadProps}>
      <Button size="small" icon={<UploadOutlined />}>
        Загрузить
      </Button>
    </Upload>
  );
};

export default ExcelUpload;