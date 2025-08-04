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
      console.log('Attempting sign up with:', { email: formData.email });
      
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

      console.log('Sign up response:', { data: authData, error: authError });

      if (authError) {
        console.error('Sign up error:', authError);
        return { success: false, error: authError.message };
      }

      // Если регистрация прошла успешно, но требуется подтверждение email
      if (!authData.user) {
        return { success: false, error: 'Ошибка при создании пользователя' };
      }

      // Создание профиля пользователя в таблице profiles
      // Профиль создается сразу, если email подтвержден, или будет создан позже через триггер/webhook
      if (authData.user) {
        const fullName = [formData.firstName, formData.middleName, formData.lastName]
          .filter(name => name && name.trim())
          .join(' ');
          
        // Попытаемся создать профиль, но не будем считать это критической ошибкой
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                full_name: fullName,
                role: formData.role,
              }
            ]);

          if (profileError) {
            console.warn('Profile creation warning (will be created later):', profileError);
          }
        } catch (profileError) {
          console.warn('Profile creation attempt failed (will be created later):', profileError);
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
      console.log('Attempting sign in with:', { email: formData.email });
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      console.log('Sign in response:', { data: authData, error: authError });

      if (authError) {
        console.error('Auth error:', authError);
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

      // Парсим full_name обратно в компоненты для совместимости
      const nameParts = profile.full_name ? profile.full_name.split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts[nameParts.length - 1] || '';
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

      return {
        success: true,
        user: {
          id: profile.id,
          email: authData.user.email || formData.email,
          firstName,
          lastName,
          middleName: middleName || undefined,
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
        const metadata = user.user_metadata || {};
        return {
          id: user.id,
          email: user.email || '',
          firstName: metadata.first_name || '',
          lastName: metadata.last_name || '',
          middleName: metadata.middle_name,
          role: metadata.role || 'viewer',
          createdAt: user.created_at,
          updatedAt: user.updated_at || user.created_at,
        };
      }

      // Парсим full_name обратно в компоненты для совместимости
      const nameParts = profile.full_name ? profile.full_name.split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts[nameParts.length - 1] || '';
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

      return {
        id: profile.id,
        email: user.email || '',
        firstName,
        lastName,
        middleName: middleName || undefined,
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