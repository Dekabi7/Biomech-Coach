import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

type CardType = 'fix_this' | 'looking_good' | 'pro_tip';

interface Props {
  type: CardType;
  title: string;
  body: string;
  drills?: string[];
}

const BADGE: Record<CardType, { label: string; color: string; bg: string }> = {
  fix_this:     { label: 'Fix this',     color: Colors.white,  bg: Colors.red },
  looking_good: { label: 'Looking good', color: Colors.white,  bg: Colors.green },
  pro_tip:      { label: 'Pro tip',      color: Colors.white,  bg: Colors.orangeDim },
};

export function RallyCard({ type, title, body, drills }: Props) {
  const badge = BADGE[type];
  return (
    <View style={styles.card}>
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {drills && drills.map((d, i) => (
        <View key={i} style={styles.drillRow}>
          <View style={styles.drillBullet}>
            <Text style={styles.drillNum}>{i + 1}</Text>
          </View>
          <Text style={styles.drillText}>{d}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    color: Colors.textSub,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  drillBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  drillNum: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  drillText: {
    color: Colors.text,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
});
