import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { getXPProgress, getNextRank } from '../utils/xpSystem';
import { rankColors } from '../theme/colors';

export default function XPBar({ totalXP = 0, rank = 'E', compact = false }) {
  const { progress, xpInRank, xpNeeded } = getXPProgress(totalXP, rank);
  const nextRank = getNextRank(rank);
  const rankColor = rankColors[rank];
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: Math.min(progress, 1),
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [totalXP, rank]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: rankColor,
                shadowColor: rankColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.xpTextSmall, { color: rankColor }]}>
          {xpInRank}/{xpNeeded} XP
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.xpLabel}>EXPERIENCE</Text>
        <Text style={[styles.xpValue, { color: rankColor }]}>
          {totalXP.toLocaleString()} XP
        </Text>
      </View>
      <View style={styles.barTrackFull}>
        <Animated.View
          style={[
            styles.barFillFull,
            {
              width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: rankColor,
              shadowColor: rankColor,
            },
          ]}
        />
        {/* Glow pulse overlay */}
        <Animated.View
          style={[
            styles.glowOverlay,
            {
              width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: rankColor + '44',
            },
          ]}
        />
      </View>
      <View style={styles.footer}>
        <Text style={styles.rankProgress}>
          {xpInRank.toLocaleString()} / {xpNeeded?.toLocaleString() ?? '—'} XP
        </Text>
        {nextRank && (
          <Text style={styles.nextRank}>
            Next: <Text style={{ color: rankColors[nextRank] }}>{nextRank} Class</Text>
          </Text>
        )}
        {!nextRank && (
          <Text style={[styles.nextRank, { color: colors.gold }]}>MAX RANK</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  xpLabel: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  xpValue: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  barTrackFull: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  barFillFull: {
    height: '100%',
    borderRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.9,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  rankProgress: {
    fontFamily: 'Rajdhani_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  nextRank: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  // Compact
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  barFill: {
    height: '100%',
    borderRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
  xpTextSmall: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
