import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, rankColors, statColors } from '../theme/colors';
import SystemPanel from '../components/SystemPanel';
import RankBadge from '../components/RankBadge';
import XPBar from '../components/XPBar';
import StatBar from '../components/StatBar';
import { getHunterProfile, saveHunterProfile } from '../utils/storage';
import { getLevelFromXP, RANK_ORDER } from '../utils/xpSystem';

const RANK_LABELS = {
  E: 'E-Class',
  D: 'D-Class',
  C: 'C-Class',
  B: 'B-Class',
  A: 'A-Class',
  S: 'S-Class',
  National: 'National Level',
  Monarch: 'Monarch',
  Sovereign: 'Shadow Sovereign',
};

const STAT_INFO = {
  strength: {
    icon: '💪',
    desc: 'Raw physical power. Increases through strength training, push-ups, and resistance exercises.',
    gains: 'Gained from: Strength quests (+3), Workout sessions',
  },
  agility: {
    icon: '⚡',
    desc: 'Speed and reflexes. Built through cardio, flexibility work, and quick-movement exercises.',
    gains: 'Gained from: Cardio quests (+3), Flexibility training (+2)',
  },
  endurance: {
    icon: '🛡',
    desc: 'Stamina and staying power. Forged through long sessions, circuits, and sustained effort.',
    gains: 'Gained from: Endurance quests (+4), Strength quests (+1), Cardio (+2)',
  },
  vitality: {
    icon: '🌀',
    desc: 'Life force and recovery. Strengthened by rest, flexibility, and consistent training habits.',
    gains: 'Gained from: Rest quests (+3), Flexibility quests (+2), Endurance (+1)',
  },
  intelligence: {
    icon: '🧠',
    desc: 'Mental fortitude and adaptability. Awarded for completing quests and strategic training.',
    gains: 'Gained from: Every completed quest (+1), Quest-type quests (+2)',
  },
};

export default function HunterProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [selectedStat, setSelectedStat] = useState(null);

  useFocusEffect(
    useCallback(() => {
      getHunterProfile().then(setProfile);
    }, [])
  );

  function confirmResetProgress() {
    Alert.alert(
      'RESET PROGRESS',
      'This will reset XP, rank, stats, streak and titles to zero.\n\nYour custom quests and saved workouts will be kept.\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'RESET',
          style: 'destructive',
          onPress: async () => {
            const p = await getHunterProfile();
            if (!p) return;
            const reset = {
              ...p,
              xp: 0,
              level: 1,
              rank: 'E',
              stats: { strength: 10, agility: 10, endurance: 10, intelligence: 10, vitality: 10 },
              streak: 0,
              totalWorkouts: 0,
              lastWorkoutDate: null,
              lastQuestDate: null,
              titles: [],
            };
            await saveHunterProfile(reset);
            setProfile(reset);
          },
        },
      ]
    );
  }

  if (!profile) return null;

  const level = getLevelFromXP(profile.xp);
  const rank = profile.rank || 'E';
  const rankColor = rankColors[rank];

  return (
    <LinearGradient colors={[colors.background, colors.darkPurple + '55', colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTag}>[ HUNTER PROFILE ]</Text>

          <SystemPanel glow style={styles.heroPanel}>
            <View style={styles.heroRow}>
              <RankBadge rank={rank} size="xlarge" />
              <View style={styles.heroMeta}>
                <Text style={styles.hunterName}>{profile.name}</Text>
                <Text style={[styles.rankLabel, { color: rankColor }]}>{RANK_LABELS[rank]}</Text>
                <Text style={styles.levelLabel}>LEVEL {level}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaItem}>AGE {profile.age}</Text>
                  <Text style={styles.metaDivider}>|</Text>
                  <Text style={styles.metaItem}>{profile.bodyWeight} KG</Text>
                  <Text style={styles.metaDivider}>|</Text>
                  <Text style={[styles.metaItem, { textTransform: 'capitalize' }]}>{profile.fitnessLevel}</Text>
                </View>
              </View>
            </View>
          </SystemPanel>

          <SystemPanel style={styles.panel}>
            <XPBar totalXP={profile.xp} rank={rank} />
          </SystemPanel>

          <SystemPanel style={styles.panel}>
            <Text style={styles.panelTitle}>CORE STATISTICS</Text>
            <Text style={styles.panelSub}>Tap a stat to learn how it's gained</Text>
            {Object.entries(profile.stats).map(([stat, val]) => (
              <TouchableOpacity key={stat} onPress={() => setSelectedStat({ name: stat, value: val })} activeOpacity={0.7}>
                <StatBar statName={stat} value={val} showValue />
              </TouchableOpacity>
            ))}
          </SystemPanel>

          <SystemPanel style={styles.panel}>
            <Text style={styles.panelTitle}>HUNTER RECORD</Text>
            <View style={styles.recordGrid}>
              <View style={styles.recordItem}>
                <Text style={styles.recordValue}>{profile.streak}</Text>
                <Text style={styles.recordLabel}>🔥 Day Streak</Text>
              </View>
              <View style={styles.recordItem}>
                <Text style={styles.recordValue}>{profile.totalWorkouts}</Text>
                <Text style={styles.recordLabel}>🏋️ Total Workouts</Text>
              </View>
              <View style={styles.recordItem}>
                <Text style={styles.recordValue}>{profile.xp.toLocaleString()}</Text>
                <Text style={styles.recordLabel}>⚡ Total XP</Text>
              </View>
              <View style={styles.recordItem}>
                <Text style={styles.recordValue}>{profile.titles?.length || 0}</Text>
                <Text style={styles.recordLabel}>🏅 Titles</Text>
              </View>
            </View>
          </SystemPanel>

          <SystemPanel style={styles.panel}>
            <Text style={styles.panelTitle}>RANK PROGRESSION</Text>
            <View style={styles.rankTrack}>
              {RANK_ORDER.map((r, idx) => {
                const isCurrentRank = r === rank;
                const isPast = RANK_ORDER.indexOf(r) < RANK_ORDER.indexOf(rank);
                const rColor = rankColors[r];
                return (
                  <React.Fragment key={r}>
                    <View style={[
                      styles.rankNode,
                      { borderColor: rColor, backgroundColor: (isCurrentRank || isPast) ? rColor + '22' : 'transparent' },
                    ]}>
                      <Text style={[styles.rankNodeText, { color: rColor }]}>{r}</Text>
                      {isCurrentRank && <View style={[styles.activeDot, { backgroundColor: rColor }]} />}
                    </View>
                    {idx < RANK_ORDER.length - 1 && (
                      <View style={[styles.rankLine, { backgroundColor: isPast ? rankColors[RANK_ORDER[idx + 1]] + '44' : colors.border }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </SystemPanel>

          {profile.titles?.length > 0 && (
            <SystemPanel style={styles.panel}>
              <Text style={styles.panelTitle}>TITLES EARNED</Text>
              <View style={styles.titlesRow}>
                {profile.titles.map(title => (
                  <View key={title} style={styles.titleBadge}>
                    <Text style={styles.titleText}>{title}</Text>
                  </View>
                ))}
              </View>
            </SystemPanel>
          )}

          <SystemPanel style={[styles.panel, styles.dangerPanel]}>
            <Text style={styles.dangerTitle}>SYSTEM RESET</Text>
            <Text style={styles.dangerSub}>Wipe XP, rank, stats and streaks. Your custom quests and saved workouts are preserved.</Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={confirmResetProgress} activeOpacity={0.85}>
              <Text style={styles.dangerBtnText}>↺ RESET PROGRESS</Text>
            </TouchableOpacity>
          </SystemPanel>

          <View style={styles.quote}>
            <Text style={styles.quoteText}>"Power is not given. It is taken, forged through sacrifice."</Text>
          </View>
        </ScrollView>

        <Modal visible={!!selectedStat} transparent animationType="fade">
          <TouchableOpacity style={styles.statOverlay} activeOpacity={1} onPress={() => setSelectedStat(null)}>
            <View style={[styles.statModal, selectedStat && { borderColor: statColors[selectedStat.name] || colors.border }]}>
              {selectedStat && (() => {
                const info = STAT_INFO[selectedStat.name] || {};
                const color = statColors[selectedStat.name] || colors.electricBlue;
                return (
                  <>
                    <Text style={[styles.statModalIcon]}>{info.icon || '◆'}</Text>
                    <Text style={[styles.statModalName, { color }]}>{selectedStat.name.toUpperCase()}</Text>
                    <Text style={[styles.statModalValue, { color }]}>{selectedStat.value} <Text style={styles.statModalMax}>/ 500</Text></Text>
                    <View style={[styles.statModalBar, { backgroundColor: colors.surface }]}>
                      <View style={[styles.statModalFill, { width: `${Math.min(selectedStat.value / 500, 1) * 100}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.statModalDesc}>{info.desc}</Text>
                    <Text style={[styles.statModalGains, { color: color + 'bb' }]}>{info.gains}</Text>
                  </>
                );
              })()}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  backBtn: { padding: 16, paddingBottom: 0 },
  backText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 13,
    color: colors.electricBlue,
    letterSpacing: 2,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  screenTag: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 11,
    color: colors.electricBlue,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 16,
  },
  heroPanel: { marginBottom: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroMeta: { flex: 1 },
  hunterName: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  rankLabel: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 4,
  },
  levelLabel: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 3,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  metaItem: {
    fontFamily: 'Rajdhani_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  metaDivider: { color: colors.textDim, fontSize: 10 },
  panel: { marginBottom: 12 },
  panelTitle: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 2.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  panelSub: {
    fontFamily: 'Rajdhani_400Regular',
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  recordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  recordItem: { width: '45%', alignItems: 'center' },
  recordValue: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 28,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  recordLabel: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 3,
    textAlign: 'center',
  },
  rankTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  rankNode: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rankNodeText: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  activeDot: {
    position: 'absolute',
    bottom: -8,
    width: 6,
    height: 6,
    borderRadius: 0,
  },
  rankLine: { flex: 1, height: 1, marginHorizontal: 2 },
  titlesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  titleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 0,
    backgroundColor: colors.gold + '15',
  },
  titleText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 1,
  },
  statOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 32 },
  statModal: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderRadius: 0, padding: 24, alignItems: 'center' },
  statModalIcon: { fontSize: 36, marginBottom: 8 },
  statModalName: { fontFamily: 'Rajdhani_700Bold', fontSize: 20, letterSpacing: 3, marginBottom: 4 },
  statModalValue: { fontFamily: 'Rajdhani_700Bold', fontSize: 32, letterSpacing: 1, marginBottom: 12 },
  statModalMax: { fontFamily: 'Rajdhani_400Regular', fontSize: 16, color: colors.textDim },
  statModalBar: { width: '100%', height: 6, borderRadius: 1, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  statModalFill: { height: '100%', borderRadius: 1 },
  statModalDesc: { fontFamily: 'Rajdhani_400Regular', fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, letterSpacing: 0.3, marginBottom: 10 },
  statModalGains: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, textAlign: 'center', letterSpacing: 0.5, lineHeight: 17 },

  dangerPanel: { borderColor: colors.penalty + '88', marginTop: 8 },
  dangerTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 12, color: colors.penalty, letterSpacing: 2.5, marginBottom: 6 },
  dangerSub: { fontFamily: 'Rajdhani_400Regular', fontSize: 11, color: colors.textDim, lineHeight: 16, letterSpacing: 0.3, marginBottom: 12 },
  dangerBtn: { borderWidth: 1, borderColor: colors.penalty, borderRadius: 0, padding: 12, alignItems: 'center', backgroundColor: colors.penalty + '11' },
  dangerBtnText: { fontFamily: 'Rajdhani_700Bold', fontSize: 13, color: colors.penalty, letterSpacing: 2 },

  quote: { alignItems: 'center', marginTop: 16, paddingHorizontal: 20 },
  quoteText: {
    fontFamily: 'Rajdhani_400Regular',
    fontSize: 12,
    color: colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 18,
  },
});
