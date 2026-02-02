import React from 'react';
import { Chip } from 'react-native-paper';
import { palette, typography } from '../theme';

type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const statusColor: Record<Status, string> = {
  success: palette.primary,
  warning: palette.secondary,
  danger: palette.danger,
  info: palette.primaryDark,
  neutral: palette.gray200,
};

interface Props {
  label: string;
  status?: Status;
  icon?: string;
}

export const StatusPill: React.FC<Props> = ({ label, status = 'neutral', icon }) => (
  <Chip
    icon={icon}
    style={{
      backgroundColor: statusColor[status],
    }}
    textStyle={{
      color: status === 'neutral' ? palette.graphite : palette.white,
      fontFamily: typography.label.fontFamily,
    }}
  >
    {label}
  </Chip>
);
