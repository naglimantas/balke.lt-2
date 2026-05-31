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
import { colors, rankColors } from '../theme/colors';
import SystemPanel from '../components/SystemPanel';
import RankBadge from '../components/RankBadge';
import { WORKOUT_PLANS, CATEGORY_LABELS, getRandomQuote } from '../utils/workoutData';
import { getCustomWorkouts } from '../utils/storage';

const { width } = Dimensions.get('window');
const CATEGORIES = ['all', 'strength', 'cardio', 'endurance', 'flexibility'];

const CATEGORY_ICONS = {
  all: '⚔️',
  strength: '💪',
  cardio: '⚡',
  endurance: '🛡',
  flexibility: '🌀',
};

export default function WorkoutLibraryScreen({ navigation }) {
  const [category, setCategory] = useState('all');
  const [customWorkouts, setCustomWorkouts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getCustomWorkouts().then(setCustomWorkouts);
    }, [])
  );

  const filteredPlans = category === 'all'
    ? WORKOUT_PLANS
    : WORKOUT_PLANS.filter(w => w.category === category);

  return (
    <LinearGradient colors={[colors.background, colors.darkPurple + '44', colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTag}>[ WORKOUT LIBRARY ]</Text>

          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterBtn, category === cat && styles.filterActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.filterText, category === cat && { color: colors.electricBlue }]}>
                  {CATEGORY_ICONS[cat]} {cat === 'all' ? 'ALL' : CATEGORY_LABELS[cat]?.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Custom Workout Builder CTA */}
          <TouchableOpacity
            style={styles.customBtn}
            onPress={() => navigation.navigate('CustomWorkoutBuilder')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.electricBlue + '33', colors.glowPurple + '22']}
              style={styles.customBtnGrad}
            >
              <Text style={styles.customBtnIcon}>⚙️</Text>
              <View>
                <Text style={styles.customBtnTitle}>CUSTOM WORKOUT BUILDER</Text>
                <Text style={styles.customBtnSub}>Design your own training protocol</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Pre-built Plans */}
          <Text style={styles.sectionTitle}>PRE-BUILT PROTOCOLS</Text>
          {filteredPlans.map(plan => (
            <WorkoutPlanCard
              key={plan.id}
              plan={plan}
              onPress={() => navigation.navigate('ActiveWorkout', { workout: plan })}
            />
          ))}

          {/* Custom Saved Workouts */}
          {customWorkouts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>MY PROTOCOLS</Text>
              {customWorkouts.map(w => (
                <WorkoutPlanCard
                  key={w.id}
                  plan={w}
                  onPress={() => navigation.navigate('ActiveWorkout', { workout: w })}
                  isCustom
                />
              ))}
            </>
          )}

          <View style={styles.quote}>
            <Text style={styles.quoteText}>{getRandomQuote()}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function WorkoutPlanCard({ plan, onPress, isCustom = false }) {
  const rankColor = rankColors[plan.rank] || rankColors.E;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.planCard}>
      <LinearGradient
        colors={[colors.surfaceElevated, colors.surface]}
        style={styles.planGrad}
      >
        <View style={styles.planTop}>
          <View style={styles.planTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planDesc} numberOfLines={2}>{plan.description}</Text>
            </View>
            <RankBadge rank={plan.rank || 'E'} size="small" showClass={false} />
          </View>
        </View>

        <View style={styles.planMeta}>
          <View style={styles.metaTag}>
            <Text style={styles.metaTagText}>
              {CATEGORY_ICONS[plan.category] || '🏋️'} {CATEGORY_LABELS[plan.category] || 'Custom'}
            </Text>
          </View>
          <View style={styles.metaTag}>
            <Text style={styles.metaTagText}>⏱ {plan.duration} min</Text>
          </View>
          <View style={styles.metaTag}>
            <Text style={styles.metaTagText}>📋 {plan.exercises?.length || 0} exercises</Text>
          </View>
          {isCustom && (
            <View style={[styles.metaTag, { borderColor: colors.glowPurple }]}>
              <Text style={[styles.metaTagText, { color: colors.glowPurple }]}>CUSTOM</Text>
            </View>
          )}
        </View>

        <View style={styles.exercisePreview}>
          {plan.exercises?.slice(0, 3).map((ex, i) => (
            <Text key={i} style={styles.exercisePreviewText}>
              • {ex.name} — {ex.sets}×{ex.reps} {ex.unit}
            </Text>
          ))}
          {plan.exercises?.length > 3 && (
            <Text style={styles.exerciseMore}>+{plan.exercises.length - 3} more</Text>
          )}
        </View>

        <View style={[styles.startBar, { backgroundColor: rankColor + '22', borderColor: rankColor + '55' }]}>
          <Text style={[styles.startText, { color: rankColor }]}>BEGIN PROTOCOL →</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  backBtn: { padding: 16, paddingBottom: 0 },
  backText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: colors.electricBlue, letterSpacing: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  screenTag: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.electricBlue, letterSpacing: 3, textAlign: 'center', marginBottom: 16 },

  filterRow: { marginBottom: 16, flexGrow: 0 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 0, marginRight: 8, backgroundColor: colors.surface },
  filterActive: { borderColor: colors.electricBlue, backgroundColor: colors.electricBlue + '22' },
  filterText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: colors.textSecondary, letterSpacing: 1 },

  customBtn: { borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: colors.electricBlue, marginBottom: 24 },
  customBtnGrad: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  customBtnIcon: { fontSize: 24 },
  customBtnTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 15, color: colors.textPrimary, letterSpacing: 1 },
  customBtnSub: { fontFamily: 'Rajdhani_400Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  arrow: { fontFamily: 'Rajdhani_700Bold', fontSize: 20, color: colors.electricBlue, marginLeft: 'auto' },

  sectionTitle: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 11, color: colors.textSecondary, letterSpacing: 3, marginBottom: 12 },

  planCard: { marginBottom: 14, borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  planGrad: { padding: 14 },
  planTop: { marginBottom: 10 },
  planTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  planName: { fontFamily: 'Rajdhani_700Bold', fontSize: 17, color: colors.textPrimary, letterSpacing: 0.5, marginBottom: 4 },
  planDesc: { fontFamily: 'Rajdhani_400Regular', fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  planMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaTag: { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border, borderRadius: 0 },
  metaTagText: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.textSecondary },

  exercisePreview: { marginBottom: 12 },
  exercisePreviewText: { fontFamily: 'Rajdhani_400Regular', fontSize: 12, color: colors.textDim, lineHeight: 18 },
  exerciseMore: { fontFamily: 'Rajdhani_500Medium', fontSize: 11, color: colors.textDim, marginTop: 2 },

  startBar: { padding: 10, borderWidth: 1, borderRadius: 1, alignItems: 'center' },
  startText: { fontFamily: 'Rajdhani_700Bold', fontSize: 13, letterSpacing: 2 },

  quote: { alignItems: 'center', marginTop: 16, paddingHorizontal: 20 },
  quoteText: { fontFamily: 'Rajdhani_400Regular', fontSize: 12, color: colors.textDim, fontStyle: 'italic', textAlign: 'center', letterSpacing: 0.5, lineHeight: 18 },
});
