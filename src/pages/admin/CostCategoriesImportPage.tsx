import React from 'react';
import { CostCategoriesImport } from '../../components/admin/CostCategoriesImport';

const CostCategoriesImportPage: React.FC = () => {
  console.log('🚀 [CostCategoriesImportPage] rendered');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <CostCategoriesImport />
    </div>
  );
};

export default CostCategoriesImportPage;