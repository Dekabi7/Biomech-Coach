import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { api, SessionResult } from '@/services/api';

const PLAYER_ID = 'demo-player-id';

function MiniBar({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 40 }}>
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            width: 18,
            height: (v / max) * 40,
            backgroundColor: i === values.length - 1 ? Colors.orange : Colors.grayDim,
            borderRadius: 3,
          }}
        />
      ))}
    </View>
  );
}

export default function ProgressScreen() {
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPlayerSessions(PLAYER_ID)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  const scores = sessions.map(s => s.overall_score).filter(Boolean).reverse();
  const first = scores[0] ?? 0;
  const last = scores[scores.length - 1] ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.title}>Your progress</Text>
        <Text style={styles.count}>{sessions.length} sessions</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.orange} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Mini charts */}
          <View style={styles.chartRow}>
            <View style={styles.chartCard}>
              <Text style={styles.chartLabel}>Overall score</Text>
              <MiniBar values={scores} />
              {scores.length >= 2 && (
                <Text style={styles.chartDelta}>
                  {first}→{last}/100
                </Text>
              )}
            </View>
          </View>

          {/* Session history */}
          <Text style={styles.sectionLabel}>Session history</Text>
          {sessions.map((s, i) => {
            const prev = sessions[i + 1];
            const delta = prev ? s.overall_score - prev.overall_score : null;
            const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <View key={s.id} style={styles.sessionRow}>
                <Text style={styles.sessionDate}>{date}</Text>
                <Text style={styles.sessionShot}>
                  {s.shot_type.charAt(0).toUpperCase() + s.shot_type.slice(1)}
                </Text>
                <View style={styles.sessionRight}>
                  <Text style={styles.sessionScore}>{s.overall_score}</Text>
                  {delta !== null && (
                    <Text style={[styles.sessionDelta, { color: delta >= 0 ? Colors.orange : Colors.red }]}>
                      {delta >= 0 ? `↑+${delta}` : `↓${delta}`}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  dot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.orange },
  title:        { color: Colors.text, fontSize: 18, fontWeight: '700', flex: 1 },
  count:        { color: Colors.textSub, fontSize: 12 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 16, paddingBottom: 40 },
  chartRow:     { flexDirection: 'row', gap: 12, marginBottom: 24 },
  chartCard:    { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14, gap: 8 },
  chartLabel:   { color: Colors.textSub, fontSize: 11 },
  chartDelta:   { color: Colors.orange, fontSize: 13, fontWeight: '700' },
  sectionLabel: { color: Colors.text, fontSize: 14, fontWeight: '600', marginBottom: 10 },
  sessionRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sessionDate:  { color: Colors.textSub, fontSize: 12, width: 50 },
  sessionShot:  { color: Colors.text, fontSize: 14, flex: 1 },
  sessionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionScore: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  sessionDelta: { fontSize: 12, fontWeight: '600' },
});
