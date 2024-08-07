import * as Notifications from 'expo-notifications';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventEmitter from 'events';

const STORAGE_KEY = 'reminders';
export const eventEmitter = new EventEmitter();

export const remindersService = {
   // Save a reminder and schedule a notification
   saveReminder: async (reminder) => {
      const date = new Date(reminder.date);

      // Schedule a notification
      const notificationId = await Notifications.scheduleNotificationAsync({
         content: {
            title: 'Reminder',
            body: reminder.title,
         },
         trigger: date,
      });

      // Create a new reminder object, generating an ID if necessary
      const newReminder = {
         ...reminder,
         id: reminder.id || uuid.v4(), // Generate a new ID if not provided
         notificationId,
         enabled: true, // By default, reminders are enabled when created
      };

      // Retrieve existing reminders from storage
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      // Update the reminders array, removing any old version of this reminder
      const updatedReminders = reminders.filter(r => r.id !== newReminder.id).concat(newReminder);
      // Save the updated reminders array back to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));

      // Emit an update event to notify listeners of the change
      eventEmitter.emit('update', updatedReminders);
   },

   // Toggle a reminder on or off
   toggleReminder: async (id, enabled) => {
      // Retrieve existing reminders from storage
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      // Find the reminder to toggle
      const reminder = reminders.find(r => r.id === id);

      if (enabled) {
         // Schedule the notification again if enabling the reminder
         const trigger = new Date(reminder.date);
         const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
               title: 'Reminder',
               body: reminder.title,
            },
            trigger,
         });
         // Create an updated reminder object with the new notification ID
         const updatedReminder = { ...reminder, notificationId, enabled };
         // Update the reminders array
         const updatedReminders = reminders.map(r => r.id === id ? updatedReminder : r);
         // Save the updated reminders array back to storage
         await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));
         // Emit an update event to notify listeners of the change
         eventEmitter.emit('update', updatedReminders);
      } else {
         // Cancel the existing notification if disabling the reminder
         const identifier = reminder.notificationId;
         if (identifier) {
            await Notifications.cancelScheduledNotificationAsync(identifier);
         }
         // Create an updated reminder object without the notification ID
         const updatedReminder = { ...reminder, notificationId: null, enabled };
         // Update the reminders array
         const updatedReminders = reminders.map(r => r.id === id ? updatedReminder : r);
         // Save the updated reminders array back to storage
         await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));
         // Emit an update event to notify listeners of the change
         eventEmitter.emit('update', updatedReminders);
      }
   },

   // Toggle multiple reminders on or off
   toggleMultipleReminders: async (ids, enabled) => {
      // Retrieve existing reminders from storage
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      // Update the reminders in parallel
      const updatedReminders = await Promise.all(
         reminders.map(async (reminder) => {
            if (ids.includes(reminder.id)) {
               if (enabled) {
                  // Schedule the notification again if enabling the reminder
                  const trigger = new Date(reminder.date);
                  const notificationId = await Notifications.scheduleNotificationAsync({
                     content: {
                        title: 'Reminder',
                        body: reminder.title,
                     },
                     trigger,
                  });
                  return { ...reminder, notificationId, enabled };
               } else {
                  // Cancel the existing notification if disabling the reminder
                  const identifier = reminder.notificationId;
                  if (identifier) {
                     await Notifications.cancelScheduledNotificationAsync(identifier);
                  }
                  return { ...reminder, enabled, notificationId: null };
               }
            }
            return reminder;
         })
      );
      // Save the updated reminders array back to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));
      // Emit an update event to notify listeners of the change
      eventEmitter.emit('update', updatedReminders);
   },

   // Load all reminders from storage
   loadReminders: async () => {
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      // Emit an update event to notify listeners of the current reminders
      eventEmitter.emit('update', reminders);
      return reminders;
   },

   // Delete a reminder
   deleteReminder: async (ids, actionId) => {
      if (!Array.isArray(ids)) {
         ids = [ids];
      }
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      const updatedReminders = reminders.map(reminder => {
         if (ids.includes(reminder.id)) {
            if (reminder.notificationId) {
               Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
            }
            return { ...reminder, deletedActionId: actionId };
         }
         return reminder;
      });
   
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));
      eventEmitter.emit('update', updatedReminders);
   },

   // Cleanup deleted reminders from storage
   cleanupDeletedReminders: async () => {
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      const cleanedReminders = reminders.filter(r => !r.deletedActionId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedReminders));
      eventEmitter.emit('update', cleanedReminders);
   },

   // Undo the deletion of reminders
   undoDeletion: async (lastDeletedActionId) => {
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      const updatedReminders = reminders.map(r => {
         if (r.deletedActionId === lastDeletedActionId) {
            return { ...r, deletedActionId: null };
         }
         return r;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));
      eventEmitter.emit('update', updatedReminders);
   },

   // Register an event listener for reminders updates
   onRemindersUpdate: (callback) => {
      eventEmitter.on('update', callback);
   },

   // Remove an event listener for reminders updates
   offRemindersUpdate: (callback) => {
      eventEmitter.off('update', callback);
   }
};
