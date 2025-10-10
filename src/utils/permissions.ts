// Утилиты для проверки прав доступа на основе ролей пользователей
import type { UserRole } from '../types/auth.types';

// Иерархия ролей (от большего к меньшему)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  Administrator: 5, // Полный доступ
  moderator: 4,     // Ограниченный доступ к управлению
  engineer: 3,      // Расчеты и просмотр
  manager: 2,       // Только аналитика
  director: 1       // Только согласования
};

// Страницы и доступ к ним по ролям
export type PageRoute =
  | '/dashboard'
  | '/boq'
  | '/tenders'
  | '/commercial-costs'
  | '/cost-redistribution'
  | '/financial-indicators'
  | '/libraries/materials-works'
  | '/libraries/work-materials'
  | '/libraries/tender-materials-works'
  | '/construction-costs/tender'
  | '/construction-costs/management'
  | '/construction-costs/edit'
  | '/admin/nomenclatures'
  | '/admin/users'
  | '/admin/settings'
  | '/approvals'; // Страница согласований для директора

// Определение прав доступа к страницам
export const PAGE_PERMISSIONS: Record<PageRoute, UserRole[]> = {
  // Главная страница - доступна всем
  '/dashboard': ['Administrator', 'moderator', 'engineer', 'manager', 'director'],

  // BOQ - только инженер, модератор и админ
  '/boq': ['Administrator', 'moderator', 'engineer'],

  // Тендеры - все кроме директора
  '/tenders': ['Administrator', 'moderator', 'engineer', 'manager'],

  // Коммерческие затраты - все кроме директора
  '/commercial-costs': ['Administrator', 'moderator', 'engineer', 'manager'],

  // Перераспределение затрат - инженер, модератор, админ
  '/cost-redistribution': ['Administrator', 'moderator', 'engineer'],

  // Финансовые показатели - все роли (аналитика)
  '/financial-indicators': ['Administrator', 'moderator', 'engineer', 'manager', 'director'],

  // Библиотеки материалов - инженер, модератор, админ
  '/libraries/materials-works': ['Administrator', 'moderator', 'engineer'],
  '/libraries/work-materials': ['Administrator', 'moderator', 'engineer'],
  '/libraries/tender-materials-works': ['Administrator', 'moderator', 'engineer'],

  // Затраты на строительство - инженер, модератор, админ
  '/construction-costs/tender': ['Administrator', 'moderator', 'engineer'],
  '/construction-costs/management': ['Administrator', 'moderator', 'engineer'],
  '/construction-costs/edit': ['Administrator', 'moderator'],

  // Админка - только админ и модератор
  '/admin/nomenclatures': ['Administrator', 'moderator'],
  '/admin/users': ['Administrator'], // Только админ может управлять пользователями
  '/admin/settings': ['Administrator'],

  // Страница согласований - только для директора (и админа)
  '/approvals': ['Administrator', 'director']
};

// Действия и доступ к ним по ролям
export type Action =
  | 'create_tender'
  | 'edit_tender'
  | 'delete_tender'
  | 'create_boq'
  | 'edit_boq'
  | 'delete_boq'
  | 'create_material'
  | 'edit_material'
  | 'delete_material'
  | 'create_work'
  | 'edit_work'
  | 'delete_work'
  | 'edit_commercial_costs'
  | 'redistribute_costs'
  | 'view_financial_indicators'
  | 'approve_tender'
  | 'manage_users'
  | 'manage_settings';

export const ACTION_PERMISSIONS: Record<Action, UserRole[]> = {
  // Управление тендерами
  create_tender: ['Administrator', 'moderator', 'engineer'],
  edit_tender: ['Administrator', 'moderator', 'engineer'],
  delete_tender: ['Administrator', 'moderator'],

  // Управление BOQ
  create_boq: ['Administrator', 'moderator', 'engineer'],
  edit_boq: ['Administrator', 'moderator', 'engineer'],
  delete_boq: ['Administrator', 'moderator'],

  // Управление материалами
  create_material: ['Administrator', 'moderator', 'engineer'],
  edit_material: ['Administrator', 'moderator', 'engineer'],
  delete_material: ['Administrator', 'moderator'],

  // Управление работами
  create_work: ['Administrator', 'moderator', 'engineer'],
  edit_work: ['Administrator', 'moderator', 'engineer'],
  delete_work: ['Administrator', 'moderator'],

  // Коммерческие затраты
  edit_commercial_costs: ['Administrator', 'moderator', 'engineer'],
  redistribute_costs: ['Administrator', 'moderator', 'engineer'],

  // Финансовые показатели - просмотр доступен всем
  view_financial_indicators: ['Administrator', 'moderator', 'engineer', 'manager', 'director'],

  // Согласования
  approve_tender: ['Administrator', 'director'],

  // Управление системой
  manage_users: ['Administrator'],
  manage_settings: ['Administrator']
};

/**
 * Проверить, имеет ли пользователь доступ к странице
 */
export function canAccessPage(userRole: UserRole, page: PageRoute): boolean {
  const allowedRoles = PAGE_PERMISSIONS[page];
  if (!allowedRoles) {
    console.warn(`⚠️ Page ${page} not found in permissions config`);
    return false;
  }
  return allowedRoles.includes(userRole);
}

/**
 * Проверить, может ли пользователь выполнить действие
 */
export function canPerformAction(userRole: UserRole, action: Action): boolean {
  const allowedRoles = ACTION_PERMISSIONS[action];
  if (!allowedRoles) {
    console.warn(`⚠️ Action ${action} not found in permissions config`);
    return false;
  }
  return allowedRoles.includes(userRole);
}

/**
 * Проверить, имеет ли пользователь роль выше заданной
 */
export function hasRoleAbove(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Получить список доступных страниц для роли
 */
export function getAccessiblePages(userRole: UserRole): PageRoute[] {
  return Object.entries(PAGE_PERMISSIONS)
    .filter(([_, roles]) => roles.includes(userRole))
    .map(([page]) => page as PageRoute);
}

/**
 * Получить список доступных действий для роли
 */
export function getAccessibleActions(userRole: UserRole): Action[] {
  return Object.entries(ACTION_PERMISSIONS)
    .filter(([_, roles]) => roles.includes(userRole))
    .map(([action]) => action as Action);
}

/**
 * Проверить, является ли пользователь администратором
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'Administrator';
}

/**
 * Проверить, может ли пользователь редактировать данные
 */
export function canEdit(userRole: UserRole): boolean {
  return ['Administrator', 'moderator', 'engineer'].includes(userRole);
}

/**
 * Проверить, может ли пользователь только просматривать
 */
export function isViewOnly(userRole: UserRole): boolean {
  return ['manager', 'director'].includes(userRole);
}
