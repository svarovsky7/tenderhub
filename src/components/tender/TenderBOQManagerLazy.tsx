import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Button,
  Empty,
  Spin,
  message,
  Modal,
  Form,
  Input,
  Space,
  Typography,
  Card,
  AutoComplete
} from 'antd';
import { PlusOutlined, ReloadOutlined, FolderOpenOutlined, FileExcelOutlined } from '@ant-design/icons';
import { clientPositionsApi, tendersApi } from '../../lib/supabase/api';
import { supabase } from '../../lib/supabase/client';
import ClientPositionListItem from './ClientPositionListItem';
import AdditionalWorkInlineForm from './ClientPositionStreamlined/components/AdditionalWorkInlineForm';
import type { ClientPositionInsert, ClientPositionType } from '../../lib/supabase/types';
import { exportBOQToExcel } from '../../utils/excel-templates';
import { usePositionClipboard } from '../../hooks/usePositionClipboard';

const { Title, Text } = Typography;

interface TenderBOQManagerLazyProps {
  tenderId: string;
  onStatsUpdate?: (stats: { works: number; materials: number; total: number; positions: number }) => void;
}

interface ClientPositionWithStats {
  id: string;
  tender_id: string;
  position_number: number;
  item_no: string;
  work_name: string;
  total_materials_cost: number;
  total_works_cost: number;
  created_at: string;
  updated_at: string;
  position_type?: ClientPositionType;
  hierarchy_level?: number;
  boq_items?: any[];
  materials_count?: number;
  works_count?: number;
  total_position_cost?: number;
  // Additional fields
  additional_works?: any[];
  is_additional?: boolean;
  parent_position_id?: string | null;
  is_orphaned?: boolean;
  manual_volume?: number | null;
  manual_note?: string | null;
}

