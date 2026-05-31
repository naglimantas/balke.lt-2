import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, rankColors } from '../theme/colors';
import SystemPanel from '../components/SystemPanel';
import {
  getHunterProfile,
  saveHunterProfile,
  getBossData,
  saveBossData,
  getWeekStartDate,
} from '../utils/storage';
import { getWeeklyBoss } from '../utils/workoutData';
import { getRankForXP, checkRankUp } from '../utils/xpSystem';

export default function BossBattleScreen({ navigation }) {
  const [phase, setPhase] = useState('intro'); // intro | battle | victory | defeated | already_done
  const [boss, setBoss] = useState(null);
  const [currentHP, setCurrentHP] = useState(0);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [repsCompleted, setRepsCompleted] = useState(0);
  const [bossData, setBossDataState] = useState(null);

  const timerRef = useRef(null);
  const hpAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadBossData();
    }, [])
  );

  async function loadBossData() {
    const weekStart = getWeekStartDate();
    const data = await getBossData();
    const weeklyBoss = getWeeklyBoss();
    setBoss(weeklyBoss);
    setCurrentHP(weeklyBoss.bossHP);

    if (data && data.weekStart === weekStart && data.defeated) {
      setPhase('already_done');
    } else {
      setPhase('intro');
    }
    setBossDataState(data);
  }

  const glowLoopRef = useRef(null);

  useEffect(() => {
    if (phase === 'battle') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(s => {
          if (boss && s >= boss.timeLimit) {
            setPhase('defeated');
            clearInterval(timerRef.current);
          }
          return s + 1;
        });
      }, 1000);

      glowLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      );
      glowLoopRef.current.start();
    }
    return () => {
      clearInterval(timerRef.current);
      if (glowLoopRef.current) glowLoopRef.current.stop();
    };
  }, [phase]);

  function shakeEffect() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }

  function handleRepComplete() {
    if (!boss) return;
    const currentExercise = boss.exercises[currentExIdx];
    const newReps = repsCompleted + 1;
    setRepsCompleted(newReps);
    shakeEffect();

    // Damage boss
    const totalReps = boss.exercises.reduce((acc, ex) => acc + ex.totalReps, 0);
    const damagePerRep = totalReps > 0 ? boss.bossHP / totalReps : 0;
    const newHP = Math.max(0, currentHP - damagePerRep);
    setCurrentHP(newHP);

    Animated.timing(hpAnim, {
      toValue: newHP / boss.bossHP,
      duration: 300,
      useNativeDriver: false,
    }).start();

    if (newReps >= currentExercise.totalReps) {
      // Move to next exercise
      if (currentExIdx < boss.exercises.length - 1) {
        setCurrentExIdx(i => i + 1);
        setRepsCompleted(0);
      } else {
        // Boss defeated!
        clearInterval(timerRef.current);
        handleVictory();
      }
    }
  }

  async function handleVictory() {
    setPhase('victory');
    const weekStart = getWeekStartDate();
    await saveBossData({ weekStart, bossId: boss.id, defeated: true, time: elapsedSeconds });

    const profile = await getHunterProfile();
    if (!profile) return;
    const oldXP = profile.xp;
    profile.xp += boss.xpReward;
    if (!profile.titles) profile.titles = [];
    if (!profile.titles.includes(boss.titleReward)) {
      profile.titles.push(boss.titleReward);
    }
    profile.rank = getRankForXP(profile.xp);
    await saveHunterProfile(profile);
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  if (!boss) return null;

  const hpPercent = currentHP / boss.bossHP;
  const timeRemaining = boss ? boss.timeLimit - elapsedSeconds : 0;
  const currentExercise = boss.exercises[currentExIdx];
  const totalRepsInCurrentEx = currentExercise?.totalReps || 0;

  // === INTRO ===
  if (phase === 'intro') {
    return (
      <LinearGradient colors={[colors.background, '#1a0000', colors.background]} style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.introScroll}>
            <Text style={styles.warningTag}>[ ⚠ BOSS ENCOUNTER DETECTED ]</Text>
            <Text style={styles.bossName}>{boss.name}</Text>
            <View style={[styles.difficultyBadge, { borderColor: rankColors[boss.difficulty] }]}>
              <Text style={[styles.difficultyText, { color: rankColors[boss.difficulty] }]}>
                {boss.difficulty} — RAID
              </Text>
            </View>
            <SystemPanel penalty style={styles.lorePanel}>
              <Text style={styles.loreText}>{boss.lore}</Text>
            </SystemPanel>
            <SystemPanel style={styles.bossInfoPanel}>
              <Text style={styles.infoLabel}>BOSS HP</Text>
              <Text style={styles.infoValue}>{boss.bossHP.toLocaleString()}</Text>
              <Text style={styles.infoLabel}>TIME LIMIT</Text>
              <Text style={styles.infoValue}>{formatTime(boss.timeLimit)}</Text>
              <Text style={styles.infoLabel}>XP REWARD</Text>
              <Text style={[styles.infoValue, { color: colors.gold }]}>+{boss.xpReward} XP</Text>
              <Text style={styles.infoLabel}>TITLE REWARD</Text>
              <Text style={[styles.infoValue, { color: colors.glowPurple }]}>{boss.titleReward}</Text>
            </SystemPanel>
            <Text style={styles.exercisesTitle}>OBJECTIVES</Text>
            {boss.exercises.map((ex, i) => (
              <View key={i} style={styles.bossExRow}>
                <Text style={styles.bossExName}>{ex.name}</Text>
                <Text style={styles.bossExTarget}>{ex.totalReps} {ex.unit || 'reps'}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.enterBtn} onPress={() => setPhase('battle')}>
              <LinearGradient colors={[colors.penalty, '#880000']} style={styles.enterGrad}>
                <Text style={styles.enterText}>ENTER THE RAID GATE</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // === ALREADY DONE ===
  if (phase === 'already_done') {
    return (
      <LinearGradient colors={[colors.background, colors.darkPurple, colors.background]} style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>
          <View style={styles.centerContent}>
            <Text style={styles.systemInit}>[ SYSTEM NOTIFICATION ]</Text>
            <Text style={styles.alreadyTitle}>BOSS DEFEATED</Text>
            <Text style={styles.alreadySub}>You have already conquered this week's boss.{'\n'}A new challenger appears on Monday.</Text>
            <TouchableOpacity style={styles.backToHomeBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backToHomeText}>RETURN TO BASE</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // === VICTORY ===
  if (phase === 'victory') {
    return (
      <LinearGradient colors={[colors.background, '#001a00', colors.background]} style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.centerContent}>
            <Text style={styles.victoryTag}>[ RAID COMPLETE ]</Text>
            <Text style={styles.victoryTitle}>BOSS DEFEATED</Text>
            <Text style={[styles.victoryXP, { color: colors.gold }]}>+{boss.xpReward} XP</Text>
            <Text style={styles.victoryTime}>CLEARED IN {formatTime(elapsedSeconds)}</Text>
            <SystemPanel glow style={styles.titleAwardPanel}>
              <Text style={styles.titleAwardLabel}>TITLE EARNED</Text>
              <Text style={styles.titleAwardText}>{boss.titleReward}</Text>
            </SystemPanel>
            <TouchableOpacity style={styles.enterBtn} onPress={() => navigation.navigate('HomeDashboard')}>
              <LinearGradient colors={[colors.success + 'aa', '#004422']} style={styles.enterGrad}>
                <Text style={styles.enterText}>RETURN AS VICTOR</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // === DEFEATED ===
  if (phase === 'defeated') {
    return (
      <LinearGradient colors={[colors.background, '#1a0000', colors.background]} style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.centerContent}>
            <Text style={styles.defeatTag}>[ RAID FAILED ]</Text>
            <Text style={styles.defeatTitle}>YOU HAVE FALLEN</Text>
            <Text style={styles.defeatSub}>The boss overwhelmed you. Grow stronger and try again next week.</Text>
            <TouchableOpacity style={styles.enterBtn} onPress={() => navigation.goBack()}>
              <LinearGradient colors={['#330000', '#1a0000']} style={styles.enterGrad}>
                <Text style={styles.enterText}>RETREAT</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // === BATTLE ===
  return (
    <LinearGradient colors={[colors.background, '#1a0000', colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <Animated.View style={[styles.battleHeader, { transform: [{ translateX: shakeAnim }] }]}>
          <View>
            <Text style={styles.bossNameSmall}>{boss.name}</Text>
            <View style={styles.hpBarTrack}>
              <Animated.View style={[
                styles.hpBarFill,
                {
                  width: hpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: hpPercent > 0.5 ? colors.success : hpPercent > 0.25 ? colors.warning : colors.penalty,
                },
              ]} />
            </View>
            <Text style={styles.hpText}>{Math.round(currentHP)} / {boss.bossHP} HP</Text>
          </View>
          <Animated.View style={{ opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }}>
            <Text style={styles.timerDanger}>{formatTime(timeRemaining)}</Text>
          </Animated.View>
        </Animated.View>

        <View style={styles.battleContent}>
          {/* Exercise Info */}
          <Text style={styles.battleExIdx}>
            OBJECTIVE {currentExIdx + 1}/{boss.exercises.length}
          </Text>
          <Animated.Text style={[styles.battleExName, { transform: [{ translateX: shakeAnim }] }]}>
            {currentExercise?.name}
          </Animated.Text>
          <Text style={styles.repProgress}>
            <Text style={styles.repsDone}>{repsCompleted}</Text>
            <Text style={styles.repsSlash}>/</Text>
            <Text style={styles.repsTotal}>{totalRepsInCurrentEx}</Text>
          </Text>

          {/* Progress Bar */}
          <View style={styles.repBarTrack}>
            <View style={[styles.repBarFill, { width: `${(repsCompleted / totalRepsInCurrentEx) * 100}%` }]} />
          </View>

          {/* Hit button */}
          <TouchableOpacity
            style={styles.hitBtn}
            onPress={handleRepComplete}
            activeOpacity={0.7}
          >
            <LinearGradient colors={[colors.penalty, '#550000']} style={styles.hitGrad}>
              <Text style={styles.hitText}>+1 REP</Text>
              <Text style={styles.hitSubText}>TAP TO ATTACK</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* All exercises overview */}
          <View style={styles.exOverview}>
            {boss.exercises.map((ex, i) => (
              <View key={i} style={[styles.exOverviewItem, i === currentExIdx && styles.exOverviewActive]}>
                <Text style={[styles.exOverviewText, i < currentExIdx && styles.exOverviewDone, i === currentExIdx && { color: colors.penalty }]}>
                  {i < currentExIdx ? '✓' : i === currentExIdx ? '▶' : '○'} {ex.name}: {ex.totalReps}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  backBtn: { padding: 16, paddingBottom: 0 },
  backText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: colors.danger, letterSpacing: 2 },

  introScroll: { padding: 20, paddingBottom: 40 },
  warningTag: { fontFamily: 'Rajdhani_700Bold', fontSize: 12, color: colors.penalty, letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  bossName: { fontFamily: 'Rajdhani_700Bold', fontSize: 30, color: colors.textPrimary, textAlign: 'center', letterSpacing: 2, marginBottom: 12, textShadowColor: colors.penalty, textShadowRadius: 15, textShadowOffset: { width: 0, height: 0 } },
  difficultyBadge: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 6, borderWidth: 1.5, borderRadius: 0, marginBottom: 20 },
  difficultyText: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, letterSpacing: 3 },
  lorePanel: { marginBottom: 16 },
  loreText: { fontFamily: 'Rajdhani_400Regular', fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 20, letterSpacing: 0.5 },
  bossInfoPanel: { marginBottom: 16 },
  infoLabel: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 10, color: colors.textSecondary, letterSpacing: 2.5, marginTop: 8 },
  infoValue: { fontFamily: 'Rajdhani_700Bold', fontSize: 20, color: colors.textPrimary, letterSpacing: 1 },
  exercisesTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 11, color: colors.textSecondary, letterSpacing: 3, marginBottom: 10 },
  bossExRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  bossExName: { fontFamily: 'Rajdhani_500Medium', fontSize: 15, color: colors.textPrimary },
  bossExTarget: { fontFamily: 'Rajdhani_700Bold', fontSize: 15, color: colors.penalty },
  enterBtn: { borderRadius: 0, overflow: 'hidden', marginTop: 20 },
  enterGrad: { padding: 18, alignItems: 'center' },
  enterText: { fontFamily: 'Rajdhani_700Bold', fontSize: 18, color: colors.textPrimary, letterSpacing: 3 },

  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  systemInit: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.electricBlue, letterSpacing: 3, marginBottom: 16 },
  alreadyTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 32, color: colors.success, letterSpacing: 3, textAlign: 'center', marginBottom: 16 },
  alreadySub: { fontFamily: 'Rajdhani_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, letterSpacing: 0.5, marginBottom: 40 },
  backToHomeBtn: { paddingHorizontal: 32, paddingVertical: 14, borderWidth: 1, borderColor: colors.electricBlue, borderRadius: 0 },
  backToHomeText: { fontFamily: 'Rajdhani_700Bold', fontSize: 15, color: colors.electricBlue, letterSpacing: 2 },

  victoryTag: { fontFamily: 'Rajdhani_500Medium', fontSize: 12, color: colors.success, letterSpacing: 3, marginBottom: 16 },
  victoryTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 40, color: colors.success, letterSpacing: 3, textAlign: 'center', marginBottom: 16, textShadowColor: colors.success, textShadowRadius: 20, textShadowOffset: { width: 0, height: 0 } },
  victoryXP: { fontFamily: 'Rajdhani_700Bold', fontSize: 48, letterSpacing: 2, marginBottom: 8 },
  victoryTime: { fontFamily: 'Rajdhani_500Medium', fontSize: 14, color: colors.textSecondary, letterSpacing: 2, marginBottom: 24 },
  titleAwardPanel: { width: '100%', alignItems: 'center', marginBottom: 24 },
  titleAwardLabel: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 10, color: colors.textSecondary, letterSpacing: 2.5, marginBottom: 8 },
  titleAwardText: { fontFamily: 'Rajdhani_700Bold', fontSize: 22, color: colors.gold, letterSpacing: 2 },

  defeatTag: { fontFamily: 'Rajdhani_500Medium', fontSize: 12, color: colors.penalty, letterSpacing: 3, marginBottom: 16 },
  defeatTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 36, color: colors.penalty, letterSpacing: 3, textAlign: 'center', marginBottom: 16 },
  defeatSub: { fontFamily: 'Rajdhani_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 40 },

  // Battle
  battleHeader: { padding: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bossNameSmall: { fontFamily: 'Rajdhani_700Bold', fontSize: 16, color: colors.penalty, letterSpacing: 1, marginBottom: 6 },
  hpBarTrack: { width: 200, height: 10, backgroundColor: colors.surface, borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  hpBarFill: { height: '100%', borderRadius: 0 },
  hpText: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.textSecondary, letterSpacing: 0.5, marginTop: 4 },
  timerDanger: { fontFamily: 'Rajdhani_700Bold', fontSize: 28, color: colors.penalty, letterSpacing: 2, textShadowColor: colors.penalty, textShadowRadius: 15, textShadowOffset: { width: 0, height: 0 } },

  battleContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  battleExIdx: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: colors.textSecondary, letterSpacing: 3, marginBottom: 12 },
  battleExName: { fontFamily: 'Rajdhani_700Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: 2, textAlign: 'center', marginBottom: 16 },
  repProgress: { marginBottom: 12 },
  repsDone: { fontFamily: 'Rajdhani_700Bold', fontSize: 64, color: colors.penalty, letterSpacing: 2 },
  repsSlash: { fontFamily: 'Rajdhani_400Regular', fontSize: 32, color: colors.textDim },
  repsTotal: { fontFamily: 'Rajdhani_500Medium', fontSize: 32, color: colors.textSecondary },
  repBarTrack: { width: '100%', height: 8, backgroundColor: colors.surface, borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 32 },
  repBarFill: { height: '100%', backgroundColor: colors.penalty, borderRadius: 0 },
  hitBtn: { width: 200, height: 200, borderRadius: 0, overflow: 'hidden', marginBottom: 24,
    shadowColor: colors.penalty, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, shadowOpacity: 0.8, elevation: 12 },
  hitGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hitText: { fontFamily: 'Rajdhani_700Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: 3 },
  hitSubText: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.textPrimary + 'aa', letterSpacing: 2, marginTop: 4 },
  exOverview: { width: '100%' },
  exOverviewItem: { paddingVertical: 4 },
  exOverviewActive: {},
  exOverviewText: { fontFamily: 'Rajdhani_400Regular', fontSize: 13, color: colors.textDim, letterSpacing: 0.5 },
  exOverviewDone: { color: colors.success },
});
