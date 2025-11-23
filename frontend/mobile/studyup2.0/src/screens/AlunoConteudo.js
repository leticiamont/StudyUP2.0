import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Linking 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService';

export default function AlunoConteudo({ route }) {
  const user = route.params?.user || {};
  
  // Lógica para pegar o nome e a turma
  const userName = user.name || user.displayName || 'Aluno';
  // Se o user não tiver classId, usamos uma string vazia ou tratamos o erro
  const classId = user.classId; 
  const points = user.points || 1200; // Usa pontos do usuário ou 1200 se não tiver

  const [conteudos, setConteudos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConteudos = async () => {

    try {
      setIsLoading(true);
      // Busca conteúdos (filtrando por turma se necessário, ou pegando todos)
      const endpoint = classId ? `/api/contents?classId=${classId}` : '/api/contents';
      const data = await api.get(endpoint);
      
      // O backend retorna uma lista, garantimos que é um array
      setConteudos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar os conteúdos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConteudos();
  }, []);

  // Função para abrir o link/PDF
  const handleOpenContent = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => 
        Alert.alert("Erro", "Não foi possível abrir este link.")
      );
    } else {
      Alert.alert("Aviso", "Este conteúdo não possui um link válido.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. CABEÇALHO (Header) */}
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          <MaterialCommunityIcons name="account-circle" size={28} color="#1154D9" />
          <Text style={styles.headerText}>{userName.toUpperCase()}</Text>
        </View>
        <View style={styles.headerPoints}>
          <MaterialCommunityIcons name="star" size={24} color="#FFC107" />
          <Text style={styles.headerText}>{points}</Text>
        </View>
        <TouchableOpacity>
          <MaterialCommunityIcons name="bell" size={26} color="#555" />
        </TouchableOpacity>
      </View>

      {/* 2. Botão Dropdown Módulo (Fixo por enquanto) */}
      <TouchableOpacity style={styles.moduleButton}>
        <Text style={styles.moduleButtonText}>MÓDULO 1 - GERAL</Text>
        <MaterialCommunityIcons name="chevron-down" size={24} color="#fff" />
      </TouchableOpacity>

      {/* 3. Abas de Filtro (Visual) */}
      <View style={styles.filterTabs}>
        <TouchableOpacity style={styles.filterChipActive}>
          <Text style={styles.filterTextActive}>TODOS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>VÍDEOS</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Lista de Materiais Dinâmica */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#1154D9" style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.listContainer}>
          {conteudos.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum conteúdo encontrado para sua turma.</Text>
          ) : (
            conteudos.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.materialItem} 
                onPress={() => handleOpenContent(item.url)}
              >
                {/* Ícone e Título */}
                <View style={styles.materialInfo}>
                  <MaterialCommunityIcons 
                    // Escolhe ícone baseado no tipo do arquivo
                    name={item.type?.includes('pdf') ? 'file-pdf-box' : 'file-document-outline'} 
                    size={30} 
                    color="#1154D9" 
                  />
                  <Text style={styles.materialTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                
                {/* Botão de Ação (Download/Abrir) */}
                <MaterialCommunityIcons name="open-in-new" size={24} color="#555" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerProfile: { flexDirection: 'row', alignItems: 'center' },
  headerPoints: { flexDirection: 'row', alignItems: 'center' },
  headerText: { 
    marginLeft: 8, 
    fontWeight: 'bold', 
    fontSize: 16,
    color: '#333'
  },
  moduleButton: {
    backgroundColor: '#1154D9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  moduleButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  filterTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  filterChip: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  filterText: { color: '#555', fontWeight: 'bold' },
  filterTextActive: { color: '#BAF241', fontWeight: 'bold' },
  
  listContainer: { paddingHorizontal: 20 },
  
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  materialInfo: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1, // Garante que o texto ocupe o espaço disponível
    marginRight: 10
  },
  materialTitle: { 
    fontSize: 16, 
    marginLeft: 15,
    color: '#333',
    flexShrink: 1 // Evita que o texto estoure a tela
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
    fontSize: 16
  }
});