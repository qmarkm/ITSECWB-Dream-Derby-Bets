export type RaceStatus = "open" | "upcoming" | "active" | "completed" | "cancelled";

export type AptitudeGrade = "S" | "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface UmamusumeStats {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wit: number;
}

export interface UmamusumeAptitudes {
  turf: AptitudeGrade;
  dirt: AptitudeGrade;
  short: AptitudeGrade;
  mile: AptitudeGrade;
  medium: AptitudeGrade;
  long: AptitudeGrade;
  front: AptitudeGrade;
  pace: AptitudeGrade;
  late: AptitudeGrade;
  end: AptitudeGrade;
}

export interface Umamusume {
  id: string;
  name: string;
  picture: string;
  owner: string;
  ownerId: string;
  odds: number;
  stats: UmamusumeStats;
  skills: string[];
  aptitudes: UmamusumeAptitudes;
}

export interface Bet {
  id: string;
  userId: string;
  username: string;
  umamusumeId: string;
  umamusumeName: string;
  amount: number;
  createdAt: Date;
}

export interface Race {
  id: string;
  name: string;
  description: string;
  status: RaceStatus;
  createdBy: string;
  umamusumes: Umamusume[];
  bets: Bet[];
  createdAt: Date;
  scheduledAt?: Date;
  winnerId?: string;
}
