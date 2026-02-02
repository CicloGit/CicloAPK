import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Text, TextInput, Button, Card, HelperText } from 'react-native-paper';
import { RoleSwitcher } from '../components/RoleSwitcher';
import { palette, typography } from '../theme';

export const AuthLanding = () => {
  const [email, setEmail] = useState('owner@ciclo.plus');
  const [password, setPassword] = useState('password');
  const [error] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <Animatable.View animation="fadeInUp" duration={600} style={styles.logoWrap}>
        <Animatable.Text animation="pulse" iterationCount="infinite" duration={2800} style={styles.logo}>
          Ciclo+
        </Animatable.Text>
        <Text style={styles.subtitle}>Gestao completa com controle por tenant</Text>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={120} duration={500} style={styles.formWrap}>
        <Card mode="elevated" style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text style={styles.cardTitle}>Entrar</Text>
            <TextInput
              mode="outlined"
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Senha"
              value={password}
              secureTextEntry
              onChangeText={setPassword}
              left={<TextInput.Icon icon="lock-outline" />}
              style={styles.input}
            />
            {!!error && <HelperText type="error">{error}</HelperText>}
            <Button
              mode="contained"
              buttonColor={palette.primary}
              textColor={palette.white}
              style={styles.primaryButton}
              onPress={() => {
                /* hook real auth when pronto */
              }}
            >
              Entrar
            </Button>
            <RoleSwitcher />
          </Card.Content>
        </Card>
      </Animatable.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.white,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    ...typography.heading,
    fontSize: 32,
    color: palette.primary,
  },
  subtitle: {
    ...typography.body,
    color: palette.graphite,
    marginTop: 6,
  },
  formWrap: {
    width: '100%',
  },
  card: {
    borderRadius: 16,
  },
  cardContent: {
    gap: 10,
  },
  cardTitle: {
    ...typography.subheading,
    fontSize: 18,
    color: palette.graphite,
    marginBottom: 4,
  },
  input: {
    backgroundColor: palette.white,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 6,
  },
});
