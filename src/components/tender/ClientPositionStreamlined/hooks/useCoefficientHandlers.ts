import { useCallback } from 'react';
import type { FormInstance } from 'antd/es/form';

interface UseCoefficientHandlersProps {
  works: any[];
  editForm: FormInstance;
}

export const useCoefficientHandlers = ({
  works,
  editForm
}: UseCoefficientHandlersProps) => {

  // Handle work selection change in edit form
  const handleWorkSelectionChange = useCallback((workId: string) => {
    if (!workId) return;

    const work = works.find(w => w.id === workId);
    if (work && work.quantity) {
      const consumptionCoef = editForm.getFieldValue('consumption_coefficient') || 1;
      const conversionCoef = editForm.getFieldValue('conversion_coefficient') || 1;
      const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;

      editForm.setFieldsValue({ quantity: calculatedQuantity });
      console.log('📊 Updated quantity based on work selection:', calculatedQuantity);
    }
  }, [works, editForm]);

  // Handle coefficient change in edit form
  const handleCoefficientChange = useCallback(() => {
    const workId = editForm.getFieldValue('work_id');
    if (!workId) return;

    const work = works.find(w => w.id === workId);
    if (work && work.quantity) {
      const consumptionCoef = editForm.getFieldValue('consumption_coefficient') || 1;
      const conversionCoef = editForm.getFieldValue('conversion_coefficient') || 1;
      const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;

      editForm.setFieldsValue({ quantity: calculatedQuantity });
      console.log('📊 Updated quantity based on coefficient change:', calculatedQuantity);
    }
  }, [works, editForm]);

  return {
    handleWorkSelectionChange,
    handleCoefficientChange
  };
};