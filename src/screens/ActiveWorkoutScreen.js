import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Alert, TextInput, AppState,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, rankColors } from '../theme/colors';
import SystemPanel from '../components/SystemPanel';
import {
  getHunterProfile, saveHunterProfile, addWorkoutToHistory,
  recordWeeklySnapshot, getPreviousWorkoutForPlan,
} from '../utils/storage';
import { calcXPForWorkout, calcStatGains, checkRankUp, getRankForXP } from '../utils/xpSystem';
import { getRandomQuote } from '../utils/workoutData';
import { scheduleRestEndNotification, cancelRestEndNotification } from '../utils/notifications';

// ─── Set Card ───────────────────────────────────────────────────────────────────
function SetCard({ setNumber, setData, prevSet, exUnit, onUpdate, onToggle }) {
  const isTime = exUnit === 'seconds' || exUnit === 'minutes';
  const showWeight = !isTime && exUnit !== 'effort';

  return (
    <View style={[sc.card, setData.completed && sc.cardDone]}>
      <View style={sc.header}>
        <Text style={[sc.label, setData.completed && sc.labelDone]}>SET {setNumber}</Text>
        <TouchableOpacity style={[sc.check, setData.completed && sc.checkDone]} onPress={onToggle}>
          {setData.completed && <Text style={sc.checkMark}>✓</Text>}
        </TouchableOpacity>
      </View>

      <View style={sc.row}>
        {showWeight && (
          <View style={sc.col}>
            <Text style={sc.colLabel}>WEIGHT (KG)</Text>
            <TextInput
              style={[sc.input, setData.completed && sc.inputDone]}
              value={setData.weight}
              onChangeText={v => onUpdate('weight', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textDim}
              selectTextOnFocus
            />
          </View>
        )}
        <View style={sc.col}>
          <Text style={sc.colLabel}>{isTime ? exUnit.toUpperCase() : 'REPS'}</Text>
          <TextInput
            style={[sc.input, setData.completed && sc.inputDone]}
            value={setData.reps}
            onChangeText={v => onUpdate('reps', v)}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textDim}
            selectTextOnFocus
          />
        </View>
        <View style={sc.col}>
          <Text style={sc.colLabel}>RPE</Text>
          <TextInput
            style={[sc.input, setData.completed && sc.inputDone]}
            value={String(setData.rpe)}
            onChangeText={v => {
              const n = parseInt(v);
              if (!isNaN(n)) onUpdate('rpe', Math.min(10, Math.max(1, n)));
            }}
            keyboardType="number-pad"
            placeholder="7"
            placeholderTextColor={colors.textDim}
            maxLength={2}
            selectTextOnFocus
          />
        </View>
      </View>

      {!!prevSet && (
        <Text style={sc.prev}>
          {`prev: ${showWeight && prevSet.weight > 0 ? `${prevSet.weight}kg × ` : ''}${prevSet.reps} ${isTime ? exUnit : 'reps'} @ RPE ${prevSet.rpe}`}
        </Text>
      )}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────────
export default function ActiveWorkoutScreen({ navigation, route }) {
  const { workout } = route.params;
  const exercises = workout.exercises || [];

  const [phase, setPhase] = useState('ready');
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [setsData, setSetsData] = useState([]);
  const [prevWorkout, setPrevWorkout] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [completedExData, setCompletedExData] = useState([]);
  const [newRank, setNewRank] = useState(null);
  const [finaleQuote] = useState(getRandomQuote());

  const timerRef = useRef(null);
  const restRef = useRef(null);
  const workoutStartTsRef = useRef(null);
  const restEndsAtRef = useRef(null);
  const phaseRef = useRef('ready');
  const restActiveRef = useRef(false);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { restActiveRef.current = restActive; }, [restActive]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    getPreviousWorkoutForPlan(workout.name).then(setPrevWorkout);
    return () => { cancelRestEndNotification(); clearInterval(timerRef.current); clearInterval(restRef.current); };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') return;
      if (phaseRef.current === 'workout' && workoutStartTsRef.current)
        setElapsedSeconds(Math.floor((Date.now() - workoutStartTsRef.current) / 1000));
      if (restActiveRef.current && restEndsAtRef.current) {
        const rem = Math.max(0, Math.floor((restEndsAtRef.current - Date.now()) / 1000));
        setRestTimer(rem);
        if (rem === 0) { cancelRestEndNotification(); triggerRestEndAlert(); setRestActive(false); }
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (phase === 'workout') {
      timerRef.current = setInterval(() => {
        if (workoutStartTsRef.current)
          setElapsedSeconds(Math.floor((Date.now() - workoutStartTsRef.current) / 1000));
      }, 1000);
    } else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffect(() => {
    if (restActive) {
      restRef.current = setInterval(() => {
        if (!restEndsAtRef.current) return;
        const rem = Math.max(0, Math.floor((restEndsAtRef.current - Date.now()) / 1000));
        setRestTimer(rem);
        if (rem === 0) { clearInterval(restRef.current); cancelRestEndNotification(); triggerRestEndAlert(); setRestActive(false); }
      }, 500);
    } else { clearInterval(restRef.current); }
    return () => clearInterval(restRef.current);
  }, [restActive]);

  function buildSetsData(prev) {
    return exercises.map(ex => {
      const prevEx = prev?.exercises?.find(e => e.name === ex.name);
      return Array.from({ length: ex.sets }, (_, i) => {
        const ps = prevEx?.sets?.[i];
        return {
          weight: ps?.weight > 0 ? String(ps.weight) : '',
          reps: ps?.reps ? String(ps.reps) : String(ex.reps || ''),
          rpe: ps?.rpe ?? 7,
          completed: false,
        };
      });
    });
  }

  function startWorkout() {
    setSetsData(buildSetsData(prevWorkout));
    workoutStartTsRef.current = Date.now();
    setPhase('workout');
  }

  function updateSet(exIdx, setIdx, field, value) {
    setSetsData(prev => {
      const next = prev.map(ex => [...ex]);
      next[exIdx] = next[exIdx].map((s, i) => i === setIdx ? { ...s, [field]: value } : s);
      return next;
    });
  }

  function toggleSet(exIdx, setIdx) {
    setSetsData(prev => {
      const next = prev.map(ex => [...ex]);
      const wasCompleted = next[exIdx][setIdx].completed;
      next[exIdx] = next[exIdx].map((s, i) => i === setIdx ? { ...s, completed: !s.completed } : s);
      if (!wasCompleted) {
        const dur = exercises[exIdx]?.rest || 60;
        restEndsAtRef.current = Date.now() + dur * 1000;
        setRestTimer(dur);
        scheduleRestEndNotification(dur);
        setRestActive(true);
      }
      return next;
    });
  }

  function skipRest() {
    cancelRestEndNotification();
    restEndsAtRef.current = Date.now();
    setRestTimer(0);
    setRestActive(false);
  }

  function triggerRestEndAlert() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }

  async function finishWorkout() {
    cancelRestEndNotification();
    clearInterval(timerRef.current);
    clearInterval(restRef.current);

    const actualElapsed = workoutStartTsRef.current
      ? Math.floor((Date.now() - workoutStartTsRef.current) / 1000)
      : elapsedSeconds;
    setElapsedSeconds(actualElapsed);

    const exResults = exercises.map((ex, i) => ({
      name: ex.name, unit: ex.unit, type: ex.type,
      sets: (setsData[i] || []).filter(s => s.completed).map(s => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0,
        rpe: s.rpe,
      })),
    }));

    setCompletedExData(exResults);
    const durationMin = Math.floor(actualElapsed / 60);
    const xp = calcXPForWorkout(exResults, durationMin);
    setXpGained(xp);
    setPhase('complete');

    const profile = await getHunterProfile();
    if (!profile) return;

    const oldXP = profile.xp;
    profile.xp += xp;
    profile.totalWorkouts += 1;
    profile.lastWorkoutDate = new Date().toISOString();

    const today = new Date().toDateString();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const lastDate = profile.lastWorkoutDate ? new Date(profile.lastWorkoutDate).toDateString() : null;
    if (lastDate !== today)
      profile.streak = lastDate === yesterday.toDateString() ? profile.streak + 1 : 1;

    const gains = calcStatGains(workout.category || 'strength', 1);
    for (const [stat, val] of Object.entries(gains))
      if (profile.stats[stat] !== undefined) profile.stats[stat] += val;
    profile.stats.vitality += 1;

    const rankCheck = checkRankUp(oldXP, profile.xp);
    profile.rank = getRankForXP(profile.xp);
    await saveHunterProfile(profile);
    await addWorkoutToHistory({ name: workout.name, category: workout.category, exercises: exResults, duration: durationMin, xpGained: xp });
    await recordWeeklySnapshot(profile);
    if (rankCheck.didRankUp) setNewRank(rankCheck.newRank);
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ── READY ─────────────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <LinearGradient colors={[colors.background, colors.darkPurple, colors.background]} style={s.root}>
        <SafeAreaView style={s.safe} edges={['top']}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← ABORT</Text>
          </TouchableOpacity>
          <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={s.readyScroll} showsVerticalScrollIndicator={false}>
            <Text style={s.systemInit}>[ PROTOCOL LOADED ]</Text>
            <Text style={s.workoutName}>{workout.name}</Text>
            <Text style={s.workoutMeta}>{exercises.length} EXERCISES · {workout.duration} MIN</Text>
            {prevWorkout && (
              <Text style={s.prevBadge}>↳ LAST SESSION: {new Date(prevWorkout.date).toLocaleDateString()}</Text>
            )}
            <View style={s.exList}>
              {exercises.map((ex, i) => {
                const prevEx = prevWorkout?.exercises?.find(e => e.name === ex.name);
                const best = prevEx?.sets?.reduce((b, st) => (!b || st.reps > b.reps) ? st : b, null);
                return (
                  <View key={i} style={s.exListRow}>
                    <Text style={s.exListName}>{i + 1}. {ex.name} — {ex.sets}×{ex.reps} {ex.unit}</Text>
                    {best && (
                      <Text style={s.exListPrev}>
                        {best.weight > 0 ? `${best.weight}kg × ` : ''}{best.reps} {ex.unit} @ RPE {best.rpe}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
            <TouchableOpacity style={s.startBtn} onPress={startWorkout} activeOpacity={0.8}>
              <LinearGradient colors={[colors.electricBlue, colors.glowPurple]} style={s.startGrad}>
                <Text style={s.startText}>INITIATE PROTOCOL</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── COMPLETE ───────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    const rankColor = newRank ? rankColors[newRank] : colors.gold;
    const totalSets = completedExData.reduce((a, e) => a + e.sets.length, 0);
    return (
      <LinearGradient colors={[colors.background, colors.darkPurple, colors.background]} style={s.root}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={s.completeScroll}>
            <Text style={s.completeTag}>[ PROTOCOL COMPLETE ]</Text>
            <SystemPanel glow style={s.completePanel}>
              <Text style={s.xpGained}>+{xpGained} XP</Text>
              <Text style={s.xpLabel}>EXPERIENCE GAINED</Text>
              <View style={s.completeMeta}>
                <View style={s.metaItem}><Text style={s.metaValue}>{formatTime(elapsedSeconds)}</Text><Text style={s.metaLabel}>DURATION</Text></View>
                <View style={s.metaItem}><Text style={s.metaValue}>{completedExData.filter(e => e.sets.length > 0).length}</Text><Text style={s.metaLabel}>EXERCISES</Text></View>
                <View style={s.metaItem}><Text style={s.metaValue}>{totalSets}</Text><Text style={s.metaLabel}>TOTAL SETS</Text></View>
              </View>
            </SystemPanel>
            {newRank && (
              <SystemPanel glow style={[s.rankUpPanel, { borderColor: rankColor }]}>
                <Text style={[s.rankUpText, { color: rankColor }]}>🏆 RANK UP — {newRank} CLASS</Text>
                <Text style={s.rankUpSub}>The System acknowledges your ascent.</Text>
              </SystemPanel>
            )}
            <View style={s.quoteBox}><Text style={s.quoteText}>{finaleQuote}</Text></View>
            <TouchableOpacity style={s.doneBtn} onPress={() => {
              if (newRank) navigation.navigate('RankUp', { newRank });
              else navigation.navigate('HomeDashboard');
            }}>
              <LinearGradient colors={[colors.electricBlue, colors.glowPurple]} style={s.startGrad}>
                <Text style={s.startText}>{newRank ? 'WITNESS YOUR RANK' : 'RETURN TO BASE'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── WORKOUT ──────────────────────────────────────────────────────────────────
  const ex = exercises[currentExIdx];
  const exSets = setsData[currentExIdx] || [];
  const completedSets = exSets.filter(st => st.completed).length;
  const prevEx = prevWorkout?.exercises?.find(e => e.name === ex?.name);
  const prevSets = prevEx?.sets || [];

  return (
    <LinearGradient colors={[colors.background, colors.darkPurple + '55', colors.background]} style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.electricBlue, opacity: flashAnim }]} />

        <View style={s.wHeader}>
          <Text style={s.elapsed}>{formatTime(elapsedSeconds)}</Text>
          <Text style={s.exProgress}>{currentExIdx + 1} / {exercises.length}</Text>
          <TouchableOpacity onPress={() => Alert.alert('End Workout?', 'Save progress and finish?', [
            { text: 'Continue', style: 'cancel' },
            { text: 'Finish', style: 'destructive', onPress: finishWorkout },
          ])}>
            <Text style={s.endText}>END</Text>
          </TouchableOpacity>
        </View>

        {restActive && (
          <View style={s.restBanner}>
            <Text style={s.restBannerText}>⏱ REST · {formatTime(restTimer)}</Text>
            <TouchableOpacity onPress={skipRest} style={s.skipBtn}>
              <Text style={s.skipText}>SKIP</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.exHeaderRow}>
            <View style={s.exNumBadge}>
              <Text style={s.exNumText}>{currentExIdx + 1}</Text>
            </View>
            <View style={s.exHeaderInfo}>
              <Text style={s.exName}>{ex?.name}</Text>
              <Text style={s.exMeta}>{ex?.sets}×{ex?.reps} {ex?.unit} · {completedSets}/{ex?.sets} done</Text>
            </View>
          </View>

          {!!ex?.notes && (
            <View style={s.cuesPanel}>
              <Text style={s.cuesLabel}>EXECUTION CUES</Text>
              <Text style={s.cuesText}>{ex.notes}</Text>
            </View>
          )}

          <Text style={s.setsLabel}>SETS{ex?.rest ? ` · ${ex.rest}S REST BETWEEN SETS` : ''}</Text>

          {exSets.map((setData, setIdx) => (
            <SetCard
              key={setIdx}
              setNumber={setIdx + 1}
              setData={setData}
              prevSet={prevSets[setIdx] || null}
              exUnit={ex?.unit || 'reps'}
              onUpdate={(field, val) => updateSet(currentExIdx, setIdx, field, val)}
              onToggle={() => toggleSet(currentExIdx, setIdx)}
            />
          ))}

          <View style={s.navRow}>
            <TouchableOpacity
              style={[s.prevBtn, currentExIdx === 0 && s.prevBtnDisabled]}
              onPress={() => currentExIdx > 0 && setCurrentExIdx(i => i - 1)}
            >
              <Text style={[s.prevBtnText, currentExIdx === 0 && { color: colors.textDim }]}>← PREV</Text>
            </TouchableOpacity>

            {currentExIdx < exercises.length - 1 ? (
              <TouchableOpacity style={s.nextBtn} onPress={() => setCurrentExIdx(i => i + 1)}>
                <LinearGradient colors={[colors.electricBlue, colors.glowPurple]} style={s.nextBtnGrad}>
                  <Text style={s.nextBtnText}>NEXT →</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.nextBtn} onPress={finishWorkout}>
                <LinearGradient colors={[colors.success + 'bb', colors.electricBlue]} style={s.nextBtnGrad}>
                  <Text style={s.nextBtnText}>COMPLETE WORKOUT</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── SetCard Styles
const sc = StyleSheet.create({
  card: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 0, padding: 12, marginBottom: 8 },
  cardDone: { borderColor: colors.electricBlue + '88', backgroundColor: colors.electricBlue + '0d' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: colors.textSecondary, letterSpacing: 2 },
  labelDone: { color: colors.electricBlue },
  check: { width: 28, height: 28, borderRadius: 0, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.electricBlue, borderColor: colors.electricBlue },
  checkMark: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },
  colLabel: { fontFamily: 'Rajdhani_500Medium', fontSize: 9, color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 5, textAlign: 'center' },
  input: { fontFamily: 'Rajdhani_700Bold', fontSize: 22, color: colors.textPrimary, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 0, paddingVertical: 10, textAlign: 'center' },
  inputDone: { borderColor: colors.electricBlue + '55' },
  prev: { fontFamily: 'Rajdhani_400Regular', fontSize: 10, color: colors.neonBlue, marginTop: 8, letterSpacing: 0.3 },
});

// ─── Main Styles
const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  backBtn: { padding: 16, paddingBottom: 8 },
  backText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: colors.danger, letterSpacing: 2 },

  readyScroll: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  systemInit: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.electricBlue, letterSpacing: 3, textAlign: 'center', marginBottom: 16 },
  workoutName: { fontFamily: 'Rajdhani_700Bold', fontSize: 26, color: colors.textPrimary, textAlign: 'center', letterSpacing: 2, marginBottom: 6 },
  workoutMeta: { fontFamily: 'Rajdhani_500Medium', fontSize: 12, color: colors.textSecondary, letterSpacing: 2, textAlign: 'center', marginBottom: 6 },
  prevBadge: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: colors.success, letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  exList: { marginBottom: 32 },
  exListRow: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  exListName: { fontFamily: 'Rajdhani_500Medium', fontSize: 14, color: colors.textSecondary, letterSpacing: 0.5 },
  exListPrev: { fontFamily: 'Rajdhani_400Regular', fontSize: 11, color: colors.neonBlue, marginTop: 3, paddingLeft: 14 },
  startBtn: { borderRadius: 0, overflow: 'hidden' },
  startGrad: { padding: 18, alignItems: 'center' },
  startText: { fontFamily: 'Rajdhani_700Bold', fontSize: 18, color: colors.textPrimary, letterSpacing: 4 },

  wHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  elapsed: { fontFamily: 'Rajdhani_700Bold', fontSize: 20, color: colors.textPrimary, letterSpacing: 2 },
  exProgress: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 16, color: colors.textSecondary, letterSpacing: 1 },
  endText: { fontFamily: 'Rajdhani_700Bold', fontSize: 13, color: colors.danger, letterSpacing: 2 },

  restBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.deepBlue, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.electricBlue + '55', paddingHorizontal: 16, paddingVertical: 8 },
  restBannerText: { fontFamily: 'Rajdhani_700Bold', fontSize: 16, color: colors.electricBlue, letterSpacing: 2 },
  skipBtn: { paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: colors.textDim, borderRadius: 0 },
  skipText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: colors.textSecondary, letterSpacing: 2 },

  scroll: { padding: 16, paddingBottom: 32 },
  exHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  exNumBadge: { width: 32, height: 32, borderRadius: 0, backgroundColor: colors.electricBlue + '22', borderWidth: 1, borderColor: colors.electricBlue, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  exNumText: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, color: colors.electricBlue },
  exHeaderInfo: { flex: 1 },
  exName: { fontFamily: 'Rajdhani_700Bold', fontSize: 22, color: colors.textPrimary, letterSpacing: 1 },
  exMeta: { fontFamily: 'Rajdhani_500Medium', fontSize: 12, color: colors.textSecondary, letterSpacing: 1, marginTop: 2 },

  cuesPanel: { backgroundColor: colors.penaltyDark, borderWidth: 1, borderColor: colors.penalty + '44', borderRadius: 0, padding: 12, marginBottom: 12 },
  cuesLabel: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 10, color: colors.penalty, letterSpacing: 2.5, marginBottom: 6 },
  cuesText: { fontFamily: 'Rajdhani_400Regular', fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3, lineHeight: 20 },

  setsLabel: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 10, color: colors.textDim, letterSpacing: 2, marginBottom: 8 },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  prevBtn: { paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 0, alignItems: 'center', justifyContent: 'center' },
  prevBtnDisabled: { opacity: 0.3 },
  prevBtnText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: colors.textSecondary, letterSpacing: 1 },
  nextBtn: { flex: 1, borderRadius: 0, overflow: 'hidden' },
  nextBtnGrad: { padding: 14, alignItems: 'center' },
  nextBtnText: { fontFamily: 'Rajdhani_700Bold', fontSize: 15, color: colors.textPrimary, letterSpacing: 2 },

  completeScroll: { padding: 20, paddingTop: 40, alignItems: 'center' },
  completeTag: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.success, letterSpacing: 3, marginBottom: 24 },
  completePanel: { width: '100%', alignItems: 'center', marginBottom: 16 },
  xpGained: { fontFamily: 'Rajdhani_700Bold', fontSize: 56, color: colors.gold, letterSpacing: 2, textShadowColor: colors.gold, textShadowRadius: 20, textShadowOffset: { width: 0, height: 0 } },
  xpLabel: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: colors.textSecondary, letterSpacing: 3, marginBottom: 16 },
  completeMeta: { flexDirection: 'row', gap: 24 },
  metaItem: { alignItems: 'center' },
  metaValue: { fontFamily: 'Rajdhani_700Bold', fontSize: 22, color: colors.textPrimary },
  metaLabel: { fontFamily: 'Rajdhani_500Medium', fontSize: 10, color: colors.textSecondary, letterSpacing: 1.5, marginTop: 4 },
  rankUpPanel: { width: '100%', alignItems: 'center', marginBottom: 16 },
  rankUpText: { fontFamily: 'Rajdhani_700Bold', fontSize: 20, letterSpacing: 2, marginBottom: 6 },
  rankUpSub: { fontFamily: 'Rajdhani_400Regular', fontSize: 13, color: colors.textSecondary },
  quoteBox: { paddingHorizontal: 20, marginBottom: 32 },
  quoteText: { fontFamily: 'Rajdhani_400Regular', fontSize: 14, color: colors.textDim, fontStyle: 'italic', textAlign: 'center', letterSpacing: 0.5, lineHeight: 22 },
  doneBtn: { width: '100%', borderRadius: 0, overflow: 'hidden' },
});
