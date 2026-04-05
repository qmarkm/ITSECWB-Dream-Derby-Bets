import apiClient from '@/config/api';

export type DistCategory = 'Sprint' | 'Mile' | 'Medium' | 'Long';
export type TrackDirection = 'left' | 'right' | 'straight';
export type TrackType = 'turf' | 'dirt';

export interface Track {
    id: number;
    name: string;
    image: string | null;
    distance: string;
    dist_category: DistCategory;
    direction: TrackDirection;
    track_type: TrackType;
}

export interface TrackWriteData {
    name: string;
    image?: string;
    distance?: string;
    dist_category: DistCategory;
    direction: TrackDirection;
    track_type: TrackType;
}

export const adminGetTracks = async (): Promise<Track[]> => {
    const response = await apiClient.get<Track[]>('/api/events/tracks/');
    return response.data;
};

export const adminCreateTrack = async (data: TrackWriteData): Promise<Track> => {
    const response = await apiClient.post<Track>('/api/events/tracks/create/', data);
    return response.data;
};

export const adminUpdateTrack = async (id: number, data: Partial<TrackWriteData>): Promise<Track> => {
    const response = await apiClient.patch<Track>(`/api/events/tracks/${id}/update/`, data);
    return response.data;
};

export const adminDeleteTrack = async (id: number): Promise<void> => {
    await apiClient.delete(`/api/events/tracks/${id}/delete/`);
};
