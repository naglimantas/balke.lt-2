import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { rankColors } from '../theme/colors';
import SystemPanel from '../components/SystemPanel';
import RankBadge from '../components/RankBadge';
import XPBar from '../components/XPBar';
import StatBar from '../components/StatBar';
import {
  getHunterProfile,
  getDailyQuests,
  getTodayKey,
  getBossData,
  getWeekStartDate,
} from '../utils/storage';
import { getLevelFromXP, getRankForXP } from '../utils/xpSystem';
import { getWeeklyBoss } from '../utils/workoutData';

const { width } = Dimensions.get('window');

const NAV_ITEMS = [
  { screen: 'HunterProfile', icon: '👤', label: 'PROFILE' },
  { screen: 'DailyQuests', icon: '📜', label: 'QUESTS' },
  { screen: 'WorkoutLibrary', icon: '🏋️', label: 'TRAIN' },
  { screen: 'BossBattle', icon: '⚔️', label: 'BOSS' },
  { screen: 'Progress', icon: '📊', label: 'STATS' },
  { screen: 'Leaderboard', icon: '🏆', label: 'RANKS' },
];

const RANK_DISPLAY = {
  E: 'E — CLASS HUNTER',
  D: 'D — CLASS HUNTER',
  C: 'C — CLASS HUNTER',
  B: 'B — CLASS HUNTER',
  A: 'A — CLASS HUNTER',
  S: 'S — CLASS HUNTER',
  National: 'NATIONAL LEVEL',
  Monarch: 'MONARCH',
  Sovereign: 'SHADOW SOVEREIGN',
};

