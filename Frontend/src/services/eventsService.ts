import apiClient from '@/config/api';

export type DistCategory = 'Sprint' | 'Mile' | 'Medium' | 'Long';
export type TrackDirection = 'left' | 'right' | 'straight';
export type TrackType = 'turf' | 'dirt';
export type RaceStatus = 'scheduled' | 'open' | 'active' | 'race_ongoing' | 'completed';

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

export interface RaceParticipant {
    id: number;          // Results.id — used as `uma` FK when placing a bid
    umamusume: number;
    umamusume_data: {
        id: number;
        name: string;
        image: string | null;
    };
    place: number | null;
}

export interface RaceEvent {
    id: number;
    created_at: string;
    host: number;
    host_username: string;
    status: RaceStatus;
    opening_dt: string | null;
    is_published: boolean;
    active_dt: string | null;
    race_start_dt: string | null;
    race_end_dt: string | null;
    track: number | null;
    track_name: string | null;
    umas: any;
    bid_count: number;
    participants: RaceParticipant[];
}

export interface RaceEventWriteData {
    track?: number | null;
    opening_dt?: string | null;
    is_published?: boolean;
    active_dt?: string | null;
    race_start_dt?: string | null;
    race_end_dt?: string | null;
}

export interface RaceEventUpdateData extends RaceEventWriteData {
    status?: RaceStatus;
}

export interface RaceResultInput {
    result_id: number;
    place: number;
}

// ── Track endpoints ──────────────────────────────────────────────────────────

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

// ── Race Event endpoints ─────────────────────────────────────────────────────

export const adminGetRaceEvents = async (): Promise<RaceEvent[]> => {
    const response = await apiClient.get<RaceEvent[]>('/api/events/');
    return response.data;
};

export const adminCreateRaceEvent = async (data: RaceEventWriteData): Promise<RaceEvent> => {
    const response = await apiClient.post<RaceEvent>('/api/events/create/', data);
    return response.data;
};

export const adminUpdateRaceEvent = async (id: number, data: RaceEventUpdateData): Promise<RaceEvent> => {
    const response = await apiClient.patch<RaceEvent>(`/api/events/${id}/update/`, data);
    return response.data;
};

export const adminDeleteRaceEvent = async (id: number): Promise<void> => {
    await apiClient.delete(`/api/events/${id}/delete/`);
};

export const adminSetRaceResults = async (id: number, results: RaceResultInput[]): Promise<RaceEvent> => {
    const response = await apiClient.post<RaceEvent>(`/api/events/${id}/results/`, results);
    return response.data;
};

// ── Bid types & endpoints (regular user) ────────────────────────────────────

export interface Bid {
    id: number;
    race_event: number;
    race_event_status: RaceStatus;
    race_track_name: string | null;
    bidder: number;
    bidder_username: string;
    amount: number;
    uma: number | null;        // Results.id
    umamusume_name: string | null;
    created_at: string;
}

export const getRaceEvents = async (): Promise<RaceEvent[]> => {
    const response = await apiClient.get<RaceEvent[]>('/api/events/');
    return response.data;
};

export const getRaceEvent = async (id: number): Promise<{ race: RaceEvent; bids: Bid[] }> => {
    const response = await apiClient.get<{ race: RaceEvent; bids: Bid[] }>(`/api/events/${id}/`);
    return response.data;
};

export const getMyBids = async (): Promise<Bid[]> => {
    const response = await apiClient.get<Bid[]>('/api/events/my-bids/');
    return response.data;
};

export const placeBid = async (raceId: number, data: { amount: number; uma?: number | null }): Promise<Bid> => {
    const response = await apiClient.post<Bid>(`/api/events/${raceId}/bids/`, data);
    return response.data;
};

export const updateBid = async (bidId: number, amount: number): Promise<Bid> => {
    const response = await apiClient.patch<Bid>(`/api/events/bids/${bidId}/`, { amount });
    return response.data;
};

export const cancelBid = async (bidId: number): Promise<void> => {
    await apiClient.delete(`/api/events/bids/${bidId}/`);
};

// ── Trainer enrollment ───────────────────────────────────────────────────────

export const enrollUmamusume = async (raceId: number, umamusumeId: number): Promise<RaceParticipant> => {
    const response = await apiClient.post<RaceParticipant>(`/api/events/${raceId}/enroll/`, {
        umamusume_id: umamusumeId,
    });
    return response.data;
};
