import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { SafeAreaView } from 'react-native-safe-area-context';

// Dados de exemplo (vamos substituí-los pelo backend depois)
const materials = [
  { type: 'PDF', title: 'Aula 1 - PDF', icon: 'file-pdf-box', actionIcon: 'download' },
  { type: 'Vídeo', title: 'Aula 1 - Vídeo', icon: 'play-box', actionIcon: 'download' },
  { type: 'Link', title: 'Aula 1 - Link', icon: 'folder-open', actionIcon: 'open-in-new' },
  { type: 'PDF', title: 'Aula 2 - PDF', icon: 'file-pdf-box', actionIcon: 'download' },
  { type: 'PDF', title: 'Aula 3 - PDF', icon: 'file-pdf-box', actionIcon: 'download' },
  { type: 'Link', title: 'Aula 3 - Link', icon: 'folder-open', actionIcon: 'open-in-new' },
  { type: 'Vídeo', title: 'Aula 3 - Vídeo', icon: 'play-box', actionIcon: 'download' },
  { type: 'Vídeo', title: 'Aula 4 - Vídeo', icon: 'play-box', actionIcon: 'download' },
];

export default function AlunoConteudo({ route }) {
  const user = route.params?.user || {};
  const userName = user.name || user.displayName || 'Aluno';
  const points = 1200;

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

      {/* 2. Botão Dropdown Módulo */}
      <TouchableOpacity style={styles.moduleButton}>
        <Text style={styles.moduleButtonText}>MODULO 1 - INTRODUÇÃO</Text>
        <MaterialCommunityIcons name="chevron-down" size={24} color="#fff" />
      </TouchableOpacity>

      {/* 3. Abas de Filtro (PDF, Vídeos, Links) */}
      <View style={styles.filterTabs}>
        <TouchableOpacity style={styles.filterChipActive}>
          <Text style={styles.filterTextActive}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>VÍDEOS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>LINKS</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Lista de Materiais */}
      <ScrollView style={styles.listContainer}>
        {materials.map((item, index) => (
          <View key={index} style={styles.materialItem}>
            {/* Ícone e Título */}
            <View style={styles.materialInfo}>
              <MaterialCommunityIcons name={item.icon} size={30} color="#1154D9" />
              <Text style={styles.materialTitle}>{item.title}</Text>
            </View>
            {/* Botão de Ação (Download/Abrir) */}
            <TouchableOpacity>
              <MaterialCommunityIcons name={item.actionIcon} size={26} color="#1154D9" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
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
  headerProfile: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  headerPoints: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
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
    backgroundColor: '#f0f0f0', // Cor inativa
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: '#333', // Cor ativa
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  filterText: { 
    color: '#555', 
    fontWeight: 'bold' 
  },
  filterTextActive: { 
    color: '#BAF241', // Cor do texto ativo
    fontWeight: 'bold' 
  },
  listContainer: { 
    paddingHorizontal: 20 
  },
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
    alignItems: 'center' 
  },
  materialTitle: { 
    fontSize: 16, 
    marginLeft: 15,
    color: '#333'
  },
});