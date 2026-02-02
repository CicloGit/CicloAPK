import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, List, Chip, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, spacing, typography } from '../../theme';
import { AppButton } from '../../ui/AppButton';
import { useNavigation } from '@react-navigation/native';

export const AdminDashboard = () => {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Admin</Text>
        <Text style={styles.subheading}>Operacao diaria do tenant.</Text>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Estoque"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="warehouse" size={26} />}
          right={(props) => (
            <Chip {...props} style={styles.statusChip}>
              12 alertas
            </Chip>
          )}
        />
        <Card.Content>
          <List.Item title="Cadastrar insumos" left={(p) => <List.Icon {...p} icon="package-variant-closed" />} />
          <List.Item title="Entradas/Saidas" left={(p) => <List.Icon {...p} icon="swap-horizontal" />} />
          <List.Item title="Reposicao automatica" left={(p) => <List.Icon {...p} icon="autorenew" />} />
          <ProgressBar progress={0.65} color={palette.primary} style={styles.progress} />
          <AppButton
            label="Ver estoque"
            variant="outline"
            onPress={() => navigation.navigate('AdminStock')}
            style={{ marginTop: spacing.xs }}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Financeiro"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="cash-multiple" size={26} />}
          right={(props) => (
            <Chip {...props} style={styles.secondaryChip} textStyle={styles.chipText}>
              Asaas
            </Chip>
          )}
        />
        <Card.Content>
          <List.Item title="Cobrancas e conciliacao" left={(p) => <List.Icon {...p} icon="currency-usd" />} />
          <List.Item title="Comissoes" left={(p) => <List.Icon {...p} icon="percent" />} />
          <List.Item title="Relatorios de caixa" left={(p) => <List.Icon {...p} icon="chart-box-outline" />} />
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Distribuicao"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="truck-fast-outline" size={26} />}
        />
        <Card.Content>
          <List.Item title="Despacho de pedidos" left={(p) => <List.Icon {...p} icon="send" />} />
          <List.Item title="Prioridades e SLA" left={(p) => <List.Icon {...p} icon="alarm" />} />
          <List.Item title="Rastreio de entregas" left={(p) => <List.Icon {...p} icon="map-marker-path" />} />
          <AppButton
            label="Movimentacoes"
            variant="outline"
            onPress={() => navigation.navigate('AdminMovements')}
            style={{ marginTop: spacing.xs }}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Catálogo"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons {...props} name="store-outline" size={26} />}
        />
        <Card.Content>
          <List.Item title="Publicar itens" left={(p) => <List.Icon {...p} icon="checkbox-marked-outline" />} />
          <List.Item title="Editar preços/overrides" left={(p) => <List.Icon {...p} icon="pencil" />} />
          <AppButton
            label="Abrir catálogo"
            variant="outline"
            onPress={() => navigation.navigate('AdminCatalog')}
            style={{ marginTop: spacing.xs }}
          />
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
  },
  card: {
    borderRadius: 14,
  },
  cardTitle: {
    ...typography.subheading,
    color: palette.graphite,
  },
  statusChip: {
    backgroundColor: palette.warning,
  },
  secondaryChip: {
    backgroundColor: palette.secondary,
  },
  chipText: {
    color: palette.graphite,
  },
  progress: {
    marginTop: 8,
    borderRadius: 8,
    height: 8,
  },
});
