import React, { useState, useCallback } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, StatusBar,
    Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // <--- IMPORTANTE
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PlanCard = ({ plan, onPressView, onPressEdit, onPressDelete }) => {
  const isPdf = !!plan.url; // Se tem URL, é PDF/Arquivo

  return (
    <View style={styles.contentCard}>
      
      {/* CLIQUE PRINCIPAL (Área do Texto) */}
      {/* Se for PDF, clica e vê. Se for Texto, clica e edita. */}
      <TouchableOpacity 
        style={styles.cardMainArea} 
        onPress={isPdf ? onPressView : onPressEdit}
      >
        <View style={styles.contentIcon}>
          <MaterialCommunityIcons 
            name={isPdf ? "file-pdf-box" : "script-text-outline"} 
            size={30} 
            color="#1154D9" 
          />
        </View>
        <View style={styles.contentInfo}>
          <Text style={styles.contentName} numberOfLines={1}>{plan.name}</Text>
          <Text style={styles.contentType}>{plan.gradeLevel || 'Geral'}</Text>
        </View>
      </TouchableOpacity>
      
      {/* BOTÕES LATERAIS */}
      <View style={styles.actionButtons}>
        
        {/* LÓGICA: 
            - Se for PDF: Mostra OLHO (Visualizar)
            - Se for Texto: Mostra LÁPIS (Editar) 
        */}
        
        {isPdf ? (
          // É PDF -> Botão Ver
          <TouchableOpacity onPress={onPressView} style={styles.iconBtn}>
            <MaterialCommunityIcons name="eye" size={24} color="#1154D9" />
          </TouchableOpacity>
        ) : (
          // É TEXTO -> Botão Editar
          <TouchableOpacity onPress={onPressEdit} style={styles.iconBtn}>
            <MaterialCommunityIcons name="pencil" size={24} color="#555" />
          </TouchableOpacity>
        )}

        {/* LIXEIRA (Sempre aparece) */}
        <TouchableOpacity onPress={onPressDelete} style={styles.iconBtn}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color="#D32F2F" />
        </TouchableOpacity>
      </View>

    </View>
  );
};

