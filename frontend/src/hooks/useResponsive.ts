import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const baseWidth = 390; // iPhone 14 width baseline

export const useResponsive = () => {
  const { width } = useWindowDimensions();
  const scale = width / baseWidth;

  const spacing = useMemo(
    () => ({
      xs: 4 * scale,
      sm: 8 * scale,
      md: 12 * scale,
      lg: 16 * scale,
      xl: 24 * scale,
    }),
    [scale],
  );

  const font = (size: number) => size * (0.9 + scale * 0.1);

  return { spacing, font };
};
