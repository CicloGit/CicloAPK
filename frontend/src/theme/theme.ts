import { MD3LightTheme } from 'react-native-paper';
import { palette, radius } from './colors';

const fonts = {
  ...MD3LightTheme.fonts,
  bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontFamily: 'Inter_400Regular' },
  bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontFamily: 'Inter_400Regular' },
  bodySmall: { ...MD3LightTheme.fonts.bodySmall, fontFamily: 'Inter_400Regular' },
  titleLarge: { ...MD3LightTheme.fonts.titleLarge, fontFamily: 'Montserrat_700Bold' },
  titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: 'Montserrat_600SemiBold' },
  titleSmall: { ...MD3LightTheme.fonts.titleSmall, fontFamily: 'Montserrat_600SemiBold' },
  labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontFamily: 'Inter_600SemiBold' },
  labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: 'Inter_500Medium' },
  labelSmall: { ...MD3LightTheme.fonts.labelSmall, fontFamily: 'Inter_400Regular' },
};

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
    background: palette.white,
    surface: palette.white,
    surfaceVariant: palette.gray100,
    outline: palette.gray200,
    error: palette.danger,
    onPrimary: palette.white,
    onSurface: palette.graphite,
    text: palette.text,
  },
  roundness: radius.md,
  fonts,
};
