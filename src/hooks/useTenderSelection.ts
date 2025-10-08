import { useState, useCallback, useMemo } from 'react';

interface Tender {
  id: string;
  title: string;
  client_name: string;
  version?: number;
  [key: string]: any;
}

export const useTenderSelection = (tenders: Tender[]) => {
  const [selectedTenderName, setSelectedTenderName] = useState<string | null>(null);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [previousTenderId, setPreviousTenderId] = useState<string | null>(null);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isFirstSelection, setIsFirstSelection] = useState(true);

  // Get unique tender names
  const uniqueTenderNames = useMemo(() => {
    const nameMap = new Map<string, string>();

    tenders.forEach(tender => {
      const key = `${tender.title}___${tender.client_name}`;
      if (!nameMap.has(key)) {
        nameMap.set(key, `${tender.title} - ${tender.client_name}`);
      }
    });

    return Array.from(nameMap.entries());
  }, [tenders]);

  // Get available versions for selected tender name
  const availableVersions = useMemo(() => {
    if (!selectedTenderName) return [];

    const [title, clientName] = selectedTenderName.split('___');
    return tenders
      .filter(t => t.title === title && t.client_name === clientName)
      .map(t => t.version || 1)
      .sort((a, b) => b - a);
  }, [selectedTenderName, tenders]);

  // Get selected tender object
  const selectedTender = useMemo(() => {
    return tenders.find(t => t.id === (selectedTenderId || previousTenderId)) || null;
  }, [selectedTenderId, previousTenderId, tenders]);

  // Handle tender name change (first step)
  const handleTenderNameChange = useCallback((value: string) => {
    console.log('🔄 Tender name selection changed:', value);
    setSelectedTenderName(value);

    // Store previous tender ID before clearing
    if (selectedTenderId) {
      setPreviousTenderId(selectedTenderId);
    }

    // Reset tender ID to force version selection
    setSelectedTenderId(null);

    // Don't hide content - keep it visible and static
  }, [selectedTenderId]);

  // Handle version selection (second step)
  const handleVersionChange = useCallback((version: number) => {
    console.log('🔄 Version selection changed:', version);
    if (!selectedTenderName) return;

    const [title, clientName] = selectedTenderName.split('___');
    const targetTender = tenders.find(t =>
      t.title === title &&
      t.client_name === clientName &&
      (t.version || 1) === version
    );

    if (targetTender) {
      setSelectedTenderId(targetTender.id);
      setPreviousTenderId(null);

      if (!isContentVisible) {
        setIsContentVisible(true);

        // Mark first selection as complete AFTER animation finishes
        setTimeout(() => {
          setIsFirstSelection(false);
        }, 650);
      } else {
        setIsFirstSelection(false);
      }
    }
  }, [selectedTenderName, tenders, isContentVisible]);

  // Handle quick tender selection
  const handleQuickTenderSelect = useCallback((tender: Tender) => {
    console.log('🚀 Quick tender selected:', tender.id, tender.title);

    const tenderNameKey = `${tender.title}___${tender.client_name}`;
    setSelectedTenderName(tenderNameKey);
    setSelectedTenderId(tender.id);
    setPreviousTenderId(null);

    setTimeout(() => {
      setIsContentVisible(true);

      setTimeout(() => {
        setIsFirstSelection(false);
      }, 650);
    }, 150);
  }, []);

  // Reset selection
  const handleResetSelection = useCallback(() => {
    setSelectedTenderId(null);
    setSelectedTenderName(null);
    setPreviousTenderId(null);
    setIsContentVisible(false);
    setIsFirstSelection(true);
  }, []);

  return {
    selectedTenderName,
    selectedTenderId,
    previousTenderId,
    selectedTender,
    isContentVisible,
    isFirstSelection,
    uniqueTenderNames,
    availableVersions,
    handleTenderNameChange,
    handleVersionChange,
    handleQuickTenderSelect,
    handleResetSelection,
  };
};
