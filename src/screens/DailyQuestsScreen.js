import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import SystemPanel from '../components/SystemPanel';
import QuestCard from '../components/QuestCard';
import {
  getHunterProfile,
  saveHunterProfile,
  getDailyQuests,
  saveDailyQuests,
  getTodayKey,
  getYesterdayKey,
  getLastQuestDateBefore,
} from '../utils/storage';
import {
  getRandomQuests,
  createCustomQuest,
  generatePenaltyQuest,
  getRandomPenaltyMessage,
  EXERCISE_TYPES,
  UNIT_OPTIONS,
  TYPE_ICONS,
} from '../utils/questData';
import { XP_REWARDS, checkRankUp, STAT_REWARDS, getRankForXP } from '../utils/xpSystem';

export default function DailyQuestsScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [quests, setQuests] = useState([]);
  const [hasPenalty, setHasPenalty] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState('strength');
  const [customTarget, setCustomTarget] = useState('');
  const [customUnit, setCustomUnit] = useState('reps');
  const [penaltyMessage] = useState(getRandomPenaltyMessage());
  const [penaltyCount, setPenaltyCount] = useState(0);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [editingQuest, setEditingQuest] = useState(null);
  const successAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const p = await getHunterProfile();
    const todayKey = getTodayKey();
    let data = await getDailyQuests(todayKey);

    if (!data || !data.quests) {
      // First time opening quests today — generate a fresh set, and carry over
      // any quests that were left incomplete on the previous quest day as penalties.
      const count = Math.floor(Math.random() * 3) + 3;
      const newQuests = getRandomQuests(count, p?.fitnessLevel);
      const penaltyQuests = await applyMissedQuestPenalties(todayKey, p);
      data = {
        date: todayKey,
        quests: [...penaltyQuests, ...newQuests],
        allCompleted: false,
      };
      await saveDailyQuests(data, todayKey);
    }

    setProfile(p ? { ...p } : null);
    setQuests(data.quests || []);
    const penalties = (data.quests || []).filter(q => q.isPenalty);
    setHasPenalty(penalties.length > 0);
    setPenaltyCount(penalties.length);
  }

  // Checks the most recent prior quest day. If quests were left incomplete, the
  // System breaks the streak and issues harder penalty quests for the missed ones.
  async function applyMissedQuestPenalties(todayKey, p) {
    const prevDate = await getLastQuestDateBefore(todayKey);
    if (!prevDate) return [];
    const prevData = await getDailyQuests(prevDate);
    if (!prevData || !prevData.quests || prevData.quests.length === 0) return [];

    const incomplete = prevData.quests.filter(q => !q.completed);
    if (incomplete.length === 0) return [];

    // A day was missed → the streak is broken.
    if (p && (p.streak > 0 || p.lastQuestDate)) {
      p.streak = 0;
      p.lastQuestDate = null;
      await saveHunterProfile(p);
    }

    // Carry forward up to 4 missed quests as penalty missions.
    return incomplete.slice(0, 4).map(q => generatePenaltyQuest(q));
  }

  async function handleToggleQuest(quest) {
    const updated = quests.map(q =>
      q.id === quest.id ? { ...q, completed: !q.completed } : q
    );
    setQuests(updated);

    const todayKey = getTodayKey();
    const allCompleted = updated.every(q => q.completed);
    await saveDailyQuests({ date: todayKey, quests: updated, allCompleted }, todayKey);

    if (!quest.completed) {
      await awardQuestXP(quest, updated, allCompleted);
    } else {
      const p = await getHunterProfile();
      if (p) {
        p.xp = Math.max(0, p.xp - quest.xp);
        const statType = quest.statType || 'quest';
        const gains = STAT_REWARDS[statType] || STAT_REWARDS.quest;
        for (const [stat, val] of Object.entries(gains)) {
          if (p.stats[stat] !== undefined) p.stats[stat] = Math.max(0, p.stats[stat] - val);
        }
        p.stats.intelligence = Math.max(0, (p.stats.intelligence || 0) - 1);

        // If the all-quests bonus was awarded today, deduct it and revert streak
        if (p.allQuestsBonusDate === todayKey) {
          p.xp = Math.max(0, p.xp - XP_REWARDS.allQuestsBonus);
          p.allQuestsBonusDate = null;
          p.streak = Math.max(0, (p.streak || 1) - 1);
          // Restore lastQuestDate so streak resumes correctly if all quests re-completed
          p.lastQuestDate = p.streak > 0 ? getYesterdayKey() : null;
        }

        p.rank = getRankForXP(p.xp);
        await saveHunterProfile(p);
        setProfile({ ...p });
      }
    }
  }

  async function awardQuestXP(quest, updatedQuests, allCompleted) {
    const p = await getHunterProfile();
    if (!p) return;

    const oldXP = p.xp;
    p.xp += quest.xp;

    const statType = quest.statType || 'quest';
    const gains = STAT_REWARDS[statType] || STAT_REWARDS.quest;
    for (const [stat, val] of Object.entries(gains)) {
      if (p.stats[stat] !== undefined) p.stats[stat] += val;
    }
    p.stats.intelligence += 1;

    const todayKey = getTodayKey();
    if (allCompleted && p.allQuestsBonusDate !== todayKey) {
      p.xp += XP_REWARDS.allQuestsBonus;
      const yKey = getYesterdayKey();
      p.streak = p.lastQuestDate === yKey ? (p.streak || 0) + 1 : 1;
      p.lastQuestDate = todayKey;
      p.allQuestsBonusDate = todayKey;
    }

    const rankCheck = checkRankUp(oldXP, p.xp);
    p.rank = getRankForXP(p.xp);
    await saveHunterProfile(p);
    setProfile({ ...p });

    Animated.sequence([
      Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(successAnim, { toValue: 0, duration: 600, delay: 800, useNativeDriver: true }),
    ]).start();

    if (rankCheck.didRankUp) {
      setTimeout(() => navigation.navigate('RankUp', { newRank: rankCheck.newRank }), 500);
    }
  }

  function handleLongPressQuest(quest) {
    setSelectedQuest(quest);
  }

  function handleDeleteQuest() {
    const updated = quests.filter(q => q.id !== selectedQuest.id);
    setQuests(updated);
    const todayKey = getTodayKey();
    const allCompleted = updated.length > 0 && updated.every(q => q.completed);
    saveDailyQuests({ date: todayKey, quests: updated, allCompleted }, todayKey);
    setSelectedQuest(null);
  }

  function handleStartEdit() {
    const q = selectedQuest;
    setEditingQuest(q);
    setCustomName(q.name);
    setCustomType(q.statType || 'strength');
    setCustomTarget(String(q.target));
    setCustomUnit(q.unit || 'reps');
    setSelectedQuest(null);
    setShowAddModal(true);
  }

  function handleAddCustomQuest() {
    if (!customName.trim() || !customTarget) return;
    const todayKey = getTodayKey();
    if (editingQuest) {
      const updated = quests.map(q =>
        q.id === editingQuest.id
          ? { ...q, name: customName.trim(), type: customType, statType: customType, target: customTarget, unit: customUnit, icon: TYPE_ICONS[customType] || q.icon }
          : q
      );
      setQuests(updated);
      saveDailyQuests({ date: todayKey, quests: updated, allCompleted: updated.every(q => q.completed) }, todayKey);
    } else {
      const quest = createCustomQuest({
        name: customName.trim(),
        type: customType,
        target: customTarget,
        unit: customUnit,
      });
      const updated = [...quests, quest];
      setQuests(updated);
      saveDailyQuests({ date: todayKey, quests: updated, allCompleted: false }, todayKey);
    }
    setShowAddModal(false);
    setEditingQuest(null);
    setCustomName('');
    setCustomTarget('');
  }

  const completedCount = quests.filter(q => q.completed).length;
  const totalCount = quests.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <LinearGradient colors={[colors.background, hasPenalty ? colors.penaltyDark : colors.darkPurple + '44', colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTag}>[ DAILY QUEST SYSTEM ]</Text>

          {hasPenalty && (
            <SystemPanel penalty style={styles.penaltyBanner}>
              <Text style={styles.penaltyTitle}>⚠ PENALTY QUEST{penaltyCount !== 1 ? 'S' : ''} ACTIVE</Text>
              <Text style={styles.penaltyMsg}>"{penaltyMessage}"</Text>
              <Text style={styles.penaltySub}>
                {penaltyCount} mission{penaltyCount !== 1 ? 's' : ''} carried over from your failure — completed at doubled cost. Your streak has been reset.
              </Text>
            </SystemPanel>
          )}

          <SystemPanel style={styles.progressPanel} glow={completedCount === totalCount && totalCount > 0}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>TODAY'S MISSIONS</Text>
              <Text style={[
                styles.progressCount,
                completedCount === totalCount && totalCount > 0 ? { color: colors.success } : {},
              ]}>
                {completedCount}/{totalCount}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${progress * 100}%`,
                backgroundColor: completedCount === totalCount ? colors.success : colors.electricBlue,
              }]} />
            </View>
            {completedCount === totalCount && totalCount > 0 && (
              <Text style={styles.allDoneText}>ALL MISSIONS COMPLETE — +{XP_REWARDS.allQuestsBonus} BONUS XP</Text>
            )}
          </SystemPanel>

          <Animated.View style={[styles.successFlash, { opacity: successAnim }]}>
            <Text style={styles.successText}>+XP AWARDED</Text>
          </Animated.View>

          {quests.map(quest => (
            <QuestCard key={quest.id} quest={quest} onToggle={handleToggleQuest} onLongPress={handleLongPressQuest} />
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addBtnText}>+ ADD CUSTOM QUEST</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Quests reset at midnight. Incomplete quests will trigger penalty missions tomorrow.
            </Text>
          </View>
        </ScrollView>

        <Modal visible={!!selectedQuest} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedQuest(null)}>
            <View style={styles.actionPanel}>
              <Text style={styles.actionTitle}>{selectedQuest?.name}</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleStartEdit}>
                <Text style={styles.actionBtnText}>✏ EDIT QUEST</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDelete]} onPress={handleDeleteQuest}>
                <Text style={[styles.actionBtnText, { color: colors.penalty }]}>✕ DELETE QUEST</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedQuest(null)}>
                <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showAddModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalPanel}>
              <Text style={styles.modalTitle}>{editingQuest ? '[ EDIT QUEST ]' : '[ CUSTOM QUEST ]'}</Text>

              <Text style={styles.modalLabel}>QUEST NAME</Text>
              <TextInput
                style={styles.modalInput}
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g. 50 Pull-ups"
                placeholderTextColor={colors.textDim}
              />

              <Text style={styles.modalLabel}>TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {EXERCISE_TYPES.map(et => (
                  <TouchableOpacity
                    key={et.value}
                    style={[styles.typeOption, customType === et.value && styles.typeSelected]}
                    onPress={() => setCustomType(et.value)}
                  >
                    <Text style={styles.typeText}>{et.icon} {et.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.targetRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>TARGET</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={customTarget}
                    onChangeText={setCustomTarget}
                    placeholder="100"
                    placeholderTextColor={colors.textDim}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalLabel}>UNIT</Text>
                  <ScrollView>
                    {UNIT_OPTIONS.map(u => (
                      <TouchableOpacity
                        key={u}
                        style={[styles.unitOption, customUnit === u && styles.typeSelected]}
                        onPress={() => setCustomUnit(u)}
                      >
                        <Text style={styles.unitText}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); setEditingQuest(null); setCustomName(''); setCustomTarget(''); }}>
                  <Text style={styles.cancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleAddCustomQuest}>
                  <Text style={styles.confirmText}>{editingQuest ? 'SAVE' : 'ADD QUEST'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  backBtn: { padding: 16, paddingBottom: 0 },
  backText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: colors.electricBlue, letterSpacing: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  screenTag: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.electricBlue, letterSpacing: 3, textAlign: 'center', marginBottom: 16 },

  penaltyBanner: { marginBottom: 12 },
  penaltyTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, color: colors.penalty, letterSpacing: 2, marginBottom: 6 },
  penaltyMsg: { fontFamily: 'Rajdhani_400Regular', fontSize: 13, color: colors.penalty + 'cc', fontStyle: 'italic', letterSpacing: 0.5 },
  penaltySub: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.textSecondary, letterSpacing: 0.3, marginTop: 8, lineHeight: 16 },

  progressPanel: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressTitle: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: colors.textSecondary, letterSpacing: 2 },
  progressCount: { fontFamily: 'Rajdhani_700Bold', fontSize: 20, color: colors.textPrimary },
  progressTrack: { height: 6, backgroundColor: colors.surface, borderRadius: 1, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  progressFill: { height: '100%', borderRadius: 1 },
  allDoneText: { fontFamily: 'Rajdhani_700Bold', fontSize: 11, color: colors.success, letterSpacing: 2, marginTop: 8, textAlign: 'center' },

  successFlash: { alignItems: 'center', marginBottom: 8 },
  successText: { fontFamily: 'Rajdhani_700Bold', fontSize: 16, color: colors.gold, letterSpacing: 3 },

  addBtn: {
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderStyle: 'dashed',
    padding: 14,
    borderRadius: 0,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  addBtnText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 14, color: colors.electricBlue, letterSpacing: 2 },

  infoBox: { alignItems: 'center', paddingHorizontal: 20 },
  infoText: { fontFamily: 'Rajdhani_400Regular', fontSize: 11, color: colors.textDim, textAlign: 'center', letterSpacing: 0.5, lineHeight: 17 },

  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 },
  actionPanel: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 0, padding: 4, marginHorizontal: 40 },
  actionTitle: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: colors.textSecondary, letterSpacing: 1, padding: 12, paddingBottom: 8, textAlign: 'center' },
  actionBtn: { padding: 14, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  actionBtnDelete: { borderTopColor: colors.penalty + '44' },
  actionBtnText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 14, color: colors.electricBlue, letterSpacing: 1.5 },
  modalPanel: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.electricBlue, padding: 20, borderRadius: 0 },
  modalTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, color: colors.electricBlue, letterSpacing: 3, textAlign: 'center', marginBottom: 16 },
  modalLabel: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 10, color: colors.textSecondary, letterSpacing: 2.5, marginBottom: 6 },
  modalInput: { fontFamily: 'Rajdhani_500Medium', fontSize: 16, color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6, marginBottom: 14 },
  typeOption: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 0, marginRight: 8 },
  typeSelected: { borderColor: colors.electricBlue, backgroundColor: colors.electricBlue + '22' },
  typeText: { fontFamily: 'Rajdhani_500Medium', fontSize: 13, color: colors.textPrimary },
  targetRow: { flexDirection: 'row', marginBottom: 16 },
  unitOption: { paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 0, marginBottom: 4 },
  unitText: { fontFamily: 'Rajdhani_500Medium', fontSize: 12, color: colors.textPrimary },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: colors.textDim, borderRadius: 0, alignItems: 'center' },
  cancelText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 14, color: colors.textSecondary, letterSpacing: 1 },
  confirmBtn: { flex: 1, padding: 12, backgroundColor: colors.electricBlue, borderRadius: 0, alignItems: 'center' },
  confirmText: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, color: colors.textPrimary, letterSpacing: 1 },
});
