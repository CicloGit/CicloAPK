import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, List, Chip, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, spacing, typography } from '../../theme';
import { AppButton } from '../../ui/AppButton';

export const ClientDashboard = ({ navigation }: any) => (
  <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Cliente</Text>
      <Text style={styles.subheading}>Solicitacoes e financeiro pessoal.</Text>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Solicitacoes"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="clipboard-text-outline" size={26} />}
          right={() => <Badge style={styles.badge}>!</Badge>}
        />
        <Card.Content>
          <List.Item title="Criar pedido de insumos" left={(p) => <List.Icon {...p} icon="plus-circle-outline" />} />
          <List.Item title="Acompanhar status" left={(p) => <List.Icon {...p} icon="progress-clock" />} />
          <Chip style={styles.secondaryChip} textStyle={styles.chipText} icon="gesture-swipe-down">
            Pull to refresh
          </Chip>
          <AppButton
            label="Solicitar insumo"
            variant="outline"
            onPress={() => navigation?.navigate?.('ClientRequestForm')}
            style={{ marginTop: spacing.sm }}
          />
          <AppButton
            label="Ver catálogo"
            variant="outline"
            onPress={() => navigation?.navigate?.('ClientCatalog')}
            style={{ marginTop: spacing.xs }}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Historico"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="history" size={26} />}
        />
        <Card.Content>
          <List.Item title="Por lote/propriedade" left={(p) => <List.Icon {...p} icon="home-outline" />} />
          <List.Item title="Alertas de consumo" left={(p) => <List.Icon {...p} icon="bell-outline" />} />
          <AppButton
            label="Ver historico"
            variant="outline"
            onPress={() => navigation?.navigate?.('ClientHistory')}
            style={{ marginTop: spacing.sm }}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Financeiro"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="wallet-outline" size={26} />}
        />
        <Card.Content>
          <List.Item title="Extratos e recibos" left={(p) => <List.Icon {...p} icon="file-document-outline" />} />
          <List.Item title="Comprovantes Asaas" left={(p) => <List.Icon {...p} icon="check-decagram-outline" />} />
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
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  chipText: {
    color: palette.graphite,
  },
  badge: {
    backgroundColor: palette.primary,
    color: palette.white,
    alignSelf: 'center',
  },
});
