-- BiomechCoach Supabase Schema
-- Run this in the Supabase SQL Editor

-- Players table (covers both player and coach roles)
CREATE TABLE players (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'coach')),
  ntrp_rating DECIMAL(3,1),
  usta_rank   INTEGER,
  coach_id    UUID REFERENCES players(id),  -- null for coaches, set for players
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table — one row per analysis run
CREATE TABLE sessions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id           UUID REFERENCES players(id) ON DELETE CASCADE,
  shot_type           TEXT NOT NULL CHECK (shot_type IN ('serve', 'forehand', 'backhand', 'slice', 'volley')),
  player_level        TEXT NOT NULL CHECK (player_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
  video_url           TEXT,
  -- Raw biomechanical metrics
  elbow_angle         DECIMAL(5,2),
  shoulder_rotation   DECIMAL(5,2),
  wrist_snap_speed    DECIMAL(5,2),
  weight_shift        DECIMAL(5,2),
  hip_shoulder_timing INTEGER,
  knee_bend_depth     DECIMAL(5,2),
  -- Scores
  overall_score       INTEGER,
  usta_percentile     INTEGER,
  -- JSON blobs
  ai_feedback         JSONB,
  landmarks_data      JSONB,  -- MediaPipe landmarks for skeleton overlay (first 30 frames)
  -- Processing state
  status              TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'complete', 'failed')),
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX sessions_player_id_idx  ON sessions(player_id);
CREATE INDEX sessions_created_at_idx ON sessions(created_at DESC);
CREATE INDEX sessions_status_idx     ON sessions(status);

-- Storage bucket setup (do this in Supabase dashboard > Storage)
-- Bucket name : biomech-videos
-- Public      : true (so video URLs work without auth tokens)
-- File size   : 200MB max
