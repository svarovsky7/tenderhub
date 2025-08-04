import { useState } from 'react'
import { registerUser } from '../services/auth'
import type { UserRole } from '../types/auth.types'

const roles: UserRole[] = ['viewer', 'engineer']

const RegistrationForm = (): JSX.Element => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('viewer')
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setMessage(null)
    try {
      await registerUser({ email, password, fullName, role })
      setMessage('Регистрация прошла успешно')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка регистрации'
      setMessage(errorMessage)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Регистрация</h2>
      <div>
        <label htmlFor="email">Email:</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="password">Пароль:</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="fullName">ФИО:</label>
        <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="role">Роль:</label>
        <select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <button type="submit">Зарегистрироваться</button>
      {message && <p>{message}</p>}
    </form>
  )
}

export default RegistrationForm
