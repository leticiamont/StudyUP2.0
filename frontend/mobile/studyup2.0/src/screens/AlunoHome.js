import React, { useState, useCallback, useEffect } from 'react';
import { 
    StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, 
    RefreshControl, Alert, Modal, Platform // <--- ADICIONE AQUI
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../service/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AlunoHome({ route }) {
  const user = route.params?.user || {};
  const firstName = (user.name || user.displayName || 'Aluno').split(' ')[0]; 
  
  const navigation = useNavigation();
  
  // ESTADOS
  const [refreshing, setRefreshing] = useState(false);
  const [todaysTasks, setTodaysTasks] = useState([]); 
  const [userPoints, setUserPoints] = useState(user.points || 0);
  const [completedCount, setCompletedCount] = useState(0);
  
  // ESTADO DO MENU DE PERFIL
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // --- 1. BUSCA DADOS REAIS ---
  const fetchData = async () => {
    try {
      // a) Atualiza Pontos
      try {
          const userRes = await api.get(`/api/users/${user.uid}`);
          if (userRes.points !== undefined) setUserPoints(userRes.points);
      } catch (e) { console.log("Erro ao atualizar pontos"); }

      // b) Conta Fases Concluídas
      const saved = await AsyncStorage.getItem('completed_levels');
      const savedIds = saved ? JSON.parse(saved) : [];
      setCompletedCount(savedIds.length);

      // c) Busca Conteúdos "Para Hoje"
      const params = [];
      if (user.classId) params.push(`classId=${user.classId}`);
      if (user.gradeLevel) params.push(`schoolYear=${encodeURIComponent(user.gradeLevel)}`);

      if (params.length === 0) {
          setTodaysTasks([]); 
          return;
      }

      const contents = await api.get(`/api/contents?${params.join('&')}`);
      const data = Array.isArray(contents) ? contents : [];

      const sortedData = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);

      const formatted = sortedData.map(item => ({
        id: item.id,
        title: item.name,
        type: (item.url && item.url.includes('.pdf')) ? 'pdf' : 'text',
        contentUrl: item.url,
        contentText: item.content,
        date: new Date(item.createdAt).toLocaleDateString('pt-BR')
      }));

      setTodaysTasks(formatted);

    } catch (error) {
      console.log(error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // --- LÓGICA DE CONQUISTAS ---
  const getBadges = () => {
      const badges = [];
      if (userPoints >= 500) {
          badges.push({ icon: 'crown', color: '#FFD700', label: 'Mestre do XP', desc: '+500 pontos' });
      } else if (userPoints >= 100) {
          badges.push({ icon: 'medal', color: '#C0C0C0', label: 'Aprendiz', desc: '+100 pontos' });
      } else {
          badges.push({ icon: 'baby-face-outline', color: '#CD7F32', label: 'Novato', desc: 'Começando...' });
      }

      if (completedCount >= 5) {
          badges.push({ icon: 'map-check', color: '#4CAF50', label: 'Explorador', desc: '5 Fases Feitas' });
      } else if (completedCount >= 1) {
          badges.push({ icon: 'foot-print', color: '#2196F3', label: 'Primeiros Passos', desc: '1ª Fase Feita' });
      } else {
          badges.push({ icon: 'sleep', color: '#ccc', label: 'Dorminhoco', desc: 'Nenhuma fase' });
      }

      badges.push({ icon: 'book-open-page-variant', color: '#E91E63', label: 'Estudioso', desc: 'Sempre Ativo' });
      return badges;
  };

  // --- AÇÕES GERAIS ---
  const handleOpenTask = (item) => {
      Alert.alert(
          item.title,
          "O que você deseja fazer hoje?",
          [
              { 
                  text: "📖 Ler Material", 
                  onPress: () => {
                      if (item.type === 'pdf') navigation.navigate('ViewPDF', { url: item.contentUrl });
                      else navigation.navigate('AlunoConteudo'); 
                  } 
              },
              { 
                  text: "🎮 Jogar Quiz", 
                  onPress: () => navigation.navigate('GameQuiz', { 
                      pdfUrl: item.type === 'pdf' ? item.contentUrl : null,
                      textContent: item.type === 'text' ? item.contentText : null,
                      title: item.title,
                      contentId: item.id
                  }) 
              },
              { text: "Cancelar", style: "cancel" }
          ]
      );
  };

  const handleContinue = () => {
      navigation.navigate('Aulas');
  };

  // --- AÇÕES DO MENU DE PERFIL ---
  
  const handleChangePassword = () => {
      setProfileModalVisible(false); // Fecha o menu primeiro
      
      const title = "Trocar Senha";
      const message = "Para redefinir sua senha, entre em contato com seu Professor ou com a Direção da escola.";

      // Verifica se é Web (Computador) ou Mobile (Celular)
      if (Platform.OS === 'web') {
          alert(`${title}\n\n${message}`);
      } else {
          Alert.alert(title, message);
      }
  };

  const handleLogout = async () => {
      setProfileModalVisible(false);
      try {
          // Limpa dados de sessão
          await AsyncStorage.removeItem('userToken');
          // (Opcional: Limpar tudo com AsyncStorage.clear() se quiser resetar o app todo)
          
          // Reseta a navegação para a tela de Login (impede voltar)
          navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
          });
      } catch (e) {
          console.log("Erro ao sair", e);
      }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.logo}>STUDY<Text style={styles.logoUp}>UP</Text></Text>
        
        <View style={styles.pointsBadge}>
          <MaterialCommunityIcons name="star" size={18} color="#FFC107" />
          <Text style={styles.pointsText}>{userPoints}</Text>
        </View>

        {/* BOTÃO DE PERFIL (ABRE O MODAL) */}
        <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
          <MaterialCommunityIcons name="account-circle" size={32} color="#1154D9" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1154D9']} />}
      >
        
        {/* CARD DE BOAS-VINDAS */}
        <View style={styles.welcomeCard}>
          <View>
            <Text style={styles.welcomeTitle}>Olá, {firstName}!</Text>
            <Text style={styles.welcomeSubtitle}>Pronta para aprender hoje?</Text>
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}> 
              <Text style={styles.continueText}>Ir para minhas Aulas</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <MaterialCommunityIcons name="rocket-launch" size={60} color="rgba(255,255,255,0.2)" style={{position:'absolute', right: 10, bottom: 10}} />
        </View>

        {/* SEÇÃO PARA HOJE */}
        <Text style={styles.sectionTitle}>Para Hoje (Novidades)</Text>
        
        {todaysTasks.length === 0 ? (
            <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="check-all" size={40} color="#ccc" />
                <Text style={styles.emptyText}>Tudo em dia! Nenhuma novidade por enquanto.</Text>
            </View>
        ) : (
            <View style={styles.taskList}>
                {todaysTasks.map((task, index) => (
                    <TouchableOpacity key={index} style={styles.taskItem} onPress={() => handleOpenTask(task)}>
                        <View style={[styles.taskIcon, {backgroundColor: task.type === 'pdf' ? '#ffebee' : '#E3F2FD'}]}>
                            <MaterialCommunityIcons 
                                name={task.type === 'pdf' ? "file-pdf-box" : "text-box"} 
                                size={24} 
                                color={task.type === 'pdf' ? "#d32f2f" : "#1154D9"} 
                            />
                        </View>
                        <View style={styles.taskInfo}>
                            <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                            <Text style={styles.taskSub}>Postado em: {task.date}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                    </TouchableOpacity>
                ))}
            </View>
        )}

        {/* CONQUISTAS DINÂMICAS */}
        <Text style={styles.sectionTitle}>Minhas Conquistas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsRow}>
            {getBadges().map((badge, index) => (
                <View key={index} style={styles.badgeCard}>
                    <MaterialCommunityIcons name={badge.icon} size={32} color={badge.color} />
                    <Text style={styles.badgeText}>{badge.label}</Text>
                    <Text style={styles.badgeSub}>{badge.desc}</Text>
                </View>
            ))}
        </ScrollView>

        <View style={{height: 30}} />
      </ScrollView>

      {/* --- MODAL DE PERFIL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setProfileModalVisible(false)}
        >
            <View style={styles.profileMenu}>
                <View style={styles.profileHeader}>
                    <MaterialCommunityIcons name="account-circle" size={60} color="#1154D9" />
                    <Text style={styles.profileName}>{user.name || "Aluno"}</Text>
                    <Text style={styles.profileEmail}>{user.email}</Text>
                </View>
                
                <View style={styles.profileDivider} />

                {/* OPÇÃO 1: TROCAR SENHA */}
                <TouchableOpacity style={styles.profileOption} onPress={handleChangePassword}>
                    <MaterialCommunityIcons name="lock-reset" size={24} color="#555" />
                    <Text style={styles.profileOptionText}>Trocar Senha</Text>
                </TouchableOpacity>

                {/* OPÇÃO 2: SAIR */}
                <TouchableOpacity style={styles.profileOption} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color="#D32F2F" />
                    <Text style={[styles.profileOptionText, {color:'#D32F2F'}]}>Sair</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  logo: { fontSize: 20, fontWeight: 'bold', color: '#1154D9' },
  logoUp: { color: '#BAF241' },
  
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#FFE082'
  },
  pointsText: { marginLeft: 5, fontWeight: 'bold', color: '#333', fontSize: 14 },

  container: { padding: 20 },

  welcomeCard: {
    backgroundColor: '#1154D9', borderRadius: 15, padding: 20, marginBottom: 25,
    overflow: 'hidden', elevation: 4, shadowColor: '#1154D9',
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  welcomeSubtitle: { fontSize: 14, color: '#E3F2FD', marginBottom: 15 },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, alignSelf: 'flex-start'
  },
  continueText: { color: '#fff', fontWeight: 'bold', marginRight: 5, fontSize: 12 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },

  taskList: { marginBottom: 20 },
  taskItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 15, marginBottom: 10,
  },
  taskIcon: {
    width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  taskSub: { fontSize: 12, color: '#888' },

  emptyBox: { alignItems: 'center', padding: 20, marginBottom: 20 },
  emptyText: { color: '#999', marginTop: 10, fontStyle: 'italic' },

  achievementsRow: { flexDirection: 'row', overflow: 'visible', paddingBottom: 10 },
  badgeCard: {
    backgroundColor: '#fff', padding: 15, borderRadius: 12, alignItems: 'center',
    marginRight: 10, width: 110, borderWidth: 1, borderColor: '#eee',
    elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1
  },
  badgeText: { fontSize: 12, color: '#333', marginTop: 8, textAlign: 'center', fontWeight: 'bold' },
  badgeSub: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 2 },

  // ESTILOS DO MODAL DE PERFIL
  modalOverlay: { 
      flex: 1, 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      justifyContent: 'flex-start', // Começa do topo
      alignItems: 'flex-end'        // Alinha à direita
  },
  profileMenu: { 
      width: 250, 
      backgroundColor: '#fff', 
      marginTop: 65, // Distância do topo (Header)
      marginRight: 20, 
      borderRadius: 15, 
      padding: 20, 
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: {width:0, height:4},
      shadowOpacity: 0.3,
      shadowRadius: 5
  },
  profileHeader: { alignItems: 'center', marginBottom: 15 },
  profileName: { fontSize: 16, fontWeight: 'bold', marginTop: 10, color: '#333' },
  profileEmail: { fontSize: 12, color: '#888' },
  profileDivider: { height: 1, backgroundColor: '#eee', marginBottom: 10 },
  profileOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  profileOptionText: { marginLeft: 15, fontSize: 16, color: '#333' }
});