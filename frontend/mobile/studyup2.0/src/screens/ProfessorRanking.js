import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, Text, View, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, Modal, Platform // <--- ADICIONADO AQUI
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService';

export default function ProfessorRanking({ route }) {
  const { user } = route.params; 
  const [ranking, setRanking] = useState([]);
  const [turmas, setTurmas] = useState([]);
  
  // Estado da turma selecionada (null = Geral)
  const [selectedTurma, setSelectedTurma] = useState(null); 
  
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false); // Estado do Modal

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

  // 2. Carrega o Ranking (Sempre que mudar a seleção)
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
  }, [selectedTurma]);

  const renderItem = ({ item, index }) => {
    let medalColor = '#ccc';
    let medalIcon = "medal";
    
    if (index === 0) { medalColor = '#FFD700'; } // Ouro
    else if (index === 1) { medalColor = '#C0C0C0'; } // Prata
    else if (index === 2) { medalColor = '#CD7F32'; } // Bronze
    else { medalIcon = "shield-outline"; } // Resto

    return (
      <View style={styles.rankCard}>
        <View style={styles.rankPosition}>
            {index < 3 ? (
                <MaterialCommunityIcons name={medalIcon} size={32} color={medalColor} />
            ) : (
                <Text style={styles.rankNumber}>{index + 1}º</Text>
            )}
        </View>
        <View style={styles.rankInfo}>
            <Text style={styles.rankName}>{item.displayName}</Text>
            <Text style={styles.rankUser}>
                {/* Mostra a turma do aluno se estiver no modo Geral */}
                {selectedTurma ? `@${item.username}` : `${item.className} • @${item.username}`}
            </Text>
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

      {/* DROPDOWN DE FILTRO (Igual ao Fórum) */}
      <View style={{paddingHorizontal: 20, paddingTop: 15, backgroundColor: '#f4f6fa'}}>
        <Text style={styles.filterLabel}>Filtrar Visualização:</Text>
        <TouchableOpacity 
            style={styles.dropdownButton} 
            onPress={() => setDropdownVisible(true)}
        >
            <Text style={styles.dropdownText}>
                {selectedTurma ? selectedTurma.name : "Ranking Geral (Todas)"}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 50}} />
      ) : (
        <FlatList
            data={ranking}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="trophy-broken" size={50} color="#ccc" />
                    <Text style={styles.emptyText}>Nenhum aluno pontuou ainda.</Text>
                </View>
            }
        />
      )}

      {/* MODAL DE SELEÇÃO (DROPDOWN) */}
      <Modal visible={dropdownVisible} transparent animationType="fade" onRequestClose={() => setDropdownVisible(false)}>
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
             <View style={styles.dropdownModalContent}>
                <Text style={styles.dropdownModalTitle}>Selecione a Turma</Text>
                <FlatList 
                    data={[{ id: 'all', name: 'Ranking Geral (Todas)' }, ...turmas]} 
                    keyExtractor={item => item.id}
                    renderItem={({item}) => {
                        const isSelected = (item.id === 'all' && selectedTurma === null) || (selectedTurma?.id === item.id);
                        return (
                            <TouchableOpacity 
                                style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
                                onPress={() => { 
                                    setSelectedTurma(item.id === 'all' ? null : item); 
                                    setDropdownVisible(false); 
                                }}
                            >
                                <Text style={[styles.dropdownOptionText, isSelected && {color:'#1154D9', fontWeight:'bold'}]}>
                                    {item.name}
                                </Text>
                                {isSelected && <MaterialCommunityIcons name="check" size={20} color="#1154D9" />}
                            </TouchableOpacity>
                        );
                    }}
                />
             </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fa', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { padding: 15, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  
  // ESTILOS DO DROPDOWN (Padronizados)
  filterLabel: { fontSize: 14, color: '#555', fontWeight: 'bold', marginBottom: 8, marginLeft: 5 },
  dropdownButton: {
    backgroundColor: '#1154D9',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginBottom: 5
  },
  dropdownText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // MODAL DO DROPDOWN
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownModalContent: { backgroundColor: '#fff', borderRadius: 15, width: '85%', padding: 20, maxHeight: '60%', elevation: 5 },
  dropdownModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  dropdownOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownOptionActive: { backgroundColor: '#F0F7FF' },
  dropdownOptionText: { fontSize: 16, color: '#333' },

  // LISTA E CARDS
  listContainer: { padding: 20 },
  rankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  rankPosition: { width: 45, alignItems: 'center', justifyContent: 'center' },
  rankNumber: { fontSize: 18, fontWeight: 'bold', color: '#555' },
  rankInfo: { flex: 1, marginLeft: 10 },
  rankName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  rankUser: { fontSize: 12, color: '#888' },
  rankPoints: { alignItems: 'flex-end' },
  pointsValue: { fontSize: 18, fontWeight: 'bold', color: '#1154D9' },
  pointsLabel: { fontSize: 10, color: '#1154D9', fontWeight: 'bold' },
  
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 10 }
});