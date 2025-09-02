import React from 'react';
import { Card, Typography, Row, Col, Divider } from 'antd';
import { formatCurrency } from '../../utils/formatters';

const { Title, Text } = Typography;

interface CostCategoryData {
  icon: string;
  label: string;
  amount: number;
  percentage: number;
  type: 'materials' | 'works' | 'subMaterials' | 'subWorks';
}

interface BaseTenderCostsProps {
  tenderTitle: string;
  clientName: string;
  totalAmount: number;
  costCategories: CostCategoryData[];
}

const BaseTenderCostsRedesigned: React.FC<BaseTenderCostsProps> = ({
  tenderTitle,
  clientName,
  totalAmount,
  costCategories
}) => {
  const getCostCardStyle = (type: CostCategoryData['type']) => {
    const baseStyle = {
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      padding: '16px',
      height: '100%',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    };

    // Alternate opacity for visual variety
    if (type === 'materials' || type === 'subMaterials') {
      baseStyle.backgroundColor = 'rgba(255, 255, 255, 0.15)';
    }

    return baseStyle;
  };

  return (
    <Card
      className="base-tender-costs-redesigned"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        borderRadius: '16px',
        padding: '8px',
        color: 'white',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
      }}
    >
      {/* Tender Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <Title 
          level={4} 
          style={{ 
            color: 'rgba(255, 255, 255, 0.95)',
            fontSize: '20px',
            fontWeight: 600,
            marginBottom: '4px',
            lineHeight: 1.3
          }}
        >
          {tenderTitle}
        </Title>
        <Text 
          style={{ 
            color: 'rgba(255, 255, 255, 0.75)',
            fontSize: '14px',
            display: 'block'
          }}
        >
          Заказчик: {clientName}
        </Text>
      </div>

      <Divider 
        style={{ 
          borderColor: 'rgba(255, 255, 255, 0.2)',
          margin: '0 0 24px 0'
        }} 
      />

      {/* Cost Categories Grid */}
      <div style={{ marginBottom: '24px' }}>
        <Text 
          style={{ 
            color: 'rgba(255, 255, 255, 0.75)',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '16px'
          }}
        >
          Структура затрат
        </Text>
        
        <Row gutter={[12, 12]}>
          {costCategories.map((category, index) => (
            <Col xs={12} sm={12} md={12} lg={12} key={index}>
              <div
                style={getCostCardStyle(category.type)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = getCostCardStyle(category.type).backgroundColor;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{ 
                    fontSize: '16px', 
                    marginRight: '8px',
                    opacity: 0.9
                  }}>
                    {category.icon}
                  </span>
                  <Text style={{ 
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '13px',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}>
                    {category.label}
                  </Text>
                </div>
                
                <div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.95)',
                    fontSize: '16px',
                    fontWeight: 600,
                    marginBottom: '2px'
                  }}>
                    {formatCurrency(category.amount)}
                  </div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '11px',
                    fontWeight: 400
                  }}>
                    {category.percentage}%
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      <Divider 
        style={{ 
          borderColor: 'rgba(255, 255, 255, 0.2)',
          margin: '0 0 20px 0'
        }} 
      />

      {/* Total Amount Section */}
      <div 
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <Text style={{ 
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: '16px',
          fontWeight: 500
        }}>
          Общая стоимость:
        </Text>
        <Text style={{ 
          color: 'rgba(255, 255, 255, 0.98)',
          fontSize: '22px',
          fontWeight: 700
        }}>
          {formatCurrency(totalAmount)}
        </Text>
      </div>
    </Card>
  );
};

export default BaseTenderCostsRedesigned;