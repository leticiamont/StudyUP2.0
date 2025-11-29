import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, Text, View, TouchableOpacity, Platform, StatusBar, 
    ActivityIndicator, Modal, FlatList, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../service/apiService';

export default function ProfessorDetalheTurma({ route }) {
  const navigation = useNavigation();
  const { turma } = route.params || {}; 
  
  const [activeTab, setActiveTab] = useState('alunos'); 
  const [alunos, setAlunos] = useState([]);
  const [conteudosTurma, setConteudosTurma] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!turma) return null;

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'alunos') {
        // 1. Alunos: Busca alunos vinculados à esta turma
        const data = await api.get(`/api/users?role=student&classId=${turma.id}`);
        setAlunos(Array.isArray(data) ? data : []);
      } else {
        // 2. Conteúdo: BUSCA POR CLASSID (Histórico da Turma)
        const [contentsData, plansData] = await Promise.all([
            // CRUCIAL: Busca o conteúdo que foi SALVO com o ID desta turma
            api.get(`/api/contents?classId=${turma.id}`), 
            api.get(`/api/plans?classId=${turma.id}`), 
        ]);

        const validContents = Array.isArray(contentsData) ? contentsData : [];
        const validPlans = Array.isArray(plansData) ? plansData : [];
        
        setConteudosTurma([...validContents, ...validPlans]);
      }
    } catch (error) {
      console.log("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (turma?.id) fetchData();
  }, [activeTab, turma]);

  // Função para editar/visualizar conteúdo
  const renderContentItem = ({ item }) => (
    <View style={styles.cardContent}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons 
          name={item.url ? "file-pdf-box" : "clipboard-text"} 
          size={28} 
          color="#1154D9" 
        />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.contentName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.contentType}>
            {item.url ? 'Documento PDF' : 'Plano de Aula (IA)'}
        </Text>
      </View>
      
      {/* Ação: Ver PDF ou Editar Plano */}
      <TouchableOpacity onPress={() => {
          if(item.url) {
              navigation.navigate('ViewPDF', { url: item.url });
          } else {
              navigation.navigate('EditorPlanoAula', { plan: item, isContent: true });
          }
      }}>
        <MaterialCommunityIcons 
            name={item.url ? "eye" : "pencil"} 
            size={24} 
            color="#555" 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding: 5}}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{turma.name}</Text>
        <View style={{width: 26}} />
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#1154D9" />
          <Text style={styles.infoText}>{turma.schedule || 'Horário não definido'}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="school-outline" size={20} color="#1154D9" />
          <Text style={styles.infoText}>{turma.gradeLevel}</Text>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'alunos' && styles.activeTab]} 
          onPress={() => setActiveTab('alunos')}
        >
          <Text style={[styles.tabText, activeTab === 'alunos' && styles.activeTabText]}>Alunos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'conteudo' && styles.activeTab]} 
          onPress={() => setActiveTab('conteudo')}
        >
          <Text style={[styles.tabText, activeTab === 'conteudo' && styles.activeTabText]}>Conteúdo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 40}} />
        ) : (
          <>
            {activeTab === 'alunos' ? (
              <FlatList
                data={alunos}
                keyExtractor={item => item.id}
                contentContainerStyle={{paddingVertical: 15}}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum aluno nesta turma.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.cardAluno}>
                    <MaterialCommunityIcons name="account-circle" size={40} color="#ccc" />
                    <View style={{marginLeft: 15}}>
                      <Text style={styles.alunoName}>{item.displayName}</Text>
                      <Text style={styles.alunoEmail}>{item.email}</Text>
                    </View>
                  </View>
                )}
              />
            ) : (
              <View style={{flex: 1}}>
                <FlatList
                  data={conteudosTurma}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{paddingVertical: 15}}
                  ListEmptyComponent={<Text style={styles.emptyText}>Nenhum conteúdo postado.</Text>}
                  renderItem={renderContentItem}
                />
                
                {/* 🛑 BOTÃO FLUTUANTE DE ADIÇÃO (REMOVIDO) 🛑 */}
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fa', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1, textAlign: 'center' },
  infoBox: { backgroundColor: '#fff', padding: 15, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  infoText: { marginLeft: 10, color: '#555', fontSize: 14 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#1154D9' },
  tabText: { fontSize: 16, fontWeight: '500', color: '#888' },
  activeTabText: { color: '#1154D9', fontWeight: 'bold' },
  contentContainer: { flex: 1, padding: 15 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50 },
  cardAluno: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
  alunoName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  alunoEmail: { fontSize: 12, color: '#888' },
  cardContent: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#1154D9' },
  iconBox: { marginRight: 15 },
  contentName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  contentType: { fontSize: 12, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  menuOption: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuText: { fontSize: 16, color: '#333' }
});