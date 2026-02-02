import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { RadioButton, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../../ui/AppHeader';
import { AppTextField } from '../../ui/AppTextField';
import { AppButton } from '../../ui/AppButton';
import { palette, spacing, typography } from '../../theme';
import { useCreateUser } from '../../api/hooks/users';

export const OwnerUserForm = () => {
  const nav = useNavigation<any>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [password, setPassword] = useState('');
  const { mutateAsync, isPending } = useCreateUser();

  const handleSave = async () => {
    await mutateAsync({ displayName: name, email, role, phone: '', password });
    nav.goBack();
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Novo usuario" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.form}>
        <AppTextField label="Nome completo" value={name} onChangeText={setName} />
        <AppTextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <AppTextField
          label="Senha (gera uma se deixar vazio)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.sectionLabel}>Papel</Text>
        <RadioButton.Group onValueChange={setRole} value={role}>
          <RadioButton.Item label="Admin" value="admin" />
          <RadioButton.Item label="Tecnico" value="technician" />
          <RadioButton.Item label="Cliente" value="client_user" />
          <RadioButton.Item label="Fornecedor" value="supplier" />
        </RadioButton.Group>

        <AppButton label={isPending ? 'Salvando...' : 'Salvar'} onPress={handleSave} disabled={isPending} />
        <AppButton label="Cancelar" variant="outline" onPress={() => nav.goBack()} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: palette.graphite,
    marginBottom: spacing.xs,
  },
});
