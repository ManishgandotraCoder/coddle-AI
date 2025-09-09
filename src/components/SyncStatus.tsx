import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAppStore } from '../store/appStore';

export const SyncStatus: React.FC = () => {
    const [isSyncing, setIsSyncing] = useState(false);

    // Use separate store selectors to avoid potential re-render issues
    const isOffline = useAppStore(state => state.isOffline);
    const setOfflineMode = useAppStore(state => state.setOfflineMode);
    const sync = useAppStore(state => state.sync);
    const pendingOperations = useAppStore(state => state.pendingOperations);
    const serverVersion = useAppStore(state => state.serverVersion);

    // Get pending count directly from the store state instead of calling async function
    const pendingCount = pendingOperations.length;

    const handleToggleOffline = () => {
        setOfflineMode(!isOffline);
    };

    const handleSync = async () => {
        if (isOffline) {
            Alert.alert('Offline Mode', 'Cannot sync while in offline mode');
            return;
        }

        setIsSyncing(true);
        try {
            await sync();
            Alert.alert('Success', 'Sync completed successfully');
        } catch (error) {
            console.error('Sync failed:', error);
            Alert.alert('Sync Failed', 'Failed to sync with server');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Sync Status</Text>
                <View style={[styles.statusIndicator, isOffline ? styles.offline : styles.online]}>
                    <Text style={styles.statusText}>{isOffline ? 'OFFLINE' : 'ONLINE'}</Text>
                </View>
            </View>

            <View style={styles.info}>
                <Text style={styles.infoText}>Pending Operations: {pendingCount}</Text>
                <Text style={styles.infoText}>Server Version: {serverVersion}</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, styles.toggleButton]}
                    onPress={handleToggleOffline}
                >
                    <Text style={styles.buttonText}>
                        {isOffline ? 'Go Online' : 'Go Offline'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.syncButton,
                        (isOffline || isSyncing) && styles.disabledButton
                    ]}
                    onPress={handleSync}
                    disabled={isOffline || isSyncing}
                >
                    <Text style={styles.buttonText}>
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 16,
        marginVertical: 8,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    statusIndicator: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    online: {
        backgroundColor: '#dcfce7',
    },
    offline: {
        backgroundColor: '#fee2e2',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    info: {
        marginBottom: 16,
    },
    infoText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
    },
    toggleButton: {
        backgroundColor: '#f59e0b',
    },
    syncButton: {
        backgroundColor: '#3b82f6',
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
});
