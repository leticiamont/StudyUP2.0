import React, { useState, useMemo } from 'react';
import { 
    StyleSheet, Text, View, Platform, StatusBar, FlatList, TouchableOpacity, Modal, Alert 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from '../config/firebaseConfig'; // Certifique-se que o caminho está correto

// --- 1. DADOS MOCK (DIA - FIXO) ---
const agendaDoDia = [
  { id: '1', time: '07:30', title: 'Café da Manhã / Recepção', type: 'Evento', color: '#FFC107' },
  { id: '2', time: '08:00', title: 'Matemática - 9º Ano A', type: 'Aula', color: '#1154D9' },
  { id: '3', time: '09:40', title: 'Intervalo', type: 'Evento', color: '#4CAF50' },
  { id: '4', time: '10:00', title: 'Física - 1º Ano Médio', type: 'Aula', color: '#1154D9' },
  { id: '5', time: '12:00', title: 'Reunião Pedagógica', type: 'Reunião', color: '#D32F2F' },
];

// --- 2. FUNÇÃO GERADORA (MÊS - AUTOMÁTICO) ---
const gerarAgendaDoMes = () => {
  const data = [];
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  
  const titulosPossiveis = ['Aula: Matemática', 'Reunião de Pais', 'Conselho de Classe', 'Entrega de Notas', 'Feriado', 'Planejamento', 'Aula Prática'];
  const horariosPossiveis = ['07:30', '08:20', '10:00', '13:00', '14:40', '16:30'];
  const cores = ['#1154D9', '#D32F2F', '#4CAF50', '#FFC107', '#9C27B0'];

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataObj = new Date(ano, mes, dia);
    const diaSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][dataObj.getDay()];
    const numEventos = Math.floor(Math.random() * 3); 
    const eventosDoDia = [];

    for (let i = 0; i < numEventos; i++) {
      eventosDoDia.push({
        title: titulosPossiveis[Math.floor(Math.random() * titulosPossiveis.length)],
        time: horariosPossiveis[Math.floor(Math.random() * horariosPossiveis.length)],
        color: cores[Math.floor(Math.random() * cores.length)]
      });
    }
    eventosDoDia.sort((a, b) => a.time.localeCompare(b.time));

    data.push({
      id: `mes-${dia}`,
      day: dia.toString().padStart(2, '0'),
      weekDay: diaSemana,
      events: eventosDoDia
    });
  }
  return data;
};

