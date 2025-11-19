import React, { useState, useEffect, useMemo } from 'react'; 
import { 
    StyleSheet, Text, View, ScrollView, TouchableOpacity, 
    Platform, StatusBar, Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService'; 
import { useNavigation } from '@react-navigation/native';
import { PostCard } from '../components/PostCard'; 

export default function AlunoForum({ route }) {
  const { user } = route.params;
  const userId = user?.uid; 

  const [allPosts, setAllPosts] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false); 
  const [newPostText, setNewPostText] = useState('');
  const [filter, setFilter] = useState('all'); 
  const [searchText, setSearchText] = useState('');
  const navigation = useNavigation();


  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const data = await api.get('/api/forum/posts'); 
      setAllPosts(data); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os posts.');
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleCreatePost = async () => {
    if (newPostText.trim().length === 0) {
      Alert.alert('Erro', 'O post não pode estar vazio.');
      return;
    }
    try {
      await api.post('/api/forum/posts', { 
        text: newPostText,
        turmaId: 'turma_geral_alunos' 
      });
      setModalVisible(false); 
      setNewPostText(''); 
      fetchPosts(); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar o post.');
    }
  };


  const handleLikePost = async (postId) => {
    try {
      await api.post(`/api/forum/posts/${postId}/like`);
      
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
      Alert.alert('Erro', 'Não foi possível curtir o post.');
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []); 

  const filteredPosts = useMemo(() => {
    let posts = allPosts;

    if (filter === 'me') {
      posts = posts.filter(post => post.authorId === userId);
    }

    if (searchText.trim().length > 0) {
      const searchLower = searchText.toLowerCase();
      posts = posts.filter(post => 
        (post.text && post.text.toLowerCase().includes(searchLower)) ||
        (post.authorName && post.authorName.toLowerCase().includes(searchLower))
      );
    }

    return posts.map(post => {
      const userHasLiked = Array.isArray(post.likedBy) 
                            ? post.likedBy.includes(userId) 
                            : false;
      
      return {
        ...post,
        userHasLiked: userHasLiked
      };
    });
  }, [allPosts, filter, searchText, userId]); 


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. CABEÇALHO (Header) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerIcons}>
          {/* O botão "+" (para abrir o modal) */}
          <TouchableOpacity style={{ marginLeft: 20 }} onPress={() => setModalVisible(true)}>
            <MaterialCommunityIcons name="plus-circle-outline" size={26} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* 2. BARRA DE PESQUISA */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por autor ou palavra-chave..."
          placeholderTextColor="#888"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* 3. Sub-abas (Todos / Meus) */}
      <View style={styles.filterTabs}>
        <TouchableOpacity 
          style={filter === 'all' ? styles.filterTabActive : styles.filterTab}
          onPress={() => setFilter('all')} 
        >
          <Text style={filter === 'all' ? styles.filterTextActive : styles.filterText}>Todos Comentários</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={filter === 'me' ? styles.filterTabActive : styles.filterTab}
          onPress={() => setFilter('me')} 
        >
          <Text style={filter === 'me' ? styles.filterTextActive : styles.filterText}>Meus Comentários</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Lista de Posts */}
      <ScrollView style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 20}} />
        ) : (
          filteredPosts.map(post => (
            <PostCard 
              key={post.id}
              post={post} 
              onPress={() => navigation.navigate('PostDetalhe', { post: post })}
              onLike={() => handleLikePost(post.id)}
            />
          ))
        )}
      </ScrollView>

      {/* 5. O MODAL DE NOVO POST */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Post</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Escreva a sua dúvida aqui..."
              multiline
              numberOfLines={4}
              value={newPostText}
              onChangeText={setNewPostText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPost} onPress={handleCreatePost}>
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
  headerIcons: { 
    flexDirection: 'row' 
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
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
  listContainer: { 
    padding: 15,
  },
  
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButtonCancel: {
    padding: 10,
    marginRight: 10,
  },
  modalButtonPost: {
    backgroundColor: '#1154D9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonTextCancel: {
    color: '#555',
    fontWeight: 'bold',
  },
  modalButtonTextPost: {
    color: 'white',
    fontWeight: 'bold',
  },
});