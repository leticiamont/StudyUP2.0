import React, { useState } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, RefreshControl 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AlunoHome({ route }) {
  const user = route.params?.user || {};
  const firstName = (user.name || user.displayName || 'Aluno').split(' ')[0]; 
  const points = user.points || 1200; 

  // Estado para controlar o refresh
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulação de reload (aqui você chamaria sua API para atualizar pontos/user)
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. HEADER */}
      <View style={styles.header}>
        <Text style={styles.logo}>STUDY<Text style={styles.logoUp}>UP</Text></Text>
        
        <View style={styles.pointsBadge}>
          <MaterialCommunityIcons name="star" size={18} color="#FFC107" />
          <Text style={styles.pointsText}>{points}</Text>
        </View>

        <TouchableOpacity>
          <MaterialCommunityIcons name="account-circle" size={32} color="#1154D9" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1154D9']} />
        }
      >
        
        {/* 2. CARD DE BOAS-VINDAS */}
        <View style={styles.welcomeCard}>
          <View>
            <Text style={styles.welcomeTitle}>Olá, {firstName}!</Text>
            <Text style={styles.welcomeSubtitle}>Pronta para aprender hoje?</Text>
            <TouchableOpacity style={styles.continueBtn}>
              <Text style={styles.continueText}>Continuar Módulo 1</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <MaterialCommunityIcons name="rocket-launch" size={60} color="rgba(255,255,255,0.2)" style={{position:'absolute', right: 10, bottom: 10}} />
        </View>

        {/* 3. PRÓXIMAS ATIVIDADES */}
        <Text style={styles.sectionTitle}>Para Hoje</Text>
        <View style={styles.taskList}>
            
            <View style={styles.taskItem}>
                <View style={[styles.taskIcon, {backgroundColor: '#E3F2FD'}]}>
                    <MaterialCommunityIcons name="file-document" size={24} color="#1154D9" />
                </View>
                <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>Ler: Introdução ao Python</Text>
                    <Text style={styles.taskSub}>Módulo 1 • 15 min</Text>
                </View>
                <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={24} color="#ccc" />
            </View>

            <View style={styles.taskItem}>
                <View style={[styles.taskIcon, {backgroundColor: '#FFF8E1'}]}>
                    <MaterialCommunityIcons name="controller-classic" size={24} color="#FFC107" />
                </View>
                <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>Quiz: Lógica Básica</Text>
                    <Text style={styles.taskSub}>Vale 50 pontos</Text>
                </View>
                <MaterialCommunityIcons name="lock" size={24} color="#ccc" />
            </View>

        </View>

        {/* 4. CONQUISTAS RECENTES */}
        <Text style={styles.sectionTitle}>Conquistas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsRow}>
            <View style={styles.badgeCard}>
                <MaterialCommunityIcons name="fire" size={32} color="#FF5722" />
                <Text style={styles.badgeText}>3 Dias Seguidos</Text>
            </View>
            <View style={styles.badgeCard}>
                <MaterialCommunityIcons name="check-decagram" size={32} color="#4CAF50" />
                <Text style={styles.badgeText}>Primeira Nota 10</Text>
            </View>
            <View style={styles.badgeCard}>
                <MaterialCommunityIcons name="code-tags" size={32} color="#1154D9" />
                <Text style={styles.badgeText}>Dev Iniciante</Text>
            </View>
        </ScrollView>

        <View style={{height: 30}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logo: { fontSize: 20, fontWeight: 'bold', color: '#1154D9' },
  logoUp: { color: '#BAF241' },
  
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE082'
  },
  pointsText: { marginLeft: 5, fontWeight: 'bold', color: '#333', fontSize: 14 },

  container: { padding: 20 },

  welcomeCard: {
    backgroundColor: '#1154D9',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#1154D9',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  welcomeSubtitle: { fontSize: 14, color: '#E3F2FD', marginBottom: 15 },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  continueText: { color: '#fff', fontWeight: 'bold', marginRight: 5, fontSize: 12 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },

  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  taskIcon: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  taskSub: { fontSize: 12, color: '#888' },

  achievementsRow: { flexDirection: 'row', overflow: 'visible' },
  badgeCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
    width: 100,
    borderWidth: 1,
    borderColor: '#eee'
  },
  badgeText: { fontSize: 11, color: '#555', marginTop: 8, textAlign: 'center', fontWeight: '600' }
});