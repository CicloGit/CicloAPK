import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';
import { AppCard } from '../../ui/AppCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { StatusPill } from '../../ui/StatusPill';
import { palette, spacing } from '../../theme';

const visits = [
  { id: 'v1', client: 'Fazenda Rio', time: '09:00', status: 'scheduled' },
  { id: 'v2', client: 'Sitio Verde', time: '14:00', status: 'pending' },
  { id: 'v3', client: 'Agro Sol', time: '17:30', status: 'done' },
];

export const TechnicianAgenda = () => (
  <View style={styles.container}>
    <SectionHeader title="Agenda" />
    <AppCard>
      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.client}
            description={item.time}
            right={() => (
              <StatusPill
                label={item.status === 'done' ? 'Concluida' : item.status === 'scheduled' ? 'Agendada' : 'Pendente'}
                status={item.status === 'done' ? 'success' : item.status === 'scheduled' ? 'info' : 'warning'}
              />
            )}
          />
        )}
      />
    </AppCard>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
