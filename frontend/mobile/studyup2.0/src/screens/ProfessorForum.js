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

  const [allPosts, setAllPosts] = useState([]); 
  const [myClasses, setMyClasses] = useState([]); 
  const [selectedClass, setSelectedClass] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); 
  const [newPostText, setNewPostText] = useState('');
  const [searchText, setSearchText] = useState('');
  
  const navigation = useNavigation();

  // 1. Busca as turmas do professor ao abrir a tela
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await api.get('/api/classes');
        // Filtra apenas turmas deste professor
        const classesDoProf = data.filter(c => c.teacherId === userId);
        setMyClasses(classesDoProf);
        
        // Seleciona a primeira turma automaticamente se houver
        if (classesDoProf.length > 0) {
          setSelectedClass(classesDoProf[0]);
        }
      } catch (error) {
        console.log("Erro ao buscar turmas:", error);
      }
    };
    fetchClasses();
  }, []);

  // 2. Busca os posts sempre que mudar a turma selecionada
  useEffect(() => {
    if (selectedClass) {
      fetchPosts(selectedClass.id);
    } else {
      setAllPosts([]); // Limpa se não tiver turma
    }
  }, [selectedClass]);

  const fetchPosts = async (turmaId) => {
    try {
      setIsLoading(true);
      const data = await api.get(`/api/forum/posts?turmaId=${turmaId}`); 
      setAllPosts(Array.isArray(data) ? data : []);
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
    if (!selectedClass) {
      Alert.alert('Erro', 'Selecione uma turma para postar.');
      return;
    }

    try {
      await api.post('/api/forum/posts', { 
        text: newPostText,
        turmaId: selectedClass.id // Posta na turma que está selecionada na tela
      });
      setModalVisible(false); 
      setNewPostText(''); 
      fetchPosts(selectedClass.id); // Recarrega a lista
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
      Alert.alert('Erro', 'Não foi possível curtir.');
    }
  };

  const filteredPosts = useMemo(() => {
    let posts = allPosts;
    if (searchText.trim().length > 0) {
      const searchLower = searchText.toLowerCase();
      posts = posts.filter(post => 
        (post.text && post.text.toLowerCase().includes(searchLower)) ||
        (post.authorName && post.authorName.toLowerCase().includes(searchLower))
      );
    }
    return posts.map(post => ({
      ...post,
      userHasLiked: Array.isArray(post.likedBy) ? post.likedBy.includes(userId) : false
    }));
  }, [allPosts, searchText, userId]); 

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fórum de Dúvidas</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <MaterialCommunityIcons name="plus-circle-outline" size={28} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* SELETOR DE TURMAS (FILTRO) */}
      <View style={styles.classFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{paddingVertical: 10, paddingLeft: 15}}>
          {myClasses.length === 0 ? (
             <Text style={{color: '#888', marginTop: 5}}>Nenhuma turma encontrada.</Text>
          ) : (
             myClasses.map(turma => (
               <TouchableOpacity 
                 key={turma.id} 
                 style={[styles.classChip, selectedClass?.id === turma.id && styles.classChipActive]}
                 onPress={() => setSelectedClass(turma)}
               >
                 <Text style={[styles.classChipText, selectedClass?.id === turma.id && styles.classChipTextActive]}>
                   {turma.name}
                 </Text>
               </TouchableOpacity>
             ))
          )}
        </ScrollView>
      </View>

      {/* BARRA DE PESQUISA */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={selectedClass ? `Pesquisar em ${selectedClass.name}...` : "Pesquisar..."}
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
            <Text style={{textAlign: 'center', color: '#999', marginTop: 30}}>
              {selectedClass ? "Nenhuma dúvida nesta turma." : "Selecione uma turma acima."}
            </Text>
          ) : (
            filteredPosts.map(post => (
              <PostCard 
                key={post.id}
                post={post} 
                onPress={() => navigation.navigate('PostDetalhe', { post: post })}
                onLike={() => handleLikePost(post.id)}
              />
            ))
          )
        )}
        <View style={{height: 50}}/>
      </ScrollView>

      {/* MODAL DE NOVO POST */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
                Nova mensagem para {selectedClass ? selectedClass.name : '...'}
            </Text>
            
            {!selectedClass ? (
                <Text style={{color: 'red', marginBottom: 10}}>Por favor, selecione uma turma no topo antes de criar um post.</Text>
            ) : (
                <>
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
                    <TouchableOpacity style={styles.modalButtonPost} onPress={handleCreatePost}>
                        <Text style={styles.modalButtonTextPost}>Publicar</Text>
                    </TouchableOpacity>
                    </View>
                </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fa', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  
  classFilterContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', height: 60 },
  classChip: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#f0f0f0', borderRadius: 20, marginRight: 10, height: 35, justifyContent: 'center' },
  classChipActive: { backgroundColor: '#1154D9' },
  classChipText: { color: '#555', fontWeight: '600', fontSize: 14 },
  classChipTextActive: { color: '#fff' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, margin: 10, borderRadius: 10, elevation: 1 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 45, fontSize: 16, color: '#333' },
  
  listContainer: { padding: 15 },
  
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 10, padding: 20, width: '90%', elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  modalInput: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 10, textAlignVertical: 'top', minHeight: 100, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButtonCancel: { padding: 10, marginRight: 10 },
  modalButtonPost: { backgroundColor: '#1154D9', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalButtonTextCancel: { color: '#555', fontWeight: 'bold' },
  modalButtonTextPost: { color: 'white', fontWeight: 'bold' },
});