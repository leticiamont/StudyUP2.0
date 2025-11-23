import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 

import ProfessorHome from './ProfessorHome'; 
import ProfessorTurmas from './ProfessorTurmas';
import ProfessorConteudo from './ProfessorConteudo';
import ProfessorForum from './ProfessorForum';
import ProfessorRanking from './ProfessorRanking';

const Tab = createBottomTabNavigator();

function getIconName(routeName) {
  if (routeName === 'Início') return 'home';
  if (routeName === 'Turmas') return 'account-group';
  if (routeName === 'Conteúdo') return 'book-open-variant';
  if (routeName === 'Fórum') return 'chat';
  if (routeName === 'Ranking') return 'trophy'; 
}

export default function ProfessorTabs({ route }) {
  const { user } = route.params;

  return (
    <Tab.Navigator
      initialRouteName="Início"
      screenOptions={({ route }) => ({
        headerShown: false, 
        tabBarActiveTintColor: '#1154D9', 
        tabBarInactiveTintColor: '#555',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee', height: 60 },
        tabBarLabelStyle: { fontSize: 12, paddingBottom: 5 },
        tabBarIcon: ({ focused, color, size }) => (
          <MaterialCommunityIcons 
            name={getIconName(route.name)} 
            color={color} 
            size={size} 
          />
        )
      })}
    >
      <Tab.Screen name="Início" component={ProfessorHome} initialParams={{ user }} />
      <Tab.Screen name="Turmas" component={ProfessorTurmas} initialParams={{ user }} />
      <Tab.Screen name="Conteúdo" component={ProfessorConteudo} initialParams={{ user }} />
      <Tab.Screen name="Fórum" component={ProfessorForum} initialParams={{ user }} />
      <Tab.Screen name="Ranking" component={ProfessorRanking} initialParams={{ user }} />
    </Tab.Navigator>
  );
}