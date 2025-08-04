export type UserRole = 'viewer' | 'engineer'

export interface RegistrationData {
  email: string
  password: string
  fullName: string
  role: UserRole
}