const TenderBOQManagerLazy: React.FC<TenderBOQManagerLazyProps> = ({
  tenderId,
  onStatsUpdate
}) => {
  // State for positions (without BOQ items)
  const [positions, setPositions] = useState<ClientPositionWithStats[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // Additional work form state
  const [showingAdditionalFormFor, setShowingAdditionalFormFor] = useState<string | null>(null);

  // Modal and forms
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Tender data for currency rates and export
  const [tender, setTender] = useState<{
    title?: string;
    version?: number;
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null>(null);

  // Search state for position autocomplete
  const [searchValue, setSearchValue] = useState<string>('');
  const positionCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Progressive loading state
  const [displayCount, setDisplayCount] = useState<number>(100); // Show 100 positions initially
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasRestoredRef = useRef<boolean>(false); // Track if we've restored from storage

  // Sort positions by position number only (preserving Excel file order)
  const sortPositionsByNumber = useCallback((positions: ClientPositionWithStats[]): ClientPositionWithStats[] => {
    return [...positions].sort((a, b) => a.position_number - b.position_number);
  }, []);

  // Load tender data for currency rates
  useEffect(() => {
    const loadTenderData = async () => {
      if (!tenderId) return;

      try {
        const { data: directData, error: directError } = await supabase
          .from('tenders')
          .select('id, title, version, usd_rate, eur_rate, cny_rate')
          .eq('id', tenderId)
          .single();

        if (directData && !directError) {
          const actualData = Array.isArray(directData) ? directData[0] : directData;
          setTender({
            title: actualData.title,
            version: actualData.version || 1,
            usd_rate: actualData.usd_rate,
            eur_rate: actualData.eur_rate,
            cny_rate: actualData.cny_rate
          });
        }
      } catch (error) {
        console.error('❌ Error loading tender:', error);
      }
    };

    loadTenderData();
  }, [tenderId]);


  // Load ONLY positions without BOQ items
  const loadPositions = useCallback(async () => {
    console.log('📡 [TenderBOQManagerLazy] Loading positions (without BOQ items) for tender:', tenderId);

    setLoading(true);

    try {
      // Load positions with additional works structure
      const result = await clientPositionsApi.getPositionsWithAdditional(tenderId);

      let positionsData = [];

      if (result.error) {
        // Fallback to basic loading
        const fallbackResult = await clientPositionsApi.getByTenderId(tenderId, {}, { limit: 1000 });
        if (fallbackResult.error) {
          throw new Error(fallbackResult.error);
        }
        positionsData = fallbackResult.data || [];
      } else if (result.data) {
        if (result.data.positions) {
          positionsData = result.data.positions;
          // Handle orphaned additional works
          const orphanedAdditional = result.data.orphanedAdditional || [];
          orphanedAdditional.forEach(orphaned => {
            orphaned.is_orphaned = true;
            orphaned.is_additional = true;
            positionsData.push(orphaned);
          });
        } else {
          positionsData = result.data;
        }
      }

      console.log(`✅ Loaded ${positionsData.length} positions (headers only)`);

      // Get statistics for all positions
      const allPositionIds = [];
      positionsData.forEach(position => {
        allPositionIds.push(position.id);
        // Include additional works IDs
        if (position.additional_works && Array.isArray(position.additional_works)) {
          position.additional_works.forEach(add => {
            allPositionIds.push(add.id);
          });
        }
      });

      // Load statistics (works and materials counts) for display in cards
      const statsResult = await clientPositionsApi.getPositionStatistics(allPositionIds);
      const statistics = statsResult.data || {};

      // Apply statistics to positions for display
      positionsData.forEach(position => {
        // Calculate position cost for display
        const materialsCost = parseFloat(position.total_materials_cost) || 0;
        const worksCost = parseFloat(position.total_works_cost) || 0;
        position.total_position_cost = materialsCost + worksCost;

        // Apply statistics from database
        const posStats = statistics[position.id] || { works_count: 0, materials_count: 0 };
        position.works_count = posStats.works_count;
        position.materials_count = posStats.materials_count;

        // Process additional works
        if (position.additional_works && Array.isArray(position.additional_works)) {
          position.additional_works.forEach(add => {
            const addMaterialsCost = parseFloat(add.total_materials_cost) || 0;
            const addWorksCost = parseFloat(add.total_works_cost) || 0;
            add.total_position_cost = addMaterialsCost + addWorksCost;

            const addStats = statistics[add.id] || { works_count: 0, materials_count: 0 };
            add.works_count = addStats.works_count;
            add.materials_count = addStats.materials_count;
          });
        }
      });

      // Set positions with statistics
      setPositions(positionsData);

      // Cache positions in sessionStorage with timestamp (5 minute TTL)
      try {
        const cacheData = {
          positions: positionsData,
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000 // 5 minutes
        };
        sessionStorage.setItem(`boq-positions-${tenderId}`, JSON.stringify(cacheData));
        console.log('💾 Cached positions in sessionStorage');
      } catch (error) {
        console.warn('⚠️ Failed to cache positions:', error);
      }

      // Get aggregated totals from database (FAST!)
      console.log('📊 Fetching aggregated totals from database...');
      const totalsResult = await clientPositionsApi.getTenderTotals(tenderId);

      if (totalsResult.error) {
        console.warn('⚠️ Database aggregation not available, using JavaScript fallback:', totalsResult.error);

        // Fallback: Calculate totals in JavaScript (slower but works)
        let totalCost = 0;
        let totalWorks = 0;
        let totalMaterials = 0;

        positionsData.forEach(position => {
          totalCost += position.total_position_cost || 0;
          totalWorks += position.works_count || 0;
          totalMaterials += position.materials_count || 0;

          // Include additional works
          if (position.additional_works && Array.isArray(position.additional_works)) {
            position.additional_works.forEach(add => {
              totalCost += add.total_position_cost || 0;
              totalWorks += add.works_count || 0;
              totalMaterials += add.materials_count || 0;
            });
          }
        });

        console.log('📊 Fallback totals calculated:', { totalCost, totalWorks, totalMaterials });

        onStatsUpdate?.({
          positions: positionsData.length,
          works: totalWorks,
          materials: totalMaterials,
          total: totalCost
        });
      } else {
        const totals = totalsResult.data!;
        console.log('✅ Aggregated totals from database:', totals);

        // Update stats with aggregated data from database
        onStatsUpdate?.({
          positions: totals.positions_count,
          works: totals.total_works_count,
          materials: totals.total_materials_count,
          total: totals.total_cost
        });
      }

    } catch (error) {
      console.error('❌ Error loading positions:', error);
      message.error('Ошибка загрузки позиций');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [tenderId, onStatsUpdate]);

  // Update single position (optimized for clipboard operations)
  const updateSinglePosition = useCallback(async (positionId: string) => {
    console.log('🔄 [TenderBOQManagerLazy] Updating single position:', positionId);

    try {
      // 1. Load updated position data from database
      const { data: updatedPosition, error } = await supabase
        .from('client_positions')
        .select('*')
        .eq('id', positionId)
        .single();

      if (error || !updatedPosition) {
        console.error('❌ Failed to load updated position:', error);
        return;
      }

      // 2. Load statistics for this position only
      const statsResult = await clientPositionsApi.getPositionStatistics([positionId]);
      const stats = statsResult.data?.[positionId] || { works_count: 0, materials_count: 0 };

      // 3. Calculate position cost
      const materialsCost = parseFloat(updatedPosition.total_materials_cost) || 0;
      const worksCost = parseFloat(updatedPosition.total_works_cost) || 0;
      updatedPosition.total_position_cost = materialsCost + worksCost;
      updatedPosition.works_count = stats.works_count;
      updatedPosition.materials_count = stats.materials_count;

      // 4. Update position in state
      setPositions(prev => {
        const updated = prev.map(p =>
          p.id === positionId ? { ...p, ...updatedPosition } : p
        );

        // Update cache as well
        try {
          const cacheData = {
            positions: updated,
            timestamp: Date.now(),
            ttl: 5 * 60 * 1000 // 5 minutes
          };
          sessionStorage.setItem(`boq-positions-${tenderId}`, JSON.stringify(cacheData));
        } catch (error) {
          console.warn('⚠️ Failed to update cache:', error);
        }

        return updated;
      });

      console.log('✅ Position updated successfully:', positionId);
    } catch (error) {
      console.error('💥 Exception updating single position:', error);
    }
  }, [tenderId]);

  // Position clipboard hook for copy/paste functionality
  const {
    hasCopiedData,
    copiedItemsCount,
    copiedLinksCount,
    copiedFromPositionId,
    isPositionLoading,
    handleCopy,
    handlePaste,
    clearClipboard
  } = usePositionClipboard({
    tenderId,
    onUpdate: updateSinglePosition // Optimized: update only target position
  });

  // Export to Excel handler
  const handleExportToExcel = async () => {
    setExportLoading(true);
    try {
      // Show loading message - function will load all data internally
      const loadingMessage = message.loading('Экспорт данных в Excel...', 0);

      // Format tender name with version
      const tenderFullName = tender?.title
        ? `${tender.title} (Версия ${tender.version || 1})`
        : 'BOQ';

      // Pass null for boqItemsMap - function will load all data via batch APIs
      await exportBOQToExcel(positions, null, tenderFullName, tenderId);

      loadingMessage();
      message.success('Данные успешно экспортированы в Excel');
    } catch (error) {
      console.error('❌ Export error:', error);
      message.error('Ошибка при экспорте данных');
    } finally {
      setExportLoading(false);
    }
  };

  // Get regular positions (for search and display)
  const regularPositions = useMemo(() => {
    const filtered = positions.filter(p => !p.is_additional && !p.is_orphaned);
    return sortPositionsByNumber(filtered);
  }, [positions, sortPositionsByNumber]);

  // Handle position search and scroll
  const handlePositionSearch = useCallback((value: string, option: any) => {
    const positionId = option.key;

    // Find the index of the selected position in regularPositions
    const positionIndex = regularPositions.findIndex(p => p.id === positionId);

    if (positionIndex === -1) {
      return;
    }

    // If position is beyond displayCount, load enough positions to include it
    if (positionIndex >= displayCount) {
      const newDisplayCount = Math.min(
        Math.ceil((positionIndex + 1) / 100) * 100, // Round up to nearest 100
        regularPositions.length
      );
      setDisplayCount(newDisplayCount);
    }

    // Wait for render, then scroll
    setTimeout(() => {
      const cardElement = positionCardRefs.current.get(positionId);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight the card briefly
        cardElement.style.transition = 'all 0.3s ease';
        cardElement.style.boxShadow = '0 0 20px rgba(24, 144, 255, 0.6)';
        cardElement.style.transform = 'scale(1.02)';

        setTimeout(() => {
          cardElement.style.boxShadow = '';
          cardElement.style.transform = '';
        }, 1500);
      }
    }, 100); // Small delay to allow render

    // Clear the search value after selection
    setSearchValue('');
  }, [regularPositions, displayCount]);

  // Get autocomplete options from positions
  const getPositionOptions = useCallback(() => {
    if (!searchValue) return [];

    const searchLower = searchValue.toLowerCase();
    // Filter only from regular positions (not ДОП and not orphaned)
    return regularPositions
      .filter(pos =>
        pos.work_name.toLowerCase().includes(searchLower) ||
        pos.item_no?.toLowerCase().includes(searchLower) ||
        pos.position_number?.toString().includes(searchLower)
      )
      .slice(0, 10) // Limit to 10 results
      .map(pos => ({
        key: pos.id,
        value: `${pos.item_no || pos.position_number} - ${pos.work_name}`,
        label: (
          <div>
            <div style={{ fontWeight: 500 }}>{pos.work_name}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              № п/п {pos.position_number} • {pos.item_no}
            </div>
          </div>
        )
      }));
  }, [searchValue, regularPositions]);

  // Handle create position
  const handleCreatePosition = async (values: any) => {
    try {
      const newPosition: ClientPositionInsert = {
        tender_id: tenderId,
        work_name: values.work_name,
        position_type: 'executable',
        hierarchy_level: 6,
        position_number: positions.length + 1,
        item_no: `${positions.length + 1}`
      };

      const result = await clientPositionsApi.create(newPosition);

      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Позиция создана');
      setCreateModalVisible(false);
      form.resetFields();
      loadPositions();
    } catch (error) {
      console.error('❌ Error creating position:', error);
      message.error('Ошибка создания позиции');
    }
  };

  // Storage keys for saving state and positions cache
  const storageKey = `boq-scroll-${tenderId}`;
  const positionsCacheKey = `boq-positions-${tenderId}`;

  // Progressive loading: Reset displayCount only when tender changes
  useEffect(() => {
    // Reset flag when tender changes
    hasRestoredRef.current = false;

    // Try to restore from sessionStorage
    const savedState = sessionStorage.getItem(storageKey);
    if (savedState) {
      const { displayCount: saved } = JSON.parse(savedState);
      setDisplayCount(saved || 100);
    } else {
      setDisplayCount(100); // Reset to 100 only when tender changes
    }

    // Mark as restored to allow saving
    setTimeout(() => {
      hasRestoredRef.current = true;
    }, 100); // Small delay to ensure restoration is complete
  }, [tenderId, storageKey]);

  // Save displayCount to sessionStorage when it changes (but not during initial restore)
  useEffect(() => {
    // Don't save until we've restored at least once
    if (!hasRestoredRef.current) return;

    const currentScroll = window.scrollY;
    sessionStorage.setItem(storageKey, JSON.stringify({
      displayCount,
      scrollY: currentScroll
    }));
  }, [displayCount, storageKey]);

  // Restore scroll position after positions load
  useEffect(() => {
    if (positions.length > 0 && !initialLoading) {
      const savedState = sessionStorage.getItem(storageKey);
      if (savedState) {
        const { scrollY } = JSON.parse(savedState);
        if (scrollY > 0) {
          // Wait for DOM to settle
          requestAnimationFrame(() => {
            setTimeout(() => {
              window.scrollTo({
                top: scrollY,
                behavior: 'auto'
              });
            }, 100);
          });
        }
      }
    }
  }, [positions.length, initialLoading, storageKey]);

  // Ref to track total positions count without triggering re-creation
  const totalPositionsRef = useRef(regularPositions.length);

  // Update ref when positions change
  useEffect(() => {
    totalPositionsRef.current = regularPositions.length;
  }, [regularPositions.length]);

  // Callback ref for load more element - optimized to avoid re-creation
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // Don't create observer if no element
    if (!node) {
      return;
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount(prev => {
            const total = totalPositionsRef.current; // Use ref instead of closure
            const newCount = Math.min(prev + 100, total);
            return newCount > prev ? newCount : prev;
          });
        }
      },
      {
        threshold: 0,
        rootMargin: '800px' // Load new batch 800px before reaching the load indicator
      }
    );

    observerRef.current.observe(node);
  }, []); // No dependencies - observer created once

  // Cleanup observer on unmount and clear sessionStorage
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      // Clear storage on unmount to start fresh next time if navigating away
      // But NOT if just unmounting temporarily
      const handleBeforeUnload = () => {
        sessionStorage.removeItem(storageKey);
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [storageKey]);

  // Initial load with cache check
  useEffect(() => {
    if (!tenderId) return;

    const loadWithCache = async () => {
      console.log('🔄 [TenderBOQManagerLazy] Mount - checking cache for tender:', tenderId);

      // Try to load from cache first
      try {
        const cachedData = sessionStorage.getItem(`boq-positions-${tenderId}`);
        if (cachedData) {
          const { positions: cachedPositions, timestamp, ttl } = JSON.parse(cachedData);
          const age = Date.now() - timestamp;

          // Use cache if fresh (< 5 minutes)
          if (age < ttl) {
            console.log(`✅ Using cached positions (age: ${Math.round(age / 1000)}s)`);
            setPositions(cachedPositions);
            setInitialLoading(false);

            // Update stats from cached data
            let totalCost = 0;
            let totalWorks = 0;
            let totalMaterials = 0;

            cachedPositions.forEach((position: any) => {
              totalCost += position.total_position_cost || 0;
              totalWorks += position.works_count || 0;
              totalMaterials += position.materials_count || 0;

              // Include additional works
              if (position.additional_works && Array.isArray(position.additional_works)) {
                position.additional_works.forEach((add: any) => {
                  totalCost += add.total_position_cost || 0;
                  totalWorks += add.works_count || 0;
                  totalMaterials += add.materials_count || 0;
                });
              }
            });

            onStatsUpdate?.({
              positions: cachedPositions.length,
              works: totalWorks,
              materials: totalMaterials,
              total: totalCost
            });

            // Still refresh in background to ensure data is fresh
            setTimeout(() => {
              console.log('🔄 Background refresh of positions');
              loadPositions();
            }, 500);

            return;
          } else {
            console.log(`⏰ Cache expired (age: ${Math.round(age / 1000)}s)`);
          }
        } else {
          console.log('📭 No cache found');
        }
      } catch (error) {
        console.warn('⚠️ Cache read failed:', error);
      }

      // No valid cache - load from server
      loadPositions();
    };

    loadWithCache();
  }, [tenderId]); // Remove loadPositions from deps to avoid recreation

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="shadow-sm" style={{ padding: '8px 24px' }}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <Title level={4} className="mb-0" style={{ display: 'flex', alignItems: 'center' }}>
              <FolderOpenOutlined className="mr-2" />
              Позиции Заказчика
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              {positions.length} позиций
            </Text>
          </div>
          <Space>
            <AutoComplete
              value={searchValue}
              onChange={setSearchValue}
              onSelect={handlePositionSearch}
              options={getPositionOptions()}
              style={{ width: 500 }}
              placeholder="Поиск по наименованию позиции"
              allowClear
              popupMatchSelectWidth={false}
              dropdownStyle={{ maxWidth: 500, minWidth: 400 }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Создать позицию
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportToExcel}
              loading={exportLoading}
            >
              Экспорт в Excel
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadPositions}
              loading={loading}
            >
              Обновить список
            </Button>
          </Space>
        </div>
      </Card>

      {/* Loading state */}
      {initialLoading ? (
        <Card className="text-center py-12">
          <Spin size="large" />
          <div className="mt-4">
            <Text type="secondary">Загрузка позиций...</Text>
          </div>
        </Card>
      ) : positions.length === 0 ? (
        <Card>
          <Empty
            description="Нет позиций заказчика"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => setCreateModalVisible(true)}
              icon={<PlusOutlined />}
            >
              Создать первую позицию
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          {/* Regular positions list with progressive loading */}
          <div className="space-y-2">
            {regularPositions.slice(0, displayCount).map((position) => (
              <div key={position.id} ref={(el) => el && positionCardRefs.current.set(position.id, el)}>
                {/* Show additional work form if this position is selected */}
                {showingAdditionalFormFor === position.id && (
                  <div className="mb-2">
                    <AdditionalWorkInlineForm
                      parentPositionId={position.id}
                      parentPositionName={position.work_name || 'Позиция'}
                      tenderId={tenderId}
                      onSuccess={() => {
                        setShowingAdditionalFormFor(null);
                        loadPositions();
                      }}
                      onCancel={() => setShowingAdditionalFormFor(null)}
                    />
                  </div>
                )}

                <ClientPositionListItem
                  position={position}
                  tenderId={tenderId}
                  onUpdate={updateSinglePosition}
                  onCopyPosition={handleCopy}
                  onPastePosition={handlePaste}
                  hasCopiedData={hasCopiedData}
                  copiedItemsCount={copiedItemsCount}
                  copiedFromPositionId={copiedFromPositionId}
                  clipboardLoading={isPositionLoading(position.id)}
                  onShowAdditionalWorkForm={setShowingAdditionalFormFor}
                />

                {/* Render additional works inline (indented) */}
                {position.additional_works && position.additional_works.length > 0 && (
                  <div style={{ paddingLeft: '32px', position: 'relative' }} className="space-y-2">
                    {/* Visual indicator line */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '0',
                        bottom: '0',
                        width: '2px',
                        backgroundColor: '#faad14',
                        opacity: 0.5
                      }}
                    />

                    {position.additional_works.map((additionalWork: any) => (
                      <div
                        key={additionalWork.id}
                        style={{ position: 'relative' }}
                        ref={(el) => el && positionCardRefs.current.set(additionalWork.id, el)}
                      >
                        {/* Horizontal connector line */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-22px',
                            top: '50%',
                            width: '22px',
                            height: '2px',
                            backgroundColor: '#faad14',
                            opacity: 0.5
                          }}
                        />

                        <ClientPositionListItem
                          position={{
                            ...additionalWork,
                            is_additional: true
                          }}
                          tenderId={tenderId}
                          onUpdate={updateSinglePosition}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Load more indicator */}
            {displayCount < regularPositions.length && (
              <div
                ref={loadMoreRef}
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#8c8c8c'
                }}
              >
                <Spin size="small" />
                <div style={{ marginTop: '8px' }}>
                  Загрузка позиций {displayCount} / {regularPositions.length}...
                </div>
              </div>
            )}
          </div>

          {/* Orphaned Additional Works (outside virtualization) */}
          {positions.filter(p => p.is_orphaned).length > 0 && (
            <div className="space-y-2">
              <div style={{
                marginTop: '24px',
                marginBottom: '12px',
                padding: '8px 16px',
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '4px'
              }}>
                <Text strong style={{ color: '#fa8c16' }}>
                  Независимые ДОП работы (исходная позиция удалена)
                </Text>
              </div>

              {sortPositionsByNumber(positions.filter(p => p.is_orphaned)).map(orphanedWork => (
                <div key={orphanedWork.id} ref={(el) => el && positionCardRefs.current.set(orphanedWork.id, el)}>
                  <ClientPositionListItem
                    position={{
                      ...orphanedWork,
                      is_additional: true,
                      is_orphaned: true
                    }}
                    tenderId={tenderId}
                    onUpdate={updateSinglePosition}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Position Modal */}
      <Modal
        title="Создать позицию заказчика"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreatePosition}
          autoComplete="off"
        >
          <Form.Item
            name="work_name"
            label="Название позиции"
            rules={[{ required: true, message: 'Введите название позиции' }]}
          >
            <Input
              placeholder="Например: Монтаж электропроводки"
              size="large"
              autoFocus
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                Создать
              </Button>
              <Button
                onClick={() => {
                  setCreateModalVisible(false);
                  form.resetFields();
                }}
                size="large"
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default React.memo(TenderBOQManagerLazy);
