import React, { useState, useEffect, useMemo } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, TouchableOpacity, 
    Platform, StatusBar, Modal, TextInput, Alert, ActivityIndicator, FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService'; 
import { useNavigation } from '@react-navigation/native';
import { PostCard } from '../components/PostCard'; 

export default function ProfessorForum({ route }) {
  const { user } = route.params;
  const userId = user?.uid || user?.id; 

  // ESTADOS DE DADOS
  const [allPosts, setAllPosts] = useState([]); 
  const [myClasses, setMyClasses] = useState([]); 
  
  // Estado da turma selecionada (null = Todas/Geral)
  const [selectedClass, setSelectedClass] = useState(null); 
  
  const [isLoading, setIsLoading] = useState(false);
  
  // ESTADOS DOS MODAIS
  const [modalVisible, setModalVisible] = useState(false); // Modal Criar Post
  const [dropdownVisible, setDropdownVisible] = useState(false); // Modal Selecionar Turma
  
  // ESTADOS DE INPUT
  const [newPostText, setNewPostText] = useState('');
  const [searchText, setSearchText] = useState('');
  
  const navigation = useNavigation();

  // 1. BUSCAR TURMAS (Ao carregar a tela)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await api.get('/api/classes');
        // Filtra apenas turmas deste professor
        const classesDoProf = data.filter(c => c.teacherId === userId);
        setMyClasses(classesDoProf);
        
        // NOTA: Não selecionamos nenhuma turma automaticamente.
        // O estado inicial 'null' garante a visão "Geral".
      } catch (error) {
        console.log("Erro ao buscar turmas:", error);
      }
    };
    fetchClasses();
  }, []);

  // 2. BUSCAR POSTS (Sempre que mudar a seleção da turma)
  useEffect(() => {
    // Se selectedClass for null, passa null para buscar tudo
    fetchPosts(selectedClass ? selectedClass.id : null);
  }, [selectedClass]);

  const fetchPosts = async (turmaId) => {
    try {
      setIsLoading(true);
      // Se tiver ID, filtra. Se não, busca tudo (Geral)
      const endpoint = turmaId 
        ? `/api/forum/posts?turmaId=${turmaId}` 
        : '/api/forum/posts'; 

      const data = await api.get(endpoint); 
      setAllPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      // Silencia erro se for apenas lista vazia ou erro de rede momentâneo
      console.log("Erro ao buscar posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. CRIAR NOVO POST (AVISO)
  const handleCreatePost = async () => {
    if (newPostText.trim().length === 0) {
      Alert.alert('Atenção', 'O texto não pode estar vazio.');
      return;
    }
    // Professor precisa selecionar uma turma para postar (não pode postar no "Geral" sem destino)
    if (!selectedClass) {
      Alert.alert('Atenção', 'Por favor, selecione uma turma específica no filtro para enviar este aviso.');
      setModalVisible(false); // Fecha o modal de criar
      setDropdownVisible(true); // Abre o modal de seleção para ajudar
      return;
    }

    try {
      await api.post('/api/forum/posts', { 
        text: newPostText,
        turmaId: selectedClass.id 
      });
      setModalVisible(false); 
      setNewPostText(''); 
      fetchPosts(selectedClass.id); // Recarrega a lista da turma
      Alert.alert('Sucesso', 'Aviso enviado para a turma!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar o post.');
    }
  };

  // 4. CURTIR POST
  const handleLikePost = async (postId) => {
    try {
      await api.post(`/api/forum/posts/${postId}/like`);
      
      // Atualização Otimista (na tela)
      setAllPosts(currentPosts => 
        currentPosts.map(p => {
          if (p.id === postId) {
            const liked = (p.likedBy || []).includes(userId);
            const newLikedBy = liked
              ? p.likedBy.filter(uid => uid !== userId)
              : [...(p.likedBy || []), userId];
            return { ...p, likedBy: newLikedBy };
          }
          return p;
        })
      );
    } catch (error) {
      console.log('Erro ao curtir:', error);
    }
  };

  // 5. FILTRO DE PESQUISA LOCAL
  const filteredPosts = useMemo(() => {
    let posts = allPosts;
    if (searchText.trim().length > 0) {
      const searchLower = searchText.toLowerCase();
      posts = posts.filter(post => 
        (post.text && post.text.toLowerCase().includes(searchLower)) ||
        (post.authorName && post.authorName.toLowerCase().includes(searchLower))
      );
    }
    // Adiciona flag se o utilizador curtiu
    return posts.map(post => ({
      ...post,
      userHasLiked: Array.isArray(post.likedBy) ? post.likedBy.includes(userId) : false
    }));
  }, [allPosts, searchText, userId]); 

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fórum de Dúvidas</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <MaterialCommunityIcons name="plus-circle-outline" size={28} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* DROPDOWN DE SELEÇÃO (FILTRO) */}
      <View style={{paddingHorizontal: 20, paddingTop: 10}}>
        <Text style={styles.filterLabel}>Turma Selecionada:</Text>
        <TouchableOpacity 
            style={styles.dropdownButton} 
            onPress={() => setDropdownVisible(true)}
        >
            {/* Texto Dinâmico: Mostra Nome da Turma ou "Todas" */}
            <Text style={styles.dropdownText}>
                {selectedClass ? selectedClass.name : "Todas as Turmas (Geral)"}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* BARRA DE PESQUISA */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={selectedClass ? `Pesquisar em ${selectedClass.name}...` : "Pesquisar em todas..."}
          placeholderTextColor="#888"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* LISTA DE POSTS */}
      <ScrollView style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 20}} />
        ) : (
          filteredPosts.length === 0 ? (
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="chat-processing-outline" size={48} color="#ddd" />
                <Text style={{textAlign: 'center', color: '#999', marginTop: 10}}>
                  {selectedClass 
                    ? "Nenhuma dúvida nesta turma." 
                    : "Nenhuma dúvida recente em suas turmas."}
                </Text>
            </View>
          ) : (
            filteredPosts.map(post => (
              <PostCard 
                key={post.id}
                post={post} 
                onPress={() => navigation.navigate('PostDetalhe', { post: post, user: user })} 
                onLike={() => handleLikePost(post.id)}
              />
            ))
          )
        )}
        <View style={{height: 50}}/>
      </ScrollView>

      {/* MODAL DROPDOWN (SELEÇÃO DE TURMA) */}
      <Modal visible={dropdownVisible} transparent animationType="fade" onRequestClose={() => setDropdownVisible(false)}>
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
             <View style={styles.dropdownModalContent}>
                <Text style={styles.dropdownModalTitle}>Filtrar Visualização</Text>
                <FlatList 
                    data={[{ id: 'all', name: 'Todas as Turmas (Geral)' }, ...myClasses]} // Adiciona opção "Todas" manualmente no topo
                    keyExtractor={item => item.id}
                    renderItem={({item}) => {
                        // Verifica se é a opção selecionada (null = 'all')
                        const isSelected = (item.id === 'all' && selectedClass === null) || (selectedClass?.id === item.id);
                        
                        return (
                            <TouchableOpacity 
                                style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
                                onPress={() => { 
                                    setSelectedClass(item.id === 'all' ? null : item); 
                                    setDropdownVisible(false); 
                                }}
                            >
                                <Text style={[styles.dropdownOptionText, isSelected && {color:'#1154D9', fontWeight:'bold'}]}>
                                    {item.name}
                                </Text>
                                {isSelected && <MaterialCommunityIcons name="check" size={20} color="#1154D9" />}
                            </TouchableOpacity>
                        );
                    }}
                />
             </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL CRIAR NOVO POST */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
                {selectedClass ? `Aviso para ${selectedClass.name}` : "Novo Aviso"}
            </Text>
            
            {/* Aviso se tentar postar sem selecionar turma */}
            {!selectedClass && (
                <Text style={{color: '#E65100', marginBottom: 10, fontSize: 13, backgroundColor: '#FFF3E0', padding: 8, borderRadius: 4}}>
                   <MaterialCommunityIcons name="alert-circle" size={14} /> Selecione uma turma antes de publicar.
                </Text>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Escreva o aviso ou dúvida..."
              multiline
              numberOfLines={4}
              value={newPostText}
              onChangeText={setNewPostText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              {/* Botão muda de cor se estiver desabilitado */}
              <TouchableOpacity 
                style={[styles.modalButtonPost, !selectedClass && {backgroundColor: '#ccc'}]} 
                onPress={handleCreatePost}
                disabled={!selectedClass}
              >
                <Text style={styles.modalButtonTextPost}>Publicar</Text>
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
  
  // HEADER
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  
  // DROPDOWN BUTTON
  filterLabel: { fontSize: 14, color: '#555', fontWeight: 'bold', marginBottom: 8, marginLeft: 5 },
  dropdownButton: {
    backgroundColor: '#1154D9',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginBottom: 10
  },
  dropdownText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // MODAL DROPDOWN
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownModalContent: { backgroundColor: '#fff', borderRadius: 15, width: '85%', padding: 20, maxHeight: '60%', elevation: 5 },
  dropdownModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  dropdownOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownOptionActive: { backgroundColor: '#F0F7FF' },
  dropdownOptionText: { fontSize: 16, color: '#333' },

  // PESQUISA
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, marginHorizontal: 20, marginTop: 5, borderRadius: 10, elevation: 1 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 45, fontSize: 16, color: '#333' },
  
  // LISTA
  listContainer: { padding: 15 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  
  // MODAL CRIAR POST
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 10, padding: 20, width: '90%', elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  modalInput: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 10, textAlignVertical: 'top', minHeight: 100, marginBottom: 20, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButtonCancel: { padding: 10, marginRight: 10 },
  modalButtonPost: { backgroundColor: '#1154D9', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalButtonTextCancel: { color: '#555', fontWeight: 'bold' },
  modalButtonTextPost: { color: 'white', fontWeight: 'bold' },
});