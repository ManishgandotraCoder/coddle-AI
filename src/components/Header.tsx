import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Header: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Baby Care Tracker</Text>
            <Text style={styles.subtitle}>Multi-Caregiver Sync</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#3b82f6',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#bfdbfe',
        textAlign: 'center',
        marginTop: 4,
    },
});
