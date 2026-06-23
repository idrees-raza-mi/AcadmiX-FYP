export const colors = {
  // Primary — Emerald (single accent)
  primary: '#059669',
  primaryLight: '#34D399',
  primaryDark: '#047857',

  // Secondary — same emerald family (no second hue)
  secondary: '#047857',
  secondaryLight: '#6EE7B7',
  secondaryDark: '#065F46',

  // Background colors
  background: '#F8FAFC',
  backgroundGradient: ['#059669', '#047857'], // subtle single-hue gradient

  // Card and surface colors
  white: '#FFFFFF',
  cardBackground: '#FFFFFF',

  // Text colors
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textLight: '#94A3B8',

  // Status colors (semantic only)
  success: '#059669', // present
  error: '#EF4444',   // absent
  warning: '#F59E0B', // late / leave
  info: '#059669',

  // Neutral colors
  gray: '#64748B',
  lightGray: '#E2E8F0',
  border: '#E2E8F0',

  // Gender accents (kept on-palette)
  male: '#059669',
  female: '#475569',

  // Shadow
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const typography = {
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  
  // Font weights
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  
  // Line heights
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12, // Reduced from 16
  lg: 16, // Reduced from 24
  xl: 20, // Reduced from 32
  '2xl': 24, // Reduced from 48
  '3xl': 32, // Reduced from 64
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};
