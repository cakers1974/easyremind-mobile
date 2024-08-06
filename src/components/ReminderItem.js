import React, { memo, useRef, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';

const ReminderItem = ({ item, onToggle, onDelete, selectionMode, isSelected, onSelectReminder, onLongPress }) => {
    const navigation = useNavigation(); // Hook to handle navigation
    const swipeableRow = useRef(null); // Ref for the Swipeable component
    const height = useRef(new Animated.Value(115)).current; // Initial height of the item
    const threshold = 150; // Define a threshold for full swipe

    // Helper function to format time
    const formatTime = (dateString) => {
        const options = { hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleTimeString([], options);
    };

    // Apply dimmed text style if the reminder is disabled
    const textStyle = item.enabled ? {} : styles.dimmedText;

    // Render the right swipe action with a scaling animation
    const renderRightActions = (progress, dragX) => {
        const scale = dragX.interpolate({
            inputRange: [-threshold, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View style={[styles.deleteContainer, { transform: [{ scale }] }]}>
                <Ionicons name="trash" size={24} color="#ffffff" />
                <Text style={styles.deleteText}>Delete</Text>
            </Animated.View>
        );
    };

    // Handle the swipe-to-delete action
    const handleSwipeableRightWillOpen = () => {
        Animated.timing(height, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start(() => {
            onDelete(item.id);
        });
    };

    return (
        <GestureHandlerRootView>
            <Swipeable
                ref={swipeableRow}
                renderRightActions={renderRightActions}
                onSwipeableRightWillOpen={handleSwipeableRightWillOpen}
                rightThreshold={threshold}
            >
                <Animated.View style={{ height }}>
                    <TouchableOpacity 
                        onPress={() => selectionMode ? onSelectReminder(item.id) : navigation.navigate('Remind', { reminder: item })}
                        onLongPress={() => onLongPress(item.id)}
                        activeOpacity={1} // Prevents the dimming effect
                    >
                        <View style={styles.reminderItem}>
                            {selectionMode && (
                                <TouchableOpacity 
                                    onPress={() => onSelectReminder(item.id)} 
                                    style={[styles.checkbox, isSelected && styles.checkboxSelected]}
                                >
                                    {isSelected && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                                </TouchableOpacity>
                            )}
                            <View style={styles.reminderTextContainer}>
                                <Text style={[styles.reminderTitle, textStyle]}>{item.title}</Text>
                                <Text style={[styles.reminderTime, textStyle]}>{formatTime(item.date)}</Text>
                            </View>
                            <Text style={[styles.reminderDate, textStyle]}>{new Date(item.date).toLocaleDateString()}</Text>
                            {!selectionMode && (
                                <View style={styles.toggleContainer}>
                                    <Switch
                                        value={item.enabled}
                                        onValueChange={() => onToggle(item.id, !item.enabled)}
                                        trackColor={{ false: '#767577', true: '#81b0ff' }} // Customize track color
                                        thumbColor={'#f4f3f4'} // Customize thumb color
                                    />
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </Swipeable>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    reminderItem: {
        height: 100,
        padding: 20,
        paddingLeft: 15,
        paddingRight: 15,
        marginVertical: 8,
        backgroundColor: '#222222', // Darker background color
        borderColor: '#333333',
        borderWidth: 1,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    checkboxSelected: {
        backgroundColor: '#1e90ff', // Bluish background color for selected state
    },
    reminderTextContainer: {
        flex: 1,
        paddingRight: 10,
    },
    reminderTitle: {
        fontSize: 14, // Smaller title font size
        color: '#ffffff',
        marginBottom: 4,
    },
    reminderTime: {
        fontSize: 26, // Larger time font size
        color: '#ffffff',
    },
    reminderDate: {
        fontSize: 16, // Date font size
        color: '#ffffff',
        textAlign: 'center',
    },
    dimmedText: {
        opacity: 0.5, // Dimmed text effect
    },
    toggleContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ff3b30',
        borderRadius: 8,
        width: 75,
        marginVertical: 8,
    },
    deleteText: {
        color: '#ffffff',
        fontSize: 14,
    },
});

export default memo(ReminderItem);
