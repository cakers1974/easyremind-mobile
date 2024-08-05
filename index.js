import React, { useEffect } from 'react';
import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import App from './App';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

registerRootComponent(App);