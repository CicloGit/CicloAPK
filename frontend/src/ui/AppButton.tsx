import React from 'react';
import { Button } from 'react-native-paper';
import { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import { palette, radius, spacing, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'outline';

interface Props {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  icon?: string;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  compact?: boolean;
}

export const AppButton: React.FC<Props> = ({
  label,
  onPress,
  icon,
  variant = 'primary',
  style,
  disabled,
  compact,
}) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  const buttonColor = isPrimary
    ? palette.primary
    : isSecondary
      ? palette.secondary
      : palette.white;

  const textColor = variant === 'outline' ? palette.primary : palette.white;
  const mode = variant === 'outline' ? 'outlined' : 'contained';

  return (
    <Button
      icon={icon}
      mode={mode}
      onPress={onPress}
      disabled={disabled}
      buttonColor={buttonColor}
      textColor={textColor}
      style={[
        {
          borderRadius: radius.md,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variant === 'outline' ? palette.primary : 'transparent',
          paddingVertical: compact ? spacing.xs : spacing.sm,
        },
        style,
      ]}
      labelStyle={{
        fontFamily: typography.label.fontFamily,
      }}
    >
      {label}
    </Button>
  );
};
