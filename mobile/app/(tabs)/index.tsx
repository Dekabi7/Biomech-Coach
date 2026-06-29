import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { api, ShotType, PlayerLevel } from '@/services/api';
import { usePlayer } from '@/hooks/usePlayer';

const SHOT_TYPES: { key: ShotType; label: string; icon: string }[] = [
  { key: 'serve',     label: 'Serve',     icon: '🎾' },
  { key: 'forehand',  label: 'Forehand',  icon: '✊' },
  { key: 'backhand',  label: 'Backhand',  icon: '🤚' },
  { key: 'slice',     label: 'Slice',     icon: '✂️' },
  { key: 'volley',    label: 'Volley',    icon: '⚡' },
];

const LEVELS: { key: PlayerLevel; label: string; sub: string }[] = [
  { key: 'beginner',     label: 'Beginner',     sub: 'NTRP 1.0–2.5' },
  { key: 'intermediate', label: 'Intermediate', sub: 'NTRP 3.0–4.0' },
  { key: 'advanced',     label: 'Advanced',     sub: 'NTRP 4.5–5.0' },
  { key: 'elite',        label: 'Elite',        sub: 'NTRP 5.5+' },
];

const NTRP_MAP: Record<PlayerLevel, number> = {
  beginner: 2.0, intermediate: 3.5, advanced: 4.5, elite: 5.5,
};

export default function UploadScreen() {
  const router = useRouter();
  const { player, loading: playerLoading } = usePlayer();
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [shotType, setShotType] = useState<ShotType>('serve');
  const [playerLevel, setPlayerLevel] = useState<PlayerLevel>('intermediate');
  const [uploading, setUploading] = useState(false);

  async function pickFromCameraRoll() {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status === 'denied') {
        Alert.alert(
          'Photos access blocked',
          'Go to Settings → Expo Go → Photos → All Photos, then try again.',
        );
        return;
      }
      if (status !== 'granted') {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        videoMaxDuration: 30,
      });
      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        setVideoName(result.assets[0].fileName ?? 'video.mp4');
      }
    } catch (e: any) {
      // Error 3164 = iCloud video not downloaded locally
      if (e?.message?.includes('3164') || e?.code === 'E_PICKER_ICLOUD') {
        Alert.alert(
          'Video not available locally',
          'This video is stored in iCloud. Open the Photos app, tap the video to download it, then try again. Or use "Browse Files" instead.',
        );
      } else {
        Alert.alert('Camera Roll error', e?.message ?? 'Please try again.');
      }
    }
  }

  async function pickFromFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        setVideoName(result.assets[0].name ?? 'video.mp4');
      }
    } catch (e: any) {
      Alert.alert('File picker error', e?.message ?? 'Please try again.');
    }
  }

  async function analyse() {
    if (!videoUri) { Alert.alert('No video selected'); return; }
    if (!player) { Alert.alert('Not ready', 'Player profile still loading.'); return; }

    setUploading(true);
    try {
      const { session_id } = await api.uploadVideo(
        videoUri,
        shotType,
        playerLevel,
        player.id,
        NTRP_MAP[playerLevel],
      );
      router.push(`/analysis/${session_id}` as any);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.appName}>BiomechCoach</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {playerLoading ? '…' : (player?.name?.[0] ?? 'P')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Analyse your swing</Text>
        <Text style={styles.sub}>Upload a clip for elite coaching feedback</Text>

        {/* Video selection zone */}
        <View style={styles.dropZone}>
          <Text style={styles.dropIcon}>🎥</Text>
          <Text style={styles.dropMain}>
            {videoName ?? 'No video selected'}
          </Text>
          <Text style={styles.dropSub}>MP4 or MOV · max 200 MB</Text>

          <View style={styles.pickerRow}>
            <TouchableOpacity style={styles.pickerBtn} onPress={pickFromCameraRoll}>
              <Text style={styles.pickerBtnIcon}>📷</Text>
              <Text style={styles.pickerBtnText}>Camera Roll</Text>
            </TouchableOpacity>
            <View style={styles.pickerDivider} />
            <TouchableOpacity style={styles.pickerBtn} onPress={pickFromFiles}>
              <Text style={styles.pickerBtnIcon}>📁</Text>
              <Text style={styles.pickerBtnText}>Browse Files</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shot type */}
        <Text style={styles.sectionLabel}>Shot type</Text>
        <View style={styles.grid2}>
          {SHOT_TYPES.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.selector, shotType === s.key && styles.selectorActive]}
              onPress={() => setShotType(s.key)}
            >
              <Text style={styles.selectorIcon}>{s.icon}</Text>
              <Text style={[styles.selectorText, shotType === s.key && styles.selectorTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Player level */}
        <Text style={styles.sectionLabel}>Player level</Text>
        <View style={styles.grid2}>
          {LEVELS.map(l => (
            <TouchableOpacity
              key={l.key}
              style={[styles.selector, playerLevel === l.key && styles.selectorActive]}
              onPress={() => setPlayerLevel(l.key)}
            >
              <Text style={[styles.selectorText, playerLevel === l.key && styles.selectorTextActive]}>
                {l.label}
              </Text>
              <Text style={styles.selectorSub}>{l.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, (!videoUri || uploading || playerLoading) && styles.ctaDisabled]}
          onPress={analyse}
          disabled={!videoUri || uploading || playerLoading}
        >
          {uploading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.ctaText}>Analyse swing →</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: Colors.bg },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  appName:          { color: Colors.orange, fontSize: 16, fontWeight: '700' },
  avatar:           { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
  avatarText:       { color: Colors.white, fontSize: 14, fontWeight: '700' },
  scroll:           { padding: 20, paddingBottom: 40 },
  heading:          { color: Colors.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  sub:              { color: Colors.textSub, fontSize: 13, marginBottom: 24 },
  dropZone:         { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', padding: 24, marginBottom: 28 },
  dropIcon:         { fontSize: 28, marginBottom: 8 },
  dropMain:         { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  dropSub:          { color: Colors.textSub, fontSize: 12, marginBottom: 20 },
  pickerRow:        { flexDirection: 'row', alignItems: 'center', gap: 0 },
  pickerBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  pickerBtnIcon:    { fontSize: 16 },
  pickerBtnText:    { color: Colors.text, fontSize: 13, fontWeight: '600' },
  pickerDivider:    { width: 10 },
  sectionLabel:     { color: Colors.text, fontSize: 14, fontWeight: '600', marginBottom: 10 },
  grid2:            { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, gap: 8 },
  selector:         { flex: 1, minWidth: '45%', backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 14, alignItems: 'center' },
  selectorActive:   { backgroundColor: Colors.orangeDim, borderColor: Colors.orange },
  selectorIcon:     { fontSize: 18, marginBottom: 4 },
  selectorText:     { color: Colors.gray, fontSize: 14, fontWeight: '600' },
  selectorTextActive: { color: Colors.orange },
  selectorSub:      { color: Colors.textSub, fontSize: 10, marginTop: 2 },
  ctaBtn:           { backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  ctaDisabled:      { opacity: 0.4 },
  ctaText:          { color: Colors.text, fontSize: 16, fontWeight: '700' },
});
