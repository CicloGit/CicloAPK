import React from 'react';
import { TextInput, TextInputProps } from 'react-native-paper';
import { palette, radius } from '../theme';

export const AppTextField: React.FC<TextInputProps> = (props) => (
  <TextInput
    mode="outlined"
    outlineColor={palette.gray200}
    activeOutlineColor={palette.primary}
    style={[
      {
        backgroundColor: palette.white,
        borderRadius: radius.md,
      },
      props.style,
    ]}
    {...props}
  />
);
