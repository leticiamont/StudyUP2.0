import React, { useState, useCallback, useMemo, useEffect } from 'react';
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

// MAPEAMENTO VISUAL (Para ordenar os cards grandes)
const MACRO_ORDER = [
    "Ensino Fundamental 1", "Fundamental 1",
    "Ensino Fundamental 2", "Fundamental 2",
    "Ensino Médio", "Médio"
];

// MAPEAMENTO DE SÉRIES (Para ordenar o dropdown interno)
const SERIES_ORDER = [
    "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano",
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1ª Série", "2ª Série", "3ª Série"
];

export default function ProfessorConteudo({ route }) {
  const { user } = route.params;
  const navigation = useNavigation();

  const [viewMode, setViewMode] = useState('years'); // 'years' (Cards) ou 'details' (Lista)
  const [selectedMacroGrade, setSelectedMacroGrade] = useState(null); // Ex: "Ensino Médio"
  
  // Lista de Cards Grandes (Níveis)
  const [levelCards, setLevelCards] = useState([]);
  
  // Guarda todas as turmas para filtrar depois
  const [myClassesState, setMyClassesState] = useState([]);

  // Dentro do Nível: Séries disponíveis (Ex: 1ª e 2ª Série)
  const [availableSeries, setAvailableSeries] = useState([]);
  const [activeSeriesYear, setActiveSeriesYear] = useState(null); // Ex: "3ª Série"

  const [allPlansList, setAllPlansList] = useState([]); 
  const [allContents, setAllContents] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Estados IA
  const [iaModalVisible, setIaModalVisible] = useState(false);
  const [iaPrompt, setIaPrompt] = useState(''); 
  const [iaResponse, setIaResponse] = useState(''); 
  const [isIaLoading, setIsIaLoading] = useState(false);

  // --- 1. BUSCA TURMAS E GERA OS CARDS DE NÍVEL ---
  const fetchClasses = async () => {
    setLoading(true);
    try {
      const classes = await api.get('/api/classes');
      
      // Filtra apenas minhas turmas
      const myClasses = classes.filter(c => c.teacherId === user.uid);
      setMyClassesState(myClasses);

      // Agrupa por NÍVEL (gradeLevel) para fazer os cards (Fundamental, Médio...)
      const uniqueLevels = [...new Set(myClasses.map(c => c.gradeLevel || c.educationLevel))].filter(Boolean);
      
      const sortedLevels = uniqueLevels.sort((a, b) => {
          let indexA = MACRO_ORDER.indexOf(a);
          let indexB = MACRO_ORDER.indexOf(b);
          if (indexA === -1) indexA = 999;
          if (indexB === -1) indexB = 999;
          return indexA - indexB;
      });
      
      setLevelCards(sortedLevels);
    } catch (error) { console.log(error); } 
    finally { setLoading(false); }
  };

  // --- 2. AO CLICAR NO CARD, CONFIGURA AS SÉRIES ESPECÍFICAS ---
  const handlePressLevel = (macroGrade) => {
      setSelectedMacroGrade(macroGrade);
      
      // Filtra quais séries (schoolYear) eu tenho dentro desse nível
      const classesInThisLevel = myClassesState.filter(c => 
          c.gradeLevel === macroGrade || c.educationLevel === macroGrade
      );

      const realSeries = [...new Set(classesInThisLevel.map(c => c.schoolYear))].filter(Boolean);
      
      // Ordena (1º, 2º... 9º)
      realSeries.sort((a, b) => SERIES_ORDER.indexOf(a) - SERIES_ORDER.indexOf(b));

      setAvailableSeries(realSeries);

      // Seleciona a primeira série automaticamente e carrega conteúdo
      if (realSeries.length > 0) {
          setActiveSeriesYear(realSeries[0]);
      } else {
          setActiveSeriesYear(null);
      }
      
      setViewMode('details');
  };

  // --- 3. CARREGA CONTEÚDO DA SÉRIE ATIVA ---
  const fetchContentForActiveSeries = async () => {
      if (!activeSeriesYear) return;
      
      setLoading(true);
      try {
          // Busca pelo schoolYear (ex: "9º Ano")
          const plansResponse = await api.get(`/api/plans?schoolYear=${encodeURIComponent(activeSeriesYear)}`);
          setAllPlansList(Array.isArray(plansResponse) ? plansResponse : []);

          const contents = await api.get(`/api/contents?schoolYear=${encodeURIComponent(activeSeriesYear)}`);
          setAllContents(Array.isArray(contents) ? contents : []);
      } catch (e) {
          console.log(e);
      } finally {
          setLoading(false);
      }
  };

  // Monitora mudança na série ativa (Dropdown) para recarregar conteúdo
  useEffect(() => {
      if (viewMode === 'details' && activeSeriesYear) {
          fetchContentForActiveSeries();
      }
  }, [activeSeriesYear, viewMode]);

  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'years') fetchClasses();
    }, [viewMode])
  );

  const activePlan = useMemo(() => allPlansList[0], [allPlansList]);

  // --- AÇÕES ---
  
  const handleEdit = () => {
     if (!activeSeriesYear) return Alert.alert("Atenção", "Nenhuma série selecionada.");
     navigation.navigate('EditorPlanoAula', { 
         isContent: true, 
         plan: { name: '', gradeLevel: selectedMacroGrade, schoolYear: activeSeriesYear, content: '' } 
     });
  };

  const handleOpenItem = (item) => {
      if (item.url) {
          navigation.navigate('ViewPDF', { url: item.url });
      } else if (item.type === 'text') {
          navigation.navigate('EditorPlanoAula', { isContent: true, plan: item });
      }
  };

  const handleUpload = async () => {
      if (!activeSeriesYear) return Alert.alert("Erro", "Selecione uma série específica no topo.");

      try {
        const docResult = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] });
        if (!docResult.canceled && docResult.assets) {
          const file = docResult.assets[0];
          const formData = new FormData();
          if (Platform.OS === 'web') { formData.append('file', file.file, file.name); } 
          else { formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType }); }
          
          formData.append('schoolYear', activeSeriesYear); 
          formData.append('gradeLevel', selectedMacroGrade); 
          formData.append('name', file.name);

          Alert.alert('Enviando...', 'Carregando arquivo...');
          const token = await AsyncStorage.getItem('userToken');
          
          // ATENÇÃO: Verifique se o IP está correto
          const response = await fetch('http://192.168.15.30:3000/api/contents/upload', {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData,
          });
          
          if (!response.ok) throw new Error('Falha');
          Alert.alert('Sucesso!', 'Arquivo enviado.');
          fetchContentForActiveSeries();
        }
      } catch (error) { Alert.alert('Erro', 'Falha ao enviar arquivo.'); }
  };

  const deleteContent = async (id) => {
      // VERIFICAÇÃO PARA WEB (COMPUTADOR)
      if (Platform.OS === 'web') {
          if (window.confirm("Tem certeza que deseja apagar este item?")) {
              try { 
                  await api.delete(`/api/contents/${id}`); 
                  fetchContentForActiveSeries(); 
              } catch (error) { 
                  alert("Erro ao apagar: " + error.message); 
              }
          }
      } 
      // VERIFICAÇÃO PARA MOBILE (CELULAR)
      else {
          Alert.alert("Apagar", "Tem certeza?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Apagar", style: "destructive", onPress: async () => {
                  try { 
                      await api.delete(`/api/contents/${id}`); 
                      fetchContentForActiveSeries(); 
                  } catch (error) { 
                      Alert.alert("Erro", "Não foi possível apagar."); 
                  }
              }}
          ]);
      }
  }
  
  const openIAModal = () => {
      setIaPrompt('');
      setIaResponse('');
      setIaModalVisible(true);
  };

  const handleGenerateIa = async () => {
    if (!iaPrompt.trim()) return;
    setIsIaLoading(true);
    setIaResponse('');
    try {
      const data = await api.post('/api/ia/gerar', { prompt: iaPrompt });
      setIaResponse(data.resposta);
    } catch (e) { Alert.alert('Erro IA', 'Não foi possível gerar a resposta.'); }
    finally { setIsIaLoading(false); }
  };

  const saveIaContent = async () => {
      try {
          await api.post('/api/contents', { 
              name: `IA: ${iaPrompt.substring(0,15)}...`,
              content: iaResponse,
              type: 'text',
              schoolYear: activeSeriesYear,
              gradeLevel: selectedMacroGrade
          });
          setIaModalVisible(false);
          fetchContentForActiveSeries();
      } catch (e) { Alert.alert('Erro ao salvar'); }
  };

  const renderYearCard = ({ item }) => (
    <TouchableOpacity style={styles.yearCard} onPress={() => handlePressLevel(item)}>
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
        <Text style={styles.headerTitle}>{viewMode === 'years' ? 'Meus Níveis de Ensino' : selectedMacroGrade}</Text>
        <View style={{width: 24}} />
      </View>

      {/* VISTA 1: CARDS DE NÍVEL */}
      {viewMode === 'years' && (
          <View style={styles.container}>
              {loading ? <ActivityIndicator color="#1154D9" /> : (
                  <FlatList 
                    data={levelCards}
                    keyExtractor={item => item}
                    renderItem={renderYearCard}
                    ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma turma encontrada.</Text>}
                    contentContainerStyle={{padding: 20}}
                  />
              )}
          </View>
      )}

      {/* VISTA 2: DETALHES COM DROPDOWN */}
      {viewMode === 'details' && (
          <View style={styles.container}>
             <ScrollView contentContainerStyle={{padding: 20}}>
                
                {availableSeries.length > 0 ? (
                    <>
                        <Text style={styles.filterLabel}>Selecionar Série:</Text>
                        <TouchableOpacity 
                            style={styles.dropdownButton} 
                            onPress={() => setDropdownVisible(true)}
                        >
                            <Text style={styles.dropdownText}>{activeSeriesYear || "Selecione..."}</Text>
                            <MaterialCommunityIcons name="chevron-down" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </>
                ) : (
                    <Text style={[styles.emptyText, {marginBottom:20}]}>
                        Nenhuma série específica encontrada.
                    </Text>
                )}

                {/* PLANEJAMENTO */}
                <View style={styles.sectionBox}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>📖 Planejamento ({activeSeriesYear})</Text>
                        <MaterialCommunityIcons name="lock" size={16} color="#888" /> 
                    </View>
                    
                    {activePlan ? (
                        <View style={styles.planCard}>
                            <Text style={styles.planName}>{activePlan.name}</Text>
                            {activePlan.pdfUrl ? (
                                <TouchableOpacity 
                                    style={styles.viewPdfButton}
                                    onPress={() => navigation.navigate('ViewPDF', { url: activePlan.pdfUrl })}
                                >
                                    <MaterialCommunityIcons name="file-pdf-box" size={20} color="#1154D9" />
                                    <Text style={styles.viewPdfText}>Visualizar PDF</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={{fontSize: 12, color: '#666', marginTop: 5, fontStyle:'italic'}}>(Sem PDF)</Text>
                            )}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>Nenhum plano cadastrado.</Text>
                    )}
                </View>

                {/* CONTEÚDOS COM BOTÃO DE EXCLUIR CORRIGIDO */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>📂 Materiais: {activeSeriesYear}</Text>
                    
                    {allContents.map(item => (
                        <View key={item.id} style={styles.contentItemRow}>
                            <TouchableOpacity 
                                style={styles.contentInfoArea} 
                                onPress={() => handleOpenItem(item)}
                            >
                                <MaterialCommunityIcons 
                                    name={item.type === 'pdf' || (item.url && item.url.includes('.pdf')) ? "file-pdf-box" : "text-box"} 
                                    size={24} 
                                    color={item.type === 'pdf' || (item.url && item.url.includes('.pdf')) ? "#E91E63" : "#1154D9"} 
                                />
                                <Text style={styles.contentText} numberOfLines={1}>
                                    {item.name}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => deleteContent(item.id)} 
                                style={styles.deleteButton}
                                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                            >
                                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#D32F2F" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {allContents.length === 0 && (
                        <Text style={styles.emptyText}>Nada criado para {activeSeriesYear}.</Text>
                    )}
                </View>
                <View style={{height: 80}} />
             </ScrollView>

             {/* FABs */}
             <View style={styles.fabContainer}>
                <TouchableOpacity style={[styles.fab, {backgroundColor: '#9C27B0'}]} onPress={openIAModal}>
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

      {/* MODAIS (Dropdown e IA) */}
      <Modal visible={dropdownVisible} transparent animationType="fade" onRequestClose={() => setDropdownVisible(false)}>
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
             <View style={styles.dropdownModalContent}>
                <Text style={styles.dropdownModalTitle}>Selecione a Série</Text>
                <FlatList 
                    data={availableSeries}
                    keyExtractor={item => item}
                    renderItem={({item}) => (
                        <TouchableOpacity 
                            style={[styles.dropdownOption, activeSeriesYear === item && styles.dropdownOptionActive]}
                            onPress={() => { setActiveSeriesYear(item); setDropdownVisible(false); }}
                        >
                            <Text style={[styles.dropdownOptionText, activeSeriesYear === item && {color:'#1154D9', fontWeight:'bold'}]}>
                                {item}
                            </Text>
                            {activeSeriesYear === item && <MaterialCommunityIcons name="check" size={20} color="#1154D9" />}
                        </TouchableOpacity>
                    )}
                />
             </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={iaModalVisible} transparent animationType="slide">
         <View style={styles.iaOverlay}>
            <View style={styles.iaContent}>
                <View style={styles.newHeader}>
                  <Text style={styles.logo}>STUDY<Text style={styles.logoUp}>UP</Text></Text>
                  <TouchableOpacity onPress={() => setIaModalVisible(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.iaResponseArea}>
                    {isIaLoading ? (
                        <ActivityIndicator size="large" color="#BAF241" style={{marginTop: 20}} />
                    ) : (
                        <Text style={styles.iaResponseText}>
                            {iaResponse || `Criando para ${activeSeriesYear}...`}
                        </Text>
                    )}
                </ScrollView>
                {iaResponse && !isIaLoading ? (
                    <TouchableOpacity style={styles.btnSave} onPress={saveIaContent}>
                        <Text style={styles.btnSaveText}>💾 Salvar Material</Text>
                    </TouchableOpacity>
                ) : null}
                <View style={styles.iaInputGroup}>
                    <TextInput 
                        style={styles.iaInput} 
                        placeholder="O que criar?" 
                        placeholderTextColor="#888"
                        value={iaPrompt} 
                        onChangeText={setIaPrompt} 
                        multiline 
                    />
                    <TouchableOpacity onPress={handleGenerateIa} style={[styles.iaButton, {backgroundColor: '#1154D9'}]}>
                        {isIaLoading ? <ActivityIndicator size="small" color="#fff"/> : <MaterialCommunityIcons name="send" size={20} color="#fff" />}
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
  
  // CARDS DE NÍVEL
  yearCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  yearIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1154D9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  yearTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  yearSub: { fontSize: 12, color: '#888' },
  
  // SEÇÕES
  sectionBox: { backgroundColor: '#fff', padding: 20, marginBottom: 20, borderRadius: 10 },
  sectionHeaderRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1154D9', marginBottom: 5 },
  
  // DROPDOWN
  filterLabel: { fontSize: 14, color: '#555', fontWeight: 'bold', marginBottom: 8, marginLeft: 5 },
  dropdownButton: {
    backgroundColor: '#1154D9',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3
  },
  dropdownText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // PLANOS DE AULA
  planCard: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8 },
  planName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  viewPdfButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8, marginTop: 10, alignSelf: 'flex-start' },
  viewPdfText: { color: '#1154D9', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },

  // --- ESTILOS DA LISTA DE CONTEÚDOS ---
  contentItemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    backgroundColor: '#fff' 
  },
  contentInfoArea: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  contentText: { 
    flex: 1, 
    marginLeft: 10, 
    fontSize: 14, 
    color: '#333' 
  },
  deleteButton: { 
    padding: 10, 
    marginLeft: 5 
  },

  emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  
  // FABs
  fabContainer: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', gap: 10 },
  fab: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // MODAIS (Dropdown e IA)
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownModalContent: { backgroundColor: '#fff', borderRadius: 15, width: '80%', padding: 20, maxHeight: '50%', elevation: 5 },
  dropdownModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  dropdownOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownOptionActive: { backgroundColor: '#F0F7FF' },
  dropdownOptionText: { fontSize: 16, color: '#333' },

  iaOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  iaContent: { backgroundColor: '#1e1e1e', height: '80%' },
  newHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#444' },
  logo: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  logoUp: { color: '#BAF241' },
  iaResponseArea: { flex: 1, backgroundColor: '#333', borderRadius: 0, padding: 15, marginVertical: 0 },
  iaResponseText: { color: '#BAF241', fontSize: 15, lineHeight: 22 },
  iaInputGroup: { flexDirection: 'row', alignItems: 'center', width: '100%', padding: 15, paddingBottom: 25 },
  iaInput: { flex: 1, borderWidth: 1, borderColor: '#555', backgroundColor: '#222', color: '#fff', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  iaButton: { width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  btnSave: { backgroundColor: '#4CAF50', paddingVertical: 10, borderRadius: 20, alignItems: 'center', marginTop: 10, marginHorizontal: 15 },
  btnSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});