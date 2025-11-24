import React from 'react';
import { View } from 'react-native'; 
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import AlunoHome from './AlunoHome'; 
import AlunoConteudo from './AlunoConteudo';
import AlunoIde from './AlunoIde';
import AlunoForum from './AlunoForum';
import AlunoJogos from './AlunoJogos'; 

const Tab = createBottomTabNavigator();

function getIconName(routeName) {
  if (routeName === 'Início') return 'home';
  if (routeName === 'Aulas') return 'book-open-page-variant';
  if (routeName === 'Jogos') return 'gamepad-variant'; 
  if (routeName === 'IDE') return 'code-braces';
  if (routeName === 'Fórum') return 'chat-processing';
}

export default function AlunoTabs({ route }) {
  const { user } = route.params;

  return (
    <Tab.Navigator
      initialRouteName="Início"
      screenOptions={({ route }) => ({
        headerShown: false, 
        tabBarActiveTintColor: '#1154D9', 
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { 
          backgroundColor: '#fff', 
          borderTopColor: '#eee', 
          height: 60,
          paddingBottom: 5,
          paddingTop: 5
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        
        tabBarIcon: ({ focused, color, size }) => {
          return (
            <View style={{
              backgroundColor: focused ? '#E3F2FD' : 'transparent', 
              paddingHorizontal: 16,
              paddingVertical: 4,
              borderRadius: 20, 
            }}>
              <MaterialCommunityIcons 
                name={getIconName(route.name)} 
                color={color} 
                size={24} 
              />
            </View>
          );
        }
      })}
    >
      <Tab.Screen name="Início" component={AlunoHome} initialParams={{ user }} />
      <Tab.Screen name="Aulas" component={AlunoConteudo} initialParams={{ user }} />
      <Tab.Screen name="IDE" component={AlunoIde} initialParams={{ user }} />
      <Tab.Screen name="Jogos" component={AlunoJogos} initialParams={{ user }} /> 
      <Tab.Screen name="Fórum" component={AlunoForum} initialParams={{ user }} />
    </Tab.Navigator>
  );
}