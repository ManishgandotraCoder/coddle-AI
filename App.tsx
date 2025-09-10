import React, { useEffect, useState, Suspense } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from './src/store/appStore';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const HomeScreen = React.lazy(() => import('./src/screens/HomeScreen'));
const EventScreen = React.lazy(() => import('./src/screens/EventScreen'));
const SettingsScreen = React.lazy(() => import('./src/screens/SettingsScreen'));
const HeaderLazy = React.lazy(() => import('./src/components/Header').then(m => ({ default: m.Header })));
const ProfileScreen = React.lazy(() => import('./src/screens/ProfileScreen'));
const ConflictScreen = React.lazy(() => import('./src/screens/ConflictScreen'));

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const initialize = useAppStore(state => state.initialize);
  const resetApp = useAppStore(state => state.resetApp);

  useEffect(() => {
    const initApp = async () => {
      try {
        await initialize();
      } catch (error) {
        console.error('App initialization failed:', error);
        Alert.alert(
          'Initialization Error',
          'Failed to initialize the app. Would you like to reset?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              style: 'destructive',
              onPress: async () => {
                try {
                  await resetApp();
                } catch (resetError) {
                  console.error('Reset failed:', resetError);
                  Alert.alert('Error', 'Failed to reset the app');
                }
              },
            },
          ]
        );
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, [initialize, resetApp]);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="auto" />
          <View style={styles.loadingContainer}>
            {/* Loading indicator would go here */}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <Suspense fallback={<View style={styles.container} />}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={() => ({
            header: (headerProps) => (
              <Suspense fallback={null}>
                <HeaderLazy {...headerProps} />
              </Suspense>
            ),
          })}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Activity Feed' }}
          />
          <Stack.Screen
            name="Event"
            component={EventScreen}
            options={{ title: 'Log Event' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Change Profile' }}
          />
          <Stack.Screen
            name="Conflict"
            component={ConflictScreen}
            options={{ title: 'Resolve Conflicts' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
