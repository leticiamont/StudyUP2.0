import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, Text, View, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, Image, Platform, ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService';

export default function ProfessorRanking({ route }) {
  const { user } = route.params; 
  const [ranking, setRanking] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [selectedTurma, setSelectedTurma] = useState(null); 
  const [loading, setLoading] = useState(false);

  // 1. Carrega as Turmas
  useEffect(() => {
    const loadTurmas = async () => {
        try {
            const allClasses = await api.get('/api/classes');
            const teacherId = user.uid || user.id;
            const myClasses = allClasses.filter(c => c.teacherId === teacherId);
            setTurmas(myClasses);
        } catch (e) { console.log(e); }
    };
    loadTurmas();
  }, []);

  useEffect(() => {
    const loadRanking = async () => {
        setLoading(true);
        try {
            let endpoint = '/api/dashboard/leaderboard';
            
            if (selectedTurma) {
                // Se selecionou uma turma específica
                endpoint += `?classId=${selectedTurma.id}`;
            } else {
                // Se está no "Geral", manda o ID do professor para filtrar AS DELE
                const teacherId = user.uid || user.id;
                endpoint += `?teacherId=${teacherId}`;
            }
            
            const data = await api.get(endpoint);
            setRanking(Array.isArray(data) ? data : []);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };
    loadRanking();
  }, [selectedTurma]); // Roda quando muda a seleção

  const renderItem = ({ item, index }) => {
    let medalColor = '#ccc';
    if (index === 0) medalColor = '#FFD700'; 
    if (index === 1) medalColor = '#C0C0C0'; 
    if (index === 2) medalColor = '#CD7F32'; 

    return (
      <View style={styles.rankCard}>
        <View style={styles.rankPosition}>
            {index < 3 ? (
                <MaterialCommunityIcons name="medal" size={30} color={medalColor} />
            ) : (
                <Text style={styles.rankNumber}>{index + 1}º</Text>
            )}
        </View>
        <View style={styles.rankInfo}>
            <Text style={styles.rankName}>{item.displayName}</Text>
            <Text style={styles.rankUser}>@{item.username}</Text>
        </View>
        <View style={styles.rankPoints}>
            <Text style={styles.pointsValue}>{item.points}</Text>
            <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ranking da Turma</Text>
      </View>

      {/* FILTRO DE TURMAS */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{paddingVertical: 10}}>
            <TouchableOpacity 
                style={[styles.chip, selectedTurma === null && styles.chipActive]}
                onPress={() => setSelectedTurma(null)}
            >
                <Text style={[styles.chipText, selectedTurma === null && styles.chipTextActive]}>Geral</Text>
            </TouchableOpacity>
            
            {turmas.map(t => (
                <TouchableOpacity 
                    key={t.id}
                    style={[styles.chip, selectedTurma?.id === t.id && styles.chipActive]}
                    onPress={() => setSelectedTurma(t)}
                >
                    <Text style={[styles.chipText, selectedTurma?.id === t.id && styles.chipTextActive]}>
                        {t.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 50}} />
      ) : (
        <FlatList
            data={ranking}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhum aluno pontuou ainda.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fa', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { padding: 15, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  
  filterContainer: { backgroundColor: '#fff', paddingLeft: 15, paddingBottom: 5 },
  chip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
  chipActive: { backgroundColor: '#1154D9' },
  chipText: { color: '#555', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  listContainer: { padding: 20 },
  rankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  rankPosition: { width: 40, alignItems: 'center', justifyContent: 'center' },
  rankNumber: { fontSize: 18, fontWeight: 'bold', color: '#555' },
  rankInfo: { flex: 1, marginLeft: 10 },
  rankName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  rankUser: { fontSize: 12, color: '#888' },
  rankPoints: { alignItems: 'flex-end' },
  pointsValue: { fontSize: 18, fontWeight: 'bold', color: '#1154D9' },
  pointsLabel: { fontSize: 10, color: '#1154D9' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50 }
});