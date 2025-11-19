import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    ScrollView, 
    TouchableOpacity, 
    Platform, 
    StatusBar,
    Modal, 
    TextInput, 
    Alert, 
    ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService'; 
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PlanCard = ({ plan, onPress }) => (
  <TouchableOpacity style={styles.contentCard} onPress={onPress}>
    <View style={styles.contentIcon}>
      {/* Mostra ícone de PDF se tiver URL, senão mostra prancheta */}
      <MaterialCommunityIcons 
        name={plan.url ? "file-pdf-box" : "clipboard-text"} 
        size={30} 
        color="#1154D9" 
      />
    </View>
    <View style={styles.contentInfo}>
      <Text style={styles.contentName}>{plan.name}</Text>
      <Text style={styles.contentType}>Nível: {plan.gradeLevel || 'Não definido'}</Text>
    </View>
    <View style={styles.manageButton}>
      <MaterialCommunityIcons name={plan.url ? "eye" : "pencil"} size={24} color="#555" />
    </View>
  </TouchableOpacity>
);

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
      const data = await api.get('/api/plans');
      setPlans(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os planos de aula.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para a IA (Gemini) - ARRUMAR
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

  const handleFileUpload = async () => {
    try {
      const docResult = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: false,
      });

      if (docResult.assets && docResult.assets.length > 0) {
        const file = docResult.assets[0];
        
        const formData = new FormData();
        
        // Ajuste para Web vs Mobile
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
        
        // Lembre-se de ajustar o URL se estiver no celular (seu IP) vs Web (localhost)
        const backendUrl = 'http://localhost:3000/api/contents/upload'; 
        const token = await AsyncStorage.getItem('userToken'); 
        
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro no servidor durante o upload.');
        }

        const newFile = await response.json();
        Alert.alert('Sucesso!', `Ficheiro "${newFile.name}" carregado.`);

        setPlans(prev => [...prev, {
          id: newFile.id || new Date().getTime().toString(),
          name: newFile.name,
          url: newFile.url,
          gradeLevel: "Novo Conteúdo"
        }]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar o ficheiro.');
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. CABEÇALHO */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Banco de Planos</Text>
        <View style={styles.headerButtons}>
          
          {/* Botão Lápis (Editor) */}
          <TouchableOpacity 
            style={styles.pencilButton} 
            onPress={() => navigation.navigate('EditorPlanoAula', { plan: { name: 'Novo Plano', content: '' } })}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#333" />
          </TouchableOpacity>
          
          {/* Botão Mais (Upload) */}
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleFileUpload}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#333" />
          </TouchableOpacity>
          
          {/* Botão IA */}
          <TouchableOpacity style={styles.iaButton} onPress={() => setIaModalVisible(true)}>
            <MaterialCommunityIcons name="auto-fix" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container}>
        {/* 2. Lista de Planos */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 20}} />
        ) : (
          plans.map((plan) => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              onPress={() => {
                if (plan.url) {
                  navigation.navigate('ViewPDF', { url: plan.url });
                } else {
                  navigation.navigate('EditorPlanoAula', { plan: plan });
                }
              }}
            />
          ))
        )}
      </ScrollView>

      {/* 3. O MODAL DA IA */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={iaModalVisible}
        onRequestClose={() => setIaModalVisible(false)}
      >
        <View style={styles.iaModalOverlay}>
          <View style={styles.iaModalContent}>
            <View style={styles.iaHeader}>
              <Text style={styles.iaTitle}>Gerador de Conteúdo (IA)</Text>
              <TouchableOpacity onPress={() => setIaModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.iaResponseArea}>
              {isIaLoading ? (
                <ActivityIndicator size="large" color="#BAF241" />
              ) : (
                <Text style={styles.iaResponseText}>
                  {iaResponse || 'Escreva um prompt abaixo para gerar um plano de aula.\n\nEx: "Crie um plano de aula sobre Lógica de Programação para o 6º Ano."'}
                </Text>
              )}
            </ScrollView>

            <View style={styles.iaInputContainer}>
              <TextInput
                style={styles.iaInput}
                placeholder="Escreva o seu prompt para a IA..."
                placeholderTextColor="#999"
                value={iaPrompt}
                onChangeText={setIaPrompt}
              />
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
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f4f6fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pencilButton: { 
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  addButton: { 
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  iaButton: { 
    backgroundColor: '#BAF241', 
    padding: 8,
    borderRadius: 20,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  contentIcon: {
    marginRight: 15,
  },
  contentInfo: {
    flex: 1, 
  },
  contentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  contentType: {
    fontSize: 14,
    color: '#555',
  },
  manageButton: {
    marginLeft: 10,
  },
  
  // ESTILOS DO MODAL DA IA
  iaModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  iaModalContent: {
    backgroundColor: '#1E1F20', 
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%', 
    padding: 20,
  },
  iaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  iaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  iaResponseArea: {
    flex: 1,
    marginBottom: 15,
  },
  iaResponseText: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 24,
  },
  iaInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 30,
    padding: 5,
  },
  iaInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  iaSendButton: {
    backgroundColor: '#1154D9', 
    borderRadius: 25,
    padding: 10,
    marginLeft: 5,
  },
});