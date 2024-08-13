import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import ScrollPicker from 'react-native-wheel-scrollview-picker';

const AppTest = () => {
   const [selectedHour, setSelectedHour] = useState('12');
   const [selectedMinute, setSelectedMinute] = useState('00');

   const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
   const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

   return (
      <SafeAreaView style={styles.container}>
         <Text style={styles.title}>Select Time</Text>
         <View style={styles.pickerContainer}>

            <ScrollPicker
               dataSource={hours}
               selectedIndex={selectedHour}
               onValueChange={(data, selectedIndex) => {
                  setSelectedHour(data);
               }}
               wrapperHeight={180}
               wrapperBackground="#0000"
               itemHeight={60}
               highlightColor="#888"
               highlightBorderWidth={2}
               activeItemTextStyle={{ color: '#fff', fontSize: 28 }}
               itemTextStyle={{ color: '#777', fontSize: 20 }}
            />
            
            <Text style={{ color: '#fff', fontSize: 50 }}>:</Text>


            <ScrollPicker
               dataSource={minutes}
               selectedIndex={1}

               onValueChange={(data, selectedIndex) => {
                  setSelectedMinute(data);
               }}
               wrapperHeight={180}
               wrapperBackground="#FFFFFF"
               itemHeight={60}
               highlightColor="#d8d8d8"
               highlightBorderWidth={2}
            />
         </View>
         <Text style={styles.selectedTime}>
            Selected Time: {selectedHour}:{selectedMinute}
         </Text>
      </SafeAreaView>
   );
};

const styles = StyleSheet.create({
   container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000000',
   },
   title: {
      fontSize: 24,
      marginBottom: 20,
   },
   pickerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
   },
   picker: {
      width: 100,
      height: 150,
   },
   separator: {
      fontSize: 24,
      marginHorizontal: 10,
   },
   selectedTime: {
      color: '#ffffff',
      marginTop: 20,
      fontSize: 20,
   },
});

export default App;
