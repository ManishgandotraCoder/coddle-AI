import React, { Suspense } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const ActivityFeed = React.lazy(() => import('../components/ActivityFeed').then(m => ({ default: m.ActivityFeed })));
const SyncStatus = React.lazy(() => import('../components/SyncStatus').then(m => ({ default: m.SyncStatus })));
const QuickActions = React.lazy(() => import('../components/QuickActions').then(m => ({ default: m.QuickActions })));

export default function HomeScreen({ navigation }: any) {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <Suspense fallback={null}>
                        <SyncStatus />
                    </Suspense>
                    <Suspense fallback={null}>
                        <QuickActions />
                    </Suspense>

                    {/* Actions Card */}
                    <View style={styles.actionCard}>
                        <Text style={styles.actionTitle}>More Actions</Text>
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.conflictButton, { marginRight: 12 }]}
                                onPress={() => navigation.navigate('Conflict')}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={styles.actionEmoji}>🧩</Text>
                                <Text style={styles.actionLabel}>Resolve Conflicts</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.profileButton]}
                                onPress={() => navigation.navigate('Profile')}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={styles.actionEmoji}>👤</Text>
                                <Text style={styles.actionLabel}>Change Profile</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => navigation.navigate('Event')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={styles.primaryButtonText}>Create New Event</Text>
                        </TouchableOpacity>
                    </View>

                    <Suspense fallback={null}>
                        <ActivityFeed />
                    </Suspense>
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
    actionCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        textAlign: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    conflictButton: {
        backgroundColor: '#fff7ed', // orange-50
    },
    profileButton: {
        backgroundColor: '#eff6ff', // blue-50
    },
    actionEmoji: {
        fontSize: 18,
        marginBottom: 6,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    primaryButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});
