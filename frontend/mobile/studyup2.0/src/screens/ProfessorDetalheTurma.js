import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, Text, View, TouchableOpacity, Platform, StatusBar, 
    ActivityIndicator, FlatList, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../service/apiService';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfessorDetalheTurma({ route }) {
  const navigation = useNavigation();
  const { turma } = route.params || {}; 
  
  const [activeTab, setActiveTab] = useState('alunos'); 
  const [alunos, setAlunos] = useState([]);
  
  // Lista EXCLUSIVA de materiais (conteúdos), sem planos de aula
  const [conteudosTurma, setConteudosTurma] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!turma) return null;

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'alunos') {
        const data = await api.get(`/api/users?role=student&classId=${turma.id}`);
        setAlunos(Array.isArray(data) ? data : []);
      } else {
        // CORREÇÃO: Busca materiais da Turma E materiais do Ano da turma
        const schoolYear = turma.schoolYear; // ex: "9º Ano"
        
        const [classContents, yearContents] = await Promise.all([
            api.get(`/api/contents?classId=${turma.id}`), // Materiais exclusivos desta turma
            api.get(`/api/contents?schoolYear=${encodeURIComponent(schoolYear)}`) // Materiais do ano (ex: provas gerais)
        ]);
        
        // Combina e remove duplicatas (por ID)
        const combined = [...(Array.isArray(classContents) ? classContents : []), ...(Array.isArray(yearContents) ? yearContents : [])];
        
        // Remove duplicatas usando Map
        const uniqueContents = Array.from(new Map(combined.map(item => [item.id, item])).values());
        
        setConteudosTurma(uniqueContents);
      }
    } catch (error) {
      console.log("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (turma?.id) fetchData();
  }, [activeTab, turma]);

  // Função para abrir o material (PDF ou Texto)
  const handleOpenItem = (item) => {
      if (item.url) {
          navigation.navigate('ViewPDF', { url: item.url });
      } else if (item.type === 'text') {
           // Se for texto criado pela IA ou editor
           // Reutilizamos a tela de Editor apenas para visualização se necessário
           // ou criamos um modal simples. Aqui mantive o padrão do app.
           Alert.alert("Conteúdo de Texto", item.content);
      }
  };

  // Renderização do Card de Material
  const renderContentItem = ({ item }) => (
    <View style={styles.cardContent}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons 
          name={item.url ? "file-pdf-box" : "text-box-outline"} 
          size={28} 
          color="#1154D9" 
        />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.contentName} numberOfLines={1}>{item.name}</Text>
        <View style={{flexDirection:'row', alignItems:'center'}}>
            <Text style={styles.contentType}>
                {item.url ? 'Arquivo PDF' : 'Material de Texto'}
            </Text>
            {!item.classId && (
                <View style={styles.tagGeneral}>
                    <Text style={styles.tagText}>Geral ({item.schoolYear})</Text>
                </View>
            )}
        </View>
      </View>
      
      <TouchableOpacity onPress={() => handleOpenItem(item)}>
        <MaterialCommunityIcons name="eye" size={24} color="#555" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding: 5}}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{turma.name}</Text>
        <View style={{width: 26}} />
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#1154D9" />
          <Text style={styles.infoText}>{turma.schedule || 'Horário não definido'}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="school-outline" size={20} color="#1154D9" />
          <Text style={styles.infoText}>
            {turma.gradeLevel} {turma.schoolYear ? `• ${turma.schoolYear}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'alunos' && styles.activeTab]} 
          onPress={() => setActiveTab('alunos')}
        >
          <Text style={[styles.tabText, activeTab === 'alunos' && styles.activeTabText]}>Alunos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'conteudo' && styles.activeTab]} 
          onPress={() => setActiveTab('conteudo')}
        >
          <Text style={[styles.tabText, activeTab === 'conteudo' && styles.activeTabText]}>Materiais</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 40}} />
        ) : (
          <>
            {activeTab === 'alunos' ? (
              <FlatList
                data={alunos}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum aluno nesta turma.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.cardAluno}>
                    <MaterialCommunityIcons name="account-circle" size={40} color="#ccc" />
                    <View style={{marginLeft: 15}}>
                      <Text style={styles.alunoName}>{item.displayName}</Text>
                      <Text style={styles.alunoEmail}>{item.email}</Text>
                    </View>
                  </View>
                )}
              />
            ) : (
              <View style={{flex: 1}}>
                <FlatList
                  data={conteudosTurma}
                  keyExtractor={item => item.id}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        Nenhum material encontrado para o {turma.schoolYear}.
                    </Text>
                  }
                  renderItem={renderContentItem}
                />
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fa', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1, textAlign: 'center' },
  infoBox: { backgroundColor: '#fff', padding: 15, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  infoText: { marginLeft: 10, color: '#555', fontSize: 14 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#1154D9' },
  tabText: { fontSize: 16, fontWeight: '500', color: '#888' },
  activeTabText: { color: '#1154D9', fontWeight: 'bold' },
  contentContainer: { flex: 1, padding: 15 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50 },
  cardAluno: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
  alunoName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  alunoEmail: { fontSize: 12, color: '#888' },
  
  // CARD CONTEÚDO
  cardContent: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#1154D9', elevation: 2 },
  iconBox: { marginRight: 15 },
  contentName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  contentType: { fontSize: 12, color: '#888' },
  
  // TAG GERAL
  tagGeneral: { backgroundColor: '#E3F2FD', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  tagText: { color: '#1154D9', fontSize: 10, fontWeight: 'bold' },
});