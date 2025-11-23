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
        const [contentsData, plansData] = await Promise.all([
            api.get(`/api/contents?classId=${turma.id}`),
            api.get(`/api/plans?classId=${turma.id}`)
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

  const handleUploadDevice = async () => {
    setModalVisible(false); 
    try {
      const docResult = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      });

      if (!docResult.canceled && docResult.assets) {
        const file = docResult.assets[0];
        const formData = new FormData();
        
        if (Platform.OS === 'web') {
          formData.append('file', file.file, file.name); 
        } else {
          formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType });
        }
        
        formData.append('classId', turma.id); 

        Alert.alert('Enviando...', 'Carregando arquivo para a turma...');
        const token = await AsyncStorage.getItem('userToken');
        // Ajuste a URL se necessário para seu IP
        const response = await fetch('http://localhost:3000/api/contents/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) throw new Error('Falha no upload');
        Alert.alert('Sucesso!', 'Arquivo adicionado.');
        fetchData();
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao enviar arquivo.');
    }
  };

  const openBankModal = async () => {
    setModalVisible(false);
    setBankModalVisible(true);
    try {
      const [plans, contents] = await Promise.all([
        api.get('/api/plans'),
        api.get('/api/contents')
      ]);
      
      let allItems = [
        ...(Array.isArray(plans) ? plans : []), 
        ...(Array.isArray(contents) ? contents : [])
      ];

      allItems = allItems.filter(c => c.classId !== turma.id);

      setBancoPlanos(allItems);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar o banco.");
    }
  };

  // --- IMPORTAR (Atribuir à Turma) ---
  const assignContentToClass = async (item) => {
    try {
      // Agora suportamos Planos e Conteúdos!
      if (item.url) {
         // É PDF -> Rota contents
         await api.put(`/api/contents/${item.id}`, { classId: turma.id });
      } else {
         // É Plano -> Rota plans (Agora funciona!)
         await api.put(`/api/plans/${item.id}`, { classId: turma.id });
      }
      
      Alert.alert("Sucesso", "Item importado para a turma!");
      setBankModalVisible(false);
      fetchData(); 
      
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Falha ao importar.");
    }
  };

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
        <Text style={styles.contentType}>
            {item.url ? 'Documento PDF' : 'Plano de Aula (IA)'}
        </Text>
      </View>
      
      {/* Ação: Ver PDF ou Editar Plano */}
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
                  ListEmptyComponent={<Text style={styles.emptyText}>Nenhum conteúdo postado.</Text>}
                  renderItem={renderContentItem}
                />
                
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                  <MaterialCommunityIcons name="plus" size={30} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* MODAL MENU */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Adicionar à Turma</Text>
            <TouchableOpacity style={styles.menuOption} onPress={handleUploadDevice}>
              <View style={[styles.menuIcon, {backgroundColor: '#E3F2FD'}]}><MaterialCommunityIcons name="upload" size={24} color="#1154D9" /></View>
              <Text style={styles.menuText}>Carregar deste dispositivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={openBankModal}>
              <View style={[styles.menuIcon, {backgroundColor: '#FFF8E1'}]}><MaterialCommunityIcons name="briefcase-download" size={24} color="#FFC107" /></View>
              <Text style={styles.menuText}>Importar do Banco de Planos</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL BANCO */}
      <Modal visible={bankModalVisible} animationType="slide" onRequestClose={() => setBankModalVisible(false)}>
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setBankModalVisible(false)}><MaterialCommunityIcons name="close" size={26} color="#333" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Selecionar do Banco</Text>
            <View style={{width: 26}}/>
          </View>
          <FlatList 
            data={bancoPlanos}
            keyExtractor={item => item.id}
            contentContainerStyle={{padding: 20}}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhum arquivo disponível.</Text>}
            renderItem={({item}) => (
              <TouchableOpacity style={styles.cardContent} onPress={() => assignContentToClass(item)}>
                <MaterialCommunityIcons name={item.url ? "file-pdf-box" : "clipboard-text"} size={28} color="#555" />
                <View style={{marginLeft: 10, flex: 1}}>
                   <Text style={styles.contentName}>{item.name}</Text>
                   <Text style={styles.contentType}>Toque para importar</Text>
                </View>
                <MaterialCommunityIcons name="plus-circle" size={24} color="#1154D9" />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
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
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#1154D9', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  menuOption: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuText: { fontSize: 16, color: '#333' }
});