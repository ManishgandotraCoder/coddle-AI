import React from 'react';
import { StyleSheet, ScrollView, View, Button } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ActivityFeed } from '../components/ActivityFeed';
import { SyncStatus } from '../components/SyncStatus';
import { QuickActions } from '../components/QuickActions';
import { Header } from '../components/Header';

export default function HomeScreen({ navigation }: any) {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <SyncStatus />
                    <QuickActions />
                    <Button
                        title="Create New Event"
                        onPress={() => navigation.navigate('Event')}
                    />
                    <ActivityFeed />
                </ScrollView>
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
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
});
