import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, spacing, typography } from '../theme';

interface Props {
  title: string;
  description?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
  icon?: string;
}

export const EmptyState: React.FC<Props> = ({
  title,
  description,
  ctaLabel,
  onPressCta,
  icon = 'clipboard-text-outline',
}) => (
  <View style={styles.container}>
    <MaterialCommunityIcons name={icon as any} size={32} color={palette.gray400} />
    <Text style={styles.title}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
    {ctaLabel ? (
      <Button
        mode="contained"
        onPress={onPressCta}
        buttonColor={palette.secondary}
        textColor={palette.graphite}
        style={styles.button}
      >
        {ctaLabel}
      </Button>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    ...typography.subheading,
    color: palette.graphite,
    fontSize: 16,
  },
  description: {
    ...typography.body,
    color: palette.gray400,
    textAlign: 'center',
  },
  button: {
    borderRadius: 12,
    marginTop: spacing.xs,
  },
});
