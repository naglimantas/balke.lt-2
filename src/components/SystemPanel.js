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
      {/* Corner brackets — larger and sharper for edgy look */}
      <View style={[styles.corner, styles.tl, { borderColor }]} />
      <View style={[styles.corner, styles.tr, { borderColor }]} />
      <View style={[styles.corner, styles.bl, { borderColor }]} />
      <View style={[styles.corner, styles.br, { borderColor }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderRadius: 1,
    padding: 16,
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
  },
  noPad: {
    padding: 0,
  },
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderWidth: 2,
  },
  tl: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0 },
});
