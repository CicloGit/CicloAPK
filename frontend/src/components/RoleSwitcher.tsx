import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Role, useAuth } from '../context/AuthContext';
import { palette, typography } from '../theme';

const roles: { label: string; value: Role }[] = [
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Tecnico', value: 'technician' },
  { label: 'Cliente', value: 'client_user' },
  { label: 'Fornecedor', value: 'supplier' },
];

export const RoleSwitcher = () => {
  const { devSignInAs } = useAuth();
  if (!devSignInAs) return null;

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={styles.title}>
        Entrar como (mock)
      </Text>
      <View style={styles.buttons}>
        {roles.map((role) => (
          <Button
            key={role.value}
            mode="contained"
            buttonColor={palette.primary}
            textColor={palette.white}
            style={styles.button}
            onPress={() => devSignInAs(role.value)}
          >
            {role.label}
          </Button>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.gray100,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  title: {
    fontFamily: typography.label.fontFamily,
    color: palette.graphite,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    borderRadius: 10,
  },
});
