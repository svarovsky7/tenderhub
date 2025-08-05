import { useState } from 'react';
import type { FormEvent } from 'react';
import type { LoginFormData } from '../types/auth.types.ts';
import './AuthForms.css';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const LoginForm = ({ onSwitchToRegister }: LoginFormProps) => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof LoginFormData, string>> = {};

    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Неверный формат email';
    }

    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const { authService } = await import('../services/auth.service');
      const result = await authService.signIn(formData);
      
      if (result.success) {
        alert(`Добро пожаловать, ${result.user?.firstName} ${result.user?.lastName}!`);
        // Очистка формы
        setFormData({
          email: '',
          password: '',
        });
        // TODO: Перенаправление на главную страницу приложения
      } else {
        alert(`Ошибка входа: ${result.error}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Произошла ошибка при входе');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Очистка ошибки при изменении поля
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Вход в тендерный портал</h2>
        
        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={errors.email ? 'error' : ''}
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Пароль *</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={errors.password ? 'error' : ''}
            disabled={isLoading}
            autoComplete="current-password"
          />
          {errors.password && <span className="error-message">{errors.password}</span>}
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? 'Вход...' : 'Войти'}
        </button>
        
        <div className="auth-links">
          <p>
            Нет аккаунта?{' '}
            <button 
              type="button" 
              className="link-button" 
              onClick={onSwitchToRegister}
              disabled={isLoading}
            >
              Зарегистрироваться
            </button>
          </p>
          <button 
            type="button" 
            className="link-button forgot-password"
            disabled={isLoading}
          >
            Забыли пароль?
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;