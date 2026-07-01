import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, PanResponder,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Colors } from '@/constants/colors';
import { api, SessionResult } from '@/services/api';
import { MetricCard } from '@/components/MetricCard';
import { SkeletonOverlay } from '@/components/SkeletonOverlay';

const { width: SCREEN_W } = Dimensions.get('window');
const PANEL_H = 260;
const SCRUB_W = SCREEN_W - 32;

const METRIC_LABELS: { key: keyof SessionResult; label: string; unit: string }[] = [
  { key: 'elbow_angle',       label: 'Elbow angle',   unit: '°'    },
  { key: 'shoulder_rotation', label: 'Shoulder rot.', unit: '°'    },
  { key: 'wrist_snap_speed',  label: 'Wrist snap',    unit: ' m/s' },
  { key: 'weight_shift',      label: 'Weight shift',  unit: '%'    },
];

const ELITE_DEFAULTS: Record<string, number> = {
  elbow_angle: 112, shoulder_rotation: 85, wrist_snap_speed: 9.8, weight_shift: 74,
};

type Tab = 'your_form' | 'ideal_form' | 'compare';

const IDEAL_LANDMARKS: Record<string, { x: number; y: number }> = {
  left_shoulder:  { x: 0.35, y: 0.28 }, right_shoulder: { x: 0.65, y: 0.28 },
  left_elbow:     { x: 0.22, y: 0.44 }, right_elbow:    { x: 0.78, y: 0.44 },
  left_wrist:     { x: 0.12, y: 0.60 }, right_wrist:    { x: 0.88, y: 0.60 },
  left_hip:       { x: 0.40, y: 0.55 }, right_hip:      { x: 0.60, y: 0.55 },
  left_knee:      { x: 0.38, y: 0.73 }, right_knee:     { x: 0.62, y: 0.73 },
  left_ankle:     { x: 0.37, y: 0.90 }, right_ankle:    { x: 0.63, y: 0.90 },
};

const SPEEDS = [
  { label: '0.25x', value: 0.25 },
  { label: '0.5x',  value: 0.5  },
  { label: '1x',    value: 1.0  },
];

function peakFrame(frames: Record<string, { x: number; y: number }>[]) {
  if (!frames?.length) return {};
  return frames[Math.floor(frames.length / 2)] ?? frames[0];
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const dec = Math.floor((ms % 1000) / 100);
  return `${s}.${dec}s`;
}

// Defined outside component so it never remounts on state changes
interface VideoPanelProps {
  videoUrl: string;
  landmarks: Record<string, { x: number; y: number }>;
  width: number;
  height: number;
  videoRef: React.RefObject<Video>;
  onPlaybackUpdate: (status: AVPlaybackStatus) => void;
}

const VideoPanel = memo(({ videoUrl, landmarks, width, height, videoRef, onPlaybackUpdate }: VideoPanelProps) => (
  <View style={{ width, height, backgroundColor: Colors.card, borderRadius: 10, overflow: 'hidden' }}>
    <Video
      ref={videoRef}
      source={{ uri: videoUrl }}
      style={{ width, height }}
      resizeMode={ResizeMode.COVER}
      shouldPlay
      isLooping
      isMuted
      onPlaybackStatusUpdate={onPlaybackUpdate}
    />
    {Object.keys(landmarks).length > 0 && (
      <SkeletonOverlay
        landmarks={landmarks}
        width={width}
        height={height}
        color={Colors.orange}
        showProblems
      />
    )}
  </View>
));

const IdealPanel = memo(({ width, height }: { width: number; height: number }) => (
  <View style={{ width, height, backgroundColor: Colors.card, borderRadius: 10, overflow: 'hidden' }}>
    <SkeletonOverlay
      landmarks={IDEAL_LANDMARKS}
      width={width}
      height={height}
      color={Colors.gray}
      showProblems={false}
    />
  </View>
));

export default function AnalysisScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionResult | null>(null);
  const [polling, setPolling] = useState(true);
  const [tab, setTab] = useState<Tab>('your_form');

  const videoRef = useRef<Video>(null);
  const [speed, setSpeed] = useState(1.0);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const isSeeking = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    intervalRef.current = setInterval(async () => {
      try {
        const status = await api.getStatus(sessionId);
        if (status.status === 'complete') {
          clearInterval(intervalRef.current!);
          const result = await api.getAnalysis(sessionId);
          setSession(result);
          setPolling(false);
        } else if (status.status === 'failed') {
          clearInterval(intervalRef.current!);
          setPolling(false);
        }
      } catch {}
    }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [sessionId]);

  const onPlaybackUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded || isSeeking.current) return;
    setPositionMs(status.positionMillis ?? 0);
    setDurationMs(status.durationMillis ?? 0);
  }, []);

  async function applySpeed(rate: number) {
    setSpeed(rate);
    await videoRef.current?.setRateAsync(rate, true);
  }

  async function seekTo(x: number) {
    if (!durationMs) return;
    const pct = Math.max(0, Math.min(1, x / SCRUB_W));
    const targetMs = Math.floor(pct * durationMs);
    setPositionMs(targetMs);
    await videoRef.current?.setPositionAsync(targetMs);
  }

  const scrubPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => { isSeeking.current = true; seekTo(e.nativeEvent.locationX); },
      onPanResponderMove: (e) => { seekTo(e.nativeEvent.locationX); },
      onPanResponderRelease: () => { isSeeking.current = false; },
    })
  ).current;

  const frames = session?.landmarks_data as Record<string, { x: number; y: number }>[] | undefined;
  const contactFrame = frames ? peakFrame(frames) : {};
  const shotLabel = session
    ? session.shot_type.charAt(0).toUpperCase() + session.shot_type.slice(1)
    : '';

  const showControls = tab === 'your_form' || tab === 'compare';
  const panelW = tab === 'compare' ? (SCREEN_W - 40) / 2 : SCREEN_W - 32;
  const progressPct = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{session ? `${shotLabel} analysis` : 'Analysing...'}</Text>
        <Text style={styles.baseline}>vs USTA 4.0+</Text>
      </View>

      {polling ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.loadingText}>Running CV pipeline...</Text>
          <Text style={styles.loadingSubText}>MediaPipe is extracting your pose. Usually 15 to 30 seconds.</Text>
        </View>
      ) : session ? (
        <ScrollView>
          <View style={styles.tabBar}>
            {(['your_form', 'ideal_form', 'compare'] as Tab[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'your_form' ? 'Your Form' : t === 'ideal_form' ? 'Ideal Form' : 'Compare'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.panelRow}>
            {(tab === 'your_form' || tab === 'compare') && session.video_url && (
              <View>
                {tab === 'your_form' && <Text style={styles.panelLabel}>Your swing</Text>}
                <VideoPanel
                  videoUrl={session.video_url}
                  landmarks={contactFrame}
                  width={panelW}
                  height={PANEL_H}
                  videoRef={videoRef}
                  onPlaybackUpdate={onPlaybackUpdate}
                />
              </View>
            )}
            {(tab === 'ideal_form' || tab === 'compare') && (
              <View>
                {tab === 'ideal_form' && <Text style={styles.panelLabel}>Elite baseline</Text>}
                <IdealPanel width={panelW} height={PANEL_H} />
              </View>
            )}
          </View>

          {showControls && (
            <View style={styles.controls}>
              <View style={styles.speedRow}>
                <Text style={styles.speedLabel}>Speed</Text>
                {SPEEDS.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.speedBtn, speed === s.value && styles.speedBtnActive]}
                    onPress={() => applySpeed(s.value)}
                  >
                    <Text style={[styles.speedBtnText, speed === s.value && styles.speedBtnTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.timeText}>
                  {formatTime(positionMs)} / {formatTime(durationMs)}
                </Text>
              </View>
              <View style={styles.scrubTrack} {...scrubPan.panHandlers}>
                <View style={[styles.scrubFill, { width: `${progressPct * 100}%` as any }]} />
                <View style={[styles.scrubThumb, { left: `${progressPct * 100}%` as any }]} />
              </View>
            </View>
          )}

          <View style={styles.metricsGrid}>
            {METRIC_LABELS.map(({ key, label, unit }) => {
              const val = (session[key] as number) ?? 0;
              const elite = ELITE_DEFAULTS[key as string] ?? 0;
              const diff = Math.abs(val - elite);
              const status = diff <= 5 ? 'green' : diff <= 12 ? 'amber' : 'red';
              return (
                <MetricCard key={key as string} label={label} value={val} unit={unit} eliteValue={elite} status={status} />
              );
            })}
          </View>

          <View style={styles.scoreSection}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Overall score</Text>
              <Text style={styles.scoreVal}>{session.overall_score}/100</Text>
            </View>
            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarFill, { width: `${session.overall_score}%` as any }]} />
            </View>
            <View style={[styles.scoreRow, { marginTop: 12 }]}>
              <Text style={styles.scoreLabel}>USTA percentile</Text>
              <Text style={styles.scoreVal}>{session.usta_percentile}th</Text>
            </View>
            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarFill, { width: `${session.usta_percentile}%` as any }]} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.feedbackBtn}
            onPress={() => router.push(`/feedback/${sessionId}` as any)}
          >
            <Text style={styles.feedbackBtnText}>View Rally feedback</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Analysis failed. Please try again.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: Colors.orange }}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: Colors.bg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back:             { color: Colors.orange, fontSize: 14 },
  title:            { color: Colors.text, fontSize: 16, fontWeight: '700' },
  baseline:         { color: Colors.orange, fontSize: 11 },
  loading:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText:      { color: Colors.text, fontSize: 15, textAlign: 'center' },
  loadingSubText:   { color: Colors.textSub, fontSize: 12, textAlign: 'center' },
  tabBar:           { flexDirection: 'row', marginHorizontal: 16, backgroundColor: Colors.card, borderRadius: 10, padding: 4, marginBottom: 16 },
  tabBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive:     { backgroundColor: Colors.surface },
  tabText:          { color: Colors.gray, fontSize: 12 },
  tabTextActive:    { color: Colors.orange, fontWeight: '600' },
  panelRow:         { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 12 },
  panelLabel:       { color: Colors.textSub, fontSize: 11, marginBottom: 6 },
  controls:         { marginHorizontal: 16, marginBottom: 16 },
  speedRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  speedLabel:       { color: Colors.textSub, fontSize: 12 },
  speedBtn:         { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  speedBtnActive:   { backgroundColor: Colors.orangeDim, borderColor: Colors.orange },
  speedBtnText:     { color: Colors.gray, fontSize: 12, fontWeight: '600' },
  speedBtnTextActive: { color: Colors.orange },
  timeText:         { color: Colors.textSub, fontSize: 11, marginLeft: 'auto' },
  scrubTrack:       { height: 28, justifyContent: 'center', position: 'relative' },
  scrubFill:        { height: 4, backgroundColor: Colors.orange, borderRadius: 2, position: 'absolute', left: 0 },
  scrubThumb:       { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.orange, position: 'absolute', top: 6, marginLeft: -8 },
  metricsGrid:      { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, marginBottom: 16 },
  scoreSection:     { marginHorizontal: 16, marginBottom: 20 },
  scoreRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreLabel:       { color: Colors.textSub, fontSize: 12 },
  scoreVal:         { color: Colors.text, fontSize: 13, fontWeight: '600' },
  scoreBar:         { height: 6, backgroundColor: Colors.card, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  scoreBarFill:     { height: 6, backgroundColor: Colors.orange, borderRadius: 3 },
  feedbackBtn:      { marginHorizontal: 16, marginBottom: 32, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  feedbackBtnText:  { color: Colors.text, fontSize: 15, fontWeight: '700' },
});
