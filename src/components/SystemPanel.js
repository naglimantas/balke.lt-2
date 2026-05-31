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

  // Sharp accent color for the death-metal corner claws
  const cornerColor = penalty ? colors.penalty : colors.borderGlowStrong;

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
      {/* Bold angular corner claws — sharp death-metal frame */}
      <View style={[styles.corner, styles.tl, { borderColor: cornerColor }]} />
      <View style={[styles.corner, styles.tr, { borderColor: cornerColor }]} />
      <View style={[styles.corner, styles.bl, { borderColor: cornerColor }]} />
      <View style={[styles.corner, styles.br, { borderColor: cornerColor }]} />
      {/* Diagonal spikes piercing inward from each corner */}
      <View style={[styles.spike, styles.spikeTL, { backgroundColor: cornerColor }]} />
      <View style={[styles.spike, styles.spikeTR, { backgroundColor: cornerColor }]} />
      <View style={[styles.spike, styles.spikeBL, { backgroundColor: cornerColor }]} />
      <View style={[styles.spike, styles.spikeBR, { backgroundColor: cornerColor }]} />
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
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 3,
  },
  tl: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0 },
  // Thin diagonal blades angled across each corner
  spike: {
    position: 'absolute',
    width: 16,
    height: 2,
  },
  spikeTL: { top: 5, left: -3, transform: [{ rotate: '45deg' }] },
  spikeTR: { top: 5, right: -3, transform: [{ rotate: '-45deg' }] },
  spikeBL: { bottom: 5, left: -3, transform: [{ rotate: '-45deg' }] },
  spikeBR: { bottom: 5, right: -3, transform: [{ rotate: '45deg' }] },
});
