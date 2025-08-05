import { useAuth } from '../hooks/useAuth';
import AuthContainer from './AuthContainer';
import Dashboard from './Dashboard';
import './AppLayout.css';

const AppLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {user ? <Dashboard /> : <AuthContainer />}
    </div>
  );
};

export default AppLayout;