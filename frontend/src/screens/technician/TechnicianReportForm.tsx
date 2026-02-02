import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppHeader } from '../../ui/AppHeader';
import { AppTextField } from '../../ui/AppTextField';
import { AppButton } from '../../ui/AppButton';
import { palette, spacing } from '../../theme';

export const TechnicianReportForm = () => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [actions, setActions] = useState('');

  return (
    <View style={styles.container}>
      <AppHeader title="Relatorio de campo" />
      <ScrollView contentContainerStyle={styles.form}>
        <AppTextField label="Titulo" value={title} onChangeText={setTitle} />
        <AppTextField
          label="Notas"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          style={{ minHeight: 120 }}
        />
        <AppTextField
          label="Proximas acoes"
          value={actions}
          onChangeText={setActions}
          multiline
          numberOfLines={3}
          style={{ minHeight: 100 }}
        />
        <AppButton label="Enviar" onPress={() => {}} />
        <AppButton label="Cancelar" variant="outline" onPress={() => {}} />
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
});