export default function ProfessorConteudo({ route }) {
  const navigation = useNavigation();
  
  const [plans, setPlans] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [iaModalVisible, setIaModalVisible] = useState(false);
  const [iaPrompt, setIaPrompt] = useState(''); 
  const [iaResponse, setIaResponse] = useState(''); 
  const [isIaLoading, setIsIaLoading] = useState(false); 

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const [plansData, contentsData] = await Promise.all([
        api.get('/api/plans'),
        api.get('/api/contents')
      ]);

      const validPlans = Array.isArray(plansData) ? plansData : [];
      const validContents = Array.isArray(contentsData) ? contentsData.map(c => ({...c, isContent: true})) : [];

      const combined = [...validPlans, ...validContents];
      combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setPlans(combined);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };
  
 useFocusEffect(
  useCallback(() => {
    fetchPlans();
  }, [])
);

  const handleDelete = (item) => {
    const endpoint = item.isContent ? `/api/contents/${item.id}` : `/api/plans/${item.id}`;

    const executeDelete = async () => {
      try {
        await api.delete(endpoint);
        Alert.alert("Sucesso", "Item apagado.");
        fetchPlans(); 
      } catch (error) {
        console.error(error);
        Alert.alert("Erro", "Não foi possível apagar.");
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`Tem certeza que deseja apagar "${item.name}"?`)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        "Apagar item",
        `Tem certeza que deseja apagar "${item.name}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Apagar", style: "destructive", onPress: executeDelete }
        ]
      );
    }
  };

  const handleGenerateIa = async () => {
    if (iaPrompt.trim().length === 0) {
      Alert.alert('Erro', 'Por favor, escreva um prompt.');
      return;
    }
    setIsIaLoading(true);
    setIaResponse(''); 
    try {
      const data = await api.post('/api/ia/gerar', { prompt: iaPrompt });
      setIaResponse(data.resposta); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar a resposta da IA.');
    } finally {
      setIsIaLoading(false);
    }
  };

  const handleSaveIaContent = async () => {
    if (!iaResponse) return;
    
    try {
      await api.post('/api/plans', {
        name: `Plano IA: ${iaPrompt.substring(0, 15)}...`,
        gradeLevel: 'Gerado por IA',
        // Estrutura padrão para salvar o texto
        modules: [{ title: 'Conteúdo Principal', topics: [{ title: 'Texto', description: iaResponse }] }]
      });
      
      Alert.alert("Salvo!", "O plano foi salvo na sua lista.");
      setIaModalVisible(false);
      setIaPrompt('');
      setIaResponse('');
      fetchPlans(); 
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar.");
    }
  };

  const handleFileUpload = async () => {
    try {
      const docResult = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: false,
      });

      if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
        const file = docResult.assets[0];
        const formData = new FormData();
        
        if (Platform.OS === 'web') {
          formData.append('file', file.file, file.name); 
        } else {
          formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType,
          });
        }
        
        Alert.alert('A carregar...', 'A enviar o seu ficheiro. Por favor, aguarde.');
        
        const backendUrl = 'http://localhost:3000/api/contents/upload'; 
        const token = await AsyncStorage.getItem('userToken'); 
        
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro no servidor.');
        }

        const newFile = await response.json();
        Alert.alert('Sucesso!', `Ficheiro "${newFile.name}" carregado.`);
        fetchPlans();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', error.message || 'Falha no upload.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Banco de Planos</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.pencilButton} 
            onPress={() => navigation.navigate('EditorPlanoAula', { plan: { name: 'Novo Plano', content: '' } })}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleFileUpload}>
            <MaterialCommunityIcons name="plus" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iaButton} onPress={() => setIaModalVisible(true)}>
            <MaterialCommunityIcons name="auto-fix" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 20}} />
        ) : (
          plans.map((plan) => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              onPressView={() => {
                if (plan.url) {
                  navigation.navigate('ViewPDF', { url: plan.url });
                } else {
                  navigation.navigate('EditorPlanoAula', { plan: plan });
                }
              }}
              onPressEdit={() => {
                if (!plan.url) navigation.navigate('EditorPlanoAula', { plan: plan });
              }}
              onPressDelete={() => handleDelete(plan)}
            />
          ))
        )}
        <View style={{height: 50}}/>
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={iaModalVisible} onRequestClose={() => setIaModalVisible(false)}>
        <View style={styles.iaModalOverlay}>
          <View style={styles.iaModalContent}>
            <View style={styles.iaHeader}>
              <Text style={styles.iaTitle}>✨ Assistente Gemini</Text>
              <TouchableOpacity onPress={() => setIaModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.iaResponseArea}>
              {isIaLoading ? (
                <ActivityIndicator size="large" color="#BAF241" style={{marginTop: 20}} />
              ) : (
                <Text style={styles.iaResponseText}>
                  {iaResponse || 'Digite um tema abaixo para eu criar um plano de aula ou explicação para você.'}
                </Text>
              )}
            </ScrollView>
            {iaResponse !== '' && (
              <TouchableOpacity style={{backgroundColor: '#BAF241', padding: 10, borderRadius: 8, marginBottom: 10, alignItems: 'center'}} onPress={handleSaveIaContent}>
                <Text style={{color: '#000', fontWeight: 'bold'}}>💾 Salvar como Plano</Text>
              </TouchableOpacity>
            )}
            <View style={styles.iaInputContainer}>
              <TextInput style={styles.iaInput} placeholder="Ex: Plano de aula..." placeholderTextColor="#999" value={iaPrompt} onChangeText={setIaPrompt} />
              <TouchableOpacity style={styles.iaSendButton} onPress={handleGenerateIa} disabled={isIaLoading}>
                <MaterialCommunityIcons name="send" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fa', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  pencilButton: { backgroundColor: '#f0f0f0', padding: 8, borderRadius: 20, marginRight: 10 },
  addButton: { backgroundColor: '#f0f0f0', padding: 8, borderRadius: 20, marginRight: 10 },
  iaButton: { backgroundColor: '#BAF241', padding: 8, borderRadius: 20 },
  container: { flex: 1, padding: 20 },
  contentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardMainArea: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  contentIcon: { marginRight: 15 },
  contentInfo: { flex: 1 },
  contentName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  contentType: { fontSize: 14, color: '#555' },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 12, padding: 4 },
  iaModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  iaModalContent: { backgroundColor: '#1E1F20', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', padding: 20 },
  iaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  iaTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  iaResponseArea: { flex: 1, marginBottom: 15 },
  iaResponseText: { fontSize: 16, color: '#E0E0E0', lineHeight: 24 },
  iaInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', borderRadius: 30, padding: 5 },
  iaInput: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 10, paddingHorizontal: 15 },
  iaSendButton: { backgroundColor: '#1154D9', borderRadius: 25, padding: 10, marginLeft: 5 },
});