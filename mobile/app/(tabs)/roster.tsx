import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { api, RosterEntry } from '@/services/api';

const COACH_ID = 'demo-coach-id';

function SparkLine({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const max = Math.max(...scores, 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 24 }}>
      {scores.map((v, i) => (
        <View
          key={i}
          style={{
            width: 14,
            height: (v / max) * 24,
            backgroundColor: i === scores.length - 1 ? Colors.orange : Colors.grayDim,
            borderRadius: 2,
          }}
        />
      ))}
    </View>
  );
}

const TREND_COLOR = { improving: Colors.orange, flat: Colors.gray, declining: Colors.red };
const TREND_ARROW = { improving: '↑', flat: '→', declining: '↓' };

export default function RosterScreen() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCoachRoster(COACH_ID)
      .then(setRoster)
      .finally(() => setLoading(false));
  }, []);

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.title}>Player roster</Text>
        <View style={styles.coachBadge}><Text style={styles.coachBadgeText}>Coach</Text></View>
        <Text style={styles.count}>{roster.length} players</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.orange} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {roster.map(player => {
            const scores = player.recent_sessions.map(s => s.overall_score).filter(Boolean).reverse();
            const trendColor = TREND_COLOR[player.trend];
            const trendArrow = TREND_ARROW[player.trend];
            return (
              <View key={player.id} style={[styles.card, { borderLeftColor: trendColor }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: Colors.grayDim }]}>
                    <Text style={styles.avatarText}>{initials(player.name)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerSub}>
                      Age {player.usta_rank ? `· USTA #${player.usta_rank}` : ''}
                    </Text>
                  </View>
                  <View style={styles.trendBox}>
                    <Text style={[styles.trendVal, { color: trendColor }]}>
                      {trendArrow}{player.weekly_change > 0 ? '+' : ''}{player.weekly_change}
                    </Text>
                    <Text style={styles.trendSub}>this week</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>USTA rank</Text>
                    <Text style={styles.statVal}>#{player.usta_rank ?? '—'}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>NTRP</Text>
                    <Text style={styles.statVal}>{player.ntrp_rating ?? '—'}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Biomech</Text>
                    <Text style={styles.statVal}>{player.latest_score ?? '—'}/100</Text>
                  </View>
                  <SparkLine scores={scores} />
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
  safe:           { flex: 1, backgroundColor: Colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  dot:            { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.orange },
  title:          { color: Colors.text, fontSize: 18, fontWeight: '700', flex: 1 },
  coachBadge:     { backgroundColor: Colors.orangeDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  coachBadgeText: { color: Colors.orange, fontSize: 10, fontWeight: '700' },
  count:          { color: Colors.textSub, fontSize: 12 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:         { padding: 16, paddingBottom: 40, gap: 12 },
  card:           { backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderLeftWidth: 3 },
  cardTop:        { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:     { color: Colors.text, fontSize: 14, fontWeight: '700' },
  cardInfo:       { flex: 1 },
  playerName:     { color: Colors.text, fontSize: 15, fontWeight: '700' },
  playerSub:      { color: Colors.textSub, fontSize: 11, marginTop: 2 },
  trendBox:       { alignItems: 'flex-end' },
  trendVal:       { fontSize: 15, fontWeight: '700' },
  trendSub:       { color: Colors.textSub, fontSize: 10 },
  statsRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  stat:           { gap: 2 },
  statLabel:      { color: Colors.textSub, fontSize: 10 },
  statVal:        { color: Colors.text, fontSize: 13, fontWeight: '600' },
});
