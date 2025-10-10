export type UserRole = 'Administrator' | 'moderator' | 'engineer' | 'manager' | 'director';

// Role descriptions for UI
export const ROLE_LABELS: Record<UserRole, string> = {
  Administrator: 'Администратор',
  moderator: 'Модератор',
  engineer: 'Инженер',
  manager: 'Руководитель',
  director: 'Директор'
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  Administrator: 'Полный доступ ко всем страницам и функциям',
  moderator: 'Ограниченный доступ к управлению',
  engineer: 'Доступ к расчетам и просмотру данных',
  manager: 'Доступ только к страницам анализа',
  director: 'Доступ только к странице согласований'
};

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: UserRole;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}