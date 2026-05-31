import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import SystemPanel from '../components/SystemPanel';
import { saveHunterProfile, createDefaultProfile } from '../utils/storage';
import { initNotifications } from '../utils/notifications';

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Regular training background' },
  { value: 'advanced', label: 'Advanced', desc: 'Serious athlete' },
];

export default function HunterCreationScreen({ navigation }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('beginner');
  const [step, setStep] = useState(0); // 0=intro, 1=form, 2=confirm
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start();

    // Scanline loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanlineAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(scanlineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => setStep(1), 3500);
    return () => clearTimeout(timer);
  }, []);

  function validate() {
    if (!name.trim()) return 'Enter your Hunter name.';
    if (!age || isNaN(parseInt(age)) || parseInt(age) < 10 || parseInt(age) > 99) return 'Enter a valid age (10–99).';
    if (!bodyWeight || isNaN(parseFloat(bodyWeight))) return 'Enter your body weight.';
    return null;
  }

  async function handleCreate() {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    try {
      const profile = createDefaultProfile({ name: name.trim(), age, bodyWeight, fitnessLevel });
      await saveHunterProfile(profile);
      await initNotifications();
      navigation.replace('HomeDashboard');
    } catch {
      setError('Failed to create profile. Please try again.');
    }
  }

  return (
    <LinearGradient colors={[colors.background, colors.darkPurple, colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* INTRO OVERLAY */}
            {step === 0 && (
              <Animated.View style={[styles.introContainer, { opacity: fadeAnim }]}>
                <Text style={styles.systemInit}>[ SYSTEM INITIALIZING ]</Text>
                <Animated.Text
                  style={[
                    styles.monarchTitle,
                    { transform: [{ translateY: slideAnim }] },
                  ]}
                >
                  SHADOW{'\n'}MONARCH
                </Animated.Text>
                <Text style={styles.systemSub}>RISE OF THE HUNTER</Text>
                <View style={styles.scanlineContainer}>
                  <Animated.View
                    style={[
                      styles.scanline,
                      {
                        transform: [
                          {
                            translateY: scanlineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 300],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </View>
                <Text style={styles.bootText}>Detecting new Hunter...</Text>
              </Animated.View>
            )}

            {/* FORM */}
            {step >= 1 && (
              <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
                <Text style={styles.systemHeader}>[ SYSTEM NOTIFICATION ]</Text>
                <Text style={styles.systemMessage}>
                  A new Hunter has been detected.{'\n'}
                  Please register your profile to begin your ascent.
                </Text>

                <SystemPanel style={styles.formPanel} glow>
                  <Text style={styles.sectionLabel}>HUNTER DESIGNATION</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your name, Hunter"
                      placeholderTextColor={colors.textDim}
                      maxLength={30}
                      autoCapitalize="words"
                    />
                  </View>

                  <Text style={styles.sectionLabel}>AGE</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={age}
                      onChangeText={setAge}
                      placeholder="Years"
                      placeholderTextColor={colors.textDim}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>

                  <Text style={styles.sectionLabel}>BODY WEIGHT (kg)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={bodyWeight}
                      onChangeText={setBodyWeight}
                      placeholder="kg"
                      placeholderTextColor={colors.textDim}
                      keyboardType="decimal-pad"
                      maxLength={6}
                    />
                  </View>

                  <Text style={styles.sectionLabel}>HUNTER CLASSIFICATION</Text>
                  <View style={styles.levelGrid}>
                    {FITNESS_LEVELS.map(fl => (
                      <TouchableOpacity
                        key={fl.value}
                        style={[
                          styles.levelOption,
                          fitnessLevel === fl.value && styles.levelSelected,
                        ]}
                        onPress={() => setFitnessLevel(fl.value)}
                      >
                        <Text style={[
                          styles.levelLabel,
                          fitnessLevel === fl.value && { color: colors.electricBlue },
                        ]}>
                          {fl.label}
                        </Text>
                        <Text style={styles.levelDesc}>{fl.desc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </SystemPanel>

                <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[colors.electricBlue, colors.glowPurple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createGrad}
                  >
                    <Text style={styles.createBtnText}>ARISE AS A HUNTER</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                  "The weak exist to be prey of the strong. But you — you chose to rise."
                </Text>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  introContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 600,
    paddingTop: 80,
  },
  systemInit: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 12,
    color: colors.electricBlue,
    letterSpacing: 3,
    marginBottom: 30,
  },
  monarchTitle: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 56,
    color: colors.textPrimary,
    letterSpacing: 8,
    textAlign: 'center',
    lineHeight: 60,
    textTransform: 'uppercase',
    textShadowColor: colors.electricBlue,
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  systemSub: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: colors.glowPurple,
    letterSpacing: 6,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  scanlineContainer: {
    width: 280,
    height: 2,
    overflow: 'hidden',
    marginVertical: 30,
  },
  scanline: {
    width: '100%',
    height: 1,
    backgroundColor: colors.electricBlue + '88',
  },
  bootText: {
    fontFamily: 'Rajdhani_400Regular',
    fontSize: 13,
    color: colors.textDim,
    letterSpacing: 2,
  },

  formContainer: {
    paddingTop: 24,
  },
  systemHeader: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 12,
    color: colors.electricBlue,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 8,
  },
  systemMessage: {
    fontFamily: 'Rajdhani_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  formPanel: { marginBottom: 24 },
  sectionLabel: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2.5,
    marginTop: 14,
    marginBottom: 6,
  },
  inputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  input: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 18,
    color: colors.textPrimary,
    paddingVertical: 8,
    letterSpacing: 0.5,
  },
  levelGrid: {
    gap: 8,
    marginTop: 4,
  },
  levelOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 0,
    backgroundColor: colors.surface,
  },
  levelSelected: {
    borderColor: colors.electricBlue,
    backgroundColor: colors.electricBlue + '15',
  },
  levelLabel: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  levelDesc: {
    fontFamily: 'Rajdhani_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 13,
    color: colors.danger,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  createBtn: {
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: 20,
  },
  createGrad: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  createBtnText: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  disclaimer: {
    fontFamily: 'Rajdhani_400Regular',
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.5,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
