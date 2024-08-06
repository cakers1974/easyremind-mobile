import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { remindersService } from '../services/remindersService';
import { WheelPicker } from 'react-native-ui-lib';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const RemindScreen = ({ route }) => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');

  const currentDate = new Date();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedHour, setSelectedHour] = useState(currentDate.getHours() % 12 || 12);
  const [selectedMinute, setSelectedMinute] = useState(currentDate.getMinutes());
  const [selectedAmPm, setSelectedAmPm] = useState(currentDate.getHours() >= 12 ? 'PM' : 'AM');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [editingReminder, setEditingReminder] = useState(null);

  const hours = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: (i + 1).toString() }));
  const minutes = Array.from({ length: 60 }, (_, i) => ({ value: i, label: i.toString().padStart(2, '0') }));
  const ampm = [{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }];

  const resetFields = () => {
    setTitle('');

    const currentDate = new Date();
    // Handle AM/PM and 12-hour format
    const hour = currentDate.getHours();
    const amPm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    setSelectedDate(currentDate);
    setSelectedHour(displayHour);
    setSelectedMinute(currentDate.getMinutes());
    setSelectedAmPm(amPm);
    setEditingReminder(null);
  };

  useEffect(() => {
    if (route.params?.reminder) {
      const { reminder } = route.params;
      const reminderDate = new Date(reminder.date);
      setTitle(reminder.title);
      setSelectedDate(reminderDate);
      setSelectedHour(reminderDate.getHours() % 12 || 12);
      setSelectedMinute(reminderDate.getMinutes());
      setSelectedAmPm(reminderDate.getHours() >= 12 ? 'PM' : 'AM');
      setEditingReminder(reminder);
    } else if (route.params?.reset) {
      resetFields();
    }
  }, [route.params]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      resetFields();
    });

    return unsubscribe;
  }, [navigation]);

  const handleSaveReminder = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title for the reminder.');
      return;
    }

    const hour = selectedAmPm === 'PM' ? (selectedHour % 12) + 12 : selectedHour % 12;
    const date = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hour,
      selectedMinute
    );

    if (date <= new Date()) {
      Alert.alert('Validation Error', 'Please select a future date for the reminder.');
      return;
    }

    try {
      const reminder = {
        id: editingReminder ? editingReminder.id : null,
        title,
        date: date.toISOString(),
      };

      await remindersService.saveReminder(reminder);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error saving reminder.');
    }
  };

  const formatSelectedDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const dayFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const formattedDate = date.toLocaleDateString([], dayFormatOptions);

    if (isToday) {
      return `Today-${formattedDate}`;
    } else if (isTomorrow) {
      return `Tomorrow-${formattedDate}`;
    } else {
      return formattedDate;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{editingReminder ? 'Edit Reminder' : 'Add Reminder'}</Text>
      </View>
      <View style={styles.pickerRow}>
        <View style={styles.pickerWrapper}>
          <Text style={styles.label}>Hour</Text>
          <WheelPicker
            onChange={(item, index) => { setSelectedHour(item) }}
            initialValue={selectedHour}
            items={hours}
            style={styles.picker}
            activeTextColor={'#ffffff'}
            inactiveTextColor={'#999999'}
            numberOfVisibleRows={3}
          />
        </View>
        <View style={styles.pickerWrapper}>
          <Text style={styles.label}>Minute</Text>
          <WheelPicker
            onChange={(item, index) => { setSelectedMinute(item) }}
            initialValue={selectedMinute}
            items={minutes}
            style={styles.picker}
            activeTextColor={'#ffffff'}
            inactiveTextColor={'#999999'}
            numberOfVisibleRows={3}
          />
        </View>
        <View style={styles.pickerWrapper}>
          <Text style={styles.label}>AM/PM</Text>
          <WheelPicker
            onChange={(item, index) => { setSelectedAmPm(item) }}
            initialValue={selectedAmPm}
            items={ampm}
            style={styles.picker}
            activeTextColor={'#ffffff'}
            inactiveTextColor={'#999999'}
            numberOfVisibleRows={3}
          />
        </View>
      </View>
      <View style={styles.headerDateContainer}>
        <TouchableOpacity 
          onPress={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
          disabled={new Date(selectedDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0)}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={new Date(selectedDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0) ? "#555555" : "#ffffff"} // Dimmed color if disabled
          />
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatSelectedDate(selectedDate)}</Text>
        <TouchableOpacity 
          onPress={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
        >
          <Ionicons name="arrow-forward" size={24} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.calendarIcon}>
          <Ionicons name="calendar" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={new Date().setHours(0, 0, 0, 0)} // Prevent selecting past dates
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
            }
          }}
        />
      )}
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter reminder title"
        placeholderTextColor="#aaaaaa"
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveReminder}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#121212',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  dateText: {
    fontSize: 18,
    color: '#ffffff',
    width: 200, // Fixed width for the date text
    textAlign: 'center', // Center align the text within the fixed width
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  pickerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  picker: {
    width: 100,
    backgroundColor: '#000000',
  },
  label: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#333333',
    borderRadius: 5,
    color: '#ffffff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    padding: 15,
    backgroundColor: '#1e90ff',
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  cancelButton: {
    padding: 15,
    backgroundColor: '#dc3545',
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  calendarIcon: {
    marginLeft: 10, // Add spacing between the right arrow and the calendar icon
  },
});

export default RemindScreen;
