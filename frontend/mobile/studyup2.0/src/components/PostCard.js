import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const PostCard = ({ post, onPress, onLike }) => (
  <View style={styles.card}>
    {/* Cabeçalho do Card (clicável) */}
    <TouchableOpacity onPress={onPress}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="account-circle" size={40} color="#1154D9" />
        <Text style={styles.cardUser}>{post.authorName}</Text>
      </View>
      <Text style={styles.cardText}>{post.text}</Text>
    </TouchableOpacity>
    
    {/* Rodapé do Card (Ações) */}
    <View style={styles.cardFooter}>
      <TouchableOpacity style={styles.footerAction} onPress={onPress}>
        <MaterialCommunityIcons name="arrow-left-top" size={20} color="#555" />
        <Text style={styles.footerText}>Responder</Text>
      </TouchableOpacity>
      <View style={styles.footerLikes}>
        {/* Botão Curtir */}
        <TouchableOpacity style={styles.footerAction} onPress={onLike}>
          <MaterialCommunityIcons 
            name={post.userHasLiked ? "thumb-up" : "thumb-up-outline"} 
            size={20} 
            color={post.userHasLiked ? "#1154D9" : "#555"} 
          />
          <Text style={styles.footerText}>{post.likedBy?.length || 0}</Text>
        </TouchableOpacity>
        {/* Comentários */}
        <View style={[styles.footerAction, { marginLeft: 15 }]}>
          <MaterialCommunityIcons name="comment-outline" size={20} color="#555" />
          <Text style={styles.footerText}>{post.commentCount}</Text>
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15, 
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 15,
    paddingHorizontal: 15,
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
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLikes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    marginLeft: 5,
    color: '#555',
    fontWeight: 'bold',
    fontSize: 12,
  },
});