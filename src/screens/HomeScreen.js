import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useReminders } from '../context/RemindersContext';

const HomeScreen = () => {
  const { reminders, dispatch } = useReminders();
  const navigation = useNavigation();

  const renderReminderItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('Remind', { reminder: item })}>
      <View style={styles.reminderItem}>
        <Text style={styles.reminderText}>{item.title}</Text>
        <Text style={styles.reminderText}>{new Date(item.date).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const deleteAllReminders = () => {
    Alert.alert(
      "Delete All Reminders",
      "Are you sure you want to delete all reminders?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "OK",
          onPress: () => {
            dispatch({ type: 'SET_REMINDERS', reminders: [] });
            Alert.alert('All reminders deleted!');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EasyRemind</Text>
        <Text style={styles.headerSubtitle}>by Chris Akers</Text>
      </View>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={renderReminderItem}
      />
      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Remind', { reset: true })}>
        <Text style={styles.addButtonText}>Add Reminder</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.addButton, { backgroundColor: '#dc3545' }]} onPress={deleteAllReminders}>
        <Text style={styles.addButtonText}>Delete All Reminders</Text>
      </TouchableOpacity>
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
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
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
});

export default HomeScreen;
