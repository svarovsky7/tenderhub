import { useAuth } from '../hooks/useAuth';
import './Dashboard.css';

const Dashboard = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      alert('Ошибка при выходе');
    }
  };

  if (!user) {
    return null; // Этот компонент должен отображаться только для аутентифицированных пользователей
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="logo">TenderHub</h1>
            <span className="subtitle">Портал управления тендерами</span>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user.firstName} {user.lastName}</span>
              <span className="user-role">{getRoleLabel(user.role)}</span>
            </div>
            <button onClick={handleSignOut} className="sign-out-btn">
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Добро пожаловать, {user.firstName}!</h2>
          <p>Выберите действие для работы с тендерами</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-icon">📋</div>
            <h3>Мои тендеры</h3>
            <p>Просмотр и управление назначенными тендерами</p>
            <button className="card-button" disabled>
              Скоро доступно
            </button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">➕</div>
            <h3>Создать тендер</h3>
            <p>Создание нового тендерного проекта</p>
            <button className="card-button" disabled>
              Скоро доступно
            </button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📊</div>
            <h3>Отчеты</h3>
            <p>Аналитика и отчеты по тендерам</p>
            <button className="card-button" disabled>
              Скоро доступно
            </button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📚</div>
            <h3>Библиотеки</h3>
            <p>Управление библиотеками работ и материалов</p>
            <button className="card-button" disabled>
              Скоро доступно
            </button>
          </div>

          {user.role === 'admin' && (
            <div className="dashboard-card">
              <div className="card-icon">👥</div>
              <h3>Пользователи</h3>
              <p>Управление пользователями системы</p>
              <button className="card-button" disabled>
                Скоро доступно
              </button>
            </div>
          )}

          <div className="dashboard-card">
            <div className="card-icon">⚙️</div>
            <h3>Настройки</h3>
            <p>Настройки профиля и системы</p>
            <button className="card-button" disabled>
              Скоро доступно
            </button>
          </div>
        </div>

        <div className="stats-section">
          <h3>Статистика</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">-</div>
              <div className="stat-label">Активные тендеры</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">-</div>
              <div className="stat-label">Завершенные тендеры</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">-</div>
              <div className="stat-label">Общая стоимость</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Администратор';
    case 'engineer':
      return 'Инженер';
    case 'viewer':
      return 'Наблюдатель';
    default:
      return 'Пользователь';
  }
};

export default Dashboard;