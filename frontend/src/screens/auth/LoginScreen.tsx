import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Text, Card, TextInput } from 'react-native-paper';
import { AppButton } from '../../ui/AppButton';
import { AppTextField } from '../../ui/AppTextField';
import { palette, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { RoleSwitcher } from '../../components/RoleSwitcher';

export const LoginScreen = () => {
  const { signIn, devSignInAs, status } = useAuth();
  const [email, setEmail] = useState('owner@ciclo.plus');
  const [password, setPassword] = useState('password');

  return (
    <SafeAreaView style={styles.container}>
      <Animatable.View animation="fadeInDown" duration={500} style={styles.header}>
        <Text style={styles.logo}>Ciclo+</Text>
        <Text style={styles.subtitle}>Gestao multi-tenant com controle total</Text>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={80} duration={500} style={styles.cardWrap}>
        <Card mode="elevated" style={styles.card}>
          <Card.Content style={{ gap: spacing.sm }}>
            <Text style={styles.title}>Login</Text>
            <AppTextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              left={<TextInput.Icon icon="email-outline" />}
            />
            <AppTextField
              label="Senha"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              left={<TextInput.Icon icon="lock-outline" />}
            />
            <AppButton
              label={status === 'loading' ? 'Entrando...' : 'Entrar'}
              onPress={() => signIn(email, password)}
              disabled={status === 'loading'}
            />
            {devSignInAs ? (
              <>
                <View
                  style={{ height: 1, backgroundColor: palette.gray200, marginVertical: spacing.sm }}
                />
                <RoleSwitcher />
              </>
            ) : null}
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
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    ...typography.heading,
    fontSize: 32,
    color: palette.primary,
  },
  subtitle: {
    ...typography.body,
    color: palette.graphite,
    marginTop: 4,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  card: {
    borderRadius: 16,
  },
  title: {
    ...typography.subheading,
    color: palette.graphite,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
});
