import apiClient from '@/config/api';
import { StringToBoolean } from 'class-variance-authority/types';

export type AptitudeRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface Skill {
    id: number;
    name: string;
    description: string;
}

export interface Aptitude extends AptitudeCreationData {}

export interface BaseUma {
    id: number;
    name: string;
    avatar_url: string | null;
    is_active: boolean;
    skills: Skill[];
}

export interface Uma {
    base_uma: BaseUma;
    id: number;
    name: string;
    avatar_url: string | null;
    user: number;
    user_username?: string;
    
    // Stats
    speed: number;
    stamina: number;
    power: number;
    guts: number;
    wit: number;

    // Relations (Output usually gives full objects, not just IDs)
    skills: Skill[]; 
    aptitudes: Aptitude; 

    // Race record
    races_won: number;
    races_lost: number;

    // System fields
    created_at: string; // ISO Date string
    updated_at: string;
}

//Interfaces from Pages
export interface AptitudeCreationData {
    turf: AptitudeRank;
    dirt: AptitudeRank;
    
    short: AptitudeRank;
    mile: AptitudeRank;
    medium: AptitudeRank;
    long: AptitudeRank;
    
    front: AptitudeRank;
    pace: AptitudeRank;
    late: AptitudeRank;
    end: AptitudeRank;
}

export interface NewUmaProfile {
    name: string;
    avatar?: string | File | null;
    base_uma_id?: number | null;

    //Statistics
    speed: number;
    stamina: number;
    power: number;
    guts: number;
    wit: number;

    //Skills
    skill_ids: number[];

    //Aptitudes
    aptitudes: AptitudeCreationData;
}

//Queries
export const getAllUmas = async (): Promise<Uma[]> => {
    const response = await apiClient.get<Uma[]>('/api/umamusume/');
    return response.data;
};

export const getUma = async (id: number): Promise<Uma> => {
    const response = await apiClient.get<Uma>(`/api/umamusume/uma/${id}/`);
    return response.data;
};

export const getBaseUmas = async (): Promise<BaseUma[]> => {
    const response = await apiClient.get<BaseUma[]>('/api/umamusume/get-umas/');
    return response.data;
};

export const getMyUmas = async (): Promise<Uma[]> => {
    const response = await apiClient.get<Uma[]>('/api/umamusume/my-umas/');
    return response.data;
};

export const getSkills = async(): Promise<Skill[]> => {
    const response = await apiClient.get<Skill[]>('api/umamusume/skills/');
    return response.data;
}

export const createUma = async (data: NewUmaProfile): Promise<Uma> => {
    const formData = new FormData();

    formData.append('name', data.name);
    if (data.base_uma_id != null) {
        formData.append('base_uma_id', data.base_uma_id.toString());
    }
    formData.append('speed', data.speed.toString());
    formData.append('stamina', data.stamina.toString());
    formData.append('power', data.power.toString());
    formData.append('guts', data.guts.toString());
    formData.append('wit', data.wit.toString());

    if (data.avatar instanceof File) {
        formData.append('avatar', data.avatar);
    } else if (typeof data.avatar === 'string' && data.avatar) {
        formData.append('avatar_url', data.avatar);
    }

    data.skill_ids.forEach(id => formData.append('skill_ids', id.toString()));
    formData.append('aptitudes', JSON.stringify(data.aptitudes));

    const response = await apiClient.post<Uma>('/api/umamusume/create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
}

export const deleteUma = async (id: number): Promise<void> => {
    await apiClient.delete(`/api/umamusume/delete/${id}/`);
};

export const updateUma = async (id: number, data: Partial<NewUmaProfile>): Promise<Uma> => {
    const response = await apiClient.patch<Uma>(`/api/umamusume/update/${id}/`, data);
    return response.data;
};

export interface BaseUmaCreateData {
    name: string;
    avatar_url?: string;
}

export interface CsvImportError {
    row: number;
    name: string;
    reason: string;
}

export interface CsvImportResult {
    created: number;
    skipped: number;
    error_count: number;
    errors: CsvImportError[];
}

export const adminCreateBaseUma = async (data: BaseUmaCreateData): Promise<BaseUma> => {
    const response = await apiClient.post<BaseUma>('/api/umamusume/uma/create/', data);
    return response.data;
};

export const adminImportUmasCSV = async (file: File): Promise<CsvImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<CsvImportResult>('/api/umamusume/uma/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const adminCreateSkill = async (data: { name: string; description: string }): Promise<Skill> => {
    const response = await apiClient.post<Skill>('/api/umamusume/skill/create/', data);
    return response.data;
};

export const adminAssignSkillToUma = async (skillId: number, umaId: number): Promise<Skill> => {
    const response = await apiClient.post<Skill>('/api/umamusume/skill/assign/', {
        skill_id: skillId,
        uma_id: umaId,
    });
    return response.data;
};

export const adminUpdateUma = async (id: number, data: Partial<BaseUmaCreateData>): Promise<BaseUma> => {
    const response = await apiClient.patch<BaseUma>(`/api/umamusume/uma/${id}/update/`, data);
    return response.data;
};

export const adminUnassignSkill = async (skillId: number): Promise<void> => {
    await apiClient.post(`/api/umamusume/skill/${skillId}/unassign/`);
};

export const adminGetAllUmas = async (): Promise<BaseUma[]> => {
    const response = await apiClient.get<BaseUma[]>('/api/umamusume/uma/admin-list/');
    return response.data;
};

export const adminToggleUmaActive = async (id: number): Promise<BaseUma> => {
    const response = await apiClient.post<BaseUma>(`/api/umamusume/uma/${id}/toggle/`);
    return response.data;
};

export const adminDeleteUma = async (id: number): Promise<void> => {
    await apiClient.delete(`/api/umamusume/uma/${id}/delete/`);
};

export interface SkillAdmin {
    id: number;
    name: string;
    description: string;
    uma_id: number | null;
    uma_name: string | null;
}

export const adminGetAllSkills = async (): Promise<SkillAdmin[]> => {
    const response = await apiClient.get<SkillAdmin[]>('/api/umamusume/skill/admin-list/');
    return response.data;
};

export const adminUpdateSkill = async (id: number, data: { name?: string; description?: string }): Promise<SkillAdmin> => {
    const response = await apiClient.patch<SkillAdmin>(`/api/umamusume/skill/${id}/update/`, data);
    return response.data;
};

export const adminDeleteSkill = async (id: number): Promise<void> => {
    await apiClient.delete(`/api/umamusume/skill/${id}/delete/`);
};