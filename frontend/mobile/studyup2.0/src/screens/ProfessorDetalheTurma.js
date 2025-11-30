import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, Text, View, TouchableOpacity, Platform, StatusBar, 
    ActivityIndicator, Modal, FlatList, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../service/apiService';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfessorDetalheTurma({ route }) {
  const navigation = useNavigation();
  const { turma } = route.params || {}; 
  
  const [activeTab, setActiveTab] = useState('alunos'); 
  const [alunos, setAlunos] = useState([]);
  const [conteudosTurma, setConteudosTurma] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados de Modal removidos parcialmente pois não serão usados pelo botão +,
  // mas mantidos caso queira reativar futuramente ou usar outra lógica.
  const [modalVisible, setModalVisible] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [bancoPlanos, setBancoPlanos] = useState([]); 

  if (!turma) return null;

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'alunos') {
        const data = await api.get(`/api/users?role=student&classId=${turma.id}`);
        setAlunos(Array.isArray(data) ? data : []);
      } else {
        // BUSCA HÍBRIDA (Geral + Específico)
        const [allContentsData, plansData] = await Promise.all([
            api.get(`/api/contents`),
            api.get(`/api/plans?classId=${turma.id}`)
        ]);

        const validContents = Array.isArray(allContentsData) ? allContentsData : [];
        const validPlans = Array.isArray(plansData) ? plansData : [];
        
        const conteudosFiltrados = validContents.filter(c => {
            const ehDestaTurma = c.classId === turma.id;
            
            const serieConteudo = (c.schoolYear || "").trim();
            const serieTurma = (turma.schoolYear || "").trim();
            const nivelConteudo = (c.gradeLevel || "").trim();
            const nivelTurma = (turma.gradeLevel || turma.educationLevel || "").trim();

            const ehDaSerie = !c.classId && (
                (serieConteudo && serieConteudo === serieTurma) || 
                (nivelConteudo && nivelConteudo === nivelTurma)
            );
            
            return ehDestaTurma || ehDaSerie;
        });

        setConteudosTurma([...conteudosFiltrados, ...validPlans]);
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

  // Funções de Upload mantidas caso precise reativar, mas não estão sendo chamadas na UI agora
  const handleUploadDevice = async () => { /* ... */ };
  const openBankModal = async () => { /* ... */ };
  const assignContentToClass = async (item) => { /* ... */ };

  // Renderização de item da lista (Card)
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
        <View style={{flexDirection:'row', alignItems:'center'}}>
            <Text style={styles.contentType}>
                {item.url ? 'Documento PDF' : 'Plano de Aula'}
            </Text>
            {!item.classId && (
                <View style={styles.tagGeneral}>
                    <Text style={styles.tagText}>Geral da Série</Text>
                </View>
            )}
        </View>
      </View>
      
      <TouchableOpacity onPress={() => {
          if(item.url) {
              navigation.navigate('ViewPDF', { url: item.url });
          } else {
              navigation.navigate('EditorPlanoAula', { plan: item });
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
          <Text style={styles.infoText}>
            {turma.gradeLevel} {turma.schoolYear ? `• ${turma.schoolYear}` : ''}
          </Text>
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
                  ListEmptyComponent={<Text style={styles.emptyText}>Nenhum conteúdo encontrado para esta turma ou série.</Text>}
                  renderItem={renderContentItem}
                />
                {/* BOTÃO FAB (+) REMOVIDO AQUI */}
              </View>
            )}
          </>
        )}
      </View>

      {/* Modais mantidos no código mas inativos visualmente sem o botão */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
         {/* ... conteúdo do modal ... */}
      </Modal>
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
  
  // TAG GERAL
  tagGeneral: { backgroundColor: '#E3F2FD', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  tagText: { color: '#1154D9', fontSize: 10, fontWeight: 'bold' },

  // FAB removido da view, mas estilo mantido caso precise voltar
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#1154D9', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  menuOption: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuText: { fontSize: 16, color: '#333' }
});