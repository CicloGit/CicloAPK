import React from 'react';
import { Card } from 'react-native-paper';
import { StyleProp, ViewStyle } from 'react-native';
import { radius, shadows } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  title?: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
}

export const AppCard: React.FC<Props> = ({ children, style }) => (
  <Card
    mode="elevated"
    style={[
      {
        borderRadius: radius.lg,
        ...shadows.card,
      },
      style,
    ]}
  >
    <Card.Content>{children}</Card.Content>
  </Card>
);
