import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../service/apiService';

export default function AlunoJogos({ route }) {
  const navigation = useNavigation();
  const user = route.params?.user || {};
  
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ícones e Cores para variar as fases
  const ICONS = ['egg', 'star', 'trophy', 'fire', 'lightning-bolt', 'sword'];
  const COLORS = ['#FFC107', '#FF9800', '#1154D9', '#4CAF50', '#9C27B0', '#E91E63'];

  const fetchLevels = async () => {
    if (!user.classId) {
        setLoading(false);
        return;
    }

    try {
      setLoading(true);
      // 1. Busca os PDFs reais da turma
      const contents = await api.get(`/api/contents?classId=${user.classId}`);
      const pdfs = Array.isArray(contents) ? contents : [];

      // 2. Transforma cada PDF em um "Nível" do jogo
      const dynamicLevels = pdfs.map((pdf, index) => ({
        id: pdf.id,
        title: pdf.name.replace('.pdf', ''), // Remove a extensão
        pdfUrl: pdf.url, // Guarda a URL para gerar o quiz
        icon: ICONS[index % ICONS.length],
        color: COLORS[index % COLORS.length],
        status: 'active', // Todos desbloqueados (para teste)
        stars: 0 
      }));

      if (dynamicLevels.length === 0) {
          // Mock se não tiver nada, para não ficar vazio
          setLevels([{ id: 'mock', title: 'Aguardando Professor...', icon: 'sleep', color: '#ccc', status: 'locked' }]);
      } else {
          setLevels(dynamicLevels);
      }

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLevels();
    }, [])
  );

  const handlePressLevel = (level) => {
    if (level.status === 'locked') {
      Alert.alert("Ops!", "O professor ainda não liberou atividades.");
      return;
    }
    
    // 3. Manda a URL do PDF para o GameQuiz gerar as perguntas
    navigation.navigate('GameQuiz', { 
      pdfUrl: level.pdfUrl, 
      title: level.title 
    });
  };

  // Lógica do Zig-Zag (Visual)
  const getMarginStyle = (index) => {
    const offset = 60; 
    const positions = [0, offset, 0, -offset]; 
    return { marginLeft: positions[index % 4] };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trilha da Turma</Text>
        <View style={styles.crownContainer}>
            <MaterialCommunityIcons name="crown" size={24} color="#FFC107" />
            <Text style={styles.crownText}>{user.points || 0}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 50}} />
      ) : (
        <ScrollView 
            style={styles.container} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {levels.map((level, index) => {
            const isLocked = level.status === 'locked';
            const btnColor = isLocked ? '#E5E5E5' : level.color;
            const iconColor = isLocked ? '#A0A0A0' : '#fff';

            return (
                <View key={level.id} style={[styles.levelRow, getMarginStyle(index)]}>
                
                {/* Linha Conectora */}
                {index < levels.length - 1 && (
                    <View style={[
                        styles.connector, 
                        { 
                            height: 80,
                            transform: [{ rotate: (index % 2 === 0) ? '-15deg' : '15deg' }],
                            left: (index % 4 === 1) ? 20 : (index % 4 === 3) ? -20 : 0
                        }
                    ]} />
                )}

                <View style={styles.levelWrapper}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handlePressLevel(level)}
                        style={[
                            styles.levelButton,
                            { backgroundColor: btnColor, borderColor: isLocked ? '#CECECE' : 'rgba(0,0,0,0.2)' }
                        ]}
                    >
                    <MaterialCommunityIcons 
                        name={level.icon} 
                        size={32} 
                        color={iconColor} 
                    />
                    </TouchableOpacity>

                    <Text style={styles.levelTitle} numberOfLines={2}>
                        {level.title}
                    </Text>
                </View>
                </View>
            );
            })}
            
            <View style={{height: 100}} /> 
        </ScrollView>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    elevation: 2
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  crownContainer: { flexDirection: 'row', alignItems: 'center' },
  crownText: { fontSize: 16, fontWeight: 'bold', color: '#FFC107', marginLeft: 5 },

  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingVertical: 30, alignItems: 'center' },

  levelRow: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
    width: 100,
  },
  
  connector: {
    position: 'absolute',
    top: 40,
    width: 8,
    backgroundColor: '#E5E5E5',
    zIndex: -1,
    borderRadius: 4,
  },

  levelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120, 
  },

  levelButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 6, // Efeito 3D
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: 8,
  },

  levelTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
    marginTop: 5
  },
});