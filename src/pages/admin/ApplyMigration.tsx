import React, { useState } from 'react';
import { Button, Card, message, Space, Typography, Alert, Spin, Divider } from 'antd';
import { CheckCircleOutlined, WarningOutlined, DatabaseOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase/client';
import { testMigration } from '../../lib/supabase/api/test-migration';

const { Title, Text, Paragraph } = Typography;

const migrationSQL = `
-- Add cost_node_id field to boq_items table
ALTER TABLE public.boq_items 
ADD COLUMN IF NOT EXISTS cost_node_id UUID REFERENCES public.cost_nodes(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_boq_items_cost_node_id 
ON public.boq_items(cost_node_id);

-- Add comment
COMMENT ON COLUMN public.boq_items.cost_node_id IS 'Reference to cost category from cost_nodes hierarchy';
`;

const functionsSQL = `
-- Function to get cost categories
CREATE OR REPLACE FUNCTION get_cost_categories()
RETURNS TABLE (
    id UUID,
    name TEXT,
    code TEXT,
    description TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.name,
        cc.code,
        cc.description
    FROM public.cost_categories cc
    ORDER BY cc.name;
END;
$$;

-- Function to get details by category
CREATE OR REPLACE FUNCTION get_details_by_category(p_category_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    unit TEXT,
    unit_cost NUMERIC,
    location_id UUID,
    location_name TEXT,
    has_single_location BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH detail_locations AS (
        SELECT 
            dcc.id,
            dcc.name,
            dcc.unit,
            dcc.unit_cost,
            dcc.location_id,
            l.city || COALESCE(', ' || l.region, '') as location_name,
            COUNT(*) OVER (PARTITION BY dcc.name) as location_count
        FROM public.detail_cost_categories dcc
        LEFT JOIN public.location l ON l.id = dcc.location_id
        WHERE dcc.cost_category_id = p_category_id
    )
    SELECT 
        dl.id,
        dl.name,
        dl.unit,
        dl.unit_cost,
        dl.location_id,
        dl.location_name,
        (dl.location_count = 1) as has_single_location
    FROM detail_locations dl
    ORDER BY dl.name, dl.location_name;
END;
$$;

-- Function to find cost_node by combination
CREATE OR REPLACE FUNCTION find_cost_node_by_combination(
    p_category_id UUID,
    p_detail_id UUID,
    p_location_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_cost_node_id UUID;
    v_category_name TEXT;
    v_detail_name TEXT;
BEGIN
    -- Get category name
    SELECT name INTO v_category_name 
    FROM public.cost_categories 
    WHERE id = p_category_id;
    
    -- Get detail name
    SELECT name INTO v_detail_name
    FROM public.detail_cost_categories
    WHERE id = p_detail_id;
    
    -- Find corresponding cost_node
    -- This logic depends on how cost_nodes are structured
    -- For now, we'll try to match by name and location
    SELECT cn.id INTO v_cost_node_id
    FROM public.cost_nodes cn
    WHERE cn.location_id = p_location_id
      AND cn.name ILIKE '%' || v_detail_name || '%'
      AND cn.kind IN ('detail', 'category')
    LIMIT 1;
    
    -- If not found, try to find by parent-child relationship
    IF v_cost_node_id IS NULL THEN
        SELECT cn.id INTO v_cost_node_id
        FROM public.cost_nodes cn
        WHERE cn.location_id = p_location_id
          AND EXISTS (
              SELECT 1 FROM public.cost_nodes parent
              WHERE parent.id = cn.parent_id
                AND parent.name ILIKE '%' || v_category_name || '%'
          )
        LIMIT 1;
    END IF;
    
    RETURN v_cost_node_id;
END;
$$;

-- Function to get cost node display name
CREATE OR REPLACE FUNCTION get_cost_node_display(p_cost_node_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_display TEXT;
    v_node RECORD;
BEGIN
    -- Get node details with location
    SELECT 
        cn.name,
        cn.code,
        l.city,
        l.region,
        parent.name as parent_name
    INTO v_node
    FROM public.cost_nodes cn
    LEFT JOIN public.location l ON l.id = cn.location_id
    LEFT JOIN public.cost_nodes parent ON parent.id = cn.parent_id
    WHERE cn.id = p_cost_node_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Build display string
    v_display := '';
    
    IF v_node.parent_name IS NOT NULL THEN
        v_display := v_node.parent_name || ' → ';
    END IF;
    
    v_display := v_display || v_node.name;
    
    IF v_node.city IS NOT NULL THEN
        v_display := v_display || ' → ' || v_node.city;
        IF v_node.region IS NOT NULL THEN
            v_display := v_display || ', ' || v_node.region;
        END IF;
    END IF;
    
    RETURN v_display;
END;
$$;
`;

const ApplyMigration: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'applying' | 'success' | 'error'>('idle');
  const [migrationApplied, setMigrationApplied] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkMigrationStatus = async () => {
    console.log('🚀 Checking migration status...');
    setLoading(true);
    setStatus('testing');
    
    try {
      const result = await testMigration();
      setMigrationApplied(result);
      setStatus(result ? 'success' : 'idle');
      
      if (result) {
        message.success('Миграция уже применена!');
      } else {
        message.info('Миграция не применена. Нажмите "Применить миграцию" для установки.');
      }
    } catch (err: any) {
      console.error('❌ Error checking migration:', err);
      setErrorMessage(err.message || 'Ошибка проверки миграции');
      setStatus('error');
      message.error('Ошибка проверки статуса миграции');
    } finally {
      setLoading(false);
    }
  };

  const applyMigration = async () => {
    console.log('🚀 Applying migration...');
    setLoading(true);
    setStatus('applying');
    setErrorMessage('');
    
    try {
      // Note: Direct SQL execution is not available in Supabase client
      // You need to run this SQL in Supabase Dashboard SQL Editor
      
      message.warning('Для применения миграции скопируйте SQL код ниже и выполните его в Supabase Dashboard → SQL Editor');
      setStatus('idle');
      
    } catch (err: any) {
      console.error('❌ Error applying migration:', err);
      setErrorMessage(err.message || 'Ошибка применения миграции');
      setStatus('error');
      message.error('Ошибка применения миграции');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Title level={2}>
        <DatabaseOutlined className="mr-2" />
        Управление миграцией БД для категорий затрат
      </Title>
      
      <Card className="mb-4">
        <Space direction="vertical" className="w-full" size="large">
          <div>
            <Title level={4}>Статус миграции</Title>
            {loading && status === 'testing' && (
              <Space>
                <Spin />
                <Text>Проверка статуса миграции...</Text>
              </Space>
            )}
            
            {!loading && migrationApplied === true && (
              <Alert
                message="Миграция применена"
                description="Все необходимые изменения в базе данных уже выполнены."
                type="success"
                icon={<CheckCircleOutlined />}
                showIcon
              />
            )}
            
            {!loading && migrationApplied === false && (
              <Alert
                message="Миграция не применена"
                description="Необходимо применить миграцию для работы с категориями затрат."
                type="warning"
                icon={<WarningOutlined />}
                showIcon
              />
            )}
            
            {errorMessage && (
              <Alert
                message="Ошибка"
                description={errorMessage}
                type="error"
                showIcon
                className="mt-2"
              />
            )}
          </div>
          
          <Space>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={checkMigrationStatus}
              loading={loading && status === 'testing'}
            >
              Проверить статус
            </Button>
            
            {migrationApplied === false && (
              <Button
                type="default"
                icon={<PlayCircleOutlined />}
                onClick={applyMigration}
                loading={loading && status === 'applying'}
                danger
              >
                Применить миграцию
              </Button>
            )}
          </Space>
        </Space>
      </Card>
      
      <Card title="SQL код миграции" className="mb-4">
        <Alert
          message="Инструкция по применению"
          description={
            <ol className="mt-2">
              <li>Откройте Supabase Dashboard</li>
              <li>Перейдите в SQL Editor</li>
              <li>Скопируйте SQL код ниже</li>
              <li>Вставьте и выполните его</li>
              <li>Вернитесь сюда и проверьте статус</li>
            </ol>
          }
          type="info"
          className="mb-4"
        />
        
        <Divider>Изменения в таблице</Divider>
        <Paragraph>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            <code>{migrationSQL}</code>
          </pre>
        </Paragraph>
        
        <Divider>SQL функции</Divider>
        <Paragraph>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            <code>{functionsSQL}</code>
          </pre>
        </Paragraph>
      </Card>
      
      <Card title="Что делает эта миграция">
        <ul>
          <li>Добавляет поле <code>cost_node_id</code> в таблицу <code>boq_items</code></li>
          <li>Создает индекс для оптимизации запросов</li>
          <li>Добавляет функции для каскадного выбора категорий затрат</li>
          <li>Позволяет связывать элементы BOQ с категориями затрат</li>
        </ul>
      </Card>
    </div>
  );
};

export default ApplyMigration;