import React, { Suspense } from 'react';
import { Spin } from 'antd';

/**
 * Enhanced lazy loading wrapper with better loading states and error boundaries
 */
export const createLazyComponent = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = React.lazy(factory);
  
  return React.forwardRef<any, React.ComponentPropsWithRef<T>>((props, ref) => (
    <Suspense
      fallback={
        fallback || (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '200px',
            height: '100%'
          }}>
            <Spin size="large" tip="Загружаем компонент..." />
          </div>
        )
      }
    >
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));
};

/**
 * Preload a lazy component - useful for critical path optimization
 */
export const preloadComponent = (factory: () => Promise<any>) => {
  // Preload the component but don't block rendering
  factory().catch(() => {
    // Silently handle preload failures
    console.warn('Component preload failed');
  });
};

/**
 * Create lazy component with preloading capability
 */
export const createPreloadableLazyComponent = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) => {
  const component = createLazyComponent(factory, fallback);
  
  // Add preload method to the component
  (component as any).preload = () => preloadComponent(factory);
  
  return component;
};

/**
 * Error boundary for lazy components
 */
interface LazyErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

interface LazyErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class LazyErrorBoundary extends React.Component<LazyErrorBoundaryProps, LazyErrorBoundaryState> {
  constructor(props: LazyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LazyErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.retry} />;
      }
      
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          border: '1px solid #f5222d',
          borderRadius: '6px',
          backgroundColor: '#fff2f0'
        }}>
          <h3>Ошибка загрузки компонента</h3>
          <p>Не удалось загрузить компонент. Попробуйте обновить страницу.</p>
          <button onClick={this.retry} style={{
            padding: '8px 16px',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Повторить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping pages with lazy error boundary
 */
export const withLazyErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <LazyErrorBoundary>
      <Component {...props} ref={ref} />
    </LazyErrorBoundary>
  ));
};