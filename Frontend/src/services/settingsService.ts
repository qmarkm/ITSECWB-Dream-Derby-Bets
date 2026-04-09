import api from '@/config/api';

export interface SessionSettings {
  timeout_minutes: number;
  warning_minutes: number;
}

export interface SystemSettings {
  timeout_minutes: number;
  warning_minutes: number;
  max_login_attempts?: number;
  lockout_duration_minutes?: number;
  initial_balance?: string;
  winning_multiplier?: string;
  consolation_multiplier?: string;
}

export interface LoggingSettings {
  syslog_host: string;
  syslog_port: number;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface SecurityLogsResponse {
  logs: LogEntry[];
  total: number;
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

export const updateLoggingSettings = async (
  settings: LoggingSettings
): Promise<void> => {
  await api.post('/api/admin/settings/', {
    syslog_host: settings.syslog_host,
    syslog_port: settings.syslog_port,
  });
};

export const getSecurityLogs = async (limit = 100): Promise<SecurityLogsResponse> => {
  const response = await api.get(`/api/admin/logs/?limit=${limit}`);
  return response.data;
};

export interface DeleteLogsFilter {
  level?: string;
  date_from?: string;
  date_to?: string;
}

export interface DeleteLogsResponse {
  deleted: number;
  remaining: number;
}

export const deleteSecurityLogs = async (filters: DeleteLogsFilter = {}): Promise<DeleteLogsResponse> => {
  const params = new URLSearchParams();
  if (filters.level)     params.append('level', filters.level);
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to)   params.append('date_to', filters.date_to);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await api.delete(`/api/admin/logs/delete/${query}`);
  return response.data;
};
