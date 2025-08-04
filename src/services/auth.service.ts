import { supabase } from '../lib/supabase';
import type { RegistrationFormData, LoginFormData, UserProfile } from '../types/auth.types.ts';

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: UserProfile;
}

export const authService = {
  async signUp(formData: RegistrationFormData): Promise<AuthResponse> {
    try {
      // Регистрация пользователя в Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            middle_name: formData.middleName || null,
            role: formData.role,
          }
        }
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      // Если регистрация прошла успешно, но требуется подтверждение email
      if (!authData.user) {
        return { success: false, error: 'Ошибка при создании пользователя' };
      }

      // Создание профиля пользователя в таблице profiles
      if (authData.user && authData.user.email_confirmed_at) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              middle_name: formData.middleName || null,
              role: formData.role,
            }
          ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      return { 
        success: true, 
        user: {
          id: authData.user.id,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          role: formData.role,
          createdAt: authData.user.created_at,
          updatedAt: authData.user.updated_at || authData.user.created_at,
        }
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Произошла ошибка при регистрации' };
    }
  },

  async signIn(formData: LoginFormData): Promise<AuthResponse> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Ошибка при входе' };
      }

      // Получение профиля пользователя
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        // Если профиль не найден, используем данные из auth metadata
        const userMetadata = authData.user.user_metadata;
        return {
          success: true,
          user: {
            id: authData.user.id,
            email: authData.user.email || formData.email,
            firstName: userMetadata.first_name || '',
            lastName: userMetadata.last_name || '',
            middleName: userMetadata.middle_name,
            role: userMetadata.role || 'viewer',
            createdAt: authData.user.created_at,
            updatedAt: authData.user.updated_at || authData.user.created_at,
          }
        };
      }

      return {
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          middleName: profile.middle_name,
          role: profile.role,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        }
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Произошла ошибка при входе' };
    }
  },

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: 'Произошла ошибка при выходе' };
    }
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        middleName: profile.middle_name,
        role: profile.role,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
};