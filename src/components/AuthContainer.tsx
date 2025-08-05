import { useState } from 'react';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';

type AuthMode = 'login' | 'register';

const AuthContainer = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const switchToLogin = () => setAuthMode('login');
  const switchToRegister = () => setAuthMode('register');

  return (
    <>
      {authMode === 'login' ? (
        <LoginForm onSwitchToRegister={switchToRegister} />
      ) : (
        <RegistrationForm onSwitchToLogin={switchToLogin} />
      )}
    </>
  );
};

export default AuthContainer;