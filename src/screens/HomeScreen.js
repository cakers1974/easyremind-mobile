import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, BackHandler, Animated, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
   const [deletedReminderIds, setDeletedReminderIds] = useState([]);
   const [undoBannerVisible, setUndoBannerVisible] = useState(false);
   const [lastDeletedActionId, setLastDeletedActionId] = useState(null);
   const navigation = useNavigation();
   const [bannerHeight] = useState(new Animated.Value(0));

   useEffect(() => {
      const handleRemindersUpdate = (updatedReminders) => {
         setReminders(updatedReminders.filter(r => !r.deletedActionId));
      };
      remindersService.onRemindersUpdate(handleRemindersUpdate);

      const loadInitialReminders = async () => {
         updatedReminders = await remindersService.getReminders();
         setReminders(updatedReminders.filter(r => !r.deletedActionId));
      };
      loadInitialReminders();

      return () => {
         remindersService.offRemindersUpdate(handleRemindersUpdate);
      };
   }, []);


   // Disable any outdated reminders when the screen comes into focus
   useFocusEffect(
      useCallback(() => {
         remindersService.toggleOutdatedRemindersOff();
      }, [])
   );

  
   // Set the next upcoming reminder text and update it every 5 seconds
   useEffect(() => {
      updateNextUpcomingReminder();
      const intervalId = setInterval(updateNextUpcomingReminder, 5000);
      return () => clearInterval(intervalId);
   }, [reminders]);


   // When user is in selection mode, the device's back button will escape out of selection mode
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


   // show the undo deletion banner with sliding animation when the user deletes any reminders.
   // hide the banner after 10 seconds.
   useEffect(() => {
      Animated.timing(bannerHeight, {
         toValue: undoBannerVisible ? 50 : 0, // Adjust the height value as needed
         duration: 300,
         useNativeDriver: false,
      }).start();
   
      if (undoBannerVisible) {
         const timer = setTimeout(() => {
            setUndoBannerVisible(false);
         }, 10000); // 10 seconds
   
         return () => clearTimeout(timer);
      }
   }, [undoBannerVisible]);


   const onToggle = (reminder) => {
      const enable = !reminder.enabled;
      remindersService.toggleReminders([reminder.id], enable);
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


   const handleToggleSelectedOn = async () => {
      await remindersService.toggleReminders(selectedReminders, true);
      setSelectionMode(false);
      setSelectedReminders([]);
      setSelectAllChecked(false);
   };


   const handleToggleSelectedOff = async () => {
      await remindersService.toggleReminders(selectedReminders, false);
      setSelectionMode(false);
      setSelectedReminders([]);
      setSelectAllChecked(false);
   };


   const handleDelete = async (id) => {
      const actionId = uuid.v4();
      setLastDeletedActionId(actionId);
      await remindersService.deleteReminder(id, actionId);
      if (Array.isArray(id)) {
         setDeletedReminderIds(id);
      } else {
         setDeletedReminderIds([id]);
      }
      setSelectionMode(false);
      setSelectedReminders([]);
      setSelectAllChecked(false);
      setUndoBannerVisible(true);
   };


   const handleUndoDeletion = async () => {
      await remindersService.undoDeletion(lastDeletedActionId);
      setUndoBannerVisible(false);
   };


   const updateNextUpcomingReminder = () => {
      const now = new Date();
      const upcomingReminder = reminders
         .filter(reminder => reminder.nextReminderDate > now && reminder.enabled)
         .sort((a, b) => new Date(a.nextReminderDate) - new Date(b.nextReminderDate))[0];
   
      if (upcomingReminder) {
         const timeText = formatNextReminderTime(upcomingReminder, now);
         const titleText = upcomingReminder.title;
         setNextReminderText({ timeText, titleText });
      } else {
         setNextReminderText({ timeText: 'No upcoming reminders', titleText: '' });
      }
   };

   
   const formatNextReminderTime = (reminder, now) => {
      const nextTriggerDate = new Date(reminder.nextTriggerDate);
      const diffInMilliseconds = nextTriggerDate - now;
      const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
      const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
      const diffInMonths = Math.floor(diffInDays / 30);
   
      let timeString = 'Reminder in ';
   
      const pluralize = (value, unit) => {
         return `${value} ${unit}${value !== 1 ? 's' : ''}`;
      };
   
      if (diffInMinutes < 1) {
         // Less than 1 minute
         timeString += "less than one minute";
      } else if (diffInHours < 24) {
         // Less than 24 hours, show hours and minutes
         if (diffInHours > 0) timeString += `${pluralize(diffInHours, 'hour')} `;
         const minutes = Math.floor((diffInMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
         if (minutes > 0) timeString += `${pluralize(minutes, 'minute')}`;
      } else {
         // 24 hours or more, show months and days
         if (diffInMonths > 0) timeString += `${pluralize(diffInMonths, 'month')} `;
         const remainingDays = diffInDays % 30;
         if (remainingDays > 0) timeString += `${pluralize(remainingDays, 'day')} `;
      }
   
      // Trim any trailing space and return
      return timeString.trim();
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
               Deleted {deletedReminderIds.length} reminder{deletedReminderIds.length > 1 ? 's' : ''}.
            </Text>
            <TouchableOpacity onPress={handleUndoDeletion}>
               <Text style={styles.undoBannerUndoText}>Undo</Text>
            </TouchableOpacity>
         </Animated.View>
   
         <FlatList
            ListHeaderComponent={
               <View>
                  <View style={[styles.upcomingReminder, undoBannerVisible && { marginTop: 0 }]}>
                     <Text style={styles.upcomingReminderText}>
                        {nextReminderText.timeText}
                     </Text>
                     {nextReminderText.titleText !== '' && (
                        <Text style={styles.upcomingReminderTitleText}>
                           {nextReminderText.titleText}
                        </Text>
                     )}
                  </View>
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
            data={reminders.sort((a, b) => new Date(a.nextReminderDate) - new Date(b.nextReminderDate))}
            keyExtractor={(item) => item.id}
            renderItem={renderReminderItem}
            extraData={selectedReminders}
         />
         {selectionMode && (
            <View style={styles.selectionActions}>
               <TouchableOpacity
                  style={[styles.selectionButton, { backgroundColor: selectedReminders.length > 0 ? '#007bff' : '#555' }]}
                  onPress={handleToggleSelectedOn}
                  disabled={selectedReminders.length === 0}
               >
                  <Text style={styles.selectionButtonText}>Turn on</Text>
               </TouchableOpacity>
               <TouchableOpacity
                  style={[styles.selectionButton, { backgroundColor: selectedReminders.length > 0 ? '#007bff' : '#555' }]}
                  onPress={handleToggleSelectedOff}
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
   upcomingReminder: {
      backgroundColor: '#000000',
      padding: 10,
      borderRadius: 5,
      marginTop: 10, // Added margin to give some space between undoBanner and upcomingReminder
      alignItems: 'center', // Center align the content
   },
   upcomingReminderText: {
      color: '#ffffff',
      fontSize: 24,
      textAlign: 'center', // Center the time text
   },
   upcomingReminderTitleText: {
      color: '#bbbbbb', // Slightly dimmed color for the title
      fontSize: 16, // Smaller font size for the title
      textAlign: 'center', // Center the title text
      marginTop: 4, // Add some spacing between time and title
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
