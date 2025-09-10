import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from './src/store/appStore';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import EventScreen from './src/screens/EventScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Header } from './src/components/Header';

const Stack = createNativeStackNavigator();

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
    <NavigationContainer>
      <Stack.Navigator screenOptions={(screenProps) => ({ header: (headerProps) => <Header {...headerProps} /> })}>
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
      </Stack.Navigator>
    </NavigationContainer>
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
