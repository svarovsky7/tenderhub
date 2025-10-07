import React from 'react';
import { Card, Row, Col, Space, Tag, Button, Typography } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import GradientHeader from './GradientHeader';

const { Title, Text, Paragraph } = Typography;

/**
 * ThemeShowcase - Demo component showing all theme elements
 * Usage: Import and render to see all theme colors and components
 */
const ThemeShowcase: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>Theme Showcase - {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</Title>

        {/* Gradient Headers */}
        <Title level={3} style={{ marginTop: '24px' }}>Gradient Headers</Title>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <GradientHeader variant="primary" style={{ padding: '16px', borderRadius: '8px' }}>
            <Title level={4} style={{ color: 'white', margin: 0 }}>Primary Gradient</Title>
            <Text style={{ color: 'white' }}>Used for main headers and important sections</Text>
          </GradientHeader>

          <GradientHeader variant="success" style={{ padding: '16px', borderRadius: '8px' }}>
            <Title level={4} style={{ color: 'white', margin: 0 }}>Success Gradient</Title>
            <Text style={{ color: 'white' }}>Used for success states and positive actions</Text>
          </GradientHeader>

          <GradientHeader variant="warning" style={{ padding: '16px', borderRadius: '8px' }}>
            <Title level={4} style={{ color: 'white', margin: 0 }}>Warning Gradient</Title>
            <Text style={{ color: 'white' }}>Used for warnings and caution areas</Text>
          </GradientHeader>

          <GradientHeader variant="danger" style={{ padding: '16px', borderRadius: '8px' }}>
            <Title level={4} style={{ color: 'white', margin: 0 }}>Danger Gradient</Title>
            <Text style={{ color: 'white' }}>Used for errors and destructive actions</Text>
          </GradientHeader>

          <GradientHeader variant="info" style={{ padding: '16px', borderRadius: '8px' }}>
            <Title level={4} style={{ color: 'white', margin: 0 }}>Info Gradient</Title>
            <Text style={{ color: 'white' }}>Used for informational content</Text>
          </GradientHeader>
        </Space>

        {/* Status Tags */}
        <Title level={3} style={{ marginTop: '32px' }}>Status Tags</Title>
        <Space size="middle" wrap>
          <Tag color="success" icon={<CheckCircleOutlined />}>Success</Tag>
          <Tag color="warning" icon={<WarningOutlined />}>Warning</Tag>
          <Tag color="error" icon={<CloseCircleOutlined />}>Error</Tag>
          <Tag color="processing" icon={<InfoCircleOutlined />}>Processing</Tag>
          <Tag color="default">Default</Tag>
          <Tag color="blue">Blue</Tag>
          <Tag color="green">Green</Tag>
          <Tag color="red">Red</Tag>
          <Tag color="orange">Orange</Tag>
          <Tag color="purple">Purple</Tag>
          <Tag color="cyan">Cyan</Tag>
          <Tag color="gold">Gold</Tag>
        </Space>

        {/* Work Type Colors */}
        <Title level={3} style={{ marginTop: '32px' }}>Work Type Colors</Title>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card size="small" style={{ background: 'var(--work-type-repair)', color: 'white' }}>
              <Text strong style={{ color: 'white' }}>Repair Work</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: 'var(--work-type-construction)', color: 'white' }}>
              <Text strong style={{ color: 'white' }}>Construction</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: 'var(--work-type-technical)', color: 'white' }}>
              <Text strong style={{ color: 'white' }}>Technical</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: 'var(--work-type-installation)', color: 'white' }}>
              <Text strong style={{ color: 'white' }}>Installation</Text>
            </Card>
          </Col>
        </Row>

        {/* Material Type Colors */}
        <Title level={3} style={{ marginTop: '32px' }}>Material Type Colors</Title>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card size="small" style={{ background: 'var(--material-type-main)', color: 'white' }}>
              <Text strong style={{ color: 'white' }}>Main Materials</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ background: 'var(--material-type-auxiliary)', color: 'white' }}>
              <Text strong style={{ color: 'white' }}>Auxiliary Materials</Text>
            </Card>
          </Col>
        </Row>

        {/* Text Hierarchy */}
        <Title level={3} style={{ marginTop: '32px' }}>Text Hierarchy</Title>
        <Space direction="vertical">
          <Text style={{ color: 'var(--text-primary)', fontSize: '16px' }}>
            Primary text - High contrast, used for main content
          </Text>
          <Text style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Secondary text - Medium contrast, used for supporting content
          </Text>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
            Tertiary text - Low contrast, used for hints and metadata
          </Text>
          <Text style={{ color: 'var(--text-disabled)', fontSize: '12px' }}>
            Disabled text - Minimal contrast, used for disabled states
          </Text>
        </Space>

        {/* Buttons */}
        <Title level={3} style={{ marginTop: '32px' }}>Buttons</Title>
        <Space size="middle" wrap>
          <Button type="primary">Primary Button</Button>
          <Button type="default">Default Button</Button>
          <Button type="dashed">Dashed Button</Button>
          <Button type="text">Text Button</Button>
          <Button type="link">Link Button</Button>
          <Button type="primary" danger>Danger Button</Button>
          <Button type="primary" disabled>Disabled Button</Button>
        </Space>

        {/* Cards */}
        <Title level={3} style={{ marginTop: '32px' }}>Cards & Surfaces</Title>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card title="Primary Background" size="small">
              <Paragraph>
                This card uses the primary background color (var(--bg-primary))
              </Paragraph>
            </Card>
          </Col>
          <Col span={8}>
            <Card
              title="Elevated Surface"
              size="small"
              style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-md)' }}
            >
              <Paragraph>
                This card uses elevated background with shadow
              </Paragraph>
            </Card>
          </Col>
          <Col span={8}>
            <Card
              title="Tertiary Background"
              size="small"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <Paragraph>
                This card uses tertiary background color
              </Paragraph>
            </Card>
          </Col>
        </Row>

        {/* CSS Variables Reference */}
        <Title level={3} style={{ marginTop: '32px' }}>CSS Variables Reference</Title>
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text code>var(--bg-primary)</Text>
            <Text code>var(--bg-secondary)</Text>
            <Text code>var(--bg-tertiary)</Text>
            <Text code>var(--bg-elevated)</Text>
            <Text code>var(--text-primary)</Text>
            <Text code>var(--text-secondary)</Text>
            <Text code>var(--text-tertiary)</Text>
            <Text code>var(--border-color)</Text>
            <Text code>var(--gradient-primary)</Text>
            <Text code>var(--work-type-repair)</Text>
            <Text code>var(--material-type-main)</Text>
            <Text code>var(--status-success)</Text>
          </Space>
        </Card>
      </Card>
    </div>
  );
};

export default ThemeShowcase;
