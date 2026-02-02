import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, List, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, spacing, typography } from '../../theme';
import { AppButton } from '../../ui/AppButton';

export const TechnicianDashboard = ({ navigation }: any) => (
  <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Tecnico</Text>
      <Text style={styles.subheading}>Visitas, oportunidades e relatorios.</Text>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Agenda"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="calendar-clock" size={26} />}
          right={(props) => (
            <Chip {...props} style={styles.secondaryChip} textStyle={styles.chipText}>
              Hoje: 3
            </Chip>
          )}
        />
        <Card.Content>
          <List.Item title="Proximas visitas" left={(p) => <List.Icon {...p} icon="map-marker" />} />
          <List.Item title="Alertas de SLA" left={(p) => <List.Icon {...p} icon="alert-circle-outline" />} />
          <AppButton
            label="Ver agenda"
            variant="outline"
            onPress={() => navigation?.navigate?.('TechnicianAgenda')}
            style={{ marginTop: spacing.sm }}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Oportunidades"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="lightbulb-on-outline" size={26} />}
        />
        <Card.Content>
          <List.Item title="Projetos atribuidos" left={(p) => <List.Icon {...p} icon="clipboard-list-outline" />} />
          <List.Item title="Checklists de campo" left={(p) => <List.Icon {...p} icon="checkbox-marked-outline" />} />
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Relatorios"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="file-document-edit-outline" size={26} />}
        />
        <Card.Content>
          <List.Item title="Upload de fotos e notas" left={(p) => <List.Icon {...p} icon="camera" />} />
          <List.Item title="Integracao estoque/financeiro" left={(p) => <List.Icon {...p} icon="database-sync" />} />
          <AppButton
            label="Criar relatorio"
            variant="outline"
            onPress={() => navigation?.navigate?.('TechnicianReportForm')}
            style={{ marginTop: spacing.sm }}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    ...typography.heading,
    fontSize: 22,
    color: palette.graphite,
  },
  subheading: {
    ...typography.body,
    color: palette.graphite,
  },
  card: {
    borderRadius: 14,
  },
  cardTitle: {
    ...typography.subheading,
    color: palette.graphite,
  },
  secondaryChip: {
    backgroundColor: palette.secondary,
  },
  chipText: {
    color: palette.graphite,
  },
});
