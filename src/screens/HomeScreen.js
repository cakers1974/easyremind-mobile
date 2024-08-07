import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, BackHandler, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ReminderItem from '../components/ReminderItem';
import { remindersService } from '../services/remindersService';
import uuid from 'react-native-uuid';

const HomeScreen = () => {
   const [reminders, setReminders] = useState([]);
   const [nextReminderText, setNextReminderText] = useState('');
   const [selectionMode, setSelectionMode] = useState(false);
   const [selectedReminders, setSelectedReminders] = useState([]);
   const [selectAllChecked, setSelectAllChecked] = useState(false);
   const [deletedReminders, setDeletedReminders] = useState([]);
   const [undoBannerVisible, setUndoBannerVisible] = useState(false);
   const [lastDeletedActionId, setLastDeletedActionId] = useState(null);
   const navigation = useNavigation();
   const [bannerHeight] = useState(new Animated.Value(0));

   useEffect(() => {
      const loadInitialReminders = async () => {
         const initialReminders = await remindersService.loadReminders();
         setReminders(initialReminders.filter(r => !r.deletedActionId));
      };

      loadInitialReminders();

      const handleRemindersUpdate = (updatedReminders) => {
         setReminders(updatedReminders.filter(r => !r.deletedActionId));
         const nextReminder = getNextUpcomingReminder(updatedReminders);
         setNextReminderText(nextReminder ? formatNextReminderTime(nextReminder) : 'No upcoming reminders');
      };

      remindersService.onRemindersUpdate(handleRemindersUpdate);

      return () => {
         remindersService.offRemindersUpdate(handleRemindersUpdate);
      };
   }, []);

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

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

      return () => backHandler.remove();
   }, [selectionMode]);

   useEffect(() => {
      const unsubscribe = navigation.addListener('focus', () => {
         remindersService.cleanupDeletedReminders();
         setUndoBannerVisible(false);
      });

      return unsubscribe;
   }, [navigation]);

   useEffect(() => {
      Animated.timing(bannerHeight, {
         toValue: undoBannerVisible ? 50 : 0, // Adjust the height value as needed
         duration: 300,
         useNativeDriver: false,
      }).start();
   }, [undoBannerVisible]);

   const onToggle = (id, enabled) => {
      remindersService.toggleReminder(id, enabled);
   };

   const handleLongPress = (id) => {
      setSelectionMode(true);
      setSelectedReminders([id]);
   };

   const handleSelectReminder = (id) => {
      setSelectedReminders((prevSelectedReminders) =>
         prevSelectedReminders.includes(id)
            ? prevSelectedReminders.filter((reminderId) => reminderId !== id)
            : [...prevSelectedReminders, id]
      );
      if (selectedReminders.length + 1 === reminders.length) {
         setSelectAllChecked(true);
      } else {
         setSelectAllChecked(false);
      }
   };

   const handleSelectAll = () => {
      if (selectedReminders.length === reminders.length) {
         setSelectedReminders([]);
         setSelectAllChecked(false);
      } else {
         setSelectedReminders(reminders.map((reminder) => reminder.id));
         setSelectAllChecked(true);
      }
   };

   const handleTurnOn = async () => {
      await remindersService.toggleMultipleReminders(selectedReminders, true);
      setSelectionMode(false);
      setSelectedReminders([]);
      setSelectAllChecked(false);
   };

   const handleTurnOff = async () => {
      await remindersService.toggleMultipleReminders(selectedReminders, false);
      setSelectionMode(false);
      setSelectedReminders([]);
      setSelectAllChecked(false);
   };

   const handleDelete = async (id) => {
      const actionId = uuid.v4();
      setLastDeletedActionId(actionId);
      await remindersService.deleteReminder(id, actionId);
      if (Array.isArray(id)) {
         setDeletedReminders(id);
      } else {
         setDeletedReminders([id]);
      }
      setSelectionMode(false);
      setSelectedReminders([]);
      setSelectAllChecked(false);
      setUndoBannerVisible(true);
   };

   const handleUndo = async () => {
      await remindersService.undoDeletion(lastDeletedActionId);
      setUndoBannerVisible(false);
   };

   const getNextUpcomingReminder = (reminders) => {
      const now = new Date();
      return reminders
         .filter(reminder => new Date(reminder.date) > now && reminder.enabled)
         .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
   };

   const formatNextReminderTime = (reminder) => {
      const now = new Date();
      const diff = new Date(reminder.date) - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      let timeString = 'Next reminder in ';
      if (days > 0) timeString += `${days} days `;
      if (hours > 0) timeString += `${hours} hours `;
      if (minutes > 0) timeString += `${minutes} minutes`;

      timeString = timeString.trim() + `. ${reminder.title}`;

      return timeString;
   };

   const renderReminderItem = ({ item }) => (
      <ReminderItem
         item={item}
         onToggle={onToggle}
         onDelete={() => handleDelete(item.id)}
         selectionMode={selectionMode}
         isSelected={selectedReminders.includes(item.id)}
         onSelectReminder={handleSelectReminder}
         onLongPress={handleLongPress}
      />
   );

   return (
      <View style={styles.container}>
         <Animated.View style={[styles.undoBanner, { height: bannerHeight, padding: bannerHeight.interpolate({ inputRange: [0, 50], outputRange: [0, 10] }) }]}>
            <Text style={styles.undoBannerText}>
               Deleted {deletedReminders.length} reminder{deletedReminders.length > 1 ? 's' : ''}.
            </Text>
            <TouchableOpacity onPress={handleUndo}>
               <Text style={styles.undoBannerUndoText}>Undo</Text>
            </TouchableOpacity>
         </Animated.View>
         <View style={[styles.upcomingReminder, undoBannerVisible && { marginTop: 0 }]}>
            <Text style={styles.upcomingReminderText}>
               {nextReminderText}
            </Text>
         </View>
         <FlatList
            ListHeaderComponent={
               <View style={styles.header}>
                  <View style={styles.actions}>
                     {selectionMode && (
                        <View style={styles.checkboxContainer}>
                           <TouchableOpacity
                              onPress={handleSelectAll}
                              style={[styles.checkbox, selectAllChecked && styles.checkboxSelected]}
                           >
                              {selectAllChecked && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                           </TouchableOpacity>
                           <Text style={styles.selectAllText}>Select All</Text>
                        </View>
                     )}
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
         {selectionMode && (
            <View style={styles.selectionActions}>
               <TouchableOpacity
                  style={[styles.selectionButton, { backgroundColor: selectedReminders.length > 0 ? '#007bff' : '#555' }]}
                  onPress={handleTurnOn}
                  disabled={selectedReminders.length === 0}
               >
                  <Text style={styles.selectionButtonText}>Turn on</Text>
               </TouchableOpacity>
               <TouchableOpacity
                  style={[styles.selectionButton, { backgroundColor: selectedReminders.length > 0 ? '#007bff' : '#555' }]}
                  onPress={handleTurnOff}
                  disabled={selectedReminders.length === 0}
               >
                  <Text style={styles.selectionButtonText}>Turn off</Text>
               </TouchableOpacity>
               <TouchableOpacity
                  style={[styles.selectionButton, { backgroundColor: selectedReminders.length > 0 ? '#007bff' : '#555' }]}
                  onPress={() => handleDelete(selectedReminders)}
                  disabled={selectedReminders.length === 0}
               >
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
   undoBanner: {
      backgroundColor: '#bf8d02',
      padding: 10,
      borderRadius: 5,
      marginBottom: 0, // Remove bottom margin
      flexDirection: 'row', // Change to row to align text and link horizontally
      justifyContent: 'space-between',
      alignItems: 'center', // Vertically center the text and link
   },
   undoBannerText: {
      color: '#ffffff',
      fontSize: 16,
   },
   undoBannerUndoText: {
      color: '#ffffff', // Change to white color
      fontSize: 16,
      textDecorationLine: 'underline', // Add underline
   },
   header: {
      marginBottom: 8,
   },
   upcomingReminder: {
      backgroundColor: '#000000',
      padding: 10,
      borderRadius: 5,
      marginTop: 10, // Added margin to give some space between undoBanner and upcomingReminder
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
