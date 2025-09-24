import { useState, useEffect } from 'react';
import { getActiveTenderMarkup } from '../../../../lib/supabase/api/tender-markup';

interface UseTenderMarkupProps {
  tenderId: string;
}

/**
 * Хук для загрузки и управления tender markup
 */
export const useTenderMarkup = ({ tenderId }: UseTenderMarkupProps) => {
  const [tenderMarkup, setTenderMarkup] = useState<any>(null);
  const [loadingMarkup, setLoadingMarkup] = useState(false);

  useEffect(() => {
    const loadMarkup = async () => {
      try {
        setLoadingMarkup(true);
        const markup = await getActiveTenderMarkup(tenderId);
        console.log('📊 Raw markup response:', markup);

        // Handle both array and object responses
        const markupData = Array.isArray(markup) ? markup[0] : markup;

        if (markupData) {
          setTenderMarkup(markupData);
          console.log('📊 Loaded tender markup:', markupData);
        }
      } catch (error) {
        console.error('❌ Failed to load tender markup:', error);
      } finally {
        setLoadingMarkup(false);
      }
    };

    loadMarkup();
  }, [tenderId]);

  return {
    tenderMarkup,
    loadingMarkup
  };
};