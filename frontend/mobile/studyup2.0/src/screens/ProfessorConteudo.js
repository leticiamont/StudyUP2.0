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
  const [selectedYear, setSelectedYear] = useState(null); // Mudado de selectedGrade para selectedYear
  const [yearsList, setYearsList] = useState([]);
  const [myContents, setMyContents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados IA (Mantidos)
  const [iaModalVisible, setIaModalVisible] = useState(false);
  const [iaPrompt, setIaPrompt] = useState('');
  const [iaResponse, setIaResponse] = useState('');
  const [isIaLoading, setIsIaLoading] = useState(false);

  // 1. Busca os ANOS (Ex: "9º Ano", "3ª Série") que o professor tem
  const fetchYears = async () => {
    setLoading(true);
    try {
      const classes = await api.get('/api/classes');
      const myClasses = classes.filter(c => c.teacherId === (user.uid || user.id));
      
      // CORREÇÃO: Agrupa por 'schoolYear' (específico) em vez de 'gradeLevel' (genérico)
      const uniqueYears = [...new Set(myClasses.map(c => c.schoolYear))].filter(y => y).sort();
      setYearsList(uniqueYears);
    } catch (error) { console.log(error); } 
    finally { setLoading(false); }
  };

  // 2. Abre detalhes de um Ano específico
  const openYearDetails = async (year) => {
    setSelectedYear(year);
    setViewMode('details');
    setLoading(true);
    try {
      // CORREÇÃO: Busca conteúdos filtrando pelo schoolYear
      const contents = await api.get(`/api/contents?schoolYear=${encodeURIComponent(year)}`);
      setMyContents(contents);
    } catch (error) { Alert.alert("Erro", "Falha ao carregar dados."); } 
    finally { setLoading(false); }
  };

  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'years') fetchYears();
      else if (selectedYear) openYearDetails(selectedYear);
    }, [viewMode])
  );

  // --- AÇÕES ---

  const handleEdit = () => {
     // Passa o schoolYear para o editor saber onde salvar
     navigation.navigate('EditorPlanoAula', { 
         isContent: true, 
         plan: { name: '', schoolYear: selectedYear, content: '' } 
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
          
          // CORREÇÃO: Salva o schoolYear no upload
          formData.append('schoolYear', selectedYear); 
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
          openYearDetails(selectedYear);
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
                          openYearDetails(selectedYear); 
                      } catch (error) {
                          Alert.alert("Erro", "Não foi possível apagar.");
                      }
                  }
              }
          ]
      );
  }

  // ... (Lógica de IA e Renderização abaixo mantidas iguais, só ajustando nomes de variáveis)

  const handleGenerateIa = async () => { /* ... igual ... */ };
  const saveIaContent = async () => { /* ... usa selectedYear ... */ };

  const renderYearCard = ({ item }) => (
    <TouchableOpacity style={styles.yearCard} onPress={() => openYearDetails(item)}>
        <View style={styles.yearIcon}><MaterialCommunityIcons name="school" size={32} color="#fff" /></View>
        <View>
            <Text style={styles.yearTitle}>{item}</Text>
            <Text style={styles.yearSub}>Toque para gerenciar materiais</Text>
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
        {/* Título Dinâmico */}
        <Text style={styles.headerTitle}>{viewMode === 'years' ? 'Conteúdos por Ano' : selectedYear}</Text>
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
                
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>📂 Materiais de Aula</Text>
                    <Text style={styles.sectionSub}>Arquivos compartilhados com todas as turmas de {selectedYear}.</Text>
                    
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
             </ScrollView>
             {/* FABs mantidos */}
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

      {/* Modal IA mantido igual */}
      {/* ... */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (Mesmos estilos do anterior)
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
  contentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  fabContainer: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', gap: 10 },
  fab: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  // ... (estilos IA)
});