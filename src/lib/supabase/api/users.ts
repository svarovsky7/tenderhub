// API для управления пользователями
import { supabase } from '../client';
import type { UserRole } from '../../../types/auth.types';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
}

export interface UpdateRoleResult {
  success: boolean;
  user_id?: string;
  full_name?: string;
  old_role?: UserRole;
  new_role?: UserRole;
  updated_at?: string;
  error?: string;
}

/**
 * Получить всех пользователей системы
 */
export async function getAllUsers() {
  console.log('🚀 [getAllUsers] Fetching all users');

  try {
    const { data, error } = await supabase.rpc('get_all_users');

    if (error) {
      console.error('❌ [getAllUsers] Error:', error);
      return { data: null, error };
    }

    console.log('✅ [getAllUsers] Loaded:', data?.length || 0, 'users');
    return { data: data as UserProfile[], error: null };
  } catch (err: any) {
    console.error('❌ [getAllUsers] Exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Обновить роль пользователя
 */
export async function updateUserRole(userId: string, newRole: UserRole) {
  console.log('🚀 [updateUserRole] Updating role:', { userId, newRole });

  try {
    const { data, error } = await supabase.rpc('update_user_role', {
      p_user_id: userId,
      p_new_role: newRole
    });

    if (error) {
      console.error('❌ [updateUserRole] Error:', error);
      return { data: null, error };
    }

    const result = data as UpdateRoleResult;

    if (!result.success) {
      console.error('❌ [updateUserRole] Function returned error:', result.error);
      return { data: null, error: { message: result.error } };
    }

    console.log('✅ [updateUserRole] Success:', result);
    return { data: result, error: null };
  } catch (err: any) {
    console.error('❌ [updateUserRole] Exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Получить профиль пользователя по ID
 */
export async function getUserProfile(userId: string) {
  console.log('🚀 [getUserProfile] Fetching profile for:', userId);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ [getUserProfile] Error:', error);
      return { data: null, error };
    }

    console.log('✅ [getUserProfile] Loaded:', data);
    return { data, error: null };
  } catch (err: any) {
    console.error('❌ [getUserProfile] Exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Обновить профиль пользователя (имя)
 */
export async function updateUserProfile(userId: string, fullName: string) {
  console.log('🚀 [updateUserProfile] Updating profile:', { userId, fullName });

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ [updateUserProfile] Error:', error);
      return { data: null, error };
    }

    console.log('✅ [updateUserProfile] Updated:', data);
    return { data, error: null };
  } catch (err: any) {
    console.error('❌ [updateUserProfile] Exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Создать нового пользователя через обычную регистрацию
 * Note: Требует настройки auto-confirm email в Supabase Dashboard
 */
export async function createUser(email: string, password: string, fullName: string, role: UserRole) {
  console.log('🚀 [createUser] Creating user:', { email, fullName, role });

  try {
    // Используем обычную регистрацию через signUp
    // ВАЖНО: Требует отключения "Confirm email" в Supabase Dashboard
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    if (authError) {
      console.error('❌ [createUser] Auth error:', authError);
      console.error('❌ [createUser] Auth error details:', JSON.stringify(authError, null, 2));
      return { data: null, error: authError };
    }

    if (!authData.user) {
      console.error('❌ [createUser] No user data returned');
      return { data: null, error: { message: 'Failed to create user' } };
    }

    console.log('✅ [createUser] User created:', authData.user.id);

    // Создаем профиль вручную (так как нет триггера)
    console.log('📝 [createUser] Creating profile manually');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        role: role,
        created_at: authData.user.created_at,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ [createUser] Profile creation error:', profileError);
      // Возвращаем данные из auth, даже если профиль не создан
      return {
        data: {
          id: authData.user.id,
          email: authData.user.email!,
          full_name: fullName,
          role: role,
          created_at: authData.user.created_at,
          updated_at: new Date().toISOString(),
          last_sign_in_at: null
        } as UserProfile,
        error: null
      };
    }

    console.log('✅ [createUser] Success with profile:', profile);
    return {
      data: {
        ...profile,
        email: authData.user.email!,
        last_sign_in_at: null
      } as UserProfile,
      error: null
    };
  } catch (err: any) {
    console.error('❌ [createUser] Exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Удалить пользователя (DANGER: удаляет из auth.users и profiles cascade)
 * Note: Requires admin privileges
 */
export async function deleteUser(userId: string) {
  console.log('🚀 [deleteUser] Deleting user:', userId);

  try {
    // Note: This requires admin privileges in Supabase
    // In production, you should use admin API or service_role key
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error('❌ [deleteUser] Error:', error);
      return { error };
    }

    console.log('✅ [deleteUser] Deleted user:', userId);
    return { error: null };
  } catch (err: any) {
    console.error('❌ [deleteUser] Exception:', err);
    return { error: err };
  }
}