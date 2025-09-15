import React, { useState } from 'react';
import { Card, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import TemplateList from '../components/template/TemplateList';
import AddTemplateToBOQModal from '../components/template/AddTemplateToBOQModal';
import InlineTemplateForm from '../components/template/InlineTemplateForm';

const WorkMaterialsPage: React.FC = () => {
  console.log('🚀 WorkMaterialsPage загружена (с inline формами)');

  const [showCreateTemplateForm, setShowCreateTemplateForm] = useState(false);
  const [showAddToBOQModal, setShowAddToBOQModal] = useState(false);
  const [selectedTemplateForBOQ, setSelectedTemplateForBOQ] = useState<string>('');

  const handleAddToTemplate = (templateName: string) => {
    console.log('🚀 Adding template to BOQ:', templateName);
    setSelectedTemplateForBOQ(templateName);
    setShowAddToBOQModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Card className="mb-6">
        <h1 className="text-2xl font-bold mb-6">Управление работами и материалами</h1>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Шаблоны работ и материалов</h3>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                console.log('🚀 Create template button clicked');
                setShowCreateTemplateForm(!showCreateTemplateForm);
              }}
            >
              {showCreateTemplateForm ? 'Скрыть форму' : 'Создать шаблон'}
            </Button>
          </div>

          <div className="text-gray-600">
            Создавайте и управляйте шаблонами связей работ с материалами для быстрого добавления в BOQ
          </div>

        </div>
      </Card>

      {/* Inline форма создания шаблона */}
      {showCreateTemplateForm && (
        <InlineTemplateForm
          onCancel={() => setShowCreateTemplateForm(false)}
        />
      )}

      {/* Список шаблонов */}
      <TemplateList onAddToTemplate={handleAddToTemplate} />

      {/* Модальное окно добавления шаблона в BOQ */}
      <AddTemplateToBOQModal
        open={showAddToBOQModal}
        onClose={() => {
          setShowAddToBOQModal(false);
          setSelectedTemplateForBOQ('');
        }}
        templateName={selectedTemplateForBOQ}
      />
    </div>
  );
};

export default WorkMaterialsPage;