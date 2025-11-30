import React, { useState, useCallback, useMemo } from 'react';
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

// 1. MAPEAMENTO E ORDEM (Usado apenas para ordenação visual agora)
const SERIES_MAP = {
    "Ensino Médio": ["1ª Série", "2ª Série", "3ª Série"],
    "Médio": ["1ª Série", "2ª Série", "3ª Série"],
    "Ensino Fundamental 2": ["6º Ano", "7º Ano", "8º Ano", "9º Ano"],
    "Fundamental 2": ["6º Ano", "7º Ano", "8º Ano", "9º Ano"],
    "Ensino Fundamental 1": ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"],
    "Fundamental 1": ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"]
};

const GRADE_ORDER = [
    "Ensino Fundamental 1", "Fundamental 1",
    "Ensino Fundamental 2", "Fundamental 2",
    "Ensino Médio", "Médio"
];

export default function ProfessorConteudo({ route }) {
  const { user } = route.params;
  const navigation = useNavigation();

  const [viewMode, setViewMode] = useState('years');
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [yearsList, setYearsList] = useState([]);
  
  // NOVO: Guarda as turmas da professora para filtrar as séries depois
  const [myClassesState, setMyClassesState] = useState([]);

  const [allPlansList, setAllPlansList] = useState([]); 
  const [allContents, setAllContents] = useState([]); 
  const [availableSeries, setAvailableSeries] = useState([]); 
  const [activeSeriesYear, setActiveSeriesYear] = useState(null); 
  const [loading, setLoading] = useState(false);

  // ESTADO DO DROPDOWN
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Estados IA
  const [iaModalVisible, setIaModalVisible] = useState(false);
  const [iaPrompt, setIaPrompt] = useState(''); 
  const [iaResponse, setIaResponse] = useState(''); 
  const [isIaLoading, setIsIaLoading] = useState(false);

  // --- FUNÇÕES DE DADOS ---
  const fetchYears = async () => {
    setLoading(true);
    try {
      const classes = await api.get('/api/classes');
      
      // Filtra apenas as turmas DESTE professor
      const myClasses = classes.filter(c => c.teacherId === user.uid);
      setMyClassesState(myClasses); // <--- Salvamos para usar depois no dropdown

      // Agrupa os Níveis (Cards Grandes)
      const uniqueGrades = [...new Set(myClasses.map(c => c.gradeLevel))];
      
      const sortedGrades = uniqueGrades.sort((a, b) => {
          let indexA = GRADE_ORDER.indexOf(a);
          let indexB = GRADE_ORDER.indexOf(b);
          if (indexA === -1) indexA = 999;
          if (indexB === -1) indexB = 999;
          return indexA - indexB;
      });
      setYearsList(sortedGrades);
    } catch (error) { console.log(error); } 
    finally { setLoading(false); }
  };

  const loadContentsAndSeries = async (grade) => {
    setSelectedGrade(grade);
    setLoading(true);
    try {
      const plansResponse = await api.get(`/api/plans?gradeLevel=${encodeURIComponent(grade)}`);
      setAllPlansList(Array.isArray(plansResponse) ? plansResponse : []);

      const contents = await api.get(`/api/contents?gradeLevel=${encodeURIComponent(grade)}`);
      setAllContents(Array.isArray(contents) ? contents : []);
      
      // --- LÓGICA CORRIGIDA DO FILTRO DE SÉRIES ---
      // 1. Pega todas as turmas que a professora tem nesse Nível (ex: Médio)
      const classesInThisGrade = myClassesState.filter(c => c.gradeLevel === grade);
      
      // 2. Extrai as séries específicas (ex: "3ª Série") dessas turmas
      // Usa Set para não repetir se ela tiver "3ª A" e "3ª B"
      const realSeries = [...new Set(classesInThisGrade.map(c => c.schoolYear))].filter(Boolean);

      // 3. Ordena visualmente (1º, 2º, 3º...) usando o mapa padrão
      const orderMap = SERIES_MAP[grade] || [];
      const sortedSeries = realSeries.sort((a, b) => {
          return orderMap.indexOf(a) - orderMap.indexOf(b);
      });

      setAvailableSeries(sortedSeries);
      
      // 4. Seleciona automaticamente a primeira série disponível
      if (sortedSeries.length > 0) {
          if (!activeSeriesYear || !sortedSeries.includes(activeSeriesYear)) {
             setActiveSeriesYear(sortedSeries[0]);
          }
      } else {
          setActiveSeriesYear(null);
      }

    } catch (error) { Alert.alert("Erro", "Falha ao carregar materiais."); } 
    finally { setLoading(false); }
  };

  const openGradeDetails = (grade) => {
    setViewMode('details');
    // Reseta a série ao entrar, para que a lógica acima selecione a primeira válida
    setActiveSeriesYear(null); 
    loadContentsAndSeries(grade);
  };

  const activePlan = useMemo(() => {
      if (!activeSeriesYear || allPlansList.length === 0) return null;
      const match = allPlansList.find(p => p.schoolYear === activeSeriesYear);
      if (!match) return allPlansList.find(p => p.name && p.name.includes(activeSeriesYear));
      return match;
  }, [allPlansList, activeSeriesYear]);

  const filteredContents = useMemo(() => {
      if (!activeSeriesYear) return allContents;
      return allContents.filter(item => item.schoolYear === activeSeriesYear);
  }, [allContents, activeSeriesYear]);

  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'years') fetchYears();
      else if (selectedGrade) loadContentsAndSeries(selectedGrade);
    }, [viewMode])
  );

  // --- AÇÕES ---
  
  const handleEdit = () => {
     if (!activeSeriesYear) return Alert.alert("Atenção", "Selecione uma Série primeiro.");
     navigation.navigate('EditorPlanoAula', { 
         isContent: true, 
         plan: { name: '', gradeLevel: selectedGrade, schoolYear: activeSeriesYear, content: '' } 
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
      if (!activeSeriesYear) return Alert.alert("Atenção", "Selecione uma Série antes de enviar arquivos.");

      try {
        const docResult = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] });
        if (!docResult.canceled && docResult.assets) {
          const file = docResult.assets[0];
          const formData = new FormData();
          if (Platform.OS === 'web') { formData.append('file', file.file, file.name); } 
          else { formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType }); }
          
          formData.append('gradeLevel', selectedGrade); 
          formData.append('schoolYear', activeSeriesYear); 
          formData.append('name', file.name);

          Alert.alert('Enviando...', 'Carregando arquivo...');
          const token = await AsyncStorage.getItem('userToken');
          
          // ATENÇÃO: Verifique se este IP está correto para o seu ambiente
          const response = await fetch('http://192.168.0.90:3000/api/contents/upload', {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData,
          });
          
          if (!response.ok) throw new Error('Falha');
          Alert.alert('Sucesso!', 'Arquivo enviado.');
          loadContentsAndSeries(selectedGrade);
        }
      } catch (error) { Alert.alert('Erro', 'Falha ao enviar arquivo.'); }
  };

  const deleteContent = async (id) => {
      Alert.alert("Apagar", "Tem certeza?", [
          { text: "Cancelar", style: "cancel" },
          { text: "Apagar", style: "destructive", onPress: async () => {
              try { await api.delete(`/api/contents/${id}`); loadContentsAndSeries(selectedGrade); } 
              catch (error) { Alert.alert("Erro", "Não foi possível apagar."); }
          }}
      ]);
  }
  
  const openIAModal = () => {
      if (!activeSeriesYear) return Alert.alert("Atenção", "Selecione uma Série para a IA criar o conteúdo.");
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
      if (!activeSeriesYear) return Alert.alert("Erro", "Série não selecionada.");
      
      try {
          await api.post('/api/contents', { 
              name: `IA: ${iaPrompt.substring(0,15)}...`,
              content: iaResponse,
              type: 'text',
              gradeLevel: selectedGrade,
              schoolYear: activeSeriesYear 
          });
          setIaModalVisible(false);
          setIaPrompt('');
          setIaResponse('');
          loadContentsAndSeries(selectedGrade);
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
                
                {/* DROPDOWN AZUL (AGORA FILTRADO PELAS TURMAS REAIS) */}
                {availableSeries.length > 0 ? (
                    <>
                        <Text style={styles.filterLabel}>Filtrar Série:</Text>
                        <TouchableOpacity 
                            style={styles.dropdownButton} 
                            onPress={() => setDropdownVisible(true)}
                        >
                            <Text style={styles.dropdownText}>{activeSeriesYear || "Selecione a Série"}</Text>
                            <MaterialCommunityIcons name="chevron-down" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </>
                ) : (
                    <Text style={[styles.emptyText, {marginBottom:20}]}>
                        Você não tem turmas cadastradas para este nível.
                    </Text>
                )}

                {/* BLOCO PLANEJAMENTO */}
                <View style={styles.sectionBox}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>
                            📖 Planejamento ({activeSeriesYear || 'Geral'})
                        </Text>
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
                                    <Text style={styles.viewPdfText}>Visualizar PDF do Plano</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={{fontSize: 12, color: '#666', marginTop: 5, fontStyle:'italic'}}>
                                    (Este plano não possui PDF anexado)
                                </Text>
                            )}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>Nenhum plano cadastrado para {activeSeriesYear}.</Text>
                    )}
                </View>

                {/* BLOCO MEUS MATERIAIS */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>📂 Materiais: {activeSeriesYear}</Text>
                    
                    {filteredContents.map(item => (
                        <TouchableOpacity key={item.id} style={styles.contentItem} onPress={() => handleOpenItem(item)}>
                            <MaterialCommunityIcons name={item.url ? "file-pdf-box" : "text-box"} size={24} color="#555" />
                            <Text style={{flex: 1, marginLeft: 10}} numberOfLines={1}>{item.name}</Text>
                            <TouchableOpacity onPress={() => deleteContent(item.id)} style={{padding: 5}}>
                                <MaterialCommunityIcons name="trash-can" size={20} color="red" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                    {filteredContents.length === 0 && (
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

      {/* MODAL DE SELEÇÃO (DROPDOWN) */}
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

      {/* MODAL IA */}
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
                            {iaResponse || `Seu assistente está pronto para criar conteúdo para ${activeSeriesYear}.`}
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
  sectionHeaderRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1154D9', marginBottom: 5 },
  
  // ESTILOS DO DROPDOWN
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
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3
  },
  dropdownText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // ESTILOS DO BOTÃO VIEW PDF
  viewPdfButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E3F2FD',
      padding: 10,
      borderRadius: 8,
      marginTop: 10,
      alignSelf: 'flex-start'
  },
  viewPdfText: { color: '#1154D9', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },

  // Modal do Dropdown
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownModalContent: { backgroundColor: '#fff', borderRadius: 15, width: '80%', padding: 20, maxHeight: '50%', elevation: 5 },
  dropdownModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  dropdownOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownOptionActive: { backgroundColor: '#F0F7FF' },
  dropdownOptionText: { fontSize: 16, color: '#333' },

  planCard: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8 },
  planName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  moduleText: { fontSize: 13, color: '#555', marginLeft: 5 },
  contentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  fabContainer: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', gap: 10 },
  fab: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // MODAL IA
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