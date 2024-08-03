import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, Modal, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReminders } from '../context/RemindersContext';

const DayScreen = ({ route, navigation }) => {
  const { reminders, dispatch } = useReminders();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);

  useEffect(() => {
    if (route.params?.date) {
      setSelectedDate(new Date(route.params.date));
    }
  }, [route.params]);

  const filteredReminders = reminders.filter(
    (r) => new Date(r.date).toDateString() === selectedDate.toDateString()
  );

  const deleteReminder = (date) => {
    dispatch({ type: 'DELETE_REMINDER', date });
    Alert.alert('Reminder deleted!');
    setModalVisible(false);
  };

  const handleReminderPress = (reminder) => {
    navigation.navigate('Remind', { reminder });
  };

  const handleReminderLongPress = (reminder) => {
    setSelectedReminder(reminder);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedDate.toDateString()}</Text>
        <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}>
          <Ionicons name="arrow-forward" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredReminders}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.reminderItem}
            onPress={() => handleReminderPress(item)}
            onLongPress={() => handleReminderLongPress(item)}
          >
            <Text style={styles.reminderText}>{item.title}</Text>
            <Text style={styles.reminderText}>{new Date(item.date).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Remind', { date: selectedDate })}>
        <Text style={styles.addButtonText}>Add Reminder</Text>
      </TouchableOpacity>
      {selectedReminder && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Reminder Options</Text>
              <Text style={styles.modalReminderTitle}>{selectedReminder.title}</Text>
              <Text style={styles.modalReminderDate}>{new Date(selectedReminder.date).toLocaleString()}</Text>
              <Button title="Edit" onPress={() => { setModalVisible(false); handleReminderPress(selectedReminder); }} />
              <Button title="Delete" color="#dc3545" onPress={() => deleteReminder(selectedReminder.date)} />
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    color: '#ffffff',
  },
  reminderItem: {
    padding: 20,
    marginVertical: 8,
    backgroundColor: '#333333',
    borderColor: '#444444',
    borderWidth: 1,
    borderRadius: 8,
  },
  reminderText: {
    fontSize: 16,
    color: '#ffffff',
  },
  addButton: {
    padding: 15,
    backgroundColor: '#28a745',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: 300,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 10,
  },
  modalReminderTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  modalReminderDate: {
    fontSize: 16,
    marginBottom: 20,
  },
});

export default DayScreen;
