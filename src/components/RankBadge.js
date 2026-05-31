import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { rankColors } from '../theme/colors';

// Short labels for badges. Multi-letter ranks use a single glyph.
const RANK_GLYPH = {
  E: 'E',
  D: 'D',
  C: 'C',
  B: 'B',
  A: 'A',
  S: 'S',
  National: 'N',
  Monarch: 'M',
  Sovereign: '◆',
};

export default function RankBadge({ rank = 'E', size = 'medium', showClass = true }) {
  const color = rankColors[rank] || rankColors.E;

  const sizeStyles = {
    small: { width: 32, height: 32, borderRadius: 0, borderWidth: 1.5 },
    medium: { width: 52, height: 52, borderRadius: 0, borderWidth: 2 },
    large: { width: 80, height: 80, borderRadius: 0, borderWidth: 2.5 },
    xlarge: { width: 120, height: 120, borderRadius: 0, borderWidth: 3 },
  };

  const textSizes = {
    small: 14,
    medium: 24,
    large: 36,
    xlarge: 56,
  };

  const labelSizes = {
    small: 6,
    medium: 8,
    large: 10,
    xlarge: 12,
  };

  const shadowRadiusByMode = {
    small: 4,
    medium: 6,
    large: 10,
    xlarge: 14,
  };

  return (
    <View
      style={[
        styles.badge,
        sizeStyles[size],
        {
          borderColor: color,
          shadowColor: color,
          backgroundColor: color + '22',
        },
      ]}
    >
      <Text
        style={[
          styles.rankText,
          {
            color,
            fontSize: textSizes[size],
            textShadowColor: color,
            textShadowRadius: shadowRadiusByMode[size],
            textShadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        {RANK_GLYPH[rank] || rank.charAt(0)}
      </Text>
      {showClass && size !== 'small' && (
        <Text style={[styles.classLabel, { color: color + 'bb', fontSize: labelSizes[size] }]}>
          CLASS
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.8,
    elevation: 8,
  },
  rankText: {
    fontFamily: 'Rajdhani_700Bold',
    letterSpacing: 0,
    textAlign: 'center',
    includeFontPadding: false,
  },
  classLabel: {
    fontFamily: 'Rajdhani_600SemiBold',
    letterSpacing: 2,
    marginTop: -2,
    textAlign: 'center',
  },
});
