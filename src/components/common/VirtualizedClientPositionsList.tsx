import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { Skeleton, Card, Space, Typography, Button, Input, Empty, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useClientPositionsInfinite, usePrefetchClientPositions } from '../../hooks/useClientPositions';
import type { ClientPositionFilters, ClientPositionSummary } from '../../lib/supabase/types';
import { formatCurrency } from '../../utils/formatters';

const { Text } = Typography;
const { Search } = Input;

interface VirtualizedClientPositionsListProps {
  tenderId: string;
  itemHeight?: number;
  height?: number | string;
  filters?: ClientPositionFilters;
  onItemClick?: (position: ClientPositionSummary) => void;
  onItemEdit?: (position: ClientPositionSummary) => void;
  onItemDelete?: (position: ClientPositionSummary) => void;
  showSearch?: boolean;
  showActions?: boolean;
  className?: string;
}

interface ItemData {
  items: ClientPositionSummary[];
  hasNextPage: boolean;
  isNextPageLoading: boolean;
  loadNextPage: () => void;
  onItemClick?: (position: ClientPositionSummary) => void;
  onItemEdit?: (position: ClientPositionSummary) => void;
  onItemDelete?: (position: ClientPositionSummary) => void;
  showActions?: boolean;
}

// Memoized row component for performance
const Row = React.memo<{ index: number; style: React.CSSProperties; data: ItemData }>(
  ({ index, style, data }) => {
    const { items, hasNextPage, isNextPageLoading, loadNextPage, onItemClick, onItemEdit, onItemDelete, showActions } = data;

    // If we're at the end and there are more items to load
    if (index >= items.length) {
      if (hasNextPage) {
        // Load more items
        loadNextPage();
        return (
          <div style={style}>
            <Card className="m-2" loading>
              <Skeleton active title paragraph={{ rows: 2 }} />
            </Card>
          </div>
        );
      } else {
        // No more items
        return <div style={style} />;
      }
    }

    const position = items[index];

    return (
      <div style={style}>
        <Card
          className="m-2 cursor-pointer hover:shadow-md transition-shadow"
          size="small"
          onClick={() => onItemClick?.(position)}
          title={
            <Space>
              <Text strong>
                {position.item_no ? `${position.item_no}.` : ''} {position.work_name}
              </Text>
              {position.is_additional && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                  ДОП
                </span>
              )}
            </Space>
          }
          extra={
            showActions && (
              <Space>
                <Button size="small" type="link" onClick={(e) => {
                  e.stopPropagation();
                  onItemEdit?.(position);
                }}>
                  Изменить
                </Button>
                <Button size="small" type="link" danger onClick={(e) => {
                  e.stopPropagation();
                  onItemDelete?.(position);
                }}>
                  Удалить
                </Button>
              </Space>
            )
          }
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Text type="secondary">Позиция:</Text> {position.position_number}
            </div>
            <div>
              <Text type="secondary">Единица:</Text> {position.unit}
            </div>
            <div>
              <Text type="secondary">Объем:</Text> {position.volume || position.manual_volume || '—'}
            </div>
            <div>
              <Text type="secondary">Материалы:</Text>{' '}
              <Text strong>{formatCurrency(position.total_materials_cost || 0)}</Text>
            </div>
            <div>
              <Text type="secondary">Работы:</Text>{' '}
              <Text strong>{formatCurrency(position.total_works_cost || 0)}</Text>
            </div>
            <div>
              <Text type="secondary">Итого:</Text>{' '}
              <Text strong className="text-blue-600">
                {formatCurrency((position.total_materials_cost || 0) + (position.total_works_cost || 0))}
              </Text>
            </div>
          </div>
          {position.client_note && (
            <div className="mt-2 p-2 bg-gray-50 rounded">
              <Text italic className="text-xs">{position.client_note}</Text>
            </div>
          )}
          {position.manual_note && (
            <div className="mt-2 p-2 bg-blue-50 rounded">
              <Text italic className="text-xs text-blue-600">{position.manual_note}</Text>
            </div>
          )}
        </Card>
      </div>
    );
  }
);

Row.displayName = 'VirtualizedPositionRow';

const VirtualizedClientPositionsList: React.FC<VirtualizedClientPositionsListProps> = ({
  tenderId,
  itemHeight = 180,
  height = '70vh',
  filters: initialFilters = {},
  onItemClick,
  onItemEdit,
  onItemDelete,
  showSearch = true,
  showActions = false,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [filters, setFilters] = useState<ClientPositionFilters>(initialFilters);
  const { prefetchOptimizedPositions } = usePrefetchClientPositions();

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchQuery }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Prefetch next page for better UX
  useEffect(() => {
    if (tenderId) {
      prefetchOptimizedPositions(tenderId, filters, { page: 2, limit: 50 });
    }
  }, [tenderId, filters, prefetchOptimizedPositions]);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useClientPositionsInfinite(tenderId, filters);

  // Flatten all pages of data
  const items = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  const loadNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Check if we have the item loaded
  const isItemLoaded = useCallback((index: number) => {
    return !!items[index];
  }, [items]);

  // Calculate total item count (including potential unloaded items)
  const itemCount = hasNextPage ? items.length + 1 : items.length;

  const itemData: ItemData = useMemo(() => ({
    items,
    hasNextPage: !!hasNextPage,
    isNextPageLoading: isFetchingNextPage,
    loadNextPage,
    onItemClick,
    onItemEdit,
    onItemDelete,
    showActions,
  }), [
    items,
    hasNextPage,
    isFetchingNextPage,
    loadNextPage,
    onItemClick,
    onItemEdit,
    onItemDelete,
    showActions
  ]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isError) {
    return (
      <div className={`p-4 ${className}`}>
        <Card>
          <div className="text-center py-8">
            <Text type="danger">Ошибка загрузки позиций: {error?.message}</Text>
            <br />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              className="mt-4"
            >
              Повторить
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <Card>
          <div className="text-center py-8">
            <Spin size="large" />
            <br />
            <Text className="mt-4">Загрузка позиций...</Text>
          </div>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <Card>
          {showSearch && (
            <div className="mb-4">
              <Search
                placeholder="Поиск по наименованию, номеру позиции или примечанию"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={(value) => setSearchQuery(value)}
                allowClear
                style={{ width: 400 }}
              />
            </div>
          )}
          <Empty description="Позиции не найдены" />
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {showSearch && (
        <Card className="mb-4">
          <Space className="w-full justify-between">
            <Search
              placeholder="Поиск по наименованию, номеру позиции или примечанию"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={(value) => setSearchQuery(value)}
              allowClear
              style={{ width: 400 }}
            />
            <div>
              <Text strong>Загружено: {items.length} позиций</Text>
              {isFetchingNextPage && <Spin size="small" className="ml-2" />}
            </div>
          </Space>
        </Card>
      )}

      <Card bodyStyle={{ padding: 0 }}>
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={loadNextPage}
          threshold={5} // Start loading 5 items before the end
        >
          {({ onItemsRendered, ref }) => (
            <List
              ref={ref}
              height={typeof height === 'string' ? `calc(${height})` : height}
              itemCount={itemCount}
              itemSize={itemHeight}
              itemData={itemData}
              onItemsRendered={onItemsRendered}
              overscanCount={3} // Render 3 extra items outside of visible area for smoother scrolling
            >
              {Row}
            </List>
          )}
        </InfiniteLoader>
      </Card>
    </div>
  );
};

export default VirtualizedClientPositionsList;