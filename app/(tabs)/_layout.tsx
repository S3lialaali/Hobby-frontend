import { View, Text } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'

const _layout = () => {
  return (
    <Tabs>
      <Tabs.Screen 
      name="index" 
      options={{ 
        headerShown: false }} 
        />
      <Tabs.Screen
       name="search" 
       options={{ headerShown: false }} />

      <Tabs.Screen
       name="booking"
       options={{ headerShown: false }} />
       
      <Tabs.Screen
       name="profile"
       options={{ headerShown: false }} />
    </Tabs>
  )
}

export default _layout