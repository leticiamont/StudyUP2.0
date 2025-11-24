import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import AlunoTabs from './src/screens/AlunoTabs'; 
import ProfessorHome from './src/screens/ProfessorHome'; 
import PostDetalhe from './src/screens/PostDetalhe';
import ProfessorTabs from './src/screens/ProfessorTabs';
import ProfessorDetalheTurma from './src/screens/ProfessorDetalheTurma';
import EditorPlanoAula from './src/screens/EditorPlanoAula';
import ViewPDF from "./src/screens/ViewPDF";
import GameQuiz from './src/screens/GameQuiz';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="AlunoHome" 
          component={AlunoTabs} 
          options={{ headerShown: false }} 
        />
        
        <Stack.Screen 
          name="ProfessorHome" 
          component={ProfessorTabs} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="PostDetalhe" 
          component={PostDetalhe} 
          options={{ headerShown: false }} 
        />

       <Stack.Screen 
          name="ProfessorDetalheTurma" 
          component={ProfessorDetalheTurma} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="EditorPlanoAula" 
          component={EditorPlanoAula} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
        name="ViewPDF" component={ViewPDF} 
      
        />
        <Stack.Screen 
          name="GameQuiz" 
          component={GameQuiz} 
          options={{ headerShown: false }} 
        />

      </Stack.Navigator>

    </NavigationContainer>
  );
}