import React, { Suspense } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const ConflictDemo = React.lazy(() =>
    import('../components/ConflictDemo').then(m => ({ default: m.ConflictDemo }))
);

export default function ConflictScreen() {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <Suspense fallback={null}>
                        <ConflictDemo />
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
});
