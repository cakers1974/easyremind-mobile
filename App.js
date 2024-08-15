// App.js

import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import RemindScreen from './src/screens/RemindScreen';
import { remindersService } from './src/services/remindersService';
import { registerBackgroundTask } from './src/services/backgroundTasks';

const Stack = createStackNavigator();

export default function App() {
   
   console.log(`



      
      

      APPS START`);
      
   useEffect(() => {
      remindersService.cleanupDeletedReminders();

      // Request notification permissions when the app mounts
      const requestPermissions = async () => {
         if (Constants.isDevice) {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
               const { status: newStatus } = await Notifications.requestPermissionsAsync();
               if (newStatus !== 'granted') {
                  Alert.alert(
                     'Permissions Required',
                     'Please enable notifications permissions in your settings to receive reminders.',
                     [{ text: 'OK' }]
                  );
               }
            }
         }
      };
      requestPermissions();

      // Register the background fetch task
      registerBackgroundTask();

      //remindersService.cancelAllNotifications();

   }, []);

   return (
      <GestureHandlerRootView style={{ flex: 1 }}>
         <NavigationContainer theme={DarkTheme}>
            <Stack.Navigator initialRouteName="Home">
               <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
               <Stack.Screen name="Remind" component={RemindScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
         </NavigationContainer>
      </GestureHandlerRootView>
   );
}
