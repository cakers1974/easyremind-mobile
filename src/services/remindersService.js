// src/services/remindersService.js

import * as Notifications from 'expo-notifications';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventEmitter from 'events';
import { registerBackgroundTask } from './backgroundTasks';
import { parseReminderDates, updateReminderTrigger } from './reminderUtils';  // Import utility functions from reminderUtils

const STORAGE_KEY = 'reminders';

export const eventEmitter = new EventEmitter();


export const remindersService = {
   // Save a reminder and schedule a notification
   saveReminder: async (reminder) => {
      let r = { ...reminder };

      // reset any existing triggers since we may be updating an existing reminder
      r.lastTriggerDate = r.nextTriggerDate = r.lastAcknowledged = r.prevReminderDate = r.nextReminderDate = null;

      // set the next trigger date
      updateReminderTrigger(r);

      if (!r.nextTriggerDate || r.nextTriggerDate <= new Date()) {
         throw new Error('Unable to determine the next trigger date, or next trigger date was in the past. Reminder not saved.');
      }

      // If the reminder has an existing notification identifier, dismiss the existing notification
      if (r.notificationId) {
         await Notifications.dismissNotificationAsync(r.notificationId);
      }

      // Schedule a notification for the next trigger date and add the identifier to the reminder
      r.notificationId = await Notifications.scheduleNotificationAsync({
         content: {
            title: 'Reminder',
            body: r.title,
         },
         trigger: r.nextTriggerDate,
      });

      console.log('saveReminder scheduled notification for ', r.title, ' for ', r.nextTriggerDate?.toLocaleString());

      // update remaining variables
      r.id = r.id || uuid.v4(); // Generate a new ID if not provided
      r.lastTriggerDate = r.nextTriggerDate;
      r.enabled = true;  // we always enable a reminder that's new or was updated

      // Retrieve existing reminders from storage
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      // Update the reminders array, removing any old version of this reminder
      const updatedReminders = reminders.filter(item => item.id !== r.id).concat(r);

      // Save the updated reminders array back to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));

      // Emit an update event to notify listeners of the change
      const parsedReminders = updatedReminders.map(parseReminderDates);
      eventEmitter.emit('update', parsedReminders);

      registerBackgroundTask();
   },


   // Toggle one or multiple reminders on or off
   toggleReminders: async (ids, enabled) => {
      if (!Array.isArray(ids)) {
         ids = [ids];
      }

      const now = new Date();

      // Retrieve existing reminders from storage
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];

      // Update the reminders in parallel. Must be inside Promise.all because map is calling an asynchronous function
      const updatedReminders = await Promise.all(
         reminders.map(async (reminder) => {
            reminder = parseReminderDates(reminder);  // Parse dates before processing
            if (ids.includes(reminder.id)) {
               if (enabled && !reminder.enabled) {
                  // If enabling and nextReminderDate is in the past, update for 'One-time' periodicity
                  if (reminder.periodicity === 'One-time' && reminder.nextReminderDate < now) {
                     reminder.date = new Date(reminder.date);
                     reminder.date.setDate(reminder.date.getDate() + 1); // Move to the next day
                  }

                  reminder.enabled = true;

                  // Schedule the notification only if enabling a previously disabled reminder
                  updateReminderTrigger(reminder);
                  if (reminder.nextTriggerDate) {
                     reminder.notificationId = await Notifications.scheduleNotificationAsync({
                        content: {
                           title: 'Reminder',
                           body: reminder.title,
                        },
                        trigger: reminder.nextTriggerDate,
                     });

                     reminder.lastTriggerDate = reminder.nextTriggerDate;
                     reminder.enabled = true;
                  }
               } else if (!enabled && reminder.enabled) {
                  // Cancel the existing notification if disabling the reminder
                  const identifier = reminder.notificationId;
                  if (identifier) {
                     await Notifications.cancelScheduledNotificationAsync(identifier);
                  }

                  reminder.enabled = false;
                  reminder.notificationId = null;
               }
            }

            return reminder;
         })
      );

      registerBackgroundTask();

      // Save the updated reminders array back to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));
      // Emit an update event to notify listeners of the change
      eventEmitter.emit('update', updatedReminders);
   },


   // Load all reminders from storage
   getReminders: async () => {
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      // Parse dates in all reminders
      const parsedReminders = reminders.map(parseReminderDates);
      return parsedReminders;
   },


   // Delete a reminder
   deleteReminder: async (ids, actionId) => {
      if (!Array.isArray(ids)) {
         ids = [ids];
      }

      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];

      const updatedReminders = reminders.map(reminder => {
         reminder = parseReminderDates(reminder);  // Parse dates before processing
         if (ids.includes(reminder.id)) {
            if (reminder.notificationId) {
               Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
            }
            reminder.deletedActionId = actionId;
         }

         return reminder;
      });

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));
      eventEmitter.emit('update', updatedReminders);

      registerBackgroundTask();
   },


   // Cleanup deleted reminders from storage
   cleanupDeletedReminders: async () => {
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      const cleanedReminders = reminders.filter(r => !r.deletedActionId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedReminders));

      const parsedReminders = cleanedReminders.map(parseReminderDates);
      eventEmitter.emit('update', parsedReminders);
   },


   // Undo the deletion of reminders
   undoDeletion: async (lastDeletedActionId) => {
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];

      // Map through reminders and create a list of promises
      const updatedReminders = await Promise.all(
         reminders.map(async (reminder) => {
            reminder = parseReminderDates(reminder);  // Parse dates before processing
            if (reminder.deletedActionId === lastDeletedActionId) {
               reminder.deletedActionId = null;

               if (reminder.enabled) {
                  // If the reminder is enabled, reschedule the notification
                  updateReminderTrigger(reminder);
                  if (reminder.nextTriggerDate && reminder.nextTriggerDate > new Date()) {
                     reminder.notificationId = await Notifications.scheduleNotificationAsync({
                        content: {
                           title: 'Reminder',
                           body: reminder.title,
                        },
                        trigger: reminder.nextTriggerDate,
                     });

                     reminder.lastTriggerDate = reminder.nextTriggerDate;
                  }
               }
            }

            return reminder;
         })
      );

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));
      eventEmitter.emit('update', updatedReminders);

      registerBackgroundTask();
   },


   toggleOutdatedRemindersOff: async () => {
      const now = new Date();

      // Retrieve existing reminders from storage
      let reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];

      // Flag to check if any reminder was changed
      let hasChanges = false;

      // Update reminders where enabled is true and nextTriggerDate is null
      reminders = reminders.map(reminder => {
         parseReminderDates(reminder);
         if (reminder.enabled && reminder.periodicity === 'One-time' && (reminder.nextReminderDate === null || reminder.nextReminderDate < now)) {
            reminder.enabled = false;
            hasChanges = true;
         }
         return reminder;
      });

      // Only save and emit update if changes were made
      if (hasChanges) {
         await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
         eventEmitter.emit('update', reminders);
      }
   },


   serializeReminder: (r) => {
      return {
         ...r,
         date: r.date ? r.date.toISOString() : null,
         nextReminderDate: r.nextReminderDate ? r.nextReminderDate.toISOString() : null,
         prevReminderDate: r.prevReminderDate ? r.prevReminderDate.toISOString() : null,
         lastAcknowledged: r.lastAcknowledged ? r.lastAcknowledged.toISOString() : null,
         nextTriggerDate: r.nextTriggerDate ? r.nextTriggerDate.toISOString() : null,
         lastTriggerDate: r.lastTriggerDate ? r.lastTriggerDate.toISOString() : null,
      };
   },


   deserializeReminder: (r) => {
      return {
         ...r,
         date: r.date ? new Date(r.date) : null,
         nextReminderDate: r.nextReminderDate ? new Date(r.nextReminderDate) : null,
         prevReminderDate: r.prevReminderDate ? new Date(r.prevReminderDate) : null,
         lastAcknowledged: r.lastAcknowledged ? new Date(r.lastAcknowledged) : null,
         nextTriggerDate: r.nextTriggerDate ? new Date(r.nextTriggerDate) : null,
         lastTriggerDate: r.lastTriggerDate ? new Date(r.lastTriggerDate) : null,
      };
   },


   cancelAllNotifications: async () => {
      try {
         await Notifications.cancelAllScheduledNotificationsAsync();
         console.log('All scheduled notifications have been canceled.');
      } catch (error) {
         console.error('Failed to cancel all notifications:', error);
      }
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
