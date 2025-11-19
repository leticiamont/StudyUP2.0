import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, TouchableOpacity, 
    Platform, StatusBar, Alert, ActivityIndicator, TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService'; 
import { useNavigation } from '@react-navigation/native'; 


const PostCard = ({ post, onLike }) => {
  const userHasLiked = post.userHasLiked;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="account-circle" size={40} color="#1154D9" />
        <Text style={styles.cardUser}>{post.authorName}</Text>
      </View>
      <Text style={styles.cardText}>{post.text}</Text>
      
      <View style={styles.cardFooter}>
        {/* Botão Curtir */}
        <TouchableOpacity onPress={onLike} style={styles.footerAction}>
          <MaterialCommunityIcons 
            name={userHasLiked ? "thumb-up" : "thumb-up-outline"} 
            size={20} 
            color={userHasLiked ? "#1154D9" : "#555"} 
          />
          <Text style={styles.footerText}>{post.likedBy?.length || 0}</Text>
        </TouchableOpacity>
        
        {/* Contagem de Comentários */}
        <View style={[styles.footerAction, { marginLeft: 15 }]}>
          <MaterialCommunityIcons name="comment-outline" size={20} color="#555" />
          <Text style={styles.footerText}>{post.commentCount}</Text>
        </View>
      </View>
    </View>
  );
}

// --- Componente Principal (Ecrã de Detalhe) ---
export default function PostDetalhe({ route }) {
  const navigation = useNavigation();
  const { post: initialPost, user } = route.params; 
  const userId = user?.uid;

  const [post, setPost] = useState({
    ...initialPost,
    userHasLiked: Array.isArray(initialPost.likedBy) ? initialPost.likedBy.includes(userId) : false
  });
  
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false); 


  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const data = await api.get(`/api/forum/posts/${post.id}/comments`);
      setComments(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os comentários.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateComment = async () => {
    if (newCommentText.trim().length === 0) return;
    setIsPostingComment(true);

    try {
      await api.post(`/api/forum/posts/${post.id}/comments`, { text: newCommentText });
      
      setNewCommentText(''); 
      fetchComments(); 
      
      setPost(prevPost => ({ 
        ...prevPost, 
        commentCount: (prevPost.commentCount || 0) + 1 
      }));
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível publicar o comentário.');
    } finally {
      setIsPostingComment(false);
    }
  };
  
  const handleLikePost = async () => {
    try {
      setPost(prevPost => {
        const liked = prevPost.userHasLiked;
        const newLikedBy = liked
          ? prevPost.likedBy.filter(uid => uid !== userId)
          : [...(prevPost.likedBy || []), userId];
        
        return { 
          ...prevPost, 
          likedBy: newLikedBy,
          userHasLiked: !liked
        };
      });

      await api.post(`/api/forum/posts/${post.id}/like`);
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível curtir o post.');
    }
  };

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. CABEÇALHO (Header) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{width: 26}} />
      </View>

      <ScrollView style={styles.listContainer}>
        <PostCard 
          post={post} 
          onLike={handleLikePost} 
        />
        
        <Text style={styles.commentsTitle}>Respostas</Text>

        {/* 3. A Lista de Comentários */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#1154D9" />
        ) : (
          comments.map(comment => (
            <View key={comment.id} style={styles.commentCard}>
              <Text style={styles.commentUser}>{comment.authorName}</Text>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* 4. Caixa de Resposta (Footer) */}
      <View style={styles.replyBox}>
        <TextInput 
          style={styles.replyInput}
          placeholder="Escreva a sua resposta..."
          value={newCommentText}
          onChangeText={setNewCommentText}
          editable={!isPostingComment}
        />
        <TouchableOpacity 
          style={styles.replyButton} 
          onPress={handleCreateComment}
          disabled={isPostingComment}
        >
          {isPostingComment ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="send" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
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
  listContainer: { 
    padding: 15,
  },
  // (Estilos do PostCard)
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15, 
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardUser: {
    marginLeft: 10,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  cardText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Alinha à direita
    alignItems: 'center',
    gap: 15, // Adiciona espaço entre 'like' e 'comment'
  },
  footerAction: { // Usado para 'Responder' no AlunoForum
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLikes: { // Usado para 'Curtir' e 'Comentários'
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    marginLeft: 5,
    color: '#555',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // (Novos Estilos para Comentários)
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 5,
    marginBottom: 10,
  },
  commentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ddd',
  },
  commentUser: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
  },
  // (Novos Estilos para Caixa de Resposta)
  replyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 10,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  replyButton: {
    backgroundColor: '#1154D9',
    borderRadius: 25,
    padding: 10,
    width: 44, // Tamanho fixo
    height: 44, // Tamanho fixo
    justifyContent: 'center',
    alignItems: 'center',
  },
});