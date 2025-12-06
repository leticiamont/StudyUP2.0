import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, StatusBar, ActivityIndicator, Alert 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../service/apiService';

export default function AlunoConteudo({ route }) {
  // Garante que o objeto user existe para não crashar
  const user = route.params?.user || {};
  const navigation = useNavigation();
  
  const [activeModule, setActiveModule] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [realTopics, setRealTopics] = useState([]);
  
  // Exibe o Ano (ex: "3ª Série") ou o Nível se o ano não existir
  const userDisplayGrade = user.schoolYear || user.gradeLevel || "Série não definida";

  // Módulos estáticos (Trilha)
  const [modules, setModules] = useState([
    { id: 1, title: 'Módulo Atual', subtitle: userDisplayGrade, progress: 100, status: 'active', color: '#1154D9' },
    { id: 2, title: 'Próximo', subtitle: 'Aguarde...', progress: 0, status: 'locked', color: '#A0A0A0' },
  ]);

  const fetchData = async () => {
    // Se o aluno não tiver nível escolar cadastrado, não busca nada
    if (!user.gradeLevel) {
        setIsLoading(false);
        return;
    }

    try {
      setIsLoading(true);
      
      // --- LÓGICA DE BUSCA CORRIGIDA ---
      // Constrói a URL com os filtros corretos.
      // O Backend dá prioridade: schoolYear > gradeLevel.
      let endpoint = `/api/contents?gradeLevel=${encodeURIComponent(user.gradeLevel)}`;
      
      if (user.schoolYear) {
          // Se o aluno tem ano (ex: "3ª Série"), mandamos também para filtrar exato
          endpoint += `&schoolYear=${encodeURIComponent(user.schoolYear)}`;
      }

      console.log("AlunoConteudo: Buscando em", endpoint); // Debug no terminal

      const response = await api.get(endpoint);
      
      // Garante que é um array, mesmo se a API mudar formato
      const listaConteudos = Array.isArray(response) ? response : (response.data || []);

      // Mapeia e FILTRA itens inválidos para não quebrar a tela (Tela Branca)
      const topicosFormatados = listaConteudos
        .filter(item => item && item.name) // Só aceita itens que tenham nome
        .map(item => ({
            id: item.id,
            moduleId: 1,
            title: item.name || "Sem título",
            // Define o tipo para ícone e ação
            type: (item.type === 'pdf' || item.url) ? 'pdf' : 'text', 
            url: item.url, 
            content: item.content,
      }));

      setRealTopics(topicosFormatados);

    } catch (error) {
      console.log("Erro ao buscar conteúdos:", error);
      // Não mostramos Alert de erro aqui para não atrapalhar a UX se for só falha de rede temporária
    } finally {
      setIsLoading(false);
    }
  };

  // Recarrega sempre que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleOpenContent = (item) => {
    if (!item) return;

    if (item.type === 'pdf') {
       if (!item.url) { Alert.alert("Erro", "Link do PDF não disponível."); return; }
       
       Alert.alert(
         "Material de Estudo",
         "O que deseja fazer?",
         [
           { text: "Ler PDF", onPress: () => navigation.navigate('ViewPDF', { url: item.url }) },
           { 
             text: "Gerar Quiz (IA)", 
             // Passa o PDF URL para a IA ler
             onPress: () => navigation.navigate('GameQuiz', { pdfUrl: item.url, title: item.title }) 
           },
           { text: "Cancelar", style: "cancel" }
         ]
       );
    } 
    else {
       // Conteúdo de Texto (criado via Editor/IA)
       Alert.alert(
         item.title,
         "O que deseja fazer?",
         [
           { 
               text: "Ler Material", 
               onPress: () => Alert.alert(item.title, item.content || "Conteúdo de texto vazio.") 
           },
           { 
             text: "Gerar Quiz (IA)", 
             // Passa o texto puro para a IA
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
        <Text style={styles.screenTitle}>Minhas Aulas</Text>
        <Text style={styles.screenSubtitle}>{userDisplayGrade}</Text>
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
            <Text style={styles.topicsTitle}>Conteúdo Disponível</Text>
            
            {activeModule !== 1 ? (
               <Text style={styles.emptyText}>Módulo bloqueado.</Text>
            ) : realTopics.length === 0 ? (
               <View style={{alignItems:'center', marginTop:20}}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={50} color="#ddd" />
                  <Text style={styles.emptyText}>Nenhum conteúdo encontrado para sua turma/série.</Text>
                  <Text style={{color:'#aaa', fontSize:12, marginTop:5}}>Aguarde o professor postar!</Text>
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
                        {item.type === 'pdf' ? 'Arquivo PDF' : 'Leitura'}
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
  screenSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
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