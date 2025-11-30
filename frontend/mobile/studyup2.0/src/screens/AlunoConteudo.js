import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, StatusBar, 
  ActivityIndicator, Alert, Modal, Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../service/apiService';

const { height } = Dimensions.get('window');

export default function AlunoConteudo({ route }) {
  const user = route.params?.user || {};
  const navigation = useNavigation();
  
  const [activeModule, setActiveModule] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [realTopics, setRealTopics] = useState([]);

  // ESTADOS PARA O LEITOR DE TEXTO (MODAL)
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [selectedTextContent, setSelectedTextContent] = useState({ title: '', body: '' });

  const displayTitle = user.className || user.gradeLevel || "Minha Sala";

  // Módulos Visuais
  const modules = [
    { 
        id: 1, 
        title: 'Conteúdo da Turma', 
        subtitle: 'Arquivos do Professor', 
        progress: 100, 
        status: 'active', 
        color: '#1154D9' 
    }
  ];

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = [];
      if (user.classId) params.push(`classId=${user.classId}`);
      if (user.gradeLevel) params.push(`schoolYear=${encodeURIComponent(user.gradeLevel)}`);

      if (params.length === 0) { setIsLoading(false); return; }

      const endpoint = `/api/contents?${params.join('&')}`;
      const response = await api.get(endpoint);
      const data = Array.isArray(response) ? response : [];

      const formatted = data.map(item => {
          // Lógica de Ícone e Tipo no Frontend
          let itemType = 'text';
          if (item.type === 'pdf' || (item.url && item.url.includes('.pdf'))) itemType = 'pdf';
          else if (item.type === 'office' || (item.url && item.url.match(/\.(doc|docx|ppt|pptx|xls|xlsx)$/i))) itemType = 'office';
          else if (item.url) itemType = 'file';

          return {
            id: item.id,
            title: item.name || item.title || 'Material sem nome',
            type: itemType,
            url: item.url, 
            content: item.content,
          };
      });

      setRealTopics(formatted);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchData(); }, [])
  );

  const handleOpenContent = (item) => {
    // 1. SE FOR ARQUIVO (PDF, WORD, ETC) -> Abre no Visualizador
    if (item.type === 'pdf' || item.type === 'office') {
       navigation.navigate('ViewPDF', { url: item.url });
    } 
    // 2. SE FOR TEXTO PURO -> Abre o Modal de Leitura
    else if (item.type === 'text') {
       setSelectedTextContent({ title: item.title, body: item.content });
       setTextModalVisible(true);
    }
    // 3. OUTROS ARQUIVOS -> Aviso
    else {
        Alert.alert("Arquivo", "Este formato deve ser baixado para ser visualizado.");
    }
  };

  const getIcon = (type) => {
      switch(type) {
          case 'pdf': return { name: 'file-pdf-box', color: '#d32f2f', bg: '#ffebee' };
          case 'office': return { name: 'file-word-box', color: '#1976D2', bg: '#E3F2FD' }; // Azul para Docs
          case 'text': return { name: 'text-box', color: '#FBC02D', bg: '#FFFDE7' }; // Amarelo para Texto
          default: return { name: 'file', color: '#777', bg: '#eee' };
      }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{displayTitle}</Text>
        <Text style={styles.subTitle}>Materiais Disponíveis</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 50}} />
      ) : (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modulesScroll}>
            {modules.map((mod) => (
              <TouchableOpacity 
                key={mod.id} 
                style={[styles.moduleCard, { backgroundColor: mod.status === 'active' ? mod.color : '#E0E0E0', borderColor: activeModule === mod.id ? '#333' : 'transparent', borderWidth: activeModule === mod.id ? 3 : 0 }]}
                onPress={() => mod.status === 'active' && setActiveModule(mod.id)}
                disabled={mod.status === 'locked'}
              >
                <View style={styles.moduleHeader}>
                  <Text style={[styles.moduleTitle, mod.status === 'locked' && {color:'#888'}]}>{mod.title}</Text>
                  {mod.status === 'active' && <MaterialCommunityIcons name="star" size={16} color="#FFC107" />}
                </View>
                <Text style={styles.moduleSub}>{mod.subtitle}</Text>
                <View style={styles.progressContainer}>
                   <View style={[styles.progressBar, { width: `${mod.progress}%` }]} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.topicsContainer}>
            <Text style={styles.topicsTitle}>Arquivos da Aula</Text>
            {realTopics.length === 0 ? (
               <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="folder-open-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyText}>Nenhum material encontrado.</Text>
               </View>
            ) : (
               realTopics.map((item) => {
                const iconData = getIcon(item.type);
                return (
                    <TouchableOpacity key={item.id} style={styles.topicItem} onPress={() => handleOpenContent(item)}>
                    <View style={[styles.topicIcon, { backgroundColor: iconData.bg }]}>
                        <MaterialCommunityIcons name={iconData.name} size={24} color={iconData.color} />
                    </View>
                    <View style={styles.topicInfo}>
                        <Text style={styles.topicTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.topicSub}>{item.type === 'office' ? 'Documento' : item.type.toUpperCase()}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                );
               })
            )}
          </View>
          <View style={{height: 40}} />
        </ScrollView>
      )}

      {/* MODAL DE LEITURA DE TEXTO (SEM BOTÃO IA) */}
      <Modal visible={textModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                  <Text style={styles.modalHeaderTitle}>Leitura</Text>
                  <TouchableOpacity onPress={() => setTextModalVisible(false)} style={styles.closeBtn}>
                      <MaterialCommunityIcons name="close" size={24} color="#333" />
                  </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                  <Text style={styles.textTitle}>{selectedTextContent.title}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.textBody}>{selectedTextContent.body || "Conteúdo não disponível em texto."}</Text>
                  <View style={{height: 50}} />
              </ScrollView>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  screenTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  subTitle: { fontSize: 14, color: '#666', marginTop: 2 },
  container: { flex: 1 },
  modulesScroll: { paddingLeft: 20, paddingVertical: 15 },
  moduleCard: { width: 150, height: 100, borderRadius: 12, padding: 12, marginRight: 15, justifyContent: 'space-between', elevation: 2 },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  moduleTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  moduleSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
  progressContainer: { height: 3, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2 },
  progressBar: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  topicsContainer: { padding: 20 },
  topicsTitle: { fontSize: 16, fontWeight: 'bold', color: '#444', marginBottom: 10 },
  topicItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  topicIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  topicInfo: { flex: 1 },
  topicTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  topicSub: { fontSize: 12, color: '#888', marginTop: 2 },
  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: '#888', marginTop: 10 },
  
  // ESTILOS DO MODAL
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#555' },
  closeBtn: { padding: 5, backgroundColor: '#f0f0f0', borderRadius: 20 },
  modalContent: { padding: 25 },
  textTitle: { fontSize: 24, fontWeight: 'bold', color: '#1154D9', marginBottom: 10 },
  divider: { height: 2, backgroundColor: '#BAF241', width: 50, marginBottom: 20 },
  textBody: { fontSize: 16, lineHeight: 24, color: '#333', textAlign: 'justify' }
});