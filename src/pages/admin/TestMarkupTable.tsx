import React, { useState } from 'react';
import { Card, Button, Typography, Space, message, Alert } from 'antd';
import { supabase } from '../../lib/supabase/client';

const { Title, Text, Paragraph } = Typography;

const TestMarkupTable: React.FC = () => {
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [tableExists, setTableExists] = useState(false);

  const createTable = async () => {
    setCreating(true);
    try {
      console.log('🚀 Creating tender_markup_percentages table...');
      
      // Создаем таблицу через raw SQL
      const { data, error } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.tender_markup_percentages (
            id uuid NOT NULL DEFAULT uuid_generate_v4(),
            tender_id uuid NOT NULL,
            profit_margin numeric(5,2) DEFAULT 15.00,
            materials_markup numeric(5,2) DEFAULT 10.00,
            works_markup numeric(5,2) DEFAULT 20.00,
            submaterials_markup numeric(5,2) DEFAULT 15.00,
            subworks_markup numeric(5,2) DEFAULT 18.00,
            overhead_percentage numeric(5,2) DEFAULT 5.00,
            contingency_percentage numeric(5,2) DEFAULT 3.00,
            risk_adjustment numeric(5,2) DEFAULT 2.00,
            tax_percentage numeric(5,2) DEFAULT 20.00,
            insurance_percentage numeric(5,2) DEFAULT 1.50,
            notes text,
            is_active boolean DEFAULT true,
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            updated_at timestamp with time zone NOT NULL DEFAULT now(),
            CONSTRAINT tender_markup_percentages_pkey PRIMARY KEY (id)
          );
        `
      });

      if (error) {
        console.error('❌ Error creating table:', error);
        message.error(`Ошибка создания таблицы: ${error.message}`);
        return;
      }

      message.success('✅ Таблица tender_markup_percentages создана!');
      console.log('✅ Table created successfully:', data);
      
      // Проверим, что таблица создалась
      await testTableExists();

    } catch (error: any) {
      console.error('❌ Error:', error);
      message.error(`Ошибка: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const addForeignKey = async () => {
    try {
      console.log('🚀 Adding foreign key constraint...');
      
      const { data, error } = await supabase.rpc('exec', {
        sql: `
          ALTER TABLE public.tender_markup_percentages 
          ADD CONSTRAINT IF NOT EXISTS tender_markup_percentages_tender_id_fkey 
          FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE CASCADE;
        `
      });

      if (error) {
        console.error('❌ Error adding foreign key:', error);
        message.error(`Ошибка добавления внешнего ключа: ${error.message}`);
        return;
      }

      message.success('✅ Внешний ключ добавлен!');
      console.log('✅ Foreign key added successfully:', data);

    } catch (error: any) {
      console.error('❌ Error:', error);
      message.error(`Ошибка: ${error.message}`);
    }
  };

  const testTableExists = async () => {
    setTesting(true);
    try {
      console.log('🚀 Testing table existence...');
      
      // Пробуем получить структуру таблицы
      const { data, error } = await supabase
        .from('tender_markup_percentages')
        .select('*')
        .limit(1);

      if (error) {
        console.error('❌ Table test failed:', error);
        setTableExists(false);
        message.warning('Таблица не существует или недоступна');
        return;
      }

      setTableExists(true);
      message.success('✅ Таблица существует и доступна!');
      console.log('✅ Table exists and accessible:', data);

    } catch (error: any) {
      console.error('❌ Error:', error);
      setTableExists(false);
      message.error(`Ошибка проверки: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const insertTestRecord = async () => {
    try {
      console.log('🚀 Inserting test record...');
      
      // Получим первый тендер для тестирования
      const { data: tenders, error: tendersError } = await supabase
        .from('tenders')
        .select('id')
        .limit(1);

      if (tendersError || !tenders?.length) {
        message.error('Нет доступных тендеров для тестирования');
        return;
      }

      const { data, error } = await supabase
        .from('tender_markup_percentages')
        .insert({
          tender_id: tenders[0].id,
          profit_margin: 15.00,
          materials_markup: 10.00,
          works_markup: 20.00,
          notes: 'Тестовая запись'
        })
        .select();

      if (error) {
        console.error('❌ Error inserting test record:', error);
        message.error(`Ошибка вставки: ${error.message}`);
        return;
      }

      message.success('✅ Тестовая запись создана!');
      console.log('✅ Test record inserted:', data);

    } catch (error: any) {
      console.error('❌ Error:', error);
      message.error(`Ошибка: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Тестирование таблицы tender_markup_percentages</Title>
      
      <Alert
        message="Инструкция по созданию таблицы"
        description="Эта страница поможет создать и протестировать таблицу для хранения процентов накруток тендеров."
        type="info"
        style={{ marginBottom: 24 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="1. Создание таблицы" size="small">
          <Paragraph>
            Создает таблицу <Text code>tender_markup_percentages</Text> со всеми необходимыми полями.
          </Paragraph>
          <Button 
            type="primary" 
            onClick={createTable} 
            loading={creating}
          >
            Создать таблицу
          </Button>
        </Card>

        <Card title="2. Добавление внешнего ключа" size="small">
          <Paragraph>
            Добавляет связь с таблицей tenders.
          </Paragraph>
          <Button 
            onClick={addForeignKey}
          >
            Добавить внешний ключ
          </Button>
        </Card>

        <Card title="3. Проверка таблицы" size="small">
          <Paragraph>
            Проверяет, что таблица создана и доступна.
          </Paragraph>
          <Space>
            <Button 
              onClick={testTableExists} 
              loading={testing}
            >
              Проверить таблицу
            </Button>
            {tableExists && (
              <Text type="success">✅ Таблица существует</Text>
            )}
          </Space>
        </Card>

        <Card title="4. Тестовая запись" size="small">
          <Paragraph>
            Создает тестовую запись для проверки работоспособности.
          </Paragraph>
          <Button 
            onClick={insertTestRecord}
            disabled={!tableExists}
          >
            Создать тестовую запись
          </Button>
        </Card>
      </Space>
    </div>
  );
};

export default TestMarkupTable;