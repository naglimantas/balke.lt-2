import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, rankColors } from '../theme/colors';
import SystemPanel from '../components/SystemPanel';
import RankBadge from '../components/RankBadge';
import {
  getHunterProfile,
  getWorkoutHistory,
  getPersonalRecords,
  getLeaderboard,
} from '../utils/storage';

const CATEGORIES = [
  { key: 'most_xp_week', label: 'Most XP (Week)', icon: '⚡', unit: 'XP' },
  { key: 'longest_streak', label: 'Longest Streak', icon: '🔥', unit: 'days' },
  { key: 'most_workouts', label: 'Most Workouts', icon: '🏋️', unit: 'sessions' },
  { key: 'total_quests', label: 'Quests Completed', icon: '📜', unit: 'quests' },
];

export default function LeaderboardScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [personalRecords, setPersonalRecords] = useState({ exercises: {} });
  const [stats, setStats] = useState({});
  const [tab, setTab] = useState('records'); // records | prs

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [p, h, pr] = await Promise.all([
      getHunterProfile(),
      getWorkoutHistory(),
      getPersonalRecords(),
    ]);
    setProfile(p);
    setWorkoutHistory(h);
    setPersonalRecords(pr);

    // Calculate weekly XP from history
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weeklyXP = h
      .filter(w => new Date(w.date) > weekStart)
      .reduce((acc, w) => acc + (w.xpGained || 0), 0);

    setStats({
      most_xp_week: weeklyXP,
      longest_streak: p?.streak || 0,
      most_workouts: p?.totalWorkouts || 0,
      total_quests: 0, // We'd calculate from history
    });
  }

  if (!profile) return null;

  const rank = profile.rank || 'E';

  return (
    <LinearGradient colors={[colors.background, colors.darkPurple + '44', colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTag}>[ RANKING BOARD ]</Text>

          {/* Hunter Card */}
          <SystemPanel glow style={styles.hunterCard}>
            <View style={styles.hunterRow}>
              <RankBadge rank={rank} size="medium" />
              <View style={styles.hunterInfo}>
                <Text style={styles.hunterName}>{profile.name}</Text>
                <Text style={[styles.hunterRank, { color: rankColors[rank] }]}>{rank} — CLASS</Text>
              </View>
              <View style={styles.hunterXP}>
                <Text style={styles.xpValue}>{profile.xp.toLocaleString()}</Text>
                <Text style={styles.xpLabel}>TOTAL XP</Text>
              </View>
            </View>
          </SystemPanel>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {['records', 'prs'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && { color: colors.electricBlue }]}>
                  {t === 'records' ? 'SEASON RECORDS' : 'PERSONAL RECORDS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* SEASON RECORDS */}
          {tab === 'records' && (
            <>
              <Text style={styles.sectionSub}>Your personal bests across key metrics</Text>
              {CATEGORIES.map(cat => {
                const val = stats[cat.key] || 0;
                return (
                  <SystemPanel key={cat.key} style={styles.recordCard}>
                    <View style={styles.recordRow}>
                      <Text style={styles.recordIcon}>{cat.icon}</Text>
                      <View style={styles.recordInfo}>
                        <Text style={styles.recordLabel}>{cat.label}</Text>
                        <Text style={styles.recordDate}>Personal Best</Text>
                      </View>
                      <View style={styles.recordValue}>
                        <Text style={styles.recordNumber}>{val.toLocaleString()}</Text>
                        <Text style={styles.recordUnit}>{cat.unit}</Text>
                      </View>
                    </View>
                  </SystemPanel>
                );
              })}

              {/* Workout breakdown */}
              <SystemPanel style={styles.panel}>
                <Text style={styles.panelTitle}>COMBAT RECORD</Text>
                <View style={styles.grid}>
                  <StatBox label="Total Workouts" value={profile.totalWorkouts} icon="🏋️" />
                  <StatBox label="Current Streak" value={`${profile.streak}d`} icon="🔥" />
                  <StatBox label="Strength" value={profile.stats.strength} icon="💪" color={colors.strength} />
                  <StatBox label="Agility" value={profile.stats.agility} icon="⚡" color={colors.agility} />
                  <StatBox label="Endurance" value={profile.stats.endurance} icon="🛡" color={colors.endurance} />
                  <StatBox label="Vitality" value={profile.stats.vitality} icon="🌀" color={colors.vitality} />
                </View>
              </SystemPanel>
            </>
          )}

          {/* PERSONAL RECORDS */}
          {tab === 'prs' && (
            <>
              <Text style={styles.sectionSub}>Exercise-specific personal records</Text>
              {Object.keys(personalRecords.exercises).length === 0 ? (
                <SystemPanel style={styles.emptyPanel}>
                  <Text style={styles.emptyText}>
                    No personal records yet.{'\n'}
                    Complete workouts to set your first records.
                  </Text>
                </SystemPanel>
              ) : (
                Object.entries(personalRecords.exercises).map(([name, record]) => {
                  const date = new Date(record.date);
                  return (
                    <SystemPanel key={name} style={styles.prCard}>
                      <View style={styles.prRow}>
                        <View style={styles.prInfo}>
                          <Text style={styles.prName}>{name}</Text>
                          <Text style={styles.prDate}>{date.toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.prValue}>
                          <Text style={[styles.prNumber, { color: colors.gold }]}>{record.value}</Text>
                          <Text style={styles.prUnit}>{record.unit}</Text>
                        </View>
                      </View>
                    </SystemPanel>
                  );
                })
              )}

              {/* History Stats */}
              {workoutHistory.length > 0 && (
                <SystemPanel style={styles.panel}>
                  <Text style={styles.panelTitle}>RECENT PERFORMANCE</Text>
                  <Text style={styles.historyMeta}>
                    Avg workout duration:{' '}
                    {Math.round(workoutHistory.reduce((acc, w) => acc + (w.duration || 0), 0) / workoutHistory.length)} min
                  </Text>
                  <Text style={styles.historyMeta}>
                    Avg XP per session:{' '}
                    {Math.round(workoutHistory.reduce((acc, w) => acc + (w.xpGained || 0), 0) / workoutHistory.length)} XP
                  </Text>
                  <Text style={styles.historyMeta}>
                    Total XP from training:{' '}
                    {workoutHistory.reduce((acc, w) => acc + (w.xpGained || 0), 0).toLocaleString()} XP
                  </Text>
                </SystemPanel>
              )}
            </>
          )}

          {/* Rank Progression Note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              This board records only your own achievements.{'\n'}
              The Shadow Monarch watches your growth alone.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StatBox({ label, value, icon, color = colors.textPrimary }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBoxIcon}>{icon}</Text>
      <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  backBtn: { padding: 16, paddingBottom: 0 },
  backText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: colors.electricBlue, letterSpacing: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  screenTag: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.electricBlue, letterSpacing: 3, textAlign: 'center', marginBottom: 16 },

  hunterCard: { marginBottom: 16 },
  hunterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hunterInfo: { flex: 1 },
  hunterName: { fontFamily: 'Rajdhani_700Bold', fontSize: 20, color: colors.textPrimary, letterSpacing: 1 },
  hunterRank: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, letterSpacing: 2, marginTop: 2 },
  hunterXP: { alignItems: 'flex-end' },
  xpValue: { fontFamily: 'Rajdhani_700Bold', fontSize: 22, color: colors.gold },
  xpLabel: { fontFamily: 'Rajdhani_500Medium', fontSize: 9, color: colors.gold + 'aa', letterSpacing: 1 },

  tabRow: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.electricBlue },
  tabText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: colors.textSecondary, letterSpacing: 1 },

  sectionSub: { fontFamily: 'Rajdhani_400Regular', fontSize: 12, color: colors.textDim, letterSpacing: 0.5, marginBottom: 12 },

  recordCard: { marginBottom: 10 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recordIcon: { fontSize: 22 },
  recordInfo: { flex: 1 },
  recordLabel: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 15, color: colors.textPrimary, letterSpacing: 0.5 },
  recordDate: { fontFamily: 'Rajdhani_400Regular', fontSize: 11, color: colors.textDim, marginTop: 2 },
  recordValue: { alignItems: 'flex-end' },
  recordNumber: { fontFamily: 'Rajdhani_700Bold', fontSize: 22, color: colors.electricBlue },
  recordUnit: { fontFamily: 'Rajdhani_500Medium', fontSize: 10, color: colors.textSecondary, letterSpacing: 1 },

  panel: { marginBottom: 12 },
  panelTitle: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: '47%', padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 0, alignItems: 'center' },
  statBoxIcon: { fontSize: 18, marginBottom: 4 },
  statBoxValue: { fontFamily: 'Rajdhani_700Bold', fontSize: 22, letterSpacing: 1 },
  statBoxLabel: { fontFamily: 'Rajdhani_500Medium', fontSize: 10, color: colors.textSecondary, letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },

  emptyPanel: { alignItems: 'center' },
  emptyText: { fontFamily: 'Rajdhani_400Regular', fontSize: 13, color: colors.textDim, textAlign: 'center', lineHeight: 20, letterSpacing: 0.5 },

  prCard: { marginBottom: 8 },
  prRow: { flexDirection: 'row', alignItems: 'center' },
  prInfo: { flex: 1 },
  prName: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 15, color: colors.textPrimary },
  prDate: { fontFamily: 'Rajdhani_400Regular', fontSize: 11, color: colors.textDim, marginTop: 2 },
  prValue: { alignItems: 'flex-end' },
  prNumber: { fontFamily: 'Rajdhani_700Bold', fontSize: 22 },
  prUnit: { fontFamily: 'Rajdhani_500Medium', fontSize: 10, color: colors.textSecondary, letterSpacing: 1 },

  historyMeta: { fontFamily: 'Rajdhani_400Regular', fontSize: 13, color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 6 },

  footer: { alignItems: 'center', marginTop: 16 },
  footerText: { fontFamily: 'Rajdhani_400Regular', fontSize: 11, color: colors.textDim, textAlign: 'center', lineHeight: 18, letterSpacing: 0.5 },
});
