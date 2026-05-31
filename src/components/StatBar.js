import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, statColors } from '../theme/colors';

const STAT_ICONS = {
  strength: '💪',
  agility: '⚡',
  endurance: '🛡',
  intelligence: '🧠',
  vitality: '🌀',
};

const STAT_LABELS = {
  strength: 'Strength',
  agility: 'Agility',
  endurance: 'Endurance',
  intelligence: 'Intelligence',
  vitality: 'Vitality',
};

const MAX_STAT = 500;

export default function StatBar({ statName, value = 0, showValue = true, compact = false }) {
  const color = statColors[statName] || colors.electricBlue;
  const icon = STAT_ICONS[statName] || '◆';
  const label = STAT_LABELS[statName] || statName;
  const animWidth = useRef(new Animated.Value(0)).current;

  const progress = Math.min(value / MAX_STAT, 1);

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: progress,
      duration: 1000,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Text style={styles.compactIcon}>{icon}</Text>
        <Text style={[styles.compactLabel, { color }]} numberOfLines={1}>{label}</Text>
        <View style={styles.compactBar}>
          <Animated.View
            style={[
              styles.fill,
              {
                width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: color,
                shadowColor: color,
              },
            ]}
          />
        </View>
        <Text style={[styles.compactValue, { color }]}>{value}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {showValue && <Text style={[styles.value, { color }]}>{value}</Text>}
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  label: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  value: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 16,
  },
  track: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: {
    height: '100%',
    borderRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.8,
  },
  // Compact
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    gap: 8,
  },
  compactIcon: {
    fontSize: 14,
    width: 20,
  },
  compactLabel: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    width: 86,
  },
  compactBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactValue: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 12,
    width: 32,
    textAlign: 'right',
  },
});