export default function HomeDashboardScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [dailyQuests, setDailyQuests] = useState(null);
  const [bossAvailable, setBossAvailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function loadData() {
    const p = await getHunterProfile();
    setProfile(p);

    const quests = await getDailyQuests(getTodayKey());
    setDailyQuests(quests);

    const bossData = await getBossData();
    const weekStart = getWeekStartDate();
    const available = !bossData || bossData.weekStart !== weekStart || !bossData.defeated;
    setBossAvailable(available);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (!profile) return null;

  const rank = profile.rank || getRankForXP(profile.xp);
  const level = getLevelFromXP(profile.xp);
  const questsCompleted = dailyQuests?.quests?.filter(q => q.completed).length || 0;
  const questsTotal = dailyQuests?.quests?.length || 0;
  const rankColor = rankColors[rank];

  return (
    <LinearGradient
      colors={[colors.background, colors.darkPurple + '66', colors.background]}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.electricBlue} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.systemHeader}>
            <Text style={styles.systemTag}>[ SHADOW MONARCH SYSTEM ]</Text>
          </View>

          <View style={styles.heroSection}>
            <RankBadge rank={rank} size="medium" />
            <View style={styles.heroInfo}>
              <Text style={styles.hunterName}>{profile.name}</Text>
              <Text style={[styles.rankText, { color: rankColor }]}>{RANK_DISPLAY[rank] || rank}</Text>
              <Text style={styles.levelText}>LVL {level}</Text>
            </View>
          </View>

          <SystemPanel style={styles.xpPanel}>
            <XPBar totalXP={profile.xp} rank={rank} />
          </SystemPanel>

          <SystemPanel style={styles.statsPanel}>
            <Text style={styles.panelTitle}>CORE STATS</Text>
            {Object.entries(profile.stats).map(([stat, val]) => (
              <StatBar key={stat} statName={stat} value={val} compact />
            ))}
          </SystemPanel>

          <View style={styles.metricsRow}>
            <SystemPanel style={styles.metricCard}>
              <Text style={styles.metricValue}>{profile.streak}</Text>
              <Text style={styles.metricLabel}>🔥 DAY STREAK</Text>
            </SystemPanel>
            <SystemPanel style={styles.metricCard}>
              <Text style={styles.metricValue}>{profile.totalWorkouts}</Text>
              <Text style={styles.metricLabel}>🏋️ WORKOUTS</Text>
            </SystemPanel>
            <SystemPanel style={styles.metricCard}>
              <Text style={[styles.metricValue, { color: questsCompleted === questsTotal && questsTotal > 0 ? colors.success : colors.textPrimary }]}>
                {questsCompleted}/{questsTotal}
              </Text>
              <Text style={styles.metricLabel}>📜 QUESTS</Text>
            </SystemPanel>
          </View>

          <Text style={styles.sectionTitle}>[ HUNTER INTERFACE ]</Text>
          <View style={styles.navGrid}>
            {NAV_ITEMS.map(item => {
              const isBoss = item.screen === 'BossBattle';
              return (
                <Animated.View
                  key={item.screen}
                  style={isBoss ? { transform: [{ scale: pulseAnim }] } : {}}
                >
                  <TouchableOpacity
                    style={[
                      styles.navItem,
                      isBoss && bossAvailable && styles.navItemBoss,
                    ]}
                    onPress={() => navigation.navigate(item.screen)}
                    activeOpacity={0.75}
                  >
                    <LinearGradient
                      colors={
                        isBoss && bossAvailable
                          ? [colors.penaltyDark, colors.penalty + '44', colors.penaltyDark]
                          : [colors.surfaceElevated, colors.surface]
                      }
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.navGrad}
                    >
                      <Text style={styles.navIcon}>{item.icon}</Text>
                      <Text style={[
                        styles.navLabel,
                        isBoss && bossAvailable && { color: colors.penalty },
                      ]}>
                        {item.label}
                      </Text>
                      {isBoss && bossAvailable && (
                        <Text style={styles.bossAlert}>NEW</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {dailyQuests?.quests?.length > 0 && questsCompleted < questsTotal && (
            <SystemPanel style={styles.alertPanel}>
              <Text style={styles.alertText}>
                ⚠ {questsTotal - questsCompleted} quest{questsTotal - questsCompleted !== 1 ? 's' : ''} remaining today.
                Complete them before midnight.
              </Text>
            </SystemPanel>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              "The Shadow Monarch acknowledges your presence."
            </Text>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 14, paddingBottom: 24 },

  systemHeader: { alignItems: 'center', marginBottom: 12, marginTop: 4 },
  systemTag: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 12,
    color: colors.electricBlue,
    letterSpacing: 3,
  },

  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  heroInfo: { flex: 1 },
  hunterName: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 30,
    color: colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  rankText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 2,
  },
  levelText: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },

  xpPanel: { marginBottom: 10, padding: 14 },
  statsPanel: { marginBottom: 10, padding: 14 },
  panelTitle: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 3,
    marginBottom: 8,
  },

  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricCard: { flex: 1, alignItems: 'center', padding: 12 },
  metricValue: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  metricLabel: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 3,
    textAlign: 'center',
  },

  sectionTitle: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 12,
    color: colors.electricBlue,
    letterSpacing: 3,
    marginBottom: 8,
    textAlign: 'center',
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  navItem: {
    width: (width - 48) / 3,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navItemBoss: {
    borderColor: colors.penalty,
    shadowColor: colors.penalty,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.6,
    elevation: 6,
  },
  navGrad: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 82,
    position: 'relative',
  },
  navIcon: { fontSize: 28, marginBottom: 5 },
  navLabel: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  bossAlert: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 7,
    color: colors.penalty,
    letterSpacing: 1,
    backgroundColor: colors.penaltyDark,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },

  alertPanel: { borderColor: colors.warning, marginBottom: 6, padding: 10 },
  alertText: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 11,
    color: colors.warning,
    letterSpacing: 0.5,
  },

  footer: { alignItems: 'center', marginTop: 4 },
  footerText: {
    fontFamily: 'Rajdhani_400Regular',
    fontSize: 10,
    color: colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
