import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { executeTriggers } from './reminderUtils'; // Import from the new module

const BACKGROUND_FETCH_TASK = 'background-fetch-task';

/**
 * Define the background fetch task.
 * This task will be executed in the background when the next reminder is due.
 * It fetches reminders, filters due reminders, and schedules notifications for them.
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
   try {
      console.log('Performing background task.');

      // Register the background task to execute triggers
      await registerBackgroundTask();

      return BackgroundFetch.BackgroundFetchResult.NewData;
   } catch (error) {
      console.error('Background fetch failed:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
   }
});


/**
 * Registers the background fetch task to run at the appropriate time.
 * This function calculates the time until the next trigger date and sets
 * the background fetch task accordingly.
 */
export async function registerBackgroundTask() {
   const status = await BackgroundFetch.getStatusAsync();
   if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
      console.warn('Background fetch is not available');
      return;
   }

   // Execute triggers, returns the next future trigger date
   const now = new Date();
   const nextTriggerDate = await executeTriggers(now);

   // Remove any previous background fetch tasks if they exist
   const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
   if (isTaskRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('Previous background fetch task unregistered');
   }

   // Register the background fetch task if an earliest nextTriggerDate was found
   if (nextTriggerDate) {
      const interval = Math.floor((nextTriggerDate - now) / 1000); // Calculate interval in seconds
      console.log('Registering background task with next interval in seconds:', interval);

      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
         minimumInterval: interval, // Set the interval to the exact time of the next reminder
         stopOnTerminate: false,
         startOnBoot: true,
      });

      console.log(`Background task registered to run at: ${nextTriggerDate?.toLocaleString()}`);
   } else {
      console.log('No reminders with valid nextTriggerDate, background task not registered');
   }
}
