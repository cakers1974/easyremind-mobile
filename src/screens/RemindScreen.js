import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useReminders } from '../context/RemindersContext';
import uuid from 'react-native-uuid';
import { WheelPicker } from 'react-native-ui-lib';
import { Ionicons } from '@expo/vector-icons';

const RemindScreen = ({ route, navigation }) => {
  const { dispatch } = useReminders();
  const [title, setTitle] = useState('');
  
  const currentDate = new Date();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedHour, setSelectedHour] = useState(currentDate.getHours() % 12 || 12);
  const [selectedMinute, setSelectedMinute] = useState(currentDate.getMinutes());
  const [selectedAmPm, setSelectedAmPm] = useState(currentDate.getHours() >= 12 ? 'PM' : 'AM');
  
  const [editingReminder, setEditingReminder] = useState(null);

  const hours = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: (i + 1).toString() }));
  const minutes = Array.from({ length: 60 }, (_, i) => ({ value: i, label: i.toString().padStart(2, '0') }));
  const ampm = [{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }];

  const resetFields = () => {
   setTitle('');

   const currentDate = new Date();
   /*currentDate.setMinutes(currentDate.getMinutes() + 4); // Add 4 minutes
   let roundedMinutes = Math.ceil(currentDate.getMinutes() / 15) * 15; // Round up to the nearest 15-minute interval

   if (roundedMinutes === 60) {
     currentDate.setHours(currentDate.getHours() + 1);
     roundedMinutes = 0;
   }

   currentDate.setMinutes(roundedMinutes);
   currentDate.setSeconds(0);
   currentDate.setMilliseconds(0);
*/
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
    } else if (route.params?.date) {
      setTitle(''); // Ensure the title is reset
      const date = new Date(route.params.date);
      setSelectedDate(date);
      setSelectedHour(date.getHours() % 12 || 12);
      setSelectedMinute(date.getMinutes());
      setSelectedAmPm(date.getHours() >= 12 ? 'PM' : 'AM');
    }
    else {
      resetFields();
    }
  }, [route.params]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      resetFields();
    });

    return unsubscribe;
  }, [navigation]);

  const scheduleNotification = async (title, date) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Reminder',
        body: title,
      },
      trigger: new Date(date),
    });
  };

  const saveReminder = async () => {
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
        id: editingReminder ? editingReminder.id : uuid.v4(), // Use existing id if editing, otherwise generate a new one
        title,
        date: date.toISOString(),
      };

      if (editingReminder) {
        dispatch({ type: 'EDIT_REMINDER', reminder });
      } else {
        dispatch({ type: 'ADD_REMINDER', reminder });
      }

      await scheduleNotification(title, date);
      Alert.alert('Reminder saved!');
      navigation.navigate('Day', { date });
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error saving reminder.');
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{editingReminder ? 'View/Edit Reminder' : 'Add Reminder'}</Text>
      </View>
      <View style={styles.pickerRow}>
        <View style={styles.pickerWrapper}>
          <Text style={styles.label}>Hour</Text>
          <WheelPicker
            onChange={(item, index) => {setSelectedHour(item)}}
            initialValue={selectedHour}
            items={hours}
            style={styles.picker}
            activeTextColor={'#ffffff'}
            inactiveTextColor={'#ffffff'}
            numberOfVisibleRows={3}
          />
        </View>
        <View style={styles.pickerWrapper}>
          <Text style={styles.label}>Minute</Text>
          <WheelPicker
            onChange={(item, index) => {setSelectedMinute(item)}}
            initialValue={selectedMinute}
            items={minutes}
            style={styles.picker}
            activeTextColor={'#ffffff'}
            inactiveTextColor={'#ffffff'}
            numberOfVisibleRows={3}
          />
        </View>
        <View style={styles.pickerWrapper}>
          <Text style={styles.label}>AM/PM</Text>
          <WheelPicker
            onChange={(item, index) => {setSelectedAmPm(item)}}
            initialValue={selectedAmPm}
            items={ampm}
            style={styles.picker}
            activeTextColor={'#ffffff'}
            inactiveTextColor={'#ffffff'}
            numberOfVisibleRows={3}
          />
        </View>
      </View>
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedDate.toDateString()}</Text>
        <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}>
          <Ionicons name="arrow-forward" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter reminder title"
        placeholderTextColor="#aaaaaa"
      />
      <TouchableOpacity style={styles.saveButton} onPress={saveReminder}>
        <Text style={styles.saveButtonText}>Save Reminder</Text>
      </TouchableOpacity>
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
  saveButton: {
    padding: 15,
    backgroundColor: '#1e90ff',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RemindScreen;
