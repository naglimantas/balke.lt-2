import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function SystemPanel({ children, style, penalty = false, glow = false, noPad = false }) {
  const borderColor = penalty
    ? colors.penalty
    : glow
    ? colors.electricBlue
    : colors.border;

  const glowShadow = penalty
    ? { shadowColor: colors.penalty, shadowOpacity: 0.7, elevation: 10, shadowRadius: 14 }
    : glow
    ? { shadowColor: colors.electricBlue, shadowOpacity: 0.6, elevation: 10, shadowRadius: 14 }
    : { shadowColor: colors.electricBlue, shadowOpacity: 0.12, elevation: 4, shadowRadius: 8 };

  return (
    <View
      style={[
        styles.panel,
        { borderColor },
        glowShadow,
        noPad ? styles.noPad : {},
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderRadius: 0,
    padding: 16,
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
  },
  noPad: {
    padding: 0,
  },
});
