import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from './src/store/appStore';
import { Header } from './src/components/Header';
import { CaregiverSelector } from './src/components/CaregiverSelector';
import { EventCreator } from './src/components/EventCreator';
import { ActivityFeed } from './src/components/ActivityFeed';
import { SyncStatus } from './src/components/SyncStatus';
import { ConflictDemo } from './src/components/ConflictDemo';

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
              }
            }
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
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <Header />
        <View style={styles.content}>
          <CaregiverSelector />
          <SyncStatus />
          <EventCreator />
          <ConflictDemo />
          <ActivityFeed />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
