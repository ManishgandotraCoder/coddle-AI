import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CaregiverSelector } from '../components/CaregiverSelector';
import { ConflictDemo } from '../components/ConflictDemo';

export default function SettingsScreen() {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <CaregiverSelector />
                    <ConflictDemo />
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
