import * as Notifications from 'expo-notifications';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventEmitter from 'events';
import { addMinutes, set, addMonths, addYears, getDaysInMonth, differenceInMinutes } from 'date-fns';

const STORAGE_KEY = 'reminders';
export const eventEmitter = new EventEmitter();

export const remindersService = {
   // Save a reminder and schedule a notification
   saveReminder: async (reminder) => {
      // If the reminder has an existing notification identifier, dismiss the existing notification
      if (reminder.notificationId) {
         await Notifications.dismissNotificationAsync(reminder.notificationId);
      }

      // set the next trigger date
      updateReminderTrigger(reminder);

      if (!reminder.nextTriggerDate) {
         throw new Error('Unable to determine the next trigger date. Reminder not saved.');
      }

      // Schedule a notification for the next trigger date and add the identifier to the reminder
      reminder.notificationId = await Notifications.scheduleNotificationAsync({
         content: {
            title: 'Reminder',
            body: reminder.title,
         },
         trigger: reminder.nextTriggerDate,
      });

      // update remaining variables
      reminder.id = reminder.id || uuid.v4(); // Generate a new ID if not provided
      reminder.enabled = true;  // we always enable a reminder that's new or was updated

      // Retrieve existing reminders from storage
      const reminders = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)) || [];
      // Update the reminders array, removing any old version of this reminder
      const updatedReminders = reminders.filter(r => r.id !== reminder.id).concat(reminder);

      // Save the updated reminders array back to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));

      // Emit an update event to notify listeners of the change
      const parsedReminders = updatedReminders.map(parseReminderDates);
      eventEmitter.emit('update', parsedReminders);
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
   
      // Save the updated reminders array back to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));
      // Emit an update event to notify listeners of the change
      eventEmitter.emit('update', updatedReminders);
   },
   


   canToggleOn: (reminder) => {
      const r = { ...reminder };
      updateReminderTrigger(r);
      return r.nextReminderDate !== null;
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
                  if (reminder.nextTriggerDate) {
                     reminder.notificationId = await Notifications.scheduleNotificationAsync({
                        content: {
                           title: 'Reminder',
                           body: reminder.title,
                        },
                        trigger: reminder.nextTriggerDate,
                     });
                  }
               }
            }

            return reminder;
         })
      );

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders));
      eventEmitter.emit('update', updatedReminders);
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
         if (reminder.enabled && (reminder.nextTriggerDate === null || reminder.nextTriggerDate < now)) {
            reminder.enabled = false;
            hasChanges = true;
         }
         return reminder;
      });
   
      console.log( 'toggleOutdatedRemindersOff hasChanges:  ' + (hasChanges ? 'true' : 'false'));

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


   executeTriggers: async (currentTime) => {
      const now = currentTime;

      let reminders = JSON.parse(await AsyncStorage.getItem('reminders')) || [];

      // Filter reminders that are enabled and serialize their trigger dates
      const notifications = reminders.filter(reminder => reminder.enabled && !reminder.deletedActionId)  // first filter enabled and not deleted
         .map(parseReminderDates)  // next serialize the dates in to javascript date objects
         .filter(r => r.nextTriggerDate < now);  // filter where the nextTriggerDate has been reached 

      // Iterate through the reminders
      for (const reminder of notifications) {
         // Dismiss the existing notification if identifier is present
         if (reminder.notificationId) {
            await Notifications.dismissNotificationAsync(reminder.notificationId);
         }

         // Push the notification for the reminder
         let identifier = await Notifications.scheduleNotificationAsync({
            identifier: reminder.notificationId || null, // Use the same identifer if available
            content: {
               title: 'Reminder',
               body: reminder.title,
            },
            trigger: null, // Trigger immediately
         });

         // Update the reminder with the new identifier
         reminder.notificationId = identifier;

         // Update the trigger
         reminder.lastTriggerDate = now;

         // set the next trigger
         updateReminderTrigger(reminder);

         // Update the reminder in the original array
         reminders = reminders.map(r => r.id === reminder.id ? reminder : r);
      }

      // Save updated reminders back to AsyncStorage
      await AsyncStorage.setItem('reminders', JSON.stringify(reminders));

      // Find the earliest future nextTriggerDate across all reminders
      let earliestNextTriggerDate = null;
      reminders.forEach(reminder => {
         if (reminder.nextTriggerDate && reminder.nextTriggerDate > now) {
            if (!earliestNextTriggerDate || reminder.nextTriggerDate < earliestNextTriggerDate) {
               earliestNextTriggerDate = reminder.nextTriggerDate;
            }
         }
      });

      return earliestNextTriggerDate;
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


// Utility function to parse string dates back to Date objects in a reminder
function parseReminderDates(reminder) {
   if (reminder.date) reminder.date = new Date(reminder.date);
   if (reminder.nextReminderDate) reminder.nextReminderDate = new Date(reminder.nextReminderDate);
   if (reminder.prevReminderDate) reminder.prevReminderDate = new Date(reminder.prevReminderDate);
   if (reminder.lastAcknowledged) reminder.lastAcknowledged = new Date(reminder.lastAcknowledged);
   if (reminder.nextTriggerDate) reminder.nextTriggerDate = new Date(reminder.nextTriggerDate);
   if (reminder.lastTriggerDate) reminder.lastTriggerDate = new Date(reminder.lastTriggerDate);
   return reminder;
}


// Updates the reminder by setting nextReminderDate, prevReminderDate, and nextTriggerDate
// based on date, month, day, hour, minute, periodicity, continousAlert, and lastAcknowledged.
// reminder = the reminder to be updated.  Function directly updates the reminder instance.
// currentDate = (optional) the date to be referenced as the current date and time.
function updateReminderTrigger(reminder, currentDate) {
   const {
      date,
      month,  // Zero-based month: January = 0, February = 1, etc.
      day,
      hour,
      minute,
      weekdays,
      periodicity,
      nextReminderDate,
      prevReminderDate,
      lastAcknowledged,
      continuousAlert,
      lastTriggerDate
   } = reminder;

   const now = currentDate || new Date();

   /*
   console.log(`



      CurrentDateTime: ${now.toLocaleString()}

      getNextTriggerDate...
      Date: ${date?.toLocaleString()}
      Month: ${month}
      Day: ${day}
      Hour: ${hour}
      Minute: ${minute}
      Weekdays: ${weekdays}
      Periodicity: ${periodicity}
      Last Acknowledged: ${lastAcknowledged}
      Continuous Alert: ${continuousAlert}
      Last Trigger Date: ${lastTriggerDate}

    `);
   */


   // if the next reminder date was reached
   if (nextReminderDate && nextReminderDate <= now) {
      // store it as the previous reminder
      reminder.prevReminderDate = nextReminderDate;
   }

   if (!reminder.nextReminderDate || reminder.nextReminderDate <= now) {
      // Determine nextReminderDate based on periodicity
      let newReminderDate = null;

      switch (periodicity) {
         case 'One-time':
            newReminderDate = date.setHours(hour, minute, 0, 0);
            break;

         case 'Weekdays':
            newReminderDate = getNextWeekdayTrigger(now, weekdays, hour, minute);
            break;

         case 'Monthly':
            newReminderDate = new Date(now.getFullYear(), now.getMonth(), Math.min(day, getDaysInMonth(now)), hour, minute);
            if (newReminderDate <= now) {
               newReminderDate = addMonths(newReminderDate, 1);
            }
            break;

         case 'Yearly':
            newReminderDate = new Date(now.getFullYear(), month, day, hour, minute);
            if (newReminderDate <= now) {
               newReminderDate = addYears(newReminderDate, 1);
            }
            break;
      }

      reminder.nextReminderDate = newReminderDate;
   }

   // Handle continuous alerts every 5 minutes and determine nextTriggerDate.
   // Continuous alerts are limited to 6 alerts in 30 minutes, but we calculate
   // up to 34 minutes to account for background tasks being delayed.
   // 
   // The conditions reads:  "If continuous alerts is on and a reminder was
   //    previously invoked not more than 34 minutes ago and the user has not
   //    yet acknowledged the reminder"
   //
   // Because lastAcknowledged may be initialized for a reminder invocation that
   // preceeded prevReminderDate, the test, lastAcknowledged < prevReminderDate,
   // will confirm that it does not pertain to the latest prevReminderDate.
   if (continuousAlert && lastTriggerDate && prevReminderDate && differenceInMinutes(now, prevReminderDate) <= 34 && (!lastAcknowledged || lastAcknowledged < prevReminderDate)) {
      console.log('checkking continuous alert');
      // if the last trigger date pertains to the previous reminder and was invoked less than 30 minutes after the reminder
      if (lastTriggerDate >= prevReminderDate && differenceInMinutes(lastTriggerDate, prevReminderDate) < 30) {
         // assure that the next continue trigger is at least 5 minutes after the last invocation
         let nextTriggerDate = addMinutes(lastTriggerDate, 5);

         // assure that it's in the future
         if (nextTriggerDate <= now) {
            nextTriggerDate = addMinutes(now, 1);
         }

         console.log('nextTriggerDate from continuous alert:');
         console.log(nextTriggerDate);
         reminder.nextTriggerDate = nextTriggerDate;
      } else {
         // no more continuous alerts are due, move to the nextReminderDate
         reminder.nextTriggerDate = reminder.nextReminderDate;
      }
   } else {
      // No continuous alerts, set nextTriggerDate to nextReminderDate
      reminder.nextTriggerDate = reminder.nextReminderDate;
   }
}


// Utility function
// baseDate = the next trigger must be after this date (typically the current date)
// weekdays = array of days of the week that the reminder is set
// hour, minute = the hour and minute the user set for the reminder
function getNextWeekdayTrigger(baseDate, weekdays, hour, minute) {
   const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
   let nextDate = new Date(baseDate);

   for (let i = 0; i < 8; i++) {
      const dayName = daysOfWeek[nextDate.getDay()];

      // Check if today is a valid weekday
      if (weekdays.includes(dayName)) {
         // nextDate will start out as baseDate and increase by one day with each loop
         const potentialTrigger = set(nextDate, { hours: hour, minutes: minute });

         // Return this trigger time if it hasn't passed yet
         if (potentialTrigger > baseDate) {
            return potentialTrigger;
         }
      }

      // Move to the next day if today's trigger time has passed
      nextDate.setDate(nextDate.getDate() + 1);
   }

   return null;
}
