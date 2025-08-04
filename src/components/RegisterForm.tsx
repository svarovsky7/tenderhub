import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { supabase } from '../services/supabaseClient';

interface FormState {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'engineer' | 'viewer';
}

const initialForm: FormState = {
  email: '',
  password: '',
  fullName: '',
  role: 'viewer',
};

const RegisterForm = (): JSX.Element => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const userId = signUpData.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: form.fullName,
        role: form.role,
      });

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setSuccess(true);
      setForm(initialForm);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Пароль:</label>
        <input
          id="password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="fullName">ФИО:</label>
        <input
          id="fullName"
          type="text"
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="role">Роль:</label>
        <select id="role" name="role" value={form.role} onChange={handleChange}>
          <option value="viewer">Просмотр</option>
          <option value="engineer">Инженер</option>
          <option value="admin">Администратор</option>
        </select>
      </div>
      <button type="submit">Зарегистрироваться</button>
      {error && <p>{error}</p>}
      {success && <p>Регистрация прошла успешно</p>}
    </form>
  );
};

export default RegisterForm;
