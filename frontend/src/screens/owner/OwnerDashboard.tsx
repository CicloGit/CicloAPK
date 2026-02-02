import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, Chip, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { AppButton } from '../../ui/AppButton';

export const OwnerDashboard = ({ navigation }: any) => {
  const { session } = useAuth();
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Owner - Tenant {session.tenantId ?? 'N/D'}</Text>
        <Text style={styles.subheading}>Controle total de usuarios, fornecedores e modulos.</Text>

        <Card style={styles.card} mode="elevated">
          <Card.Title
            title="Usuarios"
            titleStyle={styles.cardTitle}
            left={(props) => (
              <MaterialCommunityIcons {...props} name="account-multiple-plus-outline" size={26} />
            )}
          />
          <Card.Content>
            <List.Item title="Criar Admins/Tecnicos/Clientes" left={(p) => <List.Icon {...p} icon="plus" />} />
            <List.Item title="Distribuir acessos por modulo" left={(p) => <List.Icon {...p} icon="shield-key" />} />
            <Chip style={styles.chip} textStyle={styles.chipText} icon="checkbox-marked-outline">
              RBAC por tenant
            </Chip>
            <AppButton
              label="Ver usuarios"
              variant="outline"
              onPress={() => navigation?.navigate?.('OwnerUsers')}
              style={{ marginTop: spacing.sm }}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Title
            title="Fornecedores"
            titleStyle={styles.cardTitle}
            left={(props) => <MaterialCommunityIcons {...props} name="truck-outline" size={26} />}
          />
          <Card.Content>
            <List.Item title="Cadastro por tenant" left={(p) => <List.Icon {...p} icon="pencil-outline" />} />
            <List.Item title="Mapear insumos e SLA" left={(p) => <List.Icon {...p} icon="clock-outline" />} />
            <Chip style={styles.secondaryChip} textStyle={styles.chipText} icon="check-circle-outline">
              Reposicao agil
            </Chip>
            <AppButton
              label="Ver fornecedores"
              variant="outline"
              onPress={() => navigation?.navigate?.('OwnerSuppliers')}
              style={{ marginTop: spacing.sm }}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Title
            title="Integracoes"
            titleStyle={styles.cardTitle}
            left={(props) => <MaterialCommunityIcons {...props} name="lan-connect" size={26} />}
          />
          <Card.Content>
            <List.Item title="Asaas (cobrancas/comissoes)" left={(p) => <List.Icon {...p} icon="currency-usd" />} />
            <List.Item title="Webhooks Railway" left={(p) => <List.Icon {...p} icon="webhook" />} />
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

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
    marginBottom: spacing.xs,
  },
  card: {
    borderRadius: 14,
  },
  cardTitle: {
    ...typography.subheading,
    color: palette.graphite,
  },
  chip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
  },
  secondaryChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: palette.secondary,
  },
  chipText: {
    color: palette.white,
    fontFamily: typography.label.fontFamily,
  },
});
