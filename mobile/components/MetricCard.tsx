import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  label: string;
  value: number;
  unit: string;
  eliteValue: number;
  status: 'green' | 'amber' | 'red';
}

const STATUS_COLOR = {
  green:  Colors.orange,
  amber:  Colors.gray,
  red:    Colors.red,
};

export function MetricCard({ label, value, unit, eliteValue, status }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: STATUS_COLOR[status] }]}>
        {value.toFixed(1)}{unit}
      </Text>
      <Text style={styles.elite}>Elite: {eliteValue.toFixed(1)}{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    flex: 1,
    margin: 4,
  },
  label: {
    color: Colors.textSub,
    fontSize: 11,
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
  },
  elite: {
    color: Colors.gray,
    fontSize: 11,
    marginTop: 2,
  },
});