export default function ProfessorHome({ route }) {
  const navigation = useNavigation();
  const user = route.params?.user || {};
  const userName = user.name || user.displayName || ''; 
  const userEmail = user.email || ''; 
  
  const [viewMode, setViewMode] = useState('day'); 
  const [profileModalVisible, setProfileModalVisible] = useState(false); 

  const agendaDoMes = useMemo(() => gerarAgendaDoMes(), []);

  // --- FUNÇÕES DO PERFIL ---

  const handleLogout = async () => {
    const executeLogout = async () => {
      try {
        await signOut(auth); 
        await AsyncStorage.removeItem('userToken'); 
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } catch (error) {
        console.error("Erro ao sair:", error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Deseja realmente sair do aplicativo?")) {
        executeLogout();
      }
    } else {
      Alert.alert("Sair", "Deseja realmente sair do aplicativo?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: executeLogout }
      ]);
    }
  };

  const handleChangePassword = async () => {
    if (!userEmail) {
      if (Platform.OS === 'web') alert("Erro: E-mail não encontrado no perfil.");
      else Alert.alert("Erro", "E-mail não encontrado no perfil.");
      return;
    }

    const executeReset = async () => {
      try {
        await sendPasswordResetEmail(auth, userEmail);
        if (Platform.OS === 'web') {
            alert("Sucesso! E-mail enviado. Verifique sua caixa de entrada.");
        } else {
            Alert.alert("Sucesso", "E-mail enviado! Verifique sua caixa de entrada.");
        }
        setProfileModalVisible(false);
      } catch (error) {
        console.error("Erro senha:", error);
        if (Platform.OS === 'web') alert("Erro: Não foi possível enviar o e-mail.");
        else Alert.alert("Erro", "Não foi possível enviar o e-mail.");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Enviar e-mail de redefinição para ${userEmail}?`)) {
        executeReset();
      }
    } else {
      Alert.alert(
        "Redefinir Senha", 
        `Enviaremos um e-mail para ${userEmail} com o link de redefinição.`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Enviar", onPress: executeReset }
        ]
      );
    }
  };

  // --- RENDERIZADORES DA AGENDA ---
  const renderDayItem = ({ item }) => (
    <View style={styles.agendaRow}>
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{item.time}</Text>
        <View style={styles.timeLine} />
      </View>
      <View style={[styles.eventCard, { borderLeftColor: item.color }]}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventType}>{item.type}</Text>
      </View>
    </View>
  );

  const renderMonthItem = ({ item }) => {
    const temEventos = item.events.length > 0;
    const isWeekend = item.weekDay === 'SÁB' || item.weekDay === 'DOM';
    return (
      <View style={[styles.monthRow, isWeekend && styles.monthRowWeekend]}>
        <View style={styles.dateColumn}>
          <Text style={[styles.dateDay, isWeekend && {color: '#999'}]}>{item.day}</Text>
          <Text style={[styles.dateWeek, isWeekend && {color: '#999'}]}>{item.weekDay}</Text>
        </View>
        <View style={styles.eventsColumn}>
          {temEventos ? (
            item.events.map((evt, index) => (
              <View key={index} style={[styles.miniEventCard, { backgroundColor: evt.color + '15' }]}>
                <Text style={[styles.miniEventTime, { color: evt.color }]}>{evt.time}</Text>
                <View style={[styles.dot, { backgroundColor: evt.color }]} />
                <Text style={[styles.miniEventText, { color: evt.color }]} numberOfLines={1}>
                  {evt.title}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noEventText}>-</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <Text style={styles.logo}>STUDY<Text style={styles.logoUp}>UP</Text></Text>
        <View style={styles.headerIcons}>
                  
          {/* BOTÃO PERFIL (O ícone que sumiu) */}
          <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={{marginLeft: 15}}>
            <MaterialCommunityIcons name="account-circle" size={30} color="#1154D9" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.container}>
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeTitle}>Olá, Professor(a) {userName}!</Text>
          <Text style={styles.welcomeText}>Seja bem vindo(a) e boa aula!.</Text>
        </View>

        <View style={styles.agendaHeader}>
          <Text style={styles.sectionTitle}>
            {viewMode === 'day' ? 'Cronograma (Hoje)' : 'Visão Mensal'}
          </Text>
          <View style={styles.switchContainer}>
            <TouchableOpacity 
              style={[styles.switchBtn, viewMode === 'day' && styles.switchBtnActive]} 
              onPress={() => setViewMode('day')}
            >
              <Text style={[styles.switchText, viewMode === 'day' && styles.switchTextActive]}>Dia</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.switchBtn, viewMode === 'month' && styles.switchBtnActive]} 
              onPress={() => setViewMode('month')}
            >
              <Text style={[styles.switchText, viewMode === 'month' && styles.switchTextActive]}>Mês</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={viewMode === 'day' ? agendaDoDia : agendaDoMes}
          keyExtractor={item => item.id}
          renderItem={viewMode === 'day' ? renderDayItem : renderMonthItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          initialNumToRender={10}
        />
      </View>

      {/* --- MODAL DE PERFIL (O que contém as funções de sair/trocar senha) --- */}
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
          {/* O Card do Perfil fica no topo direito */}
          <View style={styles.profileMenu}>
            <View style={styles.profileHeader}>
                <MaterialCommunityIcons name="account-circle" size={60} color="#1154D9" />
                <Text style={styles.profileName}>{userName}</Text>
                <Text style={styles.profileEmail}>{userEmail}</Text>
            </View>
            
            <View style={styles.profileDivider} />

            <TouchableOpacity style={styles.profileOption} onPress={handleChangePassword}>
                <MaterialCommunityIcons name="lock-reset" size={24} color="#555" />
                <Text style={styles.profileOptionText}>Trocar Senha</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileOption} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={24} color="#D32F2F" />
                <Text style={[styles.profileOptionText, {color: '#D32F2F'}]}>Sair do App</Text>
            </TouchableOpacity>
            
            <View style={styles.profileFooter}>
                <Text style={styles.versionText}>Versão 1.0.2</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6fa', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  logo: { fontSize: 22, fontWeight: 'bold', color: '#1154D9' },
  logoUp: { color: '#BAF241' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  
  container: { flex: 1, padding: 20 },
  welcomeBox: { backgroundColor: '#BAF241', borderRadius: 10, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  welcomeTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  welcomeText: { fontSize: 15, color: '#333' },

  agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  switchContainer: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 20, padding: 2 },
  switchBtn: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 18 },
  switchBtnActive: { backgroundColor: '#fff', elevation: 2 },
  switchText: { fontSize: 12, color: '#666', fontWeight: '600' },
  switchTextActive: { color: '#1154D9' },

  // Agenda
  agendaRow: { flexDirection: 'row', marginBottom: 15 },
  timeContainer: { width: 60, alignItems: 'center', marginRight: 10 },
  timeText: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  timeLine: { width: 2, flex: 1, backgroundColor: '#ddd', borderRadius: 1 },
  eventCard: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 15, borderLeftWidth: 5, borderLeftColor: '#1154D9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, justifyContent: 'center' },
  eventTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  eventType: { fontSize: 12, color: '#888', marginTop: 4, textTransform: 'uppercase', fontWeight: '600' },

  // Mês
  monthRow: { flexDirection: 'row', marginBottom: 10, backgroundColor: '#fff', borderRadius: 10, padding: 12, elevation: 1, minHeight: 70 },
  monthRowWeekend: { backgroundColor: '#f9f9f9', opacity: 0.7 },
  dateColumn: { alignItems: 'center', justifyContent: 'center', paddingRight: 15, borderRightWidth: 1, borderRightColor: '#eee', width: 60 },
  dateDay: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  dateWeek: { fontSize: 12, color: '#888', fontWeight: 'bold', marginTop: 2 },
  eventsColumn: { flex: 1, paddingLeft: 10, justifyContent: 'center' },
  miniEventCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, padding: 4, borderRadius: 4 },
  miniEventTime: { fontSize: 12, fontWeight: 'bold', marginRight: 8, width: 40 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  miniEventText: { fontSize: 13, fontWeight: '600', flex: 1 },
  noEventText: { color: '#ccc', fontSize: 20, fontWeight: 'bold', marginLeft: 10 },

  // MODAL DE PERFIL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  profileMenu: { width: 280, backgroundColor: '#fff', marginTop: 60, marginRight: 20, borderRadius: 15, padding: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10, textAlign: 'center' },
  profileEmail: { fontSize: 14, color: '#666', textAlign: 'center' },
  profileDivider: { height: 1, backgroundColor: '#eee', marginBottom: 15 },
  profileOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  profileOptionText: { fontSize: 16, color: '#333', marginLeft: 15, fontWeight: '500' },
  profileFooter: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, alignItems: 'center' },
  versionText: { fontSize: 12, color: '#aaa' }
});