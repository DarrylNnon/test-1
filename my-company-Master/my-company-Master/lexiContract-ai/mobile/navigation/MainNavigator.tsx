import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ContractsDashboardScreen from '../screens/ContractsDashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={ContractsDashboardScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}