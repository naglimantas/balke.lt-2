import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, rankColors } from '../theme/colors';
import SystemPanel from '../components/SystemPanel';
import { saveCustomWorkout } from '../utils/storage';
import { EXERCISE_TYPES, UNIT_OPTIONS } from '../utils/questData';

const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'];

export default function CustomWorkoutBuilderScreen({ navigation }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('strength');
  const [rank, setRank] = useState('E');
  const [duration, setDuration] = useState('30');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState([]);
  const [showAddExercise, setShowAddExercise] = useState(false);

  // Add exercise form
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('3');
  const [exReps, setExReps] = useState('10');
  const [exUnit, setExUnit] = useState('reps');
  const [exRest, setExRest] = useState('60');
  const [exType, setExType] = useState('strength');

  function addExercise() {
    if (!exName.trim()) return;
    const ex = {
      name: exName.trim(),
      sets: parseInt(exSets) || 3,
      reps: parseInt(exReps) || 10,
      unit: exUnit,
      rest: parseInt(exRest) || 60,
      type: exType,
    };
    setExercises([...exercises, ex]);
    setExName('');
    setExSets('3');
    setExReps('10');
    setShowAddExercise(false);
  }

  function removeExercise(idx) {
    setExercises(exercises.filter((_, i) => i !== idx));
  }

  async function saveWorkout(startNow = false) {
    if (!name.trim()) { Alert.alert('Name required', 'Enter a protocol name.'); return; }
    if (exercises.length === 0) { Alert.alert('No exercises', 'Add at least one exercise.'); return; }

    const workout = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      category,
      rank,
      duration: parseInt(duration) || 30,
      description: description.trim() || `Custom ${name.trim()} protocol`,
      exercises,
      isCustom: true,
    };

    await saveCustomWorkout(workout);

    if (startNow) {
      navigation.replace('ActiveWorkout', { workout });
    } else {
      Alert.alert('Protocol Saved', 'Your custom workout has been saved to the library.');
      navigation.goBack();
    }
  }

  return (
    <LinearGradient colors={[colors.background, colors.darkPurple + '44', colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTag}>[ CUSTOM PROTOCOL BUILDER ]</Text>

          <SystemPanel style={styles.panel}>
            <Text style={styles.fieldLabel}>PROTOCOL NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Shadow Force Circuit"
              placeholderTextColor={colors.textDim}
            />

            <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, { height: 60 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your training protocol..."
              placeholderTextColor={colors.textDim}
              multiline
            />

            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {EXERCISE_TYPES.map(et => (
                <TouchableOpacity
                  key={et.value}
                  style={[styles.chip, category === et.value && styles.chipActive]}
                  onPress={() => setCategory(et.value)}
                >
                  <Text style={[styles.chipText, category === et.value && { color: colors.electricBlue }]}>
                    {et.icon} {et.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>DIFFICULTY RANK</Text>
            <View style={styles.rankRow}>
              {RANKS.map(r => {
                const rColor = rankColors[r];
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rankChip, { borderColor: rColor }, rank === r && { backgroundColor: rColor + '33' }]}
                    onPress={() => setRank(r)}
                  >
                    <Text style={[styles.rankChipText, { color: rColor }]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>ESTIMATED DURATION (MIN)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.textDim}
            />
          </SystemPanel>

          {/* Exercises */}
          <SystemPanel style={styles.panel}>
            <Text style={styles.fieldLabel}>EXERCISES ({exercises.length})</Text>
            {exercises.map((ex, idx) => (
              <View key={idx} style={styles.exerciseRow}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseMeta}>{ex.sets}×{ex.reps} {ex.unit} · {ex.rest}s rest</Text>
                </View>
                <TouchableOpacity onPress={() => removeExercise(idx)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {!showAddExercise ? (
              <TouchableOpacity style={styles.addExBtn} onPress={() => setShowAddExercise(true)}>
                <Text style={styles.addExText}>+ ADD EXERCISE</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.addExForm}>
                <Text style={styles.addExTitle}>— NEW EXERCISE —</Text>

                <TextInput
                  style={styles.input}
                  value={exName}
                  onChangeText={setExName}
                  placeholder="Exercise name"
                  placeholderTextColor={colors.textDim}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {EXERCISE_TYPES.map(et => (
                    <TouchableOpacity
                      key={et.value}
                      style={[styles.chip, exType === et.value && styles.chipActive]}
                      onPress={() => setExType(et.value)}
                    >
                      <Text style={[styles.chipText, exType === et.value && { color: colors.electricBlue }]}>
                        {et.icon}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.exInputRow}>
                  <View style={styles.exInputField}>
                    <Text style={styles.exInputLabel}>SETS</Text>
                    <TextInput style={styles.smallInput} value={exSets} onChangeText={setExSets} keyboardType="numeric" />
                  </View>
                  <View style={styles.exInputField}>
                    <Text style={styles.exInputLabel}>REPS</Text>
                    <TextInput style={styles.smallInput} value={exReps} onChangeText={setExReps} keyboardType="numeric" />
                  </View>
                  <View style={styles.exInputField}>
                    <Text style={styles.exInputLabel}>REST(s)</Text>
                    <TextInput style={styles.smallInput} value={exRest} onChangeText={setExRest} keyboardType="numeric" />
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {UNIT_OPTIONS.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.chip, exUnit === u && styles.chipActive]}
                      onPress={() => setExUnit(u)}
                    >
                      <Text style={[styles.chipText, exUnit === u && { color: colors.electricBlue }]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.addExButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddExercise(false)}>
                    <Text style={styles.cancelText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={addExercise}>
                    <Text style={styles.confirmText}>ADD</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </SystemPanel>

          {/* Action Buttons */}
          <TouchableOpacity style={styles.saveBtn} onPress={() => saveWorkout(false)}>
            <Text style={styles.saveBtnText}>SAVE TO LIBRARY</Text>
          </TouchableOpacity>

          {exercises.length > 0 && (
            <TouchableOpacity style={styles.startBtn} onPress={() => saveWorkout(true)}>
              <LinearGradient colors={[colors.electricBlue, colors.glowPurple]} style={styles.startGrad}>
                <Text style={styles.startBtnText}>SAVE & BEGIN NOW</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </ScrollView>
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

  panel: { marginBottom: 14 },
  fieldLabel: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 10, color: colors.textSecondary, letterSpacing: 2.5, marginBottom: 6, marginTop: 8 },
  input: { fontFamily: 'Rajdhani_500Medium', fontSize: 16, color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6, marginBottom: 4 },

  chip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 0, marginRight: 8, backgroundColor: colors.surface },
  chipActive: { borderColor: colors.electricBlue, backgroundColor: colors.electricBlue + '22' },
  chipText: { fontFamily: 'Rajdhani_500Medium', fontSize: 13, color: colors.textSecondary },

  rankRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  rankChip: { flex: 1, padding: 10, borderWidth: 1.5, borderRadius: 0, alignItems: 'center' },
  rankChipText: { fontFamily: 'Rajdhani_700Bold', fontSize: 16, letterSpacing: 1 },

  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 15, color: colors.textPrimary },
  exerciseMeta: { fontFamily: 'Rajdhani_400Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  removeBtn: { padding: 6 },
  removeText: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, color: colors.danger },

  addExBtn: { paddingVertical: 12, borderWidth: 1, borderColor: colors.electricBlue, borderStyle: 'dashed', alignItems: 'center', borderRadius: 0, marginTop: 8 },
  addExText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 14, color: colors.electricBlue, letterSpacing: 2 },

  addExForm: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  addExTitle: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: colors.electricBlue, letterSpacing: 2, textAlign: 'center', marginBottom: 12 },
  exInputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  exInputField: { flex: 1 },
  exInputLabel: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 9, color: colors.textSecondary, letterSpacing: 2, marginBottom: 4 },
  smallInput: { fontFamily: 'Rajdhani_500Medium', fontSize: 18, color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 4, textAlign: 'center' },

  addExButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: colors.textDim, borderRadius: 0, alignItems: 'center' },
  cancelText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: colors.textSecondary, letterSpacing: 1 },
  confirmBtn: { flex: 2, padding: 10, backgroundColor: colors.electricBlue, borderRadius: 0, alignItems: 'center' },
  confirmText: { fontFamily: 'Rajdhani_700Bold', fontSize: 13, color: colors.textPrimary, letterSpacing: 1 },

  saveBtn: { padding: 14, borderWidth: 1, borderColor: colors.glowPurple, borderRadius: 0, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { fontFamily: 'Rajdhani_700Bold', fontSize: 15, color: colors.glowPurple, letterSpacing: 2 },
  startBtn: { borderRadius: 0, overflow: 'hidden' },
  startGrad: { padding: 16, alignItems: 'center' },
  startBtnText: { fontFamily: 'Rajdhani_700Bold', fontSize: 16, color: colors.textPrimary, letterSpacing: 3 },
});
