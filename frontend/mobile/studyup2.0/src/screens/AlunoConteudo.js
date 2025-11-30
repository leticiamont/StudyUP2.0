import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, StatusBar, ActivityIndicator, Alert, Linking 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../service/apiService';

export default function AlunoConteudo({ route }) {
  const user = route.params?.user || {};
  const navigation = useNavigation();
  
  const [activeModule, setActiveModule] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [realTopics, setRealTopics] = useState([]);

  // Nome da turma ou série para exibir no topo
  const displayTitle = user.className || user.gradeLevel || "Minha Sala";

  // Módulos (Visual)
  const modules = [
    { id: 1, title: 'Conteúdo da Turma', subtitle: 'Arquivos do Professor', progress: 100, status: 'active', color: '#1154D9' },
    { id: 2, title: 'Conteúdo Extra', subtitle: 'Materiais de Apoio', progress: 0, status: 'locked', color: '#A0A0A0' },
  ];

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      let endpoint = '';

      // LÓGICA DE OURO: Prioriza o ID da Turma
      if (user.classId) {
          endpoint = `/api/contents?classId=${user.classId}`;
          console.log(`[AlunoConteudo] Buscando por classId: ${user.classId}`);
      } else if (user.gradeLevel) {
          endpoint = `/api/contents?gradeLevel=${encodeURIComponent(user.gradeLevel)}`;
          console.log(`[AlunoConteudo] Buscando por gradeLevel: ${user.gradeLevel}`);
      } else {
          // Sem dados suficientes
          setIsLoading(false);
          return;
      }

      const response = await api.get(endpoint);
      const data = Array.isArray(response) ? response : [];

      // Formata os dados para a lista
      const formatted = data.map(item => ({
        id: item.id,
        title: item.name || item.title || 'Arquivo sem nome',
        type: (item.url && item.url.includes('.pdf')) ? 'pdf' : 'text', 
        url: item.url, 
        content: item.content,
      }));

      setRealTopics(formatted);

    } catch (error) {
      console.log('Erro ao buscar aulas:', error);
      Alert.alert('Erro', 'Não foi possível carregar os materiais.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleOpenContent = (item) => {
    if (item.type === 'pdf') {
       // Navega para visualização de PDF
       navigation.navigate('ViewPDF', { url: item.url });
    } else {
       // Conteúdo de texto
       Alert.alert(item.title, item.content || "Sem conteúdo.");
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
          
          {/* Renderização dos Módulos (Abas) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modulesScroll}>
            {modules.map((mod) => (
              <TouchableOpacity 
                key={mod.id} 
                style={[
                  styles.moduleCard, 
                  { backgroundColor: mod.status === 'active' ? mod.color : '#E0E0E0' },
                  activeModule === mod.id && { borderWidth: 3, borderColor: '#333' }
                ]}
                onPress={() => mod.status === 'active' && setActiveModule(mod.id)}
                disabled={mod.status === 'locked'}
              >
                <View style={styles.moduleHeader}>
                  <Text style={[styles.moduleTitle, mod.status === 'locked' && {color:'#888'}]}>
                    {mod.title}
                  </Text>
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
                  {!user.classId && (
                    <Text style={styles.debugText}>Aviso: Você não está vinculado a uma turma (ID ausente).</Text>
                  )}
               </View>
            ) : (
               realTopics.map((item) => (
                <TouchableOpacity key={item.id} style={styles.topicItem} onPress={() => handleOpenContent(item)}>
                  <View style={[styles.topicIcon, { backgroundColor: item.type === 'pdf' ? '#ffebee' : '#e3f2fd' }]}>
                    <MaterialCommunityIcons 
                        name={item.type === 'pdf' ? "file-pdf-box" : "text-box"} 
                        size={24} 
                        color={item.type === 'pdf' ? "#d32f2f" : "#1976d2"} 
                    />
                  </View>
                  <View style={styles.topicInfo}>
                    <Text style={styles.topicTitle}>{item.title}</Text>
                    <Text style={styles.topicSub}>{item.type === 'pdf' ? 'PDF' : 'Leitura'}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                </TouchableOpacity>
              ))
            )}
          </View>
          <View style={{height: 40}} />
        </ScrollView>
      )}
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
  topicSub: { fontSize: 12, color: '#888' },
  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: '#888', marginTop: 10 },
  debugText: { color: '#f44336', fontSize: 10, marginTop: 5 }
});