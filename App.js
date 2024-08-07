import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import RemindScreen from './src/screens/RemindScreen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert } from 'react-native'; // Add this import

const Stack = createStackNavigator();

export default function App() {
   useEffect(() => {
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
