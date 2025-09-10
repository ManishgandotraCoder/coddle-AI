import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { NativeStackHeaderProps } from '@react-navigation/native-stack';

export const Header: React.FC<NativeStackHeaderProps> = ({
    options,
    navigation,
}) => {
    const route = useRoute();
    const canGoBack = navigation.canGoBack();
    const title = options?.title ?? (typeof route?.name === 'string' ? route.name : '');

    return (
        <View style={styles.container}>
            <View style={styles.leftContainer}>
                {canGoBack && (
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>Back</Text>
                    </TouchableOpacity>
                )}
            </View>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.rightContainer}>
                {route.name === 'Home' && (
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <Text style={styles.settingsText}>Settings</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#3b82f6',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    leftContainer: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    rightContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    backButton: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
    },
    settingsText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
    },
});