import React, { createContext, useReducer, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RemindersContext = createContext();

const remindersReducer = (state, action) => {
  switch (action.type) {
    case 'SET_REMINDERS':
      return action.reminders;
    case 'ADD_REMINDER':
      return [...state, action.reminder];
    case 'EDIT_REMINDER':
      return state.map(reminder => reminder.id === action.reminder.id ? action.reminder : reminder);
    case 'DELETE_REMINDER':
      return state.filter(reminder => reminder.id !== action.date);
    default:
      return state;
  }
};

export const RemindersProvider = ({ children }) => {
  const [reminders, dispatch] = useReducer(remindersReducer, []);

  useEffect(() => {
    const loadReminders = async () => {
      const storedReminders = await AsyncStorage.getItem('reminders');
      if (storedReminders) {
        dispatch({ type: 'SET_REMINDERS', reminders: JSON.parse(storedReminders) });
      }
    };
    loadReminders();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('reminders', JSON.stringify(reminders));
  }, [reminders]);

  return (
    <RemindersContext.Provider value={{ reminders, dispatch }}>
      {children}
    </RemindersContext.Provider>
  );
};

export const useReminders = () => useContext(RemindersContext);
