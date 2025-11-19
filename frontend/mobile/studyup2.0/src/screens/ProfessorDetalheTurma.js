import React, { useState } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    ScrollView, 
    TouchableOpacity, 
    Platform, 
    StatusBar 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// --- Dados de Exemplo (Substituiremos pela API) ---
const mockAlunos = [
  { id: '1', name: 'Anna Beatriz de Oliveira', email: 'anna.oliveira@studyup.com' },
  { id: '2', name: 'Luís Gustavo Nascimento', email: 'luis.nascimento@studyup.com' },
  { id: '3', name: 'Letícia Monteiro Feitosa', email: 'leticia.feitosa@studyup.com' },
];
const mockConteudo = [
  { id: '1', name: 'Aula 1: Introdução à Matemática', type: 'PDF', icon: 'file-pdf-box' },
  { id: '2', name: 'Vídeo: Experimentos', type: 'Vídeo', icon: 'video' },
];
// ----------------------------------------------

export default function ProfessorDetalheTurma({ route }) {
  const navigation = useNavigation();
  const { turma } = route.params; 
  const [activeTab, setActiveTab] = useState('alunos'); 
  const [alunos, setAlunos] = useState(mockAlunos);
  const [conteudos, setConteudos] = useState(mockConteudo);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. CABEÇALHO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{turma.name}</Text>
        <View style={{width: 26}} />
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="calendar-clock" size={24} color="#1154D9" />
          <Text style={styles.infoText}>Horário: Segundas, 14:00 - 16:00</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="clipboard-text" size={24} color="#1154D9" />
          <Text style={styles.infoText}>Plano de Aula: Python Básico</Text>
        </View>
      </View>

      <View style={styles.filterTabs}>
        <TouchableOpacity 
          style={activeTab === 'alunos' ? styles.filterTabActive : styles.filterTab}
          onPress={() => setActiveTab('alunos')}
        >
          <Text style={activeTab === 'alunos' ? styles.filterTextActive : styles.filterText}>Alunos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={activeTab === 'conteudo' ? styles.filterTabActive : styles.filterTab}
          onPress={() => setActiveTab('conteudo')}
        >
          <Text style={activeTab === 'conteudo' ? styles.filterTextActive : styles.filterText}>Conteúdo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container}>
        
        {activeTab === 'alunos' && (
          <View>
            <Text style={styles.sectionTitle}>Alunos Matriculados ({alunos.length})</Text>
            {alunos.map((aluno) => (
              <View key={aluno.id} style={styles.alunoCard}>
                <MaterialCommunityIcons name="account-circle" size={30} color="#555" />
                <View style={styles.alunoInfo}>
                  <Text style={styles.alunoName}>{aluno.name}</Text>
                  <Text style={styles.alunoEmail}>{aluno.email}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'conteudo' && (
          <View>
            <Text style={styles.sectionTitle}>Materiais da Turma</Text>
            {conteudos.map((item) => (
              <View key={item.id} style={styles.contentCard}>
                <View style={styles.contentIcon}>
                  <MaterialCommunityIcons name={item.icon} size={30} color="#1154D9" />
                </View>
                <View style={styles.contentInfo}>
                  <Text style={styles.contentName}>{item.name}</Text>
                  <Text style={styles.contentType}>{item.type}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addButton}>
              <MaterialCommunityIcons name="plus" size={24} color="#333" />
              <Text style={styles.addButtonText}>Adicionar Conteúdo</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  // 🆕 Estilos da Caixa de Info (Horário)
  infoBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  // Estilos das Sub-Abas
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#1154D9',
  },
  filterText: { 
    color: '#555', 
    fontWeight: 'bold',
    fontSize: 16,
  },
  filterTextActive: { 
    color: '#1154D9', 
    fontWeight: 'bold',
    fontSize: 16,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  alunoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  alunoInfo: {
    marginLeft: 10,
  },
  alunoName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  alunoEmail: {
    fontSize: 14,
    color: '#555',
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BAF241',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  addButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
});