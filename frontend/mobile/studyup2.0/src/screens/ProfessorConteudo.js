import React, { useState, useCallback } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, StatusBar,
    Modal, TextInput, Alert, ActivityIndicator, FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfessorConteudo({ route }) {
  const { user } = route.params;
  const navigation = useNavigation();

  const [viewMode, setViewMode] = useState('years');
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [yearsList, setYearsList] = useState([]);
  const [desktopPlan, setDesktopPlan] = useState(null);
  const [myContents, setMyContents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados IA
  const [iaModalVisible, setIaModalVisible] = useState(false);
  const [iaPrompt, setIaPrompt] = useState('');
  const [iaResponse, setIaResponse] = useState('');
  const [isIaLoading, setIsIaLoading] = useState(false);

  const fetchYears = async () => {
    setLoading(true);
    try {
      const classes = await api.get('/api/classes');
      const myClasses = classes.filter(c => c.teacherId === (user.uid || user.id));
      const uniqueGrades = [...new Set(myClasses.map(c => c.gradeLevel))].sort();
      setYearsList(uniqueGrades);
    } catch (error) { console.log(error); } 
    finally { setLoading(false); }
  };

  const openGradeDetails = async (grade) => {
    setSelectedGrade(grade);
    setViewMode('details');
    setLoading(true);
    try {
      const allPlans = await api.get(`/api/plans?gradeLevel=${grade}`);
      setDesktopPlan(allPlans.length > 0 ? allPlans[0] : null);
      
      const contents = await api.get(`/api/contents?gradeLevel=${grade}`);
      setMyContents(contents);
    } catch (error) { Alert.alert("Erro", "Falha ao carregar dados."); } 
    finally { setLoading(false); }
  };

  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'years') fetchYears();
      else if (selectedGrade) openGradeDetails(selectedGrade);
    }, [viewMode])
  );

  // --- AÇÕES ---

  const handleEdit = () => {
     navigation.navigate('EditorPlanoAula', { 
         isContent: true, 
         plan: { name: '', gradeLevel: selectedGrade, content: '' } 
     });
  };

  const handleEditItem = (item) => {
      if (item.type === 'text') {
          navigation.navigate('EditorPlanoAula', { isContent: true, plan: item });
      } else if (item.url) {
          navigation.navigate('ViewPDF', { url: item.url });
      }
  };

  const handleUpload = async () => {
    try {
        const docResult = await DocumentPicker.getDocumentAsync({
          type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        });
        if (!docResult.canceled && docResult.assets) {
          const file = docResult.assets[0];
          const formData = new FormData();
          if (Platform.OS === 'web') { formData.append('file', file.file, file.name); } 
          else { formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType }); }
          formData.append('gradeLevel', selectedGrade); 
          formData.append('name', file.name);

          Alert.alert('Enviando...', 'Carregando arquivo...');
          const token = await AsyncStorage.getItem('userToken');
          const response = await fetch('http://localhost:3000/api/contents/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
          });
          if (!response.ok) throw new Error('Falha');
          Alert.alert('Sucesso!', 'Arquivo enviado.');
          openGradeDetails(selectedGrade);
        }
      } catch (error) { Alert.alert('Erro', 'Falha ao enviar arquivo.'); }
  };

  const deleteContent = async (id) => {
      Alert.alert(
          "Apagar Material",
          "Tem certeza que deseja apagar este item?",
          [
              { text: "Cancelar", style: "cancel" },
              { 
                  text: "Apagar", 
                  style: "destructive", 
                  onPress: async () => {
                      try {
                          await api.delete(`/api/contents/${id}`);
                          openGradeDetails(selectedGrade); 
                      } catch (error) {
                          Alert.alert("Erro", "Não foi possível apagar.");
                      }
                  }
              }
          ]
      );
  }

  const handleGenerateIa = async () => {
    if (!iaPrompt.trim()) return;
    const currentPrompt = iaPrompt;
    setIaPrompt('');
    
    setIsIaLoading(true);
    setIaResponse('');
    try {
      const data = await api.post('/api/ia/gerar', { prompt: currentPrompt });
      setIaResponse(data.resposta);
    } catch (e) { Alert.alert('Erro IA'); }
    setIsIaLoading(false);
  };

  const saveIaContent = async () => {
      try {
          await api.post('/api/contents', { 
              name: `IA: ${iaPrompt.substring(0,15)}...`,
              content: iaResponse,
              type: 'text',
              gradeLevel: selectedGrade
          });
          setIaModalVisible(false);
          setIaPrompt('');
          setIaResponse('');
          openGradeDetails(selectedGrade);
      } catch (e) { Alert.alert('Erro ao salvar'); }
  };

  const renderYearCard = ({ item }) => (
    <TouchableOpacity style={styles.yearCard} onPress={() => openGradeDetails(item)}>
        <View style={styles.yearIcon}><MaterialCommunityIcons name="school" size={32} color="#fff" /></View>
        <View>
            <Text style={styles.yearTitle}>{item}</Text>
            <Text style={styles.yearSub}>Toque para gerenciar</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" style={{marginLeft: 'auto'}} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        {viewMode === 'details' ? (
            <TouchableOpacity onPress={() => setViewMode('years')} style={{paddingRight: 10}}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
            </TouchableOpacity>
        ) : <View />}
        <Text style={styles.headerTitle}>{viewMode === 'years' ? 'Meus Anos Letivos' : selectedGrade}</Text>
        <View style={{width: 24}} />
      </View>

      {viewMode === 'years' && (
          <View style={styles.container}>
              {loading ? <ActivityIndicator color="#1154D9" /> : (
                  <FlatList 
                    data={yearsList}
                    keyExtractor={item => item}
                    renderItem={renderYearCard}
                    ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma turma encontrada.</Text>}
                    contentContainerStyle={{padding: 20}}
                  />
              )}
          </View>
      )}

      {viewMode === 'details' && (
          <View style={styles.container}>
             <ScrollView contentContainerStyle={{padding: 20}}>
                
                {/* BLOCO 1: PLANEJAMENTO (READ-ONLY) */}
                <View style={styles.sectionBox}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={styles.sectionTitle}>📖 Planejamento (Desktop)</Text>
                        <MaterialCommunityIcons name="lock" size={16} color="#888" /> 
                    </View>
                    
                    {desktopPlan ? (
                        <View style={styles.planCard}>
                            <Text style={styles.planName}>{desktopPlan.name}</Text>
                            {desktopPlan.modules && desktopPlan.modules.map((mod, i) => (
                                <Text key={i} style={styles.moduleText}>• {mod.title}</Text>
                            ))}
                        </View>
                    ) : <Text style={styles.emptyText}>Nenhum plano base cadastrado.</Text>}
                </View>

                {/* BLOCO 2: MEUS MATERIAIS */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>📂 Meus Materiais</Text>
                    <Text style={styles.sectionSub}>Arquivos e textos para este ano.</Text>
                    {myContents.map(item => (
                        <TouchableOpacity key={item.id} style={styles.contentItem} onPress={() => handleEditItem(item)}>
                            <MaterialCommunityIcons name={item.url ? "file-pdf-box" : "text-box"} size={24} color="#555" />
                            <Text style={{flex: 1, marginLeft: 10}} numberOfLines={1}>{item.name}</Text>
                            <TouchableOpacity onPress={() => deleteContent(item.id)} style={{padding: 5}}>
                                <MaterialCommunityIcons name="trash-can" size={20} color="red" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                    {myContents.length === 0 && <Text style={styles.emptyText}>Nada criado ainda.</Text>}
                </View>
                <View style={{height: 80}} />
             </ScrollView>

             <View style={styles.fabContainer}>
                <TouchableOpacity style={[styles.fab, {backgroundColor: '#9C27B0'}]} onPress={() => setIaModalVisible(true)}>
                    <MaterialCommunityIcons name="auto-fix" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.fab, {backgroundColor: '#FFC107'}]} onPress={handleEdit}>
                    <MaterialCommunityIcons name="pencil" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.fab, {backgroundColor: '#1154D9'}]} onPress={handleUpload}>
                    <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                </TouchableOpacity>
             </View>
          </View>
      )}

      {/* MODAL IA - Layout Final - FLUSH BORDER */}
      <Modal visible={iaModalVisible} transparent animationType="slide">
         <View style={styles.iaOverlay}>
            <View style={styles.iaContent}>
                
                {/* NOVO HEADER: STUDYUP + BOTÃO FECHAR */}
                <View style={styles.newHeader}>
                  <Text style={styles.logo}>STUDY<Text style={styles.logoUp}>UP</Text></Text>
                  <TouchableOpacity onPress={() => setIaModalVisible(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                {/* ÁREA DE RESPOSTA/CHAT LOG (FLUSH) */}
                <ScrollView style={styles.iaResponseArea}>
                    {isIaLoading ? (
                        <ActivityIndicator size="large" color="#BAF241" style={{marginTop: 20}} />
                    ) : (
                        <Text style={styles.iaResponseText}>
                            {iaResponse || `Seu assistente está pronto para criar conteúdo para ${selectedGrade}.`}
                        </Text>
                    )}
                </ScrollView>
                
                {/* BOTÃO SALVAR (Aparece em cima da área de input/chat) */}
                {iaResponse && !isIaLoading ? (
                    <TouchableOpacity style={styles.btnSave} onPress={saveIaContent}>
                        <Text style={styles.btnSaveText}>💾 Salvar Material</Text>
                    </TouchableOpacity>
                ) : null}

                {/* INPUT E BOTÕES (Barra Fica no Fundo) */}
                <View style={styles.iaInputGroup}>
                    <TextInput 
                        style={styles.iaInput} 
                        placeholder="O que você quer criar?" 
                        placeholderTextColor="#888"
                        value={iaPrompt} 
                        onChangeText={setIaPrompt} 
                        multiline 
                    />
                    <TouchableOpacity 
                        onPress={handleGenerateIa} 
                        style={[styles.iaButton, {backgroundColor: '#1154D9'}]}
                        disabled={isIaLoading}
                    >
                        {isIaLoading ? (
                            <ActivityIndicator size="small" color="#fff"/>
                        ) : (
                            <MaterialCommunityIcons name="send" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
                
            </View>
         </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fa' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', flex: 1 },
  container: { flex: 1 },
  yearCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  yearIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1154D9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  yearTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  yearSub: { fontSize: 12, color: '#888' },
  sectionBox: { backgroundColor: '#fff', padding: 20, marginBottom: 20, borderRadius: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1154D9', marginBottom: 5 },
  sectionSub: { fontSize: 12, color: '#666', marginBottom: 10 },
  planCard: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8 },
  planName: { fontWeight: 'bold', marginBottom: 5 },
  moduleText: { fontSize: 13, color: '#555', marginLeft: 5 },
  contentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  fabContainer: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', gap: 10 },
  fab: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // --- ESTILOS DO MODAL IA (DARK) ---
  iaOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  iaContent: { 
    backgroundColor: '#1e1e1e', 
    height: '80%', 
    // Removido border radius para o topo ficar flush (sem borda grossa)
  },
  
  // NOVO HEADER ESTILIZADO
  newHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15, // Adiciona o padding que foi tirado do iaContent
    borderBottomWidth: 1, 
    borderBottomColor: '#444',
  },
  logo: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  logoUp: { color: '#BAF241' },

  // CORREÇÃO: Resposta agora é FLUSH (sem borda grossa)
  iaResponseArea: { 
    flex: 1, 
    backgroundColor: '#333', 
    borderRadius: 0, 
    padding: 15,
    marginVertical: 0, // Sem margem vertical
  }, 
  
  iaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  iaTitle: { fontWeight: 'bold', fontSize: 20, color: '#fff' }, 
  iaResponseText: { color: '#BAF241', fontSize: 15, lineHeight: 22 }, 

  iaInputGroup: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '100%',
    padding: 15, // Padding para input bar
    paddingBottom: 25, // Mais espaço no final
  },
  iaInput: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#555', 
    backgroundColor: '#222', 
    color: '#fff', 
    borderRadius: 25, 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    marginRight: 10 
  },
  iaButton: { width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  btnSave: { 
      backgroundColor: '#4CAF50', 
      paddingVertical: 10, 
      borderRadius: 20, 
      alignItems: 'center', 
      marginTop: 10,
      marginHorizontal: 15 // Margem lateral para o botão salvar
  },
  btnSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});