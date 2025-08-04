import RegisterForm from './components/RegisterForm';
import './App.css';
import type { JSX } from 'react';

function App(): JSX.Element {
  return (
    <div className="app">
      <h1>Регистрация пользователя</h1>
      <RegisterForm />
    </div>
  );
}

export default App;
