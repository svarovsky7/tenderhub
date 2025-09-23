import React from 'react';
import { Form, Button, AutoComplete } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';

interface TemplateAddFormProps {
  templateAddForm: FormInstance;
  handleTemplateAdd: () => void;
  loadTemplates: (searchText: string) => void;
  setTemplateAddMode: (mode: boolean) => void;
  selectedTemplateName: string;
  setSelectedTemplateName: (name: string) => void;
  templateOptions: any[];
  setTemplateOptions: (options: any[]) => void;
  loadingTemplates: boolean;
  loading: boolean;
}

export const TemplateAddForm: React.FC<TemplateAddFormProps> = ({
  templateAddForm,
  handleTemplateAdd,
  loadTemplates,
  setTemplateAddMode,
  selectedTemplateName,
  setSelectedTemplateName,
  templateOptions,
  setTemplateOptions,
  loadingTemplates,
  loading
}) => {
  return (
    <div className="mb-4 p-3 bg-white rounded-lg border border-green-300">
      <Form
        form={templateAddForm}
        layout="horizontal"
        onFinish={handleTemplateAdd}
        className="flex items-end gap-3"
      >
        <Form.Item
          name="template_name"
          label="Выберите шаблон"
          className="mb-0 flex-1"
          rules={[{ required: true, message: 'Выберите шаблон' }]}
        >
          <AutoComplete
            placeholder="Начните вводить название шаблона..."
            options={templateOptions}
            onSearch={loadTemplates}
            onSelect={(value: string) => setSelectedTemplateName(value)}
            loading={loadingTemplates}
            allowClear
            size="middle"
            notFoundContent={loadingTemplates ? 'Загрузка...' : 'Введите минимум 2 символа для поиска'}
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          icon={<CheckOutlined />}
          loading={loading}
          disabled={!selectedTemplateName}
        >
          Вставить
        </Button>

        <Button
          onClick={() => {
            setTemplateAddMode(false);
            templateAddForm.resetFields();
            setSelectedTemplateName('');
            setTemplateOptions([]);
          }}
          icon={<CloseOutlined />}
        >
          Отмена
        </Button>
      </Form>
    </div>
  );
};