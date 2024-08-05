import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useReminders } from '../context/RemindersContext';
import { Ionicons } from '@expo/vector-icons';
import ReminderItem from '../components/ReminderItem'; // Adjusted import path

const HomeScreen = () => {
  const { reminders, dispatch } = useReminders();
  const navigation = useNavigation();

  const onToggle = React.useCallback((id, enabled) => {
    dispatch({ type: 'TOGGLE_REMINDER', id, enabled });
  }, [dispatch]);

  const renderReminderItem = ({ item }) => (
    <ReminderItem item={item} onToggle={onToggle} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={reminders.sort((a, b) => new Date(a.date) - new Date(b.date))}
        keyExtractor={(item) => item.id}
        renderItem={renderReminderItem}
      />
      <View style={styles.actions}>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Remind', { reset: true })}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionsButton} onPress={() => {/* Handle options menu */ }}>
          <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
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
  addButton: {
    padding: 15,
    backgroundColor: '#28a745',
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 20,
  },
  optionsButton: {
    padding: 15,
    backgroundColor: '#007bff',
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 20,
    marginLeft: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

export default HomeScreen;
