// src/services/reminderUtils.js
import { addMinutes, set, addMonths, addYears, getDaysInMonth, differenceInMinutes } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';


// Utility function to parse string dates back to Date objects in a reminder
export function parseReminderDates(reminder) {
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
export function updateReminderTrigger(reminder, currentDate) {

   // store existing values in separate object
   let {
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
      lastTriggerDate,
      enabled,
   } = reminder;

   console.log('Called updateReminderTrigger() on reminder ', reminder.title);
   console.log('nextReminderDate:  ', nextReminderDate?.toLocaleString());
   console.log('prevReminderDate:  ', prevReminderDate?.toLocaleString());
   console.log('lastTriggerDate:  ', lastTriggerDate?.toLocaleString());

   const now = currentDate || new Date();

   // if the next reminder date was reached
   if (nextReminderDate && nextReminderDate <= now) {
      // store it as the previous reminder
      prevReminderDate = reminder.prevReminderDate = nextReminderDate;
      console.log('set prevReminderDate = nextReminderDate as ', nextReminderDate?.toLocaleString());
   }

   if (!nextReminderDate || (enabled && nextReminderDate <= now)) {
      console.log('!reminder.nextReminderDate || reminder.nextReminderDate <= now');

      // Determine nextReminderDate based on periodicity
      switch (periodicity) {
         case 'One-time':
            // while this should be a future date, it is not guaranteed with 'one-time' periodicity      
            nextReminderDate = new Date(date.getTime());
            nextReminderDate.setHours(hour, minute, 0, 0); 
            break;

         case 'Weekdays':
            nextReminderDate = getNextWeekdayTrigger(now, weekdays, hour, minute);
            break;

         case 'Monthly':
            nextReminderDate = new Date(now.getFullYear(), now.getMonth(), Math.min(day, getDaysInMonth(now)), hour, minute);
            if (nextReminderDate <= now) {
               nextReminderDate = addMonths(nextReminderDate, 1);
            }
            break;

         case 'Yearly':
            nextReminderDate = new Date(now.getFullYear(), month, day, hour, minute);
            if (nextReminderDate <= now) {
               nextReminderDate = addYears(nextReminderDate, 1);
            }
            break;
      }

      reminder.nextReminderDate = nextReminderDate;

      console.log('newReminderDate:  ', nextReminderDate?.toLocaleString());
   }

   if( !enabled ) {
      console.log('Reminder is disabled.  Setting nextTriggerDate to null');
      reminder.nextTriggerDate = null;
      return;
   }

   // if there is no previous reminder date or continuous alerts for this reminder is not on
   if( !prevReminderDate || !continuousAlert ) {
      reminder.nextTriggerDate = nextReminderDate > now ? nextReminderDate : null;
      console.log( 'there is no previous reminder date or continuous alerts for this reminder is not on.  Setting nextTriggerDate: ', reminder.nextTriggerDate?.toLocaleString());
      return;
   }

   // Handle continuous alerts every 5 minutes and determine nextTriggerDate.
   // Continuous alerts are limited to 6 alerts in 30 minutes, but we calculate
   // up to 34 minutes to account for background tasks possibly being delayed.
   // 
   // Because lastAcknowledged may be initialized for a reminder invocation that
   // preceeded prevReminderDate, the test, lastAcknowledged < prevReminderDate,
   // will confirm if it does not pertain to the latest prevReminderDate.

   // If the reminder was previously invoked not more than 34 minutes ago and the user has not yet acknowledged the reminder
   if (differenceInMinutes(now, prevReminderDate) <= 34 && (!lastAcknowledged || lastAcknowledged < prevReminderDate)) {
      console.log('checking continuous alert');

      // if the last trigger date pertains to the previous reminder and was invoked less than 30 minutes after the reminder
      if (lastTriggerDate >= prevReminderDate && differenceInMinutes(lastTriggerDate, prevReminderDate) < 30) {
         console.log('the last trigger date pertains to the previous reminder and was invoked less than 30 minutes after the reminder');

         // assure that the next trigger is at least 5 minutes after the last notification
         let nextTriggerDate = addMinutes(lastTriggerDate, 5);

         console.log('added 5 minutes to lastTriggerDate');

         // assure that it's in the future
         if (nextTriggerDate <= now) {
            nextTriggerDate = addMinutes(now, 1);
         }

         reminder.nextTriggerDate = nextTriggerDate;

         console.log('assigned nextTriggerDate to be 5 minutes after lastTriggerDate');
      } else {
         // no more continuous alerts are due, move to the nextReminderDate only if it's been updated above to be in the future
         reminder.nextTriggerDate = nextReminderDate > now ? nextReminderDate : null;

         console.log('Continuous alert check showed no alerts.  Set nextTriggerDate to nextReminderDate or null if not in the future');
      }
   } else {
      // no more continuous alerts are due, move to the nextReminderDate only if it's been updated above to be in the future
      reminder.nextTriggerDate = nextReminderDate > now ? nextReminderDate : null;

      console.log('No continuous alerts, set nextTriggerDate to nextReminderDate or null if not in the future');
   }
}



// Utility function for determining the next weekday trigger date
export function getNextWeekdayTrigger(baseDate, weekdays, hour, minute) {
   const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
   let nextDate = new Date(baseDate);
   for (let i = 0; i < 8; i++) {
      const dayName = daysOfWeek[nextDate.getDay()];
      if (weekdays.includes(dayName)) {
         const potentialTrigger = set(nextDate, { hours: hour, minutes: minute });
         if (potentialTrigger > baseDate) {
            return potentialTrigger;
         }
      }
      nextDate.setDate(nextDate.getDate() + 1);
   }
   return null;
}


// Send notifications for triggers that have been reached
export async function executeTriggers(currentTime) {
   const now = currentTime;

   let reminders = JSON.parse(await AsyncStorage.getItem('reminders')) || [];

   // Filter reminders that are enabled and serialize their trigger dates
   const notifications = reminders.filter(reminder => !reminder.deletedActionId)  // filter for enabled and not deleted
      .map(parseReminderDates)  // next serialize the dates in to javascript date objects
      .filter(r => r.nextTriggerDate < now);  // filter where the nextTriggerDate has been reached

   // Iterate through the reminders
   for (const reminder of notifications) {
      // if a notification was not already scheduled for this trigger date
      if (reminder.lastTriggerDate < reminder.nextTriggerDate) {

         console.log('executeTriggers() scheduled reminder for ', reminder.title, ' when lastTriggerDate was ', reminder.lastTriggerDate?.toLocaleString(), ' and nextTriggerDate was ', reminder.nextTriggerDate?.toLocaleString());

         // Dismiss any existing notification
         if (reminder.notificationId) {
            await Notifications.dismissNotificationAsync(reminder.notificationId);
         }

         // Push the notification for the reminder
         reminder.notificationId = await Notifications.scheduleNotificationAsync({
            identifier: reminder.notificationId || null, // Use the same identifier if available
            content: {
               title: 'Reminder',
               body: reminder.title,
            },
            trigger: null, // Trigger immediately
         });

         // Update the last trigger date
         reminder.lastTriggerDate = now;
      }

      // Set the next trigger
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

   console.log('executeTriggers() returned the nextTriggerDate as ', earliestNextTriggerDate?.toLocaleString());

   return earliestNextTriggerDate;
};



