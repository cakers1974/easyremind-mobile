import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ReminderItem from '../components/ReminderItem';
import { remindersService } from '../services/remindersService';

const HomeScreen = () => {
  // State to hold the list of reminders
  const [reminders, setReminders] = useState([]);
  // State to manage selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  // State to manage selected reminders in selection mode
  const [selectedReminders, setSelectedReminders] = useState([]);
  // State to manage the "select all" checkbox
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  // Navigation hook to navigate between screens
  const navigation = useNavigation();

  // Load initial reminders and set up event listeners for reminders updates
  useEffect(() => {
    // Function to load initial reminders from the service
    const loadInitialReminders = async () => {
      const initialReminders = await remindersService.loadReminders();
      setReminders(initialReminders);
    };

    loadInitialReminders();

    // Callback to handle reminders update events
    const handleRemindersUpdate = (updatedReminders) => {
      setReminders(updatedReminders);
    };

    remindersService.onRemindersUpdate(handleRemindersUpdate);

    // Cleanup function to remove event listener
    return () => {
      remindersService.offRemindersUpdate(handleRemindersUpdate);
    };
  }, []);

  // Handle back button press to exit selection mode
  useEffect(() => {
    const backAction = () => {
      if (selectionMode) {
        setSelectionMode(false);
        setSelectedReminders([]);
        setSelectAllChecked(false);
        return true;
      }
      return false;
    };

    // Add event listener for hardware back press
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    // Cleanup function to remove event listener
    return () => backHandler.remove();
  }, [selectionMode]);

  // Function to toggle the reminder on or off
  const onToggle = (id, enabled) => {
    remindersService.toggleReminder(id, enabled);
  };

  // Function to handle long press to enter selection mode and select the reminder
  const handleLongPress = (id) => {
    setSelectionMode(true);
    setSelectedReminders([id]);
  };

  // Function to select or deselect a reminder
  const handleSelectReminder = (id) => {
    setSelectedReminders((prevSelectedReminders) =>
      prevSelectedReminders.includes(id)
        ? prevSelectedReminders.filter((reminderId) => reminderId !== id)
        : [...prevSelectedReminders, id]
    );
    // Update selectAllChecked state
    if (selectedReminders.length + 1 === reminders.length) {
      setSelectAllChecked(true);
    } else {
      setSelectAllChecked(false);
    }
  };

  // Function to select or deselect all reminders
  const handleSelectAll = () => {
    if (selectedReminders.length === reminders.length) {
      setSelectedReminders([]);
      setSelectAllChecked(false);
    } else {
      setSelectedReminders(reminders.map((reminder) => reminder.id));
      setSelectAllChecked(true);
    }
  };

  // Function to turn on selected reminders
  const handleTurnOn = async () => {
    await remindersService.toggleMultipleReminders(selectedReminders, true);
    setSelectionMode(false);
    setSelectedReminders([]);
    setSelectAllChecked(false);
  };

  // Function to turn off selected reminders
  const handleTurnOff = async () => {
    await remindersService.toggleMultipleReminders(selectedReminders, false);
    setSelectionMode(false);
    setSelectedReminders([]);
    setSelectAllChecked(false);
  };

  // Function to delete selected reminders
  const handleDelete = async () => {
    await Promise.all(selectedReminders.map((id) => remindersService.deleteReminder(id)));
    setSelectionMode(false);
    setSelectedReminders([]);
    setSelectAllChecked(false);
  };

  // Function to get the next upcoming reminder
  const getNextUpcomingReminder = (reminders) => {
    const now = new Date();
    return reminders
      .filter(reminder => new Date(reminder.date) > now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  };

  const nextReminder = getNextUpcomingReminder(reminders);

  // Function to render each reminder item
  const renderReminderItem = ({ item }) => (
    <ReminderItem
      item={item}
      onToggle={onToggle}
      selectionMode={selectionMode}
      isSelected={selectedReminders.includes(item.id)}
      onSelectReminder={handleSelectReminder}
      onLongPress={handleLongPress}
    />
  );

  // Function to format the time for display
  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString([], options);
  };

  return (
    <View style={styles.container}>
      {/* Display the next upcoming reminder */}
      <View style={styles.upcomingReminder}>
        <Text style={styles.upcomingReminderText}>
          {nextReminder ? `Next: ${nextReminder.title} at ${formatTime(nextReminder.date)}` : 'No upcoming reminders'}
        </Text>
      </View>

      {/* List of reminders with a header component for action buttons */}
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.actions}>
              {/* "All" button only visible in selection mode */}
              {selectionMode && (
                <View style={styles.checkboxContainer} onPress={handleSelectAll}>
                  <TouchableOpacity
                    onPress={handleSelectAll}
                    style={[styles.checkbox, selectAllChecked && styles.checkboxSelected]}
                  >
                    {selectAllChecked && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                  </TouchableOpacity>
                  <Text style={styles.selectAllText}>Select All</Text>
                </View>
              )}
              {/* Action buttons */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Remind', { reset: true })}>
                  <Ionicons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionsButton} onPress={() => {/* Handle options menu */ }}>
                  <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        data={reminders.sort((a, b) => new Date(a.date) - new Date(b.date))}
        keyExtractor={(item) => item.id}
        renderItem={renderReminderItem}
        extraData={selectedReminders}
      />

      {/* Selection mode action buttons */}
      {selectionMode && (
        <View style={styles.selectionActions}>
          <TouchableOpacity style={styles.selectionButton} onPress={handleTurnOn}>
            <Text style={styles.selectionButtonText}>Turn on</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionButton} onPress={handleTurnOff}>
            <Text style={styles.selectionButtonText}>Turn off</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionButton} onPress={handleDelete}>
            <Text style={styles.selectionButtonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionButton} onPress={() => setSelectionMode(false)}>
            <Text style={styles.selectionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#000000', // Set to true black
  },
  header: {
    marginBottom: 20,
  },
  upcomingReminder: {
    marginBottom: 10,
    backgroundColor: '#333333',
    padding: 10,
    borderRadius: 5,
  },
  upcomingReminderText: {
    color: '#ffffff',
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // Align at the bottom
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align at the bottom
    marginLeft: 16, // Adjust left margin to align with list checkboxes
  },
  checkbox: {
   width: 20,
   height: 20,
   borderRadius: 10,
   borderWidth: 2,
   borderColor: '#ffffff',
   justifyContent: 'center',
   alignItems: 'center',
 },
 checkboxSelected: {
   backgroundColor: '#1e90ff', // Bluish background color for selected state
 },

  selectAllText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 8, // Add spacing between the checkbox and the label
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Ensure buttons stay at the right
    flex: 1, // Take up the remaining space
  },
  addButton: {
    padding: 5,
    backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent background
    alignItems: 'center',
    marginTop: 20,
  },
  optionsButton: {
    padding: 5,
    backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent background
    alignItems: 'center',
    marginTop: 20,
    marginLeft: 10,
  },
  selectionActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#333333',
    padding: 20,
  },
  selectionButton: {
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 5,
  },
  selectionButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
