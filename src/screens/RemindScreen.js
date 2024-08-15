// src/screens/RemindScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { remindersService } from '../services/remindersService';
import { updateReminderTrigger } from '../services/reminderUtils';
import ScrollPicker from 'react-native-wheel-scrollview-picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ModalSelector from 'react-native-modal-selector';


const RemindScreen = ({ route }) => {

   const navigation = useNavigation();
   const [title, setTitle] = useState('');

   const currentDate = new Date();
   currentDate.setSeconds(0, 0);
   const [selectedDate, setSelectedDate] = useState(currentDate);
   const [selectedHour, setSelectedHour] = useState(currentDate.getHours() % 12 || 12);
   const [selectedMinute, setSelectedMinute] = useState(currentDate.getMinutes());
   const [selectedAmPm, setSelectedAmPm] = useState(currentDate.getHours() >= 12 ? 'PM' : 'AM');
   const [showDatePicker, setShowDatePicker] = useState(false);
   const [periodicity, setPeriodicity] = useState('One-time');
   const [selectedDays, setSelectedDays] = useState([]);
   const [selectedDay, setSelectedDay] = useState(currentDate.getDate());
   const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
   const [continuousAlert, setContinuousAlert] = useState(false);
   const [notificationId, setNotificationId] = useState(null);

   const[forceHourRerender, setForceHourRerender] = useState(0);
   const[forceMinuteRerender, setForceMinuteRerender] = useState(1);
   const[forceAmPmRerender, setForceAmPmRerender] = useState(2);

   const [editingReminder, setEditingReminder] = useState(null);

   const hours = Array.from({ length: 12 }, (_, i) => (i + 1));
   const minutes = Array.from({ length: 60 }, (_, i) => (i.toString().padStart(2, '0')));
   const ampm = ['AM', 'PM'];
   const daysInMonth = Array.from({ length: 31 }, (_, i) => ({ key: i + 1, label: `${i + 1}` }));
   const months = [
      { key: 0, label: 'Jan' },
      { key: 1, label: 'Feb' },
      { key: 2, label: 'Mar' },
      { key: 3, label: 'Apr' },
      { key: 4, label: 'May' },
      { key: 5, label: 'Jun' },
      { key: 6, label: 'Jul' },
      { key: 7, label: 'Aug' },
      { key: 8, label: 'Sep' },
      { key: 9, label: 'Oct' },
      { key: 10, label: 'Nov' },
      { key: 11, label: 'Dec' },
   ];


   // set initial values upon mounting
   useEffect(() => {
      if (route.params?.reminder) {
         const reminder = remindersService.deserializeReminder(route.params.reminder);

         const currentDate = new Date();
         currentDate.setSeconds(0, 0);
         setSelectedDate( reminder.date || currentDate);
         setSelectedMonth(reminder.month || currentDate.getMonth() );
         setSelectedDay(reminder.day || currentDate.getDate());
         setSelectedDays(reminder.weekdays || []);

         // Convert the 24-hour format hour to 12-hour format and set AM/PM
         const hour = reminder.hour;
         const amPm = hour >= 12 ? 'PM' : 'AM';
         const displayHour = hour % 12 || 12;

         // Set selectedHour, selectedMinute, and selectedAmPm based on reminder
         setSelectedHour(displayHour);
         setSelectedMinute(reminder.minute);
         setSelectedAmPm(amPm);
         
         setTitle(reminder.title);
         setPeriodicity(reminder.periodicity);

         // set continuous alert toggle
         setContinuousAlert(reminder.continuousAlert || false);

         // preserve the notificationId
         setNotificationId(reminder.notificationId || null);

         // Set editingReminder to the current reminder
         setEditingReminder(reminder);

         setForceHourRerender(3);
         setForceMinuteRerender(4);
         setForceAmPmRerender(5);

      } else if (route.params?.reset) {
         resetFields();
      }
   }, [route.params]);


   const resetFields = () => {
      setTitle('');
      setPeriodicity('One-time');

      // Get the current date and time
      const currentDate = new Date();
      currentDate.setSeconds(0, 0);

      // Determine the current hour and AM/PM
      const hour = currentDate.getHours();
      const amPm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;

      // Set the state variables to the current date and time
      setSelectedDate(currentDate);
      setSelectedMonth(currentDate.getMonth());
      setSelectedDay(currentDate.getDate());
      setSelectedHour(displayHour);
      setSelectedMinute(currentDate.getMinutes());
      setSelectedAmPm(amPm);

      // Reset the selected days array
      setSelectedDays([]);

      // reset continuous alert toggle
      setContinuousAlert(false);

      // Clear the editing reminder state
      setEditingReminder(null);
   };


   const handleSaveReminder = async () => {
      // Validate that the title is not empty
      if (!title.trim()) {
         Alert.alert('', 'Please enter a title for the reminder.', [{ text: 'OK' }], { cancelable: true });
         return;
      }

      // Convert the selected hour from 12-hour format to 24-hour format
      const hour = selectedAmPm === 'PM' ? (selectedHour % 12) + 12 : selectedHour % 12;
      const minute = parseInt(selectedMinute);

      // Initialize the reminder object with the appropriate properties
      const reminder = {
         id: editingReminder ? editingReminder.id : null,
         title,
         date: selectedDate,
         month: selectedMonth,      // Set the month
         day: selectedDay,          // Set the day
         hour,                      // Set the hour in 24-hour format
         minute,    // Set the minute
         weekdays: selectedDays,    // Set the weekdays array (if applicable)
         periodicity,               // Set the periodicity ('One-time', 'Weekdays', 'Monthly', 'Yearly')
         continuousAlert,
         enabled: true,
         notificationId: notificationId || null, // Include notificationId if it exists
         lastTriggerDate: null,
         nextTriggerDate: null,
         lastAcknowledged: null,
         prevReminderDate: null,
         nextReminderDate: null
      };

      // check for a common mistake
      if( periodicity === "Weekdays" && selectedDays.length === 0) {
         Alert.alert("", 'Select the days of the week for the reminder to occur.');
         return;
      }

      // make sure that the reminder is a future date
      updateReminderTrigger(reminder);
      if( !reminder.nextTriggerDate || reminder.nextReminderDate <= new Date() ) {
         Alert.alert("", "Please specify a reminder time that is in the future.");
         return;
      }

      try {
         // Save the reminder using the remindersService
         await remindersService.saveReminder(reminder);

         // Navigate back to the Home screen
         navigation.navigate('Home');
      } catch (error) {
         console.error('Error saving reminder:', error);
         Alert.alert('Error saving reminder.');
      }
   };


   const formatSelectedDate = (date) => {
      const today = new Date(new Date().setHours(0, 0, 0, 0));  // today's date with no time
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

   const toggleDaySelection = (day) => {
      setSelectedDays((prevSelectedDays) =>
         prevSelectedDays.includes(day)
            ? prevSelectedDays.filter((d) => d !== day)
            : [...prevSelectedDays, day]
      );
   };


   const handleTabPress = (tab) => {
      if( periodicity === tab ) return;  // ignore if user pressed the current tab

      switch(tab) {
         case 'One-time':
            // if switching from 'Weekdays'
            if( periodicity == 'Weekdays') {
               const today = new Date(new Date().setHours(0, 0, 0, 0));  // today's date with no time
               if( selectedDate < today ) {
                  setSelectedDate( today ); 
               }
            }
            else
            {  // switching from 'Monthly' or 'Yearly'
               const today = new Date(new Date().setHours(0, 0, 0, 0));  // today's date with no time

               // Check if selectedDay and selectedMonth are initialized
               const month = selectedMonth || (today.getMonth()); // Default to current month
               const day = selectedDay || today.getDate(); // Default to current day

               // Create a date object based on the selectedMonth and selectedDay
               let potentialDate = new Date(today.getFullYear(), month, day);

               // If the potential date is before today, set it to the same date next year
               if (potentialDate < today) {
                  potentialDate = new Date(today.getFullYear() + 1, month, day);
               }

               // Update selectedDate state
               setSelectedDate(potentialDate);
            }
            break;
         
      case 'Monthly': case 'Yearly':
         // only update if switching from 'One-time' or 'Weekdays' tab
         if(periodicity === 'One-time' || periodicity === 'Weekdays') {
            // Extract month and day from selectedDate
            const newMonth = selectedDate.getMonth();
            const newDay = selectedDate.getDate();
            setSelectedMonth(newMonth);
            setSelectedDay(newDay);
         }
         break;
      }
      
      setPeriodicity(tab);
   }


   const renderTabContent = () => {
      switch (periodicity) {
         case 'One-time':
            return (
               <View style={styles.dateContainer}>
                  <View style={styles.dateRow}>
                     <TouchableOpacity
                        onPress={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
                        disabled={new Date(selectedDate).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0)}
                     >
                        <Ionicons
                           name="arrow-back"
                           size={24}
                           color={new Date(selectedDate).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0) ? "#555555" : "#ffffff"}
                        />
                     </TouchableOpacity>
                     <Text style={styles.dateText}>{formatSelectedDate(selectedDate)}</Text>
                     <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}>
                        <Ionicons name="arrow-forward" size={24} color="#ffffff" />
                     </TouchableOpacity>
                     <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.calendarIcon}>
                        <Ionicons name="calendar" size={24} color="#ffffff" />
                     </TouchableOpacity>
                  </View>

                  {/* Display "next year" message if selectedDate is in the next year */}
                  {selectedDate.getFullYear() > new Date().getFullYear() && (
                     <Text style={styles.nextYearText}>next year</Text>
                  )}

                  {showDatePicker && (
                     <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        minimumDate={new Date().setHours(0, 0, 0, 0)}  // no past dates
                        maximumDate={new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate() - 1)} // yesterday's date but next year
                        onChange={(event, date) => {
                           setShowDatePicker(false);
                           if (date) {
                              setSelectedDate(date);
                           }
                        }}
                     />
                  )}
               </View>

            );
         case 'Weekdays':
            return (
               <View style={styles.weekdaysContainer}>
                   <View style={styles.weekdayButtonsContainer}>
                       {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                           <TouchableOpacity
                               key={day}
                               style={[
                                   styles.weekday,
                                   selectedDays.includes(day) && styles.selectedWeekday
                               ]}
                               onPress={() => toggleDaySelection(day)}
                           >
                               <Text style={[styles.weekdayText, selectedDays.includes(day) && styles.weekdayTextSelected]}>{day}</Text>
                           </TouchableOpacity>
                       ))}
                   </View>

                   {selectedDays.length === 0 && (
                       <Text style={styles.noDaysSelectedText}>no days selected</Text>
                   )}
               </View>
           );
          case 'Monthly':
            return (
               <View style={styles.monthlyContainer}>
                  <Text style={{ ...styles.label, marginTop: 8 }}>Day of the month:</Text>
                  <ModalSelector
                     data={daysInMonth}
                     initValue={selectedDay.toString()}
                     onChange={(option) => setSelectedDay(option.key)}
                     backdropPressToClose={true}
                     style={styles.modalSelector}
                     selectStyle={styles.selectorStyle}
                     selectTextStyle={styles.selectorTextStyle}
                     optionContainerStyle={styles.optionContainer}  // Style for the modal popup
                  />
                  <TouchableOpacity onPress={() => {
                     Alert.alert(
                        "Info",
                        "Whenever the specified day exceeds the number of days in the month, the reminder will occur on the last day of the month.",
                        [{ text: 'OK' }],
                        { cancelable: true }
                     );
                  }}>
                     <Ionicons name="information-circle-outline" size={24} color="yellow" style={styles.infoIcon} />
                  </TouchableOpacity>
               </View>
            );
         case 'Yearly':
            return (
               <View style={styles.yearlyContainer}>
                  <Text style={{ ...styles.label, marginTop: 8 }}>Month:</Text>
                  <ModalSelector
                     data={months}
                     initValue={months[selectedMonth].label}
                     onChange={(option) => setSelectedMonth(option.key)}
                     backdropPressToClose={true}
                     style={styles.modalSelector}
                     selectStyle={styles.selectorStyle}
                     selectTextStyle={styles.selectorTextStyle}
                     optionContainerStyle={styles.optionContainer}  // Style for the modal popup
                  />
                  <Text style={{ ...styles.label, marginTop: 8 }}>Day:</Text>
                  <ModalSelector
                     data={daysInMonth}
                     initValue={selectedDay.toString()}
                     onChange={(option) => setSelectedDay(option.key)}
                     backdropPressToClose={true}
                     style={styles.modalSelector}
                     selectStyle={styles.selectorStyle}
                     selectTextStyle={styles.selectorTextStyle}
                     optionContainerStyle={styles.optionContainer}  // Style for the modal popup
                  />
                  <TouchableOpacity onPress={() => {
                     Alert.alert(
                        "Info",
                        "Whenever the selected day exceeds the number of days in the month, the reminder will occur on the last day of the month.",
                        [{ text: 'OK' }],
                        { cancelable: true }
                     );
                  }}>
                     <Ionicons name="information-circle-outline" size={24} color="yellow" style={styles.infoIcon} />
                  </TouchableOpacity>
               </View>
            );
         default:
            return null;
      }
   };

   return (
      <View style={styles.container}>
         <View style={styles.header}>
            <Text style={styles.headerTitle}>{editingReminder ? 'View/Edit Reminder' : 'New Reminder'}</Text>
         </View>
         <Text style={styles.label}>Title</Text>
         <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What should I remind you about?"
            placeholderTextColor="#aaaaaa"
         />
         <View style={styles.pickerRow}>
               <ScrollPicker
                  key={forceHourRerender} // needed to force a one-time rerendering
                  dataSource={hours}
                  selectedIndex={selectedHour-1}
                  onValueChange={(data, selectedIndex) => {
                     setSelectedHour(data);
                  }}
                  wrapperHeight={180}
                  wrapperBackground="#0000"
                  itemHeight={60}
                  highlightColor="#777"
                  highlightBorderWidth={2}
                  activeItemTextStyle={{ color: '#fff', fontSize: 28 }}
                  itemTextStyle={{ color: '#666', fontSize: 20 }}
               />
            <Text style={{ color: '#fff', fontSize: 40 }}>:</Text>
               <ScrollPicker
                  key={forceMinuteRerender} // needed to force a one-time rerendering
                  dataSource={minutes}
                  selectedIndex={selectedMinute}
                  onValueChange={(data, selectedIndex) => {
                     setSelectedMinute(parseInt(data));
                  }}
                  wrapperHeight={180}
                  wrapperBackground="#0000"
                  itemHeight={60}
                  highlightColor="#777"
                  highlightBorderWidth={2}
                  activeItemTextStyle={{ color: '#fff', fontSize: 28 }}
                  itemTextStyle={{ color: '#666', fontSize: 20 }}
               />
                           <Text style={{ color: '#000', fontSize: 40 }}>:</Text>

               <ScrollPicker
                  key={forceAmPmRerender} // needed to force a one-time rerendering
                  dataSource={ampm}
                  selectedIndex={selectedAmPm === 'AM' ? 0 : 1}
                  onValueChange={(data, selectedIndex) => {
                     setSelectedAmPm(data);
                  }}
                  wrapperHeight={180}
                  wrapperBackground="#000"
                  itemHeight={60}
                  highlightColor="#777"
                  highlightBorderWidth={2}
                  activeItemTextStyle={{ color: '#fff', fontSize: 28 }}
                  itemTextStyle={{ color: '#666', fontSize: 20 }}
               />
         </View>
         <View style={styles.tabs}>
            {['One-time', 'Weekdays', 'Monthly', 'Yearly'].map((tab) => (
               <TouchableOpacity
                  key={tab}
                  style={[styles.tab, periodicity === tab && styles.selectedTab]}
                  onPress={() => handleTabPress(tab)}
               >
                  <Text style={styles.tabText}>{tab}</Text>
               </TouchableOpacity>
            ))}
         </View>
         <View style={styles.tabContent}>
            {renderTabContent()}
         </View>
         <View style={styles.toggleWrapper}>
            <Switch
               value={continuousAlert}
               onValueChange={setContinuousAlert}
               style={styles.switchStyle}
               thumbColor={continuousAlert ? '#1e90ff' : '#bbbbbb'}
               trackColor={{ true: '#81b0ff', false: '#888' }}
            />
            <Text style={styles.toggleLabel}>
               Play the reminder "ding" sound{'\n'}every 5 minutes until I{'\n'}acknowledge this reminder.{'\n'}
               Limit:  6 times for 30 minutes.{'\n'}When toggled off, you still get{'\n'}a single notification and sound.
            </Text>
         </View>
         <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.navigate('Home')}>
               <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveReminder}>
               <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
         </View>
      </View>
   );
};

