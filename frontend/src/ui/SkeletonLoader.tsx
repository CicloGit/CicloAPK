import React, { useEffect } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radius, spacing } from '../theme';

interface Props {
  height?: number;
  width?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<Props> = ({ height = 14, width = 200, style }) => {
  const opacity = new Animated.Value(0.4);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={{ paddingVertical: spacing.xs }}>
      <Animated.View
        style={[
          styles.shimmer,
          { height, width, opacity },
          style,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  shimmer: {
    backgroundColor: palette.gray200,
    borderRadius: radius.sm,
  },
});
