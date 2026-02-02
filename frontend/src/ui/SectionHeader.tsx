import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { palette, spacing, typography } from '../theme';

interface Props {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
}

export const SectionHeader: React.FC<Props> = ({ title, actionLabel, onPressAction }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {actionLabel ? (
      <Button
        mode="text"
        textColor={palette.primary}
        onPress={onPressAction}
        labelStyle={{ fontFamily: typography.label.fontFamily }}
      >
        {actionLabel}
      </Button>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.subheading,
    fontSize: 18,
    color: palette.graphite,
  },
});