const styles = StyleSheet.create({
   container: {
      padding: 15,
      paddingTop: 40,
      backgroundColor: '#000000',
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
   label: {
      fontSize: 18,
      color: '#ffffff',
      marginBottom: 10,
   },
   input: {
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
      padding: 10,
      backgroundColor: '#333333',
      borderRadius: 5,
      color: '#ffffff',
   },
   pickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 10,
      height:180,
   },
   pickerWrapper: {
      flex: 1,
      alignItems: 'center',
   },
   picker: {
      width: 100,
      backgroundColor: '#000000',
   },
   tabs: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 0,
      marginBottom: 20,
   },
   tab: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: '#333333',
      borderRadius: 5,
   },
   selectedTab: {
      backgroundColor: '#1e90ff',
   },
   tabText: {
      color: '#ffffff',
      fontWeight: 'bold',
   },
   tabContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
   },
   tabContentText: {
      color: '#ffffff',
      fontSize: 16,
   },
   dateContainer: {
      alignItems: 'center',
   },
   dateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
   },
   dateText: {
      fontSize: 20,
      color: '#ffffff',
      width: 232,
      textAlign: 'center',
   },
   calendarIcon: {
      marginLeft: 10,
   },
   nextYearText: {
      fontSize: 12,
      color: 'red',
      marginTop: 3,
   },
   weekdaysContainer: {
      alignItems: 'center',  // Ensures items are centered vertically
      width: '100%',
   },
   weekdayButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',  // Ensure the buttons take up full width
  },
   weekday: {
      padding: 7,
      paddingTop: 5,
      paddingBottom: 6,
      margin: 1,
      marginTop: 0,
      borderRadius: 10,
      borderColor: 'rgba(0, 0, 0, 0)',
      borderWidth: 1,
   },
   selectedWeekday: {
      borderColor: '#ffffff',
      borderWidth: 1,
   },
   weekdayText: {
      color: '#888888',
      fontSize: 16,
   },
   weekdayTextSelected: {
      color: '#ffffff',
   },
   noDaysSelectedText: {
      fontSize: 12,
      color: 'red',
      marginTop: 3,
      textAlign: 'center',
      width: '100%', // Ensures the text takes up the full width
   },
   monthlyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
   },
   yearlyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
   },
   modalSelector: {
      flex: 1,
      marginLeft: 10,
      marginRight: 10,
   },
   selectorStyle: {
      backgroundColor: '#333333',
      borderColor: '#555555',
      height: 32,
      width: 60,
      paddingVertical: 3,
   },
   selectorTextStyle: {
      color: '#ffffff',
   },
   optionContainer: {
      margin: 100,
   },
   infoIcon: {
      marginLeft: 10,
   },
   toggleWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 15,
   },
   toggleLabel: {
      color: '#ffffff',
      fontSize: 16,
      marginLeft: 10,
      paddingTop: 10,
   },
   switchStyle: {
      marginRight: 10,
   },
   buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
   },
   saveButton: {
      alignItems: 'center',
      flex: 1,
      padding: 2,
      marginLeft: 15,
      marginRight: 30,
      marginBottom: 10,
   },
   cancelButton: {
      alignItems: 'center',
      flex: 1,
      padding: 2,
      marginLeft: 30,
      marginRight: 15,
      marginBottom: 10,
   },
   saveButtonText: {
      color: '#ffffff',
      textDecorationLine: 'underline',
      fontSize: 20,
   },
   cancelButtonText: {
      color: '#ffffff',
      textDecorationLine: 'underline',
      fontSize: 20,
   },
   debugButton: {
      alignItems: 'center',
      padding: 10,
      marginBottom: 10,
      backgroundColor: '#555555', // A different color to distinguish the button
      borderRadius: 5,
   },
   debugButtonText: {
      color: '#ffffff',
      fontSize: 16,
   },
   testButton: {
      alignItems: 'center',
      padding: 10,
      backgroundColor: '#1e90ff',
      borderRadius: 5,
      marginBottom: 15, // Adjust margin as needed
   },
   testButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
   },
});

export default RemindScreen;
