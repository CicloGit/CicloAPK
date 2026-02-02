import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OwnerDashboard } from '../screens/owner/OwnerDashboard';
import { OwnerUsers } from '../screens/owner/OwnerUsers';
import { OwnerUserForm } from '../screens/owner/OwnerUserForm';
import { OwnerSuppliers } from '../screens/owner/OwnerSuppliers';
import { OwnerSupplierForm } from '../screens/owner/OwnerSupplierForm';
import { AdminDashboard } from '../screens/admin/AdminDashboard';
import { AdminItems } from '../screens/admin/AdminItems';
import { AdminItemForm } from '../screens/admin/AdminItemForm';
import { AdminRequests } from '../screens/admin/AdminRequests';
import { AdminStock } from '../screens/admin/AdminStock';
import { AdminMovements } from '../screens/admin/AdminMovements';
import { AdminCatalogScreen } from '../screens/admin/AdminCatalogScreen';
import { TechnicianDashboard } from '../screens/technician/TechnicianDashboard';
import { TechnicianAgenda } from '../screens/technician/TechnicianAgenda';
import { TechnicianReportForm } from '../screens/technician/TechnicianReportForm';
import { ClientDashboard } from '../screens/client/ClientDashboard';
import { ClientRequestForm } from '../screens/client/ClientRequestForm';
import { ClientHistory } from '../screens/client/ClientHistory';
import { ClientCatalogScreen } from '../screens/client/ClientCatalogScreen';
import { SupplierStockScreen } from '../screens/supplier/SupplierStockScreen';
import { SupplierMovementsScreen } from '../screens/supplier/SupplierMovementsScreen';

enableScreens();

export type AuthStackParamList = {
  Login: undefined;
};

export type OwnerStackParamList = {
  OwnerDashboard: undefined;
  OwnerUsers: undefined;
  OwnerUserForm: { id?: string } | undefined;
  OwnerSuppliers: undefined;
  OwnerSupplierForm: { id?: string } | undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminItems: undefined;
  AdminItemForm: { id?: string } | undefined;
  AdminRequests: undefined;
  AdminStock: undefined;
  AdminMovements: undefined;
  AdminCatalog: undefined;
};

export type TechnicianStackParamList = {
  TechnicianDashboard: undefined;
  TechnicianAgenda: undefined;
  TechnicianReportForm: { id?: string } | undefined;
};

export type ClientStackParamList = {
  ClientDashboard: undefined;
  ClientRequestForm: undefined;
  ClientHistory: undefined;
  ClientCatalog: undefined;
};

export type SupplierStackParamList = {
  SupplierStock: undefined;
  SupplierMovements: undefined;
};

const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const OwnerStackNav = createNativeStackNavigator<OwnerStackParamList>();
const AdminStackNav = createNativeStackNavigator<AdminStackParamList>();
const TechnicianStackNav = createNativeStackNavigator<TechnicianStackParamList>();
const ClientStackNav = createNativeStackNavigator<ClientStackParamList>();
const SupplierStackNav = createNativeStackNavigator<SupplierStackParamList>();

function OwnerStack() {
  return (
    <OwnerStackNav.Navigator screenOptions={{ headerShown: false }}>
      <OwnerStackNav.Screen name="OwnerDashboard" component={OwnerDashboard} />
      <OwnerStackNav.Screen name="OwnerUsers" component={OwnerUsers} />
      <OwnerStackNav.Screen name="OwnerUserForm" component={OwnerUserForm} />
      <OwnerStackNav.Screen name="OwnerSuppliers" component={OwnerSuppliers} />
      <OwnerStackNav.Screen name="OwnerSupplierForm" component={OwnerSupplierForm} />
    </OwnerStackNav.Navigator>
  );
}

function AdminStack() {
  return (
    <AdminStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AdminStackNav.Screen name="AdminDashboard" component={AdminDashboard} />
      <AdminStackNav.Screen name="AdminItems" component={AdminItems} />
      <AdminStackNav.Screen name="AdminItemForm" component={AdminItemForm} />
      <AdminStackNav.Screen name="AdminRequests" component={AdminRequests} />
      <AdminStackNav.Screen name="AdminStock" component={AdminStock} />
      <AdminStackNav.Screen name="AdminMovements" component={AdminMovements} />
      <AdminStackNav.Screen name="AdminCatalog" component={AdminCatalogScreen} />
    </AdminStackNav.Navigator>
  );
}

function TechnicianStack() {
  return (
    <TechnicianStackNav.Navigator screenOptions={{ headerShown: false }}>
      <TechnicianStackNav.Screen name="TechnicianDashboard" component={TechnicianDashboard} />
      <TechnicianStackNav.Screen name="TechnicianAgenda" component={TechnicianAgenda} />
      <TechnicianStackNav.Screen name="TechnicianReportForm" component={TechnicianReportForm} />
    </TechnicianStackNav.Navigator>
  );
}

function ClientStack() {
  return (
    <ClientStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ClientStackNav.Screen name="ClientDashboard" component={ClientDashboard} />
      <ClientStackNav.Screen name="ClientRequestForm" component={ClientRequestForm} />
      <ClientStackNav.Screen name="ClientHistory" component={ClientHistory} />
      <ClientStackNav.Screen name="ClientCatalog" component={ClientCatalogScreen} />
    </ClientStackNav.Navigator>
  );
}

function SupplierStack() {
  return (
    <SupplierStackNav.Navigator screenOptions={{ headerShown: false }}>
      <SupplierStackNav.Screen name="SupplierStock" component={SupplierStockScreen} />
      <SupplierStackNav.Screen name="SupplierMovements" component={SupplierMovementsScreen} />
    </SupplierStackNav.Navigator>
  );
}

function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
    </AuthStackNav.Navigator>
  );
}

function AppNavigator() {
  const { session, status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  switch (session.role) {
    case 'owner':
      return <OwnerStack />;
    case 'admin':
      return <AdminStack />;
    case 'technician':
      return <TechnicianStack />;
    case 'client_user':
    case 'supplier':
      return <SupplierStack />;
    default:
      return <AuthStack />;
  }
}

export const RootNavigator = () => (
  <NavigationContainer>
    <AppNavigator />
  </NavigationContainer>
);
