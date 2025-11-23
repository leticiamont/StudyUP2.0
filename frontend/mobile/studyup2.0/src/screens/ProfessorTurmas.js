import React, { useState, useCallback } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, StatusBar, ActivityIndicator 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../service/apiService';

export default function ProfessorTurmas({ route }) {
  const { user } = route.params;
  const navigation = useNavigation();
  const [turmas, setTurmas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTurmas = async () => {
    try {
      setIsLoading(true);
      const teacherId = user.uid || user.id; 
      
      const data = await api.get('/api/classes');
      
      // Filtra apenas as turmas desse professor
      const minhasTurmas = data.filter(t => t.teacherId === teacherId);
      
      setTurmas(minhasTurmas);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTurmas();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minhas Turmas</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 20}} />
      ) : (
        <ScrollView style={styles.container}>
          {turmas.length === 0 ? (
            <Text style={styles.emptyText}>Você ainda não possui turmas vinculadas.</Text>
          ) : (
            turmas.map((turma) => (
              <TouchableOpacity 
                key={turma.id} 
                style={styles.turmaCard}
                onPress={() => navigation.navigate('ProfessorDetalheTurma', { turma: turma })}
              >
                <View style={styles.turmaIcon}>
                  <MaterialCommunityIcons name="google-classroom" size={32} color="#1154D9" />
                </View>
                <View style={styles.turmaInfo}>
                  <Text style={styles.turmaName}>{turma.name}</Text>
                  <Text style={styles.turmaCount}>
                    {turma.studentCount || 0} alunos matriculados
                  </Text>
                  <Text style={styles.turmaLevel}>{turma.gradeLevel}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={30} color="#ccc" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fa', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  container: { flex: 1, padding: 20 },
  turmaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  turmaIcon: { marginRight: 15, backgroundColor: '#E3F2FD', padding: 10, borderRadius: 50 },
  turmaInfo: { flex: 1 },
  turmaName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  turmaCount: { fontSize: 14, color: '#666', marginTop: 4 },
  turmaLevel: { fontSize: 12, color: '#1154D9', marginTop: 2, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 30, fontSize: 16 }
});