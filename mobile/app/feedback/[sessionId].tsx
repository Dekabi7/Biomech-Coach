import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { api, RallyFeedback, SessionResult } from '@/services/api';
import { RallyCard } from '@/components/RallyCard';

export default function FeedbackScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    api.getAnalysis(sessionId)
      .then(setSession)
      .finally(() => setLoading(false));
  }, [sessionId]);

  const feedback = session?.ai_feedback as RallyFeedback | undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Coaching feedback</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Rally AI</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.orange} />
        </View>
      ) : feedback ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {feedback.fix_this?.map((item, i) => (
            <RallyCard key={i} type="fix_this" title={item.title} body={item.body} drills={item.drills} />
          ))}
          {feedback.looking_good?.map((item, i) => (
            <RallyCard key={i} type="looking_good" title={item.title} body={item.body} />
          ))}
          {feedback.pro_tip?.title && (
            <RallyCard type="pro_tip" title={feedback.pro_tip.title} body={feedback.pro_tip.body} />
          )}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={styles.empty}>No feedback available.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back:      { color: Colors.orange, fontSize: 14 },
  title:     { color: Colors.text, fontSize: 17, fontWeight: '700' },
  badge:     { backgroundColor: Colors.orangeDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: Colors.orange, fontSize: 11, fontWeight: '700' },
  scroll:    { padding: 16, paddingBottom: 40 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:     { color: Colors.textSub, fontSize: 14 },
});
