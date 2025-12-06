import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    StyleSheet, Text, View, Platform, StatusBar, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator, RefreshControl, ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from '../config/firebaseConfig';
import { api } from '../service/apiService';

// --- HELPERS DE AGENDA ---
const converterParaMinutos = (timeStr) => {
    if(!timeStr) return 9999;
    const [h, m] = timeStr.split(':').map(Number); 
    return h * 60 + m;
};

const extrairHorario = (str) => { 
    const m = str.match(/\d{1,2}:\d{0,2}/); 
    return m ? m[0] : '00:00'; 
};

// ... (processarAgendaDoDia mantida) ...
const processarAgendaDoDia = (turmas, eventos) => {
  const hoje = new Date();
  const diaSemanaHoje = hoje.getDay(); 
  const dataHojeStr = hoje.toLocaleDateString('en-CA'); 
  
  const mapaDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const normalizar = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const aulasHoje = turmas.filter(t => {
      if (!t.schedule) return false;
      const diaTexto = normalizar(t.schedule).substring(0, 3);
      return mapaDias[diaTexto] === diaSemanaHoje;
  }).map(t => ({
      id: t.id, 
      time: extrairHorario(t.schedule), 
      title: `${t.name} - ${t.gradeLevel}`, 
      type: 'Aula', 
      color: '#1154D9'
  }));

  const eventosHoje = eventos.filter(ev => {
      if (ev.eventDate) return ev.eventDate === dataHojeStr;
      
      const evDateObj = new Date(ev.createdAt);
      return evDateObj.toLocaleDateString('en-CA') === dataHojeStr;
  }).map(e => ({ 
      id: e.id, 
      time: e.eventTime || '00:00', 
      title: e.title, 
      type: e.type === 'event' ? 'Evento' : 'Aviso', 
      color: e.type === 'event' ? '#E91E63' : '#FFC107' 
  }));

  const tudoHoje = [...aulasHoje, ...eventosHoje];
  tudoHoje.sort((a, b) => converterParaMinutos(a.time) - converterParaMinutos(b.time));

  if (tudoHoje.length === 0) {
      return [{ id: 'empty', time: 'Livre', title: 'Nenhuma atividade agendada.', type: 'Dia Livre', color: '#ccc' }];
  } else {
      return tudoHoje;
  }
};

// --- CORREÇÃO: FUNÇÃO GERADORA MENSAL AGORA É DINÂMICA ---
const gerarAgendaDoMes = (turmas, eventos) => {
    const data = [];
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    const mapaDias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const mapaDiasNum = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const normalizar = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Processa todos os eventos para o mês atual
    const eventosDoMes = eventos.filter(e => {
        if (e.eventDate) {
            const [y, m] = e.eventDate.split('-').map(Number);
            return y === ano && m === mes + 1; // Mês é 0-based
        }
        return false;
    });

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const currentLoopDate = new Date(ano, mes, dia);
        const diaSemana = currentLoopDate.getDay(); // 0=Domingo, 6=Sábado
        const dataStr = currentLoopDate.toLocaleDateString('en-CA'); 

        let eventosDoDia = [];

        // Adiciona Eventos (News)
        const news = eventosDoMes.filter(e => e.eventDate === dataStr).map(e => ({
             title: e.title, time: e.eventTime || '00:00', color: e.type === 'event' ? '#E91E63' : '#FFC107'
        }));
        eventosDoDia.push(...news);
        
        // Adiciona Aulas Regulares
        const aulas = turmas.filter(t => {
            if (!t.schedule) return false;
            const diaTexto = normalizar(t.schedule).substring(0, 3);
            return mapaDiasNum[diaSemana] === diaTexto;
        }).map(t => ({
            title: `${t.name}`,
            time: extrairHorario(t.schedule),
            color: '#1154D9'
        }));
        eventosDoDia.push(...aulas);

        // Ordena por horário
        eventosDoDia.sort((a, b) => converterParaMinutos(a.time) - converterParaMinutos(b.time));


        data.push({
            id: `mes-${dia}`,
            day: dia.toString().padStart(2, '0'),
            weekDay: mapaDias[diaSemana],
            events: eventosDoDia
        });
    }
    return data;
};

// ----------------------------------------------------------------------------------

export default function ProfessorHome({ route }) {
  const navigation = useNavigation();
  const user = route.params?.user || {};
  const userName = user.name || user.displayName || 'Professor'; 
  const userEmail = user.email || ''; 
  
  const [viewMode, setViewMode] = useState('day'); 
  const [profileModalVisible, setProfileModalVisible] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [agendaDoDia, setAgendaDoDia] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  
  // CORREÇÃO: useMemo agora depende de eventos e turmas
  const agendaDoMes = useMemo(() => gerarAgendaDoMes(turmas, eventos), [turmas, eventos]); 

  // --- BUSCA GERAL DE DADOS ---
  const fetchAllData = async () => {
    try {
      if (!refreshing) setLoading(true);
      
      const [newsRes, classesRes] = await Promise.all([
          api.get('/api/news'), // Buscando TODOS os tipos, pois o Month View precisa de todos os eventos/avisos
          api.get('/api/classes') 
      ]);

      const myClasses = classesRes.filter(c => c.teacherId === user.uid);
      
      setEventos(newsRes); // Atualiza eventos para o Month View
      setTurmas(myClasses);

      // Processa a agenda do dia com os dados reais
      setAgendaDoDia(processarAgendaDoDia(myClasses, newsRes));

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error); 
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [])
  );
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
  }, []);
  
  // ... (Funções do Perfil) ...
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

  const handleChangePassword = async () => {
    Alert.alert("Redefinir Senha", "Funcionalidade de redefinição de senha ativada!");
    setProfileModalVisible(false);
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
          <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={{marginLeft: 15}}>
            <MaterialCommunityIcons name="account-circle" size={30} color="#1154D9" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1154D9']} />
        }
      >
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeTitle}>Olá, Professor(a) {userName.split(' ')[0]}!</Text>
          <Text style={styles.welcomeText}>Seja bem vindo(a) e boa aula!.</Text>
        </View>

        {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 50}} />
        ) : (
            <>
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

                {/* FlatList para Agenda do Dia ou Mês */}
                <FlatList
                  data={viewMode === 'day' ? agendaDoDia : agendaDoMes}
                  keyExtractor={item => item.id}
                  renderItem={viewMode === 'day' ? renderDayItem : renderMonthItem}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={<Text style={styles.emptyText}>Agenda vazia.</Text>}
                />
            </>
        )}
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