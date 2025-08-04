import { supabase } from './supabaseClient'
import { RegistrationData } from '../types/auth.types'

export const registerUser = async ({ email, password, fullName, role }: RegistrationData): Promise<void> => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  const user = data.user
  if (!user) throw new Error('Не удалось создать пользователя')
  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    full_name: fullName,
    role,
  })
  if (profileError) throw profileError
}
