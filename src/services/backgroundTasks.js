import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { remindersService } from './remindersService';

const BACKGROUND_FETCH_TASK = 'background-fetch-task';

/**
 * Define the background fetch task
 * This task will be executed in the background when the next reminder is due
 * It fetches reminders, filters due reminders, and schedules notifications for them
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
   try {
      const now = new Date();

      // send notifications
      const nextTriggerDate = await remindersService.executeTriggers(now);

      // Unregister the current task
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('Background fetch task unregistered');

      // Schedule the next background fetch task based on the next reminder
      if (nextTriggerDate) {
         await registerBackgroundFetchAsync(nextTriggerDate, now);
      }

      return BackgroundFetch.BackgroundFetchResult.NewData;
   } catch (error) {
      console.error('Background fetch failed:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
   }
});


/**
 * Function to register the background fetch task
 * Checks if the background fetch is available and registers the task to run at the exact time of the next reminder trigger
 */
const registerBackgroundFetchAsync = async (nextTriggerDate, currentTime) => {
   const status = await BackgroundFetch.getStatusAsync();
   if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
      console.warn('Background fetch is not available');
      return;
   }

   // Remove any previous background fetch tasks
   const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
   if (isTaskRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('Previous background fetch task unregistered');
   }

   // Register the background fetch task to run at the exact time of the next reminder
   if (nextTriggerDate) {
      const interval = Math.floor((nextTriggerDate - currentTime) / 1000); // Calculate interval in seconds
      console.log('background task next interval in seconds:');
      console.log(interval);

      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
         minimumInterval: interval, // Set the interval to the exact time of the next reminder
         stopOnTerminate: false,
         startOnBoot: true,
      });
      console.log(`Background fetch task registered to run at: ${nextTriggerDate}`);
   } else {
      console.log('No nextReminderDate provided, background fetch task not registered');
   }
};


/**
 * Function to schedule the next background fetch task
 * It calculates the time until the next reminder and sets the interval accordingly
 */
export const startBackgroundTask = async () => {
   const now = new Date();

   // send notifications
   const nextTriggerDate = await remindersService.executeTriggers(now);

   console.log('startBackgroundTask nextTriggerDate:');
   console.log(nextTriggerDate);

   if (nextTriggerDate) {
      await registerBackgroundFetchAsync(nextTriggerDate, now);
   }
};

