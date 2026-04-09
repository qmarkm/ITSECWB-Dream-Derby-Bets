import api from '@/config/api';

export interface SessionSettings {
  timeout_minutes: number;
  warning_minutes: number;
}

export interface SystemSettings {
  timeout_minutes: number;
  warning_minutes: number;
}

export const getSessionSettings = async (): Promise<SessionSettings> => {
  const response = await api.get('/api/settings/session/');
  return response.data;
};

export const getSystemSettings = async (): Promise<{ settings: any[] }> => {
  const response = await api.get('/api/admin/settings/');
  return response.data;
};

export const updateSystemSettings = async (
  settings: Partial<SystemSettings>
): Promise<SystemSettings> => {
  const response = await api.post('/api/admin/settings/', settings);
  return response.data;
};
