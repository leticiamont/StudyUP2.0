import React from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfessorHome({ route }) {
  const user = route.params?.user || {};
  const userName = user.name || user.displayName || ''; 

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. CABEÇALHO (Header) */}
      <View style={styles.header}>
        <Text style={styles.logo}>STUDY<Text style={styles.logoUp}>UP</Text></Text>
        <View style={styles.headerIcons}>
          <MaterialCommunityIcons name="bell" size={26} color="#555" />
          <MaterialCommunityIcons name="account-circle" size={26} color="#555" style={{marginLeft: 15}} />
        </View>
      </View>

      <ScrollView style={styles.container}>
        {/* 2. Caixa de Boas-vindas */}
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeTitle}>Olá, Professor {userName}!</Text>
          <Text style={styles.welcomeText}>Bem vindo ao StudyUP! Aqui estão suas próximas aulas:</Text>
        </View>

        {/* 3. Seção do Calendário */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendário</Text>
          <View style={styles.calendarCard}>
            <Text style={styles.calendarText}>Próxima Aula: Turma 6B - 17/11 às 14:00</Text>
            <Text style={styles.calendarText}>Entrega de Notas: 20/11</Text>
          </View>
        </View>

        {/* 4. Seção de Avisos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avisos importantes</Text>
          <View style={styles.avisoCard}>
            <Text style={styles.avisoData}>📅 15/12/2024</Text>
            <Text style={styles.avisoTitle}>Reunião de Professores</Text>
            <Text style={styles.avisoText}>Reunião obrigatória amanhã às 14h na sala de professores.</Text>
          </View>
          <View style={styles.avisoCard}>
            <Text style={styles.avisoData}>⚙️ 14/12/2024</Text>
            <Text style={styles.avisoTitle}>Atualização do Sistema</Text>
            <Text style={styles.avisoText}>O sistema ficará indisponível para manutenção das 22h às 24h.</Text>
          </View>
        </View>
      </ScrollView>
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
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1154D9',
  },
  logoUp: {
    color: '#BAF241', 
  },
  headerIcons: { 
    flexDirection: 'row' 
  },
  container: {
    flex: 1,
    padding: 20,
  },
  welcomeBox: {
    backgroundColor: '#BAF241', 
    borderRadius: 10,
    padding: 20,
    marginBottom: 25,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  welcomeText: {
    fontSize: 16,
    color: '#333',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  calendarText: {
    fontSize: 15,
    lineHeight: 22,
  },
  avisoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  avisoData: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1154D9',
    marginBottom: 5,
  },
  avisoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  avisoText: {
    fontSize: 14,
    color: '#555',
  },
});