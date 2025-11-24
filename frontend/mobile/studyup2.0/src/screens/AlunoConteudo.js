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
  
  const userGrade = user.gradeLevel || "Série Desconhecida";

  const [modules, setModules] = useState([
    { id: 1, title: 'Módulo Atual', subtitle: userGrade, progress: 100, status: 'active', color: '#1154D9' },
    { id: 2, title: 'Próximo', subtitle: 'Em breve...', progress: 0, status: 'locked', color: '#A0A0A0' },
  ]);

  const [realTopics, setRealTopics] = useState([]);

  const fetchData = async () => {
    if (!user.gradeLevel) {
        setIsLoading(false);
        return;
    }

    try {
      setIsLoading(true);
      
      const contents = await api.get(`/api/contents?gradeLevel=${encodeURIComponent(user.gradeLevel)}`);
      
      const listaConteudos = Array.isArray(contents) ? contents : [];

      const topicosFormatados = listaConteudos.map(item => ({
        id: item.id,
        moduleId: 1,
        title: item.name,
        type: item.type === 'text' ? 'text' : 'pdf', 
        url: item.url, 
        content: item.content,
        completed: false,
      }));

      setRealTopics(topicosFormatados);

    } catch (error) {
      console.log(error);
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
    // Fluxo para PDF
    if (item.type === 'pdf') {
       Alert.alert(
         "Material de Estudo",
         "O que deseja fazer?",
         [
           { text: "Ler PDF", onPress: () => navigation.navigate('ViewPDF', { url: item.url }) },
           { 
             text: "Gerar Quiz (IA)", 
             // ENVIA URL do PDF
             onPress: () => navigation.navigate('GameQuiz', { pdfUrl: item.url, title: item.title }) 
           },
           { text: "Cancelar", style: "cancel" }
         ]
       );
    } 
    // Fluxo para TEXTO (Materiais da IA/Lápis)
    else if (item.type === 'text') {
       Alert.alert(
         item.title,
         "O que deseja fazer?",
         [
           // Opção 1: Visualizar o texto (por enquanto via Alert)
           { text: "Ler Material", onPress: () => Alert.alert(item.title, item.content || "Conteúdo não disponível.") },
           { 
             text: "Gerar Quiz (IA)", 
             // MUDANÇA: ENVIA O TEXTO DA AULA DIRETO
             onPress: () => navigation.navigate('GameQuiz', { textContent: item.content, title: item.title }) 
           },
           { text: "Cancelar", style: "cancel" }
         ]
       );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Aulas - {userGrade}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 50}} />
      ) : (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionLabel}>Trilha de Aprendizado</Text>
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
                
                <Text style={styles.moduleSub}>
                  {mod.subtitle}
                </Text>

                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${mod.progress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {mod.id === 1 ? `${realTopics.length} materiais` : 'Bloqueado'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.topicsContainer}>
            <Text style={styles.topicsTitle}>Conteúdo do Módulo</Text>
            
            {activeModule !== 1 ? (
               <Text style={styles.emptyText}>Módulo bloqueado.</Text>
            ) : realTopics.length === 0 ? (
               <View style={{alignItems:'center', marginTop:20}}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={50} color="#ddd" />
                  <Text style={styles.emptyText}>Nenhum conteúdo publicado para o {userGrade}.</Text>
               </View>
            ) : (
               realTopics.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.topicItem} 
                  onPress={() => handleOpenContent(item)}
                >
                  <View style={[styles.topicIcon, { backgroundColor: item.type === 'pdf' ? '#E91E6315' : '#1154D915' }]}>
                    <MaterialCommunityIcons 
                        name={item.type === 'pdf' ? "file-pdf-box" : "text-box-outline"} 
                        size={24} 
                        color={item.type === 'pdf' ? "#E91E63" : "#1154D9"} 
                    />
                  </View>
                  
                  <View style={styles.topicInfo}>
                    <Text style={styles.topicTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.topicSub}>
                        {item.type === 'pdf' ? 'Documento PDF' : 'Material de Leitura'}
                    </Text>
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
  safeArea: { flex: 1, backgroundColor: '#f4f6fa' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  screenTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  container: { flex: 1 },
  sectionLabel: { margin: 20, marginBottom: 10, fontSize: 16, fontWeight: 'bold', color: '#555' },
  modulesScroll: { paddingLeft: 20, paddingBottom: 10 },
  moduleCard: { width: 160, height: 120, borderRadius: 15, padding: 15, marginRight: 15, justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduleTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  moduleSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  progressContainer: { height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2, marginTop: 10 },
  progressBar: { height: '100%', backgroundColor: '#BAF241', borderRadius: 2 },
  progressText: { color: '#fff', fontSize: 10, marginTop: 4 },
  topicsContainer: { padding: 20 },
  topicsTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  topicItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  topicIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  topicInfo: { flex: 1 },
  topicTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  topicSub: { fontSize: 12, color: '#888', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', fontStyle: 'italic', marginTop: 10 }
});