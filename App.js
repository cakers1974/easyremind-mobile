import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import DayScreen from './src/screens/DayScreen';
import RemindScreen from './src/screens/RemindScreen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { RemindersProvider } from './src/context/RemindersContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


const Tab = createBottomTabNavigator();

const CustomNavigator = () => {
   return (
      <Tab.Navigator
         screenOptions={{
            tabBarStyle: {
               backgroundColor: '#333333',
               borderTopColor: '#333333',
            },
            tabBarActiveTintColor: '#ffffff',
            tabBarInactiveTintColor: '#888888',
         }}
      >
         <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
               headerShown: false,
               tabBarLabel: 'Home',
            }}
         />
         <Tab.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{
               headerShown: false,
               tabBarLabel: 'Calendar',
            }}
         />
         <Tab.Screen
            name="Day"
            component={DayScreen}
            options={{
               headerShown: false,
               tabBarLabel: 'Day',
            }}
         />
         <Tab.Screen
            name="Remind"
            component={RemindScreen}
            options={{
               headerShown: false,
               tabBarLabel: 'Remind',
            }}
         />
      </Tab.Navigator>
   );
};

export default function App() {
   useEffect(() => {
      if (Constants.isDevice) {
         Notifications.requestPermissionsAsync();
      }
   }, []);

   return (
      <GestureHandlerRootView style={{ flex: 1 }}>
         <RemindersProvider>
            <NavigationContainer theme={DarkTheme}>
               <CustomNavigator />
            </NavigationContainer>
         </RemindersProvider>
      </GestureHandlerRootView>
   );
}
