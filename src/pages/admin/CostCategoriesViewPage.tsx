import React from 'react';
import { CostCategoriesView } from '../../components/admin/CostCategoriesView';

const CostCategoriesViewPage: React.FC = () => {
  console.log('🚀 [CostCategoriesViewPage] rendered');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <CostCategoriesView />
    </div>
  );
};

export default CostCategoriesViewPage;