import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { WheelPicker } from 'react-native-ui-lib';

const SimpleWheelPickerTest = () => {
  const hours = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: (i + 1).toString() }));
  const minutes = Array.from({ length: 60 }, (_, i) => ({ value: i, label: i.toString().padStart(2, '0') }));

  const [selectedHour, setSelectedHour] = useState(hours[0].value);
  const [selectedMinute, setSelectedMinute] = useState(minutes[0].value);

  const handleHourChange = (value) => {
    setSelectedHour(value);
  };

  const handleMinuteChange = (value) => {
    setSelectedMinute(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hour</Text>
      <WheelPicker
        onChange={handleHourChange}
        initialValue={selectedHour}
        items={hours}
        numberOfVisibleRows={3}
        //style={styles.picker}
        //itemStyle={styles.pickerItem}
        //selectedItemStyle={styles.selectedPickerItem}
      />

      <Text style={styles.label}>Minute</Text>
      <WheelPicker
        onChange={handleMinuteChange}
        initialValue={selectedMinute}
        items={minutes}
        style={{width:100, backgroundColor:'#000000'}}
        activeTextColor={'#ffffff'}
        numberOfVisibleRows={3}
        inactiveTextColor={'#ffffff'}

      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#121212',
    flex: 1,
  },
  label: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 10,
  },
  picker: {
   backgroundColor:'#000',
    width: 100,
  },
  pickerItem: {
    fontSize: 18,
    color: '#888888',
  },
  selectedPickerItem: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  selectionText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ffffff',
  },
});

export default SimpleWheelPickerTest;
