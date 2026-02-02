import React from 'react';
import { Appbar } from 'react-native-paper';
import { palette, typography } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export const AppHeader: React.FC<Props> = ({ title, subtitle, onBack }) => (
  <Appbar.Header style={{ backgroundColor: palette.white, elevation: 0 }}>
    {onBack ? <Appbar.BackAction onPress={onBack} color={palette.primary} /> : null}
    <Appbar.Content
      title={title}
      subtitle={subtitle}
      titleStyle={{ ...typography.heading, color: palette.graphite }}
      subtitleStyle={{ ...typography.body, color: palette.gray400 }}
    />
  </Appbar.Header>
);
