import React, { memo, useRef } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { format } from 'date-fns';
import { remindersService } from '../services/remindersService';

const ReminderItem = ({ item: reminder, onToggle, onDelete, selectionMode, isSelected, onSelectReminder, onLongPress }) => {
    const navigation = useNavigation();
    const swipeableRow = useRef(null);
    const height = useRef(new Animated.Value(115)).current;
    const threshold = 150;

    /**
     * Function to format the time for display based on the next trigger date in the reminder.
     * It checks the nextTriggerDate to display the correct time.
     * @param {Object} reminder - The reminder object containing nextTriggerDate.
     * @returns {string} - The formatted time string.
     */
    const formatTime = (reminder) => {
        const date = reminder.nextTriggerDate || reminder.date;
        if( !date) return;
        return format(date, 'h:mm a');
    };

    /**
     * Function to format the date or periodicity string for display.
     * It customizes the display based on the periodicity of the reminder.
     * @param {Object} reminder - The reminder object containing periodicity and other related details.
     * @returns {string} - The formatted date or periodicity string.
     */
    const formatDateOrPeriodicity = (reminder) => {
      const { periodicity, weekdays, day, month } = reminder;
      
      switch (periodicity) {
          case 'One-time':
              return format(new Date(reminder.date), 'MMM d, yyyy');
          case 'Weekdays':
              const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const shortDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
              return daysOfWeek.map((day, index) => (
                  <Text key={index} style={[styles.weekdayText, weekdays.includes(day) && styles.weekdayTextSelected]}>
                      {shortDays[index]}
                  </Text>
              ));
          case 'Monthly':
              return `${day}th of every month`;
          case 'Yearly':
              return `${format(new Date(0, month), 'MMM')} ${day}th of every year`;
          default:
              return '';
      }
  };
  
    const textStyle = reminder.enabled ? {} : styles.dimmedText;

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

    const handleSwipeableRightWillOpen = () => {
        Animated.timing(height, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start(() => {
            onDelete(reminder.id);
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
                      onPress={() => selectionMode ? onSelectReminder(reminder.id) : navigation.navigate('Remind', { reminder: remindersService.serializeReminder(reminder) })}
                      onLongPress={() => onLongPress(reminder.id)}
                      activeOpacity={1}
                  >
                      <View style={styles.reminderItem}>
                          {selectionMode && (
                              <TouchableOpacity 
                                  onPress={() => onSelectReminder(reminder.id)} 
                                  style={[styles.checkbox, isSelected && styles.checkboxSelected]}
                              >
                                  {isSelected && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                              </TouchableOpacity>
                          )}
                          <View style={styles.reminderTextContainer}>
                              <Text style={[styles.reminderTitle, textStyle]}>{reminder.title}</Text>
                              <Text style={[styles.reminderTime, textStyle]}>{formatTime(reminder)}</Text>

                              {/* Debugging: Display nextTriggerDate */}
                              <Text style={styles.debugText}>
                                  {`${reminder.nextTriggerDate ? new Date(reminder.nextTriggerDate).toLocaleString() : 'N/A'}`}
                              </Text>
                          </View>
                          <Text style={[styles.reminderDate, textStyle]}>{formatDateOrPeriodicity(reminder)}</Text>
                          {!selectionMode && (
                              <View style={styles.toggleContainer}>
                                  <Switch
                                      value={reminder.enabled}
                                      onValueChange={() => onToggle(reminder)}
                                      thumbColor={reminder.enabled ? '#1e90ff' : '#bbbbbb'}
                                      trackColor={{ true: '#81b0ff', false: '#888' }}
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
        backgroundColor: '#222222',
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
        backgroundColor: '#1e90ff',
    },
    reminderTextContainer: {
        flex: 1,
        paddingRight: 10,
    },
    reminderTitle: {
        fontSize: 14,
        color: '#ffffff',
        marginBottom: 4,
    },
    reminderTime: {
        fontSize: 26,
        color: '#ffffff',
    },
    reminderDate: {
        fontSize: 16,
        color: '#ffffff',
        textAlign: 'center',
        flexWrap: 'wrap',
        maxWidth: 120,  // Limit width to allow wrapping if necessary
    },
    dimmedText: {
        opacity: 0.5,
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
    weekdayText: {
        fontSize: 16,
        color: '#888888',
        letterSpacing: 2,
    },
    weekdayTextSelected: {
        fontWeight: 'bold',
        color: '#ffffff',
    },
    debugText: {  // Debugging: Styles for the debugging text
      fontSize: 12,
      color: 'gray',
      marginTop: 4,
  },
});

export default memo(ReminderItem);
