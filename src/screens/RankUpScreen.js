import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, rankColors } from '../theme/colors';
import RankBadge from '../components/RankBadge';
import { RANK_MESSAGES } from '../utils/xpSystem';
import { sendRankUpNotification } from '../utils/notifications';

const { width, height } = Dimensions.get('window');

const RANK_BG_COLORS = {
  D: ['#000022', '#000066', '#000022'],
  C: ['#001100', '#003300', '#001100'],
  B: ['#110022', '#220044', '#110022'],
  A: ['#220011', '#440022', '#220011'],
  S: ['#1a1100', '#332200', '#1a1100'],
};

export default function RankUpScreen({ navigation, route }) {
  const { newRank } = route.params;
  const rankColor = rankColors[newRank] || colors.gold;
  const bgColors = RANK_BG_COLORS[newRank] || RANK_BG_COLORS.D;
  const message = RANK_MESSAGES[newRank] || 'You have ascended. A new rank has been bestowed.';

  // Animations
  const bgFade = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeGlow = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(40)).current;
  const particleAnims = useRef(
    Array.from({ length: 12 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;
  const btnFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    sendRankUpNotification(newRank).catch(() => {});
    runCinematic();
  }, []);

  function runCinematic() {
    // Phase 1: Background fade in
    Animated.timing(bgFade, { toValue: 1, duration: 800, useNativeDriver: true }).start(() => {
      // Phase 2: Badge entrance
      Animated.spring(badgeScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start(() => {
        // Phase 3: Glow pulse + text
        Animated.loop(
          Animated.sequence([
            Animated.timing(badgeGlow, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(badgeGlow, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
          ])
        ).start();

        Animated.parallel([
          Animated.timing(textFade, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(titleSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]).start(() => {
          // Phase 4: Particles
          runParticles();
          // Phase 5: Button
          setTimeout(() => {
            Animated.timing(btnFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
          }, 1200);
        });
      });
    });
  }

  function runParticles() {
    const angles = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);
    const animations = particleAnims.map((p, i) => {
      const angle = angles[i];
      const distance = 120 + Math.random() * 80;
      return Animated.parallel([
        Animated.timing(p.opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(p.scale, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(p.x, {
          toValue: Math.cos(angle) * distance,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: Math.sin(angle) * distance,
          duration: 900,
          useNativeDriver: true,
        }),
      ]);
    });
    Animated.stagger(40, animations).start(() => {
      // Fade out particles
      Animated.parallel(
        particleAnims.map(p =>
          Animated.timing(p.opacity, { toValue: 0, duration: 500, useNativeDriver: true })
        )
      ).start(() => {
        // Reset and loop
        particleAnims.forEach(p => {
          p.x.setValue(0);
          p.y.setValue(0);
          p.scale.setValue(0);
        });
        setTimeout(runParticles, 800);
      });
    });
  }

  return (
    <Animated.View style={[styles.root, { opacity: bgFade }]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />

      {/* Scan lines overlay */}
      <View style={styles.scanlines} pointerEvents="none">
        {Array.from({ length: 30 }).map((_, i) => (
          <View key={i} style={[styles.scanline, { top: i * (height / 30) }]} />
        ))}
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* System tag */}
          <Animated.Text style={[styles.systemTag, { opacity: textFade }]}>
            [ SYSTEM NOTIFICATION ]
          </Animated.Text>

          {/* Badge with particles */}
          <View style={styles.badgeContainer}>
            {/* Particles */}
            {particleAnims.map((p, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.particle,
                  {
                    backgroundColor: rankColor,
                    opacity: p.opacity,
                    transform: [
                      { translateX: p.x },
                      { translateY: p.y },
                      { scale: p.scale },
                    ],
                  },
                ]}
              />
            ))}

            {/* Glow ring */}
            <Animated.View
              style={[
                styles.glowRing,
                {
                  borderColor: rankColor,
                  shadowColor: rankColor,
                  opacity: badgeGlow,
                  transform: [{ scale: badgeScale }],
                },
              ]}
            />

            {/* Badge */}
            <Animated.View
              style={{
                transform: [{ scale: badgeScale }],
              }}
            >
              <RankBadge rank={newRank} size="xlarge" />
            </Animated.View>
          </View>

          {/* Rank text */}
          <Animated.View style={{ opacity: textFade, transform: [{ translateY: titleSlide }], alignItems: 'center' }}>
            <Text style={styles.rankUpLabel}>RANK UP</Text>
            <Text style={[styles.rankName, { color: rankColor, textShadowColor: rankColor }]}>
              {newRank} — CLASS
            </Text>
            <View style={styles.divider} />
            <Text style={styles.message}>{message}</Text>
          </Animated.View>

          {/* Continue button */}
          <Animated.View style={[styles.btnWrapper, { opacity: btnFade }]}>
            <TouchableOpacity
              style={[styles.continueBtn, { borderColor: rankColor }]}
              onPress={() => navigation.navigate('HomeDashboard')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[rankColor + '33', rankColor + '11']}
                style={styles.continueGrad}
              >
                <Text style={[styles.continueBtnText, { color: rankColor }]}>
                  ACKNOWLEDGE
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#ffffff05',
  },
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 24,
  },
  systemTag: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 12,
    color: colors.electricBlue,
    letterSpacing: 4,
  },
  badgeContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 0,
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 0,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 1,
  },
  rankUpLabel: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  rankName: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 48,
    letterSpacing: 8,
    textTransform: 'uppercase',
    textShadowRadius: 30,
    textShadowOffset: { width: 0, height: 0 },
  },
  divider: {
    width: 120,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  message: {
    fontFamily: 'Rajdhani_400Regular',
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 22,
    fontStyle: 'italic',
    maxWidth: 280,
  },
  btnWrapper: { width: '100%', maxWidth: 280 },
  continueBtn: {
    borderWidth: 1.5,
    borderRadius: 0,
    overflow: 'hidden',
  },
  continueGrad: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueBtnText: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 18,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
});
