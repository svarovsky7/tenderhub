import { useState, ChangeEvent, FormEvent } from 'react'
import { supabase } from '../services/supabase'

interface FormState {
  email: string
  password: string
  fullName: string
  role: string
}

const roles = [
  { value: 'customer', label: 'Заказчик' },
  { value: 'supplier', label: 'Поставщик' },
]

const RegisterForm = (): JSX.Element => {
  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
    fullName: '',
    role: roles[0].value,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const { error: signUpError } = await supabase.auth.signUp({
      email: formState.email,
      password: formState.password,
      options: {
        data: {
          full_name: formState.fullName,
          role: formState.role,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
    } else {
      setSuccess('Регистрация успешна. Проверьте вашу почту.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formState.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          name="password"
          type="password"
          value={formState.password}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="fullName">ФИО</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          value={formState.fullName}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="role">Роль</label>
        <select
          id="role"
          name="role"
          value={formState.role}
          onChange={handleChange}
        >
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <button type="submit">Зарегистрироваться</button>
    </form>
  )
}

export default RegisterForm

