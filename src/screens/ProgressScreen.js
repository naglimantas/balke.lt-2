import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { colors, statColors } from '../theme/colors';
import SystemPanel from '../components/SystemPanel';
import { getHunterProfile, getWorkoutHistory, getWeeklyStats } from '../utils/storage';
import { getLevelFromXP } from '../utils/xpSystem';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 200;
const STAT_NAMES = ['strength', 'agility', 'endurance', 'intelligence', 'vitality'];

function MiniLineChart({ data, color, formatY }) {
  const pad = { top: 12, bottom: 28, left: 48, right: 10 };
  const w = CHART_WIDTH - pad.left - pad.right;
  const h = CHART_HEIGHT - pad.top - pad.bottom;

  const yValues = data.map(d => d.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const yRange = maxY - minY || 1;

  const points = data
    .map((d, i) => {
      const x = pad.left + (i / Math.max(data.length - 1, 1)) * w;
      const y = pad.top + ((maxY - d.y) / yRange) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const yTicks = [maxY, (maxY + minY) / 2, minY];

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {yTicks.map((val, i) => {
        const y = pad.top + (i / 2) * h;
        return (
          <React.Fragment key={i}>
            <Line
              x1={pad.left} y1={y}
              x2={pad.left + w} y2={y}
              stroke={colors.border + '55'} strokeWidth={1}
            />
            <SvgText
              x={pad.left - 4} y={y + 4}
              textAnchor="end" fontSize={9}
              fill={colors.textDim}
            >
              {formatY ? formatY(val) : Math.round(val)}
            </SvgText>
          </React.Fragment>
        );
      })}
      <Line
        x1={pad.left} y1={pad.top + h}
        x2={pad.left + w} y2={pad.top + h}
        stroke={colors.border} strokeWidth={1}
      />
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
    </Svg>
  );
}

export default function ProgressScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [selectedStat, setSelectedStat] = useState('strength');
  const [tab, setTab] = useState('stats');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    const [p, h, ws] = await Promise.all([getHunterProfile(), getWorkoutHistory(), getWeeklyStats()]);
    setProfile(p); setHistory(h); setWeeklyStats(ws);
  }

  if (!profile) return null;

  const level = getLevelFromXP(profile.xp);
  const snapshots = weeklyStats.slice(-14);
  const statChartData = snapshots.map((snap, i) => ({ x: i + 1, y: snap.stats?.[selectedStat] || 0 }));
  const xpChartData = snapshots.map((snap, i) => ({ x: i + 1, y: snap.xp || 0 }));
  const last7 = history.filter(w => new Date(w.date) > new Date(Date.now() - 7 * 86400000)).length;
  const hasChart = snapshots.length >= 2;

  return (
    <LinearGradient colors={[colors.background, colors.darkPurple + '44', colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTag}>[ PROGRESS ANALYTICS ]</Text>

          <View style={styles.summaryRow}>
            <SystemPanel style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{last7}</Text>
              <Text style={styles.summaryLabel}>WORKOUTS{`\n`}THIS WEEK</Text>
            </SystemPanel>
            <SystemPanel style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{profile.streak}</Text>
              <Text style={styles.summaryLabel}>🔥 DAY{`\n`}STREAK</Text>
            </SystemPanel>
            <SystemPanel style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{level}</Text>
              <Text style={styles.summaryLabel}>CURRENT{`\n`}LEVEL</Text>
            </SystemPanel>
          </View>

          <View style={styles.tabRow}>
            {['stats', 'workouts'].map(t => (
              <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && { color: colors.electricBlue }]}>{t.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'stats' && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statSelector}>
                {STAT_NAMES.map(s => {
                  const sc = statColors[s];
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statChip, selectedStat === s && { borderColor: sc, backgroundColor: sc + '22' }]}
                      onPress={() => setSelectedStat(s)}
                    >
                      <Text style={[styles.statChipText, selectedStat === s && { color: sc }]}>{s.toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {hasChart ? (
                <SystemPanel style={styles.chartPanel} noPad>
                  <Text style={[styles.chartTitle, { color: statColors[selectedStat] }]}>{selectedStat.toUpperCase()} OVER TIME</Text>
                  <MiniLineChart data={statChartData} color={statColors[selectedStat]} />
                </SystemPanel>
              ) : (
                <SystemPanel style={styles.noDataPanel}>
                  <Text style={styles.noDataText}>Complete workouts to unlock stat charts.</Text>
                </SystemPanel>
              )}

              <SystemPanel style={styles.panel}>
                <Text style={styles.panelTitle}>CURRENT STAT VALUES</Text>
                {STAT_NAMES.map(s => {
                  const sc = statColors[s];
                  const val = profile.stats[s] || 0;
                  return (
                    <View key={s} style={styles.statRow}>
                      <Text style={[styles.statName, { color: sc }]}>{s.toUpperCase()}</Text>
                      <View style={styles.statTrack}>
                        <View style={[styles.statFill, { width: `${Math.min(val / 500 * 100, 100)}%`, backgroundColor: sc }]} />
                      </View>
                      <Text style={[styles.statVal, { color: sc }]}>{val}</Text>
                    </View>
                  );
                })}
              </SystemPanel>

              {hasChart && (
                <SystemPanel style={styles.chartPanel} noPad>
                  <Text style={[styles.chartTitle, { color: colors.gold }]}>XP OVER TIME</Text>
                  <MiniLineChart
                    data={xpChartData}
                    color={colors.gold}
                    formatY={v => `${Math.round(v / 1000)}k`}
                  />
                </SystemPanel>
              )}
            </>
          )}

          {tab === 'workouts' && (
            <>
              {history.length === 0 ? (
                <SystemPanel style={styles.noDataPanel}>
                  <Text style={styles.noDataText}>No workout history yet. Complete your first session.</Text>
                </SystemPanel>
              ) : (
                history.slice(0, 30).map((w, i) => <WorkoutHistoryItem key={w.id || i} workout={w} />)
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function WorkoutHistoryItem({ workout }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(workout.date);
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  const totalSets = workout.exercises?.reduce((acc, e) => {
    const sets = e.sets;
    return acc + (Array.isArray(sets) ? sets.length : 0);
  }, 0) || 0;

  return (
    <View style={[styles.historyItem, expanded && styles.historyItemOpen]}>
      <TouchableOpacity style={styles.historyHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={styles.historyLeft}>
          <Text style={styles.historyName}>{workout.name}</Text>
          <Text style={styles.historyMeta}>{dateStr} · {workout.duration}min{totalSets > 0 ? ` · ${totalSets} sets` : ''}</Text>
        </View>
        <View style={styles.historyRight}>
          <Text style={styles.historyXP}>+{workout.xpGained}</Text>
          <Text style={styles.historyXPLabel}>XP</Text>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.historyDetail}>
          {workout.exercises?.map((ex, i) => {
            const sets = Array.isArray(ex.sets) ? ex.sets.filter(s => s.reps > 0) : [];
            if (sets.length === 0) return null;
            const isTime = ex.unit === 'seconds' || ex.unit === 'minutes';
            return (
              <View key={i} style={styles.historyExBlock}>
                <Text style={styles.historyExName}>{ex.name}</Text>
                {sets.map((st, j) => (
                  <Text key={j} style={styles.historySetLine}>
                    {j + 1}.{st.weight > 0 ? ` ${st.weight}kg ×` : ''} {st.reps} {isTime ? ex.unit : 'reps'} @ RPE {st.rpe}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      )}
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

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, alignItems: 'center', padding: 12 },
  summaryValue: { fontFamily: 'Rajdhani_700Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: 1 },
  summaryLabel: { fontFamily: 'Rajdhani_500Medium', fontSize: 9, color: colors.textSecondary, letterSpacing: 1, marginTop: 4, textAlign: 'center', lineHeight: 14 },

  tabRow: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.electricBlue },
  tabText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: colors.textSecondary, letterSpacing: 1.5 },

  statSelector: { marginBottom: 12, flexGrow: 0 },
  statChip: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 0, marginRight: 8, backgroundColor: colors.surface },
  statChipText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: colors.textSecondary, letterSpacing: 1 },

  chartPanel: { marginBottom: 12, overflow: 'hidden', padding: 12 },
  chartTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 11, letterSpacing: 2.5, marginBottom: 4 },
  noDataPanel: { marginBottom: 12, alignItems: 'center' },
  noDataText: { fontFamily: 'Rajdhani_400Regular', fontSize: 13, color: colors.textDim, textAlign: 'center', letterSpacing: 0.5, lineHeight: 20 },

  panel: { marginBottom: 12 },
  panelTitle: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5, marginBottom: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  statName: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, letterSpacing: 1, width: 80 },
  statTrack: { flex: 1, height: 5, backgroundColor: colors.surface, borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  statFill: { height: '100%', borderRadius: 0 },
  statVal: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, width: 36, textAlign: 'right' },

  historyItem: { borderBottomWidth: 1, borderBottomColor: colors.border },
  historyItemOpen: { borderBottomColor: colors.electricBlue + '44' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  historyLeft: { flex: 1 },
  historyName: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 15, color: colors.textPrimary, letterSpacing: 0.5 },
  historyMeta: { fontFamily: 'Rajdhani_400Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyRight: { alignItems: 'center', gap: 2 },
  historyXP: { fontFamily: 'Rajdhani_700Bold', fontSize: 18, color: colors.gold },
  historyXPLabel: { fontFamily: 'Rajdhani_500Medium', fontSize: 9, color: colors.gold + 'aa', letterSpacing: 1 },
  chevron: { fontFamily: 'Rajdhani_500Medium', fontSize: 10, color: colors.textDim, marginTop: 2 },

  historyDetail: { paddingBottom: 12, paddingLeft: 4 },
  historyExBlock: { marginBottom: 10 },
  historyExName: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: colors.textAccent, letterSpacing: 0.5, marginBottom: 4 },
  historySetLine: { fontFamily: 'Rajdhani_400Regular', fontSize: 12, color: colors.textSecondary, letterSpacing: 0.3, marginBottom: 2, paddingLeft: 8 },
});
