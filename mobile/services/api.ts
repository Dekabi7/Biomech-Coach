const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export type ShotType = 'serve' | 'forehand' | 'backhand' | 'slice' | 'volley';
export type PlayerLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export interface UploadResponse {
  session_id: string;
  status: 'processing';
}

export interface MetricData {
  value: number;
  baseline: number;
  unit: string;
  status: 'green' | 'amber' | 'red';
  score: number;
  player_value: number;
  elite_value: number;
}

export interface RallyFeedback {
  fix_this: Array<{ title: string; body: string; drills: string[] }>;
  looking_good: Array<{ title: string; body: string }>;
  pro_tip: { title: string; body: string };
}

export interface SessionResult {
  id: string;
  shot_type: ShotType;
  player_level: PlayerLevel;
  elbow_angle: number;
  shoulder_rotation: number;
  wrist_snap_speed: number;
  weight_shift: number;
  hip_shoulder_timing: number;
  knee_bend_depth: number;
  overall_score: number;
  usta_percentile: number;
  ai_feedback: RallyFeedback;
  landmarks_data: object[];
  status: 'processing' | 'complete' | 'failed';
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  email: string;
  role: 'player' | 'coach';
  ntrp_rating: number;
  usta_rank: number | null;
  coach_id: string | null;
}

export interface RosterEntry extends Player {
  latest_score: number | null;
  weekly_change: number;
  trend: 'improving' | 'flat' | 'declining';
  recent_sessions: Array<{ overall_score: number; created_at: string; shot_type: ShotType }>;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  async uploadVideo(
    videoUri: string,
    shotType: ShotType,
    playerLevel: PlayerLevel,
    playerId: string,
    ntrpRating: number,
  ): Promise<UploadResponse> {
    const form = new FormData();
    form.append('video', { uri: videoUri, type: 'video/mp4', name: 'swing.mp4' } as any);
    form.append('shot_type', shotType);
    form.append('player_level', playerLevel);
    form.append('player_id', playerId);
    form.append('ntrp_rating', String(ntrpRating));

    const res = await fetch(`${BASE_URL}/api/upload/`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
    return res.json();
  },

  getStatus: (sessionId: string) =>
    request<{ id: string; status: string; error_message?: string }>(
      `/api/analysis/${sessionId}/status`,
    ),

  getAnalysis: (sessionId: string) =>
    request<SessionResult>(`/api/analysis/${sessionId}`),

  getPlayer: (playerId: string) =>
    request<Player>(`/api/players/${playerId}`),

  getPlayerSessions: (playerId: string) =>
    request<SessionResult[]>(`/api/players/${playerId}/sessions`),

  createPlayer: (name: string, email: string, ntrpRating: number) =>
    request<Player>('/api/players/', {
      method: 'POST',
      body: JSON.stringify({ name, email, ntrp_rating: ntrpRating, role: 'player' }),
    }),

  getCoachRoster: (coachId: string) =>
    request<RosterEntry[]>(`/api/players/coach/${coachId}/roster`),
};
