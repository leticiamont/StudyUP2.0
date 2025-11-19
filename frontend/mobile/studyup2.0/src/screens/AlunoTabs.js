import React from 'react';
import { View } from 'react-native'; 
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import AlunoHome from './AlunoHome'; 
import AlunoConteudo from './AlunoConteudo';
import AlunoIde from './AlunoIde';
import AlunoForum from './AlunoForum';

const Tab = createBottomTabNavigator();

function getIconName(routeName) {
  if (routeName === 'Início') {
    return 'home';
  } else if (routeName === 'Conteúdo') {
    return 'book-open-variant';
  } else if (routeName === 'IDE') {
    return 'code-braces';
  } else if (routeName === 'Fórum') {
    return 'chat';
  }
}

export default function AlunoTabs({ route }) {
  const { user } = route.params;

  return (
    <Tab.Navigator
      initialRouteName="Início"
      screenOptions={({ route }) => ({
        headerShown: false, 
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#555',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee', height: 60 },
        tabBarLabelStyle: { fontSize: 12, paddingBottom: 5 },
        
        tabBarIcon: ({ focused, color, size }) => {
          return (
            <View style={{
              padding: 5,
              borderRadius: 30, 
              backgroundColor: focused ? '#BAF241' : 'transparent', 
            }}>
              <MaterialCommunityIcons 
                name={getIconName(route.name)} 
                color={color} 
                size={size} 
              />
            </View>
          );
        }
      })}
    >
      <Tab.Screen
        name="Início"
        component={AlunoHome} 
        initialParams={{ user }}
      />
      <Tab.Screen
        name="Conteúdo"
        component={AlunoConteudo}
        initialParams={{ user }}
      />
      <Tab.Screen
        name="IDE"
        component={AlunoIde}
        initialParams={{ user }}
      />
      <Tab.Screen
        name="Fórum"
        component={AlunoForum}
        initialParams={{ user }}
      />
    </Tab.Navigator>
  );
}