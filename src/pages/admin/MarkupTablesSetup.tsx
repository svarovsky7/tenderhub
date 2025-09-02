import React, { useState } from 'react';
import { Card, Button, Typography, Space, message, Alert, Steps, Divider, Result } from 'antd';
import { CheckCircleOutlined, DatabaseOutlined, TableOutlined, LoadingOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase/client';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const MarkupTablesSetup: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState({
    tender_markup_percentages: false,
    markup_templates: false
  });
  const [setupComplete, setSetupComplete] = useState(false);

  const executeSqlScript = async () => {
    setLoading(true);
    try {
      console.log('🚀 Executing SQL script for markup tables...');
      
      // Читаем SQL скрипт
      const sqlScript = `
        -- 1. Создание таблицы шаблонов накруток
        CREATE TABLE IF NOT EXISTS public.markup_templates (
            id uuid NOT NULL DEFAULT uuid_generate_v4(),
            name text NOT NULL,
            description text,
            is_default boolean DEFAULT false,
            works_16_markup numeric(6,2) DEFAULT 160.00,
            mechanization_service numeric(5,2) DEFAULT 0.00,
            mbp_gsm numeric(5,2) DEFAULT 0.00,
            warranty_period numeric(5,2) DEFAULT 0.00,
            works_cost_growth numeric(5,2) DEFAULT 5.00,
            materials_cost_growth numeric(5,2) DEFAULT 3.00,
            subcontract_works_cost_growth numeric(5,2) DEFAULT 7.00,
            subcontract_materials_cost_growth numeric(5,2) DEFAULT 4.00,
            contingency_costs numeric(5,2) DEFAULT 2.00,
            overhead_own_forces numeric(5,2) DEFAULT 8.00,
            overhead_subcontract numeric(5,2) DEFAULT 6.00,
            general_costs_without_subcontract numeric(5,2) DEFAULT 5.00,
            profit_own_forces numeric(5,2) DEFAULT 12.00,
            profit_subcontract numeric(5,2) DEFAULT 8.00,
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            updated_at timestamp with time zone NOT NULL DEFAULT now(),
            CONSTRAINT markup_templates_pkey PRIMARY KEY (id),
            CONSTRAINT markup_templates_name_unique UNIQUE (name)
        );

        -- 2. Создание таблицы процентов накруток тендера
        CREATE TABLE IF NOT EXISTS public.tender_markup_percentages (
            id uuid NOT NULL DEFAULT uuid_generate_v4(),
            tender_id uuid NOT NULL,
            works_16_markup numeric(6,2) DEFAULT 160.00,
            mechanization_service numeric(5,2) DEFAULT 0.00,
            mbp_gsm numeric(5,2) DEFAULT 0.00,
            warranty_period numeric(5,2) DEFAULT 0.00,
            works_cost_growth numeric(5,2) DEFAULT 5.00,
            materials_cost_growth numeric(5,2) DEFAULT 3.00,
            subcontract_works_cost_growth numeric(5,2) DEFAULT 7.00,
            subcontract_materials_cost_growth numeric(5,2) DEFAULT 4.00,
            contingency_costs numeric(5,2) DEFAULT 2.00,
            overhead_own_forces numeric(5,2) DEFAULT 8.00,
            overhead_subcontract numeric(5,2) DEFAULT 6.00,
            general_costs_without_subcontract numeric(5,2) DEFAULT 5.00,
            profit_own_forces numeric(5,2) DEFAULT 12.00,
            profit_subcontract numeric(5,2) DEFAULT 8.00,
            notes text,
            is_active boolean DEFAULT true,
            template_id uuid,
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            updated_at timestamp with time zone NOT NULL DEFAULT now(),
            CONSTRAINT tender_markup_percentages_pkey PRIMARY KEY (id)
        );
      `;

      // Выполняем SQL через отдельные запросы (Supabase не поддерживает exec)
      // Для production нужно выполнить через SQL Editor в Supabase Dashboard
      
      message.warning('Выполните SQL скрипт из файла sql/CREATE_MARKUP_TABLES_V2.sql в Supabase Dashboard SQL Editor');
      setCurrentStep(1);
      
    } catch (error: any) {
      console.error('❌ Error:', error);
      message.error(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkTablesExist = async () => {
    setLoading(true);
    try {
      console.log('🚀 Checking tables existence...');
      
      // Проверяем таблицу tender_markup_percentages
      const { data: markupData, error: markupError } = await supabase
        .from('tender_markup_percentages')
        .select('id')
        .limit(1);

      if (!markupError) {
        setTableStatus(prev => ({ ...prev, tender_markup_percentages: true }));
        console.log('✅ Table tender_markup_percentages exists');
      } else {
        console.log('❌ Table tender_markup_percentages not found:', markupError);
      }

      // Проверяем таблицу markup_templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('markup_templates')
        .select('id')
        .limit(1);

      if (!templatesError) {
        setTableStatus(prev => ({ ...prev, markup_templates: true }));
        console.log('✅ Table markup_templates exists');
      } else {
        console.log('❌ Table markup_templates not found:', templatesError);
      }

      // Если обе таблицы существуют, переходим к следующему шагу
      if (!markupError && !templatesError) {
        setCurrentStep(2);
        message.success('Таблицы найдены и доступны!');
      } else {
        message.warning('Некоторые таблицы не найдены. Создайте их через SQL Editor.');
      }

    } catch (error: any) {
      console.error('❌ Error:', error);
      message.error(`Ошибка проверки: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTemplates = async () => {
    setLoading(true);
    try {
      console.log('🚀 Creating default templates...');
      
      const templates = [
        {
          name: 'Стандартный',
          description: 'Стандартные проценты накруток для большинства проектов',
          is_default: true,
          works_16_markup: 160.00,
          works_cost_growth: 5.00,
          materials_cost_growth: 3.00,
          subcontract_works_cost_growth: 7.00,
          subcontract_materials_cost_growth: 4.00,
          contingency_costs: 2.00,
          overhead_own_forces: 8.00,
          overhead_subcontract: 6.00,
          general_costs_without_subcontract: 5.00,
          profit_own_forces: 12.00,
          profit_subcontract: 8.00
        },
        {
          name: 'Минимальный',
          description: 'Минимальные накрутки для конкурентных тендеров',
          is_default: false,
          works_16_markup: 140.00,
          works_cost_growth: 3.00,
          materials_cost_growth: 2.00,
          subcontract_works_cost_growth: 5.00,
          subcontract_materials_cost_growth: 3.00,
          contingency_costs: 1.00,
          overhead_own_forces: 5.00,
          overhead_subcontract: 4.00,
          general_costs_without_subcontract: 3.00,
          profit_own_forces: 8.00,
          profit_subcontract: 5.00
        },
        {
          name: 'Премиальный',
          description: 'Повышенные накрутки для сложных проектов',
          is_default: false,
          works_16_markup: 180.00,
          mechanization_service: 5.00,
          mbp_gsm: 3.00,
          warranty_period: 2.00,
          works_cost_growth: 8.00,
          materials_cost_growth: 5.00,
          subcontract_works_cost_growth: 10.00,
          subcontract_materials_cost_growth: 6.00,
          contingency_costs: 5.00,
          overhead_own_forces: 12.00,
          overhead_subcontract: 10.00,
          general_costs_without_subcontract: 8.00,
          profit_own_forces: 18.00,
          profit_subcontract: 12.00
        }
      ];

      for (const template of templates) {
        const { error } = await supabase
          .from('markup_templates')
          .upsert(template, { onConflict: 'name' });

        if (error) {
          console.error('❌ Error creating template:', template.name, error);
        } else {
          console.log('✅ Template created:', template.name);
        }
      }

      message.success('Шаблоны по умолчанию созданы!');
      setCurrentStep(3);
      
    } catch (error: any) {
      console.error('❌ Error:', error);
      message.error(`Ошибка создания шаблонов: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultMarkups = async () => {
    setLoading(true);
    try {
      console.log('🚀 Creating default markups for existing tenders...');
      
      // Получаем все тендеры
      const { data: tenders, error: tendersError } = await supabase
        .from('tenders')
        .select('id');

      if (tendersError) {
        throw tendersError;
      }

      if (!tenders || tenders.length === 0) {
        message.info('Нет тендеров для создания накруток');
        setSetupComplete(true);
        return;
      }

      // Для каждого тендера создаем запись накруток по умолчанию
      for (const tender of tenders) {
        // Проверяем, есть ли уже накрутки для этого тендера
        const { data: existing } = await supabase
          .from('tender_markup_percentages')
          .select('id')
          .eq('tender_id', tender.id)
          .limit(1);

        if (!existing || existing.length === 0) {
          const { error } = await supabase
            .from('tender_markup_percentages')
            .insert({
              tender_id: tender.id,
              notes: 'Конфигурация по умолчанию',
              is_active: true
            });

          if (error) {
            console.error('❌ Error creating markup for tender:', tender.id, error);
          } else {
            console.log('✅ Markup created for tender:', tender.id);
          }
        }
      }

      message.success(`Накрутки созданы для ${tenders.length} тендеров!`);
      setSetupComplete(true);
      
    } catch (error: any) {
      console.error('❌ Error:', error);
      message.error(`Ошибка создания накруток: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'SQL Скрипт',
      description: 'Выполнение SQL скрипта',
      action: executeSqlScript
    },
    {
      title: 'Проверка таблиц',
      description: 'Проверка существования таблиц',
      action: checkTablesExist
    },
    {
      title: 'Шаблоны',
      description: 'Создание шаблонов по умолчанию',
      action: createDefaultTemplates
    },
    {
      title: 'Накрутки',
      description: 'Создание накруток для тендеров',
      action: createDefaultMarkups
    }
  ];

  if (setupComplete) {
    return (
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        <Result
          status="success"
          title="Настройка завершена успешно!"
          subTitle="Таблицы накруток и шаблоны готовы к использованию"
          extra={[
            <Button type="primary" key="dashboard" href="/dashboard">
              Перейти к дашборду
            </Button>,
            <Button key="tenders" href="/tenders">
              Открыть тендеры
            </Button>
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <Title level={2}>
        <DatabaseOutlined style={{ marginRight: 8 }} />
        Настройка таблиц накруток тендера
      </Title>
      
      <Alert
        message="Важная информация"
        description={
          <div>
            <Paragraph>
              Эта страница поможет настроить таблицы для хранения процентов накруток и шаблонов.
            </Paragraph>
            <Paragraph strong>
              SQL скрипт: <Text code>sql/CREATE_MARKUP_TABLES_V2.sql</Text>
            </Paragraph>
            <Paragraph>
              Выполните скрипт в Supabase Dashboard → SQL Editor перед началом настройки.
            </Paragraph>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              icon={currentStep === index && loading ? <LoadingOutlined /> : undefined}
            />
          ))}
        </Steps>

        <Divider />

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {currentStep === 0 && (
            <Card title="Шаг 1: Выполнение SQL скрипта" bordered={false}>
              <Paragraph>
                Откройте файл <Text code>sql/CREATE_MARKUP_TABLES_V2.sql</Text> и выполните его содержимое в Supabase Dashboard.
              </Paragraph>
              <Paragraph>
                Скрипт создаст:
              </Paragraph>
              <ul>
                <li>Таблицу <Text code>tender_markup_percentages</Text> - для хранения процентов накруток</li>
                <li>Таблицу <Text code>markup_templates</Text> - для хранения шаблонов накруток</li>
                <li>Необходимые индексы и триггеры</li>
                <li>Функции для работы с шаблонами</li>
              </ul>
              <Button 
                type="primary" 
                onClick={steps[0].action}
                loading={loading}
                icon={<DatabaseOutlined />}
              >
                Я выполнил SQL скрипт
              </Button>
            </Card>
          )}

          {currentStep === 1 && (
            <Card title="Шаг 2: Проверка таблиц" bordered={false}>
              <Paragraph>
                Проверим, что таблицы успешно созданы и доступны.
              </Paragraph>
              <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
                <div>
                  {tableStatus.tender_markup_percentages ? (
                    <Text type="success">
                      <CheckCircleOutlined /> Таблица tender_markup_percentages найдена
                    </Text>
                  ) : (
                    <Text type="secondary">
                      <TableOutlined /> Таблица tender_markup_percentages не найдена
                    </Text>
                  )}
                </div>
                <div>
                  {tableStatus.markup_templates ? (
                    <Text type="success">
                      <CheckCircleOutlined /> Таблица markup_templates найдена
                    </Text>
                  ) : (
                    <Text type="secondary">
                      <TableOutlined /> Таблица markup_templates не найдена
                    </Text>
                  )}
                </div>
              </Space>
              <Button 
                type="primary" 
                onClick={steps[1].action}
                loading={loading}
                icon={<CheckCircleOutlined />}
              >
                Проверить таблицы
              </Button>
            </Card>
          )}

          {currentStep === 2 && (
            <Card title="Шаг 3: Создание шаблонов" bordered={false}>
              <Paragraph>
                Создадим стандартные шаблоны накруток:
              </Paragraph>
              <ul>
                <li><Text strong>Стандартный</Text> - базовые накрутки для большинства проектов</li>
                <li><Text strong>Минимальный</Text> - минимальные накрутки для конкурентных тендеров</li>
                <li><Text strong>Премиальный</Text> - повышенные накрутки для сложных проектов</li>
              </ul>
              <Button 
                type="primary" 
                onClick={steps[2].action}
                loading={loading}
              >
                Создать шаблоны
              </Button>
            </Card>
          )}

          {currentStep === 3 && (
            <Card title="Шаг 4: Создание накруток для тендеров" bordered={false}>
              <Paragraph>
                Создадим записи накруток по умолчанию для всех существующих тендеров.
              </Paragraph>
              <Button 
                type="primary" 
                onClick={steps[3].action}
                loading={loading}
              >
                Создать накрутки
              </Button>
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default MarkupTablesSetup;