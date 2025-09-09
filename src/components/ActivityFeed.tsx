import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useAppStore } from '../store/appStore';
import { CareEvent } from '../types';

dayjs.extend(relativeTime);

const EVENT_EMOJIS = {
    feed: '🍼',
    diaper: '👶',
    sleep: '😴',
};

interface EventItemProps {
    event: CareEvent;
    onPress: () => void;
}

const EventItem: React.FC<EventItemProps> = ({ event, onPress }) => {
    const caregivers = useAppStore(state => state.caregivers);
    const conflictResolutions = useAppStore(state => state.conflictResolutions);

    const caregiver = caregivers.find(c => c.id === event.caregiverId);
    const hasConflict = conflictResolutions.some(c => c.eventId === event.id);
    const timeAgo = dayjs(event.startISO).fromNow();

    return (
        <TouchableOpacity style={styles.eventItem} onPress={onPress}>
            <View style={styles.eventHeader}>
                <Text style={styles.eventEmoji}>{EVENT_EMOJIS[event.type]}</Text>
                <View style={styles.eventInfo}>
                    <View style={styles.eventTitleRow}>
                        <Text style={styles.eventType}>{event.type.toUpperCase()}</Text>
                        {hasConflict && (
                            <View style={styles.conflictBadge}>
                                <Text style={styles.conflictBadgeText}>MERGED</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.eventTime}>{timeAgo}</Text>
                    <Text style={styles.eventCaregiver}>by {caregiver?.name || 'Unknown'}</Text>
                </View>
                <View style={styles.eventMeta}>
                    <Text style={styles.eventVersion}>v{event.version}</Text>
                </View>
            </View>
            {event.notes && (
                <Text style={styles.eventNotes}>{event.notes}</Text>
            )}
        </TouchableOpacity>
    );
};

interface EventDetailModalProps {
    event: CareEvent | null;
    visible: boolean;
    onClose: () => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, visible, onClose }) => {
    const caregivers = useAppStore(state => state.caregivers);
    const conflictResolutions = useAppStore(state => state.conflictResolutions);

    if (!event) return null;

    const caregiver = caregivers.find(c => c.id === event.caregiverId);
    const conflicts = conflictResolutions.filter(c => c.eventId === event.id);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Event Details</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Type:</Text>
                        <Text style={styles.detailValue}>{EVENT_EMOJIS[event.type]} {event.type.toUpperCase()}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Caregiver:</Text>
                        <Text style={styles.detailValue}>{caregiver?.name || 'Unknown'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>{dayjs(event.startISO).format('MMM D, YYYY h:mm A')}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Version:</Text>
                        <Text style={styles.detailValue}>{event.version}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Last Modified:</Text>
                        <Text style={styles.detailValue}>{dayjs(event.updatedAtISO).format('MMM D, YYYY h:mm A')}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Modified By:</Text>
                        <Text style={styles.detailValue}>{event.lastModifiedBy}</Text>
                    </View>

                    {event.notes && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Notes:</Text>
                            <Text style={styles.detailValue}>{event.notes}</Text>
                        </View>
                    )}

                    {conflicts.length > 0 && (
                        <View style={styles.conflictSection}>
                            <Text style={styles.conflictSectionTitle}>Conflict Resolutions</Text>
                            {conflicts.map((conflict, index) => (
                                <View key={index} style={styles.conflictItem}>
                                    <Text style={styles.conflictReason}>{conflict.reason}</Text>
                                    <Text style={styles.conflictFields}>
                                        Fields: {conflict.conflictedFields.join(', ')}
                                    </Text>
                                    <Text style={styles.conflictWinner}>
                                        Winner: {conflict.winner === 'local' ? 'Local' : 'Server'}
                                    </Text>
                                    <Text style={styles.conflictTime}>
                                        {dayjs(conflict.timestamp).format('MMM D, YYYY h:mm A')}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

export const ActivityFeed: React.FC = () => {
    const [selectedEvent, setSelectedEvent] = useState<CareEvent | null>(null);
    const [showModal, setShowModal] = useState(false);

    const allEvents = useAppStore(state => state.events);

    // Filter and sort events in the component
    const events = allEvents
        .filter(event => !event.deleted)
        .sort((a, b) => dayjs(b.startISO).valueOf() - dayjs(a.startISO).valueOf());

    const handleEventPress = (event: CareEvent) => {
        setSelectedEvent(event);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedEvent(null);
    };

    const renderEvent = ({ item }: { item: CareEvent }) => (
        <EventItem event={item} onPress={() => handleEventPress(item)} />
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Activity Feed</Text>
            <FlatList
                data={events}
                renderItem={renderEvent}
                keyExtractor={item => item.id}
                style={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No events yet</Text>
                        <Text style={styles.emptySubtext}>Create your first care event above</Text>
                    </View>
                }
            />

            <EventDetailModal
                event={selectedEvent}
                visible={showModal}
                onClose={handleCloseModal}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        marginVertical: 8,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        padding: 16,
        paddingBottom: 8,
    },
    list: {
        flex: 1,
    },
    eventItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    eventHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    eventEmoji: {
        fontSize: 24,
        marginRight: 12,
        marginTop: 2,
    },
    eventInfo: {
        flex: 1,
    },
    eventTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    eventType: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginRight: 8,
    },
    conflictBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    conflictBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#92400e',
    },
    eventTime: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 2,
    },
    eventCaregiver: {
        fontSize: 12,
        color: '#9ca3af',
    },
    eventMeta: {
        alignItems: 'flex-end',
    },
    eventVersion: {
        fontSize: 12,
        color: '#9ca3af',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    eventNotes: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
        fontStyle: 'italic',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
        fontWeight: '500',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#d1d5db',
        marginTop: 4,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    closeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    closeButtonText: {
        fontSize: 16,
        color: '#3b82f6',
        fontWeight: '500',
    },
    modalContent: {
        padding: 16,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
        width: 120,
    },
    detailValue: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    conflictSection: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#fef3c7',
        borderRadius: 8,
    },
    conflictSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#92400e',
        marginBottom: 12,
    },
    conflictItem: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
    },
    conflictReason: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 4,
    },
    conflictFields: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    conflictWinner: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    conflictTime: {
        fontSize: 12,
        color: '#9ca3af',
    },
});
