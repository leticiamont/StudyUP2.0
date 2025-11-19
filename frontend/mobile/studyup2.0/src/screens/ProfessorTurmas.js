import React, { useState } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    ScrollView, 
    TouchableOpacity, 
    Platform, 
    StatusBar 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const mockTurmas = [
  { id: '1', name: 'Turma A - Matemática', studentCount: 25 },
  { id: '2', name: 'Turma B - Português', studentCount: 22 },
  { id: '3', name: 'Turma C - Ciências', studentCount: 28 },
];

export default function ProfessorTurmas({ route }) {
  const { user } = route.params;
  const [turmas, setTurmas] = useState(mockTurmas);
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. CABEÇALHO (Header) - */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minhas Turmas</Text>
      </View>

      <ScrollView style={styles.container}>
        {/* 2. Lista de Cartões  */}
        {turmas.map((turma) => (
          <TouchableOpacity 
            key={turma.id} 
            style={styles.turmaCard}
            onPress={() => navigation.navigate('ProfessorDetalheTurma', { turma: turma })}
          >
            <View style={styles.turmaIcon}>
              <MaterialCommunityIcons name="google-classroom" size={30} color="#1154D9" />
            </View>
            <View style={styles.turmaInfo}>
              <Text style={styles.turmaName}>{turma.name}</Text>
              <Text style={styles.turmaCount}>{turma.studentCount} alunos matriculados</Text>
            </View>
            <View style={styles.manageButton}>
              <MaterialCommunityIcons name="chevron-right" size={30} color="#555" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f4f6fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  turmaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  turmaIcon: {
    marginRight: 15,
  },
  turmaInfo: {
    flex: 1, 
  },
  turmaName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  turmaCount: {
    fontSize: 14,
    color: '#555',
  },
  manageButton: {
    marginLeft: 10,
  },
});