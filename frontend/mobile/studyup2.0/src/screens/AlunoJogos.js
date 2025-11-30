import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../service/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AlunoJogos({ route }) {
  const navigation = useNavigation();
  const { user } = route.params || {};
  
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(user.points || 0);
  const [completedIds, setCompletedIds] = useState([]); 

  const ICONS = ['star', 'school', 'book-open-variant', 'flask', 'brain', 'lightning-bolt'];
  const COLORS = ['#FFC107', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#FF5722'];

  const fetchLevels = async () => {
    try {
      setLoading(true);
      
      const saved = await AsyncStorage.getItem('completed_levels');
      const savedIds = saved ? JSON.parse(saved) : [];
      setCompletedIds(savedIds);

      try {
          const userRes = await api.get(`/api/users/${user.uid}`);
          if (userRes.points) setTotalPoints(userRes.points);
      } catch (e) {}

      const params = [];
      if (user.classId) params.push(`classId=${user.classId}`);
      if (user.gradeLevel) params.push(`schoolYear=${encodeURIComponent(user.gradeLevel)}`);

      if (params.length === 0) {
          setLevels([]); setLoading(false); return;
      }

      const contents = await api.get(`/api/contents?${params.join('&')}`);
      const data = Array.isArray(contents) ? contents : [];

      const dynamicLevels = data.map((item, index) => {
        const isCompleted = savedIds.includes(item.id);
        const previousId = index > 0 ? data[index - 1].id : null;
        const isUnlocked = index === 0 || savedIds.includes(previousId);

        return {
            id: item.id,
            title: item.name,
            type: (item.url && item.url.includes('.pdf')) ? 'pdf' : 'text',
            contentUrl: item.url,
            contentText: item.content,
            icon: ICONS[index % ICONS.length],
            color: isUnlocked ? COLORS[index % COLORS.length] : '#E0E0E0', 
            status: isUnlocked ? (isCompleted ? 'completed' : 'active') : 'locked'
        };
      });

      setLevels(dynamicLevels);

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchLevels(); }, [])
  );

  const handlePressLevel = (level) => {
    if (level.status === 'locked') {
        Alert.alert("Bloqueado 🔒", "Complete a fase anterior para desbloquear esta!");
        return;
    }

    navigation.navigate('GameQuiz', { 
      pdfUrl: level.type === 'pdf' ? level.contentUrl : null,
      textContent: level.type === 'text' ? level.contentText : null,
      title: level.title,
      contentId: level.id
    });
  };

  const getMarginStyle = (index) => {
    const offset = 60; 
    const positions = [0, offset, 0, -offset]; 
    return { marginLeft: positions[index % 4] };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trilha do Conhecimento</Text>
        <View style={styles.crownContainer}>
            <MaterialCommunityIcons name="trophy" size={24} color="#FFC107" />
            <Text style={styles.crownText}>{totalPoints} XP</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1154D9" style={{marginTop: 50}} />
      ) : levels.length === 0 ? (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="map-marker-off" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma atividade na trilha.</Text>
        </View>
      ) : (
        <ScrollView 
            style={styles.container} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* INÍCIO (AZUL) */}
            <View style={styles.startPoint}>
                <Text style={styles.startText}>INÍCIO</Text>
            </View>

            {levels.map((level, index) => {
                const showConnector = index < levels.length - 1;
                const isLocked = level.status === 'locked';

                return (
                <View key={level.id} style={[styles.levelRow, getMarginStyle(index)]}>
                
                {showConnector && (
                    <View style={[
                        styles.connector, 
                        { 
                            height: 80,
                            backgroundColor: levels[index+1]?.status === 'locked' ? '#E0E0E0' : level.color,
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
                            { 
                                backgroundColor: level.color,
                                borderColor: isLocked ? '#CCC' : 'rgba(0,0,0,0.1)' 
                            }
                        ]}
                    >
                        <MaterialCommunityIcons 
                            name={isLocked ? "lock" : (level.status === 'completed' ? "check-bold" : level.icon)} 
                            size={32} 
                            color={isLocked ? "#999" : "#fff"} 
                        />
                        {level.status === 'completed' && (
                            <View style={styles.starBadge}>
                                <MaterialCommunityIcons name="star" size={14} color="#FFC107" />
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.levelTitle, isLocked && {color:'#999'}]} numberOfLines={2}>
                        {level.title}
                    </Text>
                </View>
                </View>
            )})}
            
            {/* CHEGADA */}
            <View style={{alignItems:'center', marginTop: 10}}>
                <MaterialCommunityIcons name="flag-checkered" size={40} color="#1154D9" />
                <Text style={[styles.startText, {color: '#1154D9'}]}>CHEGADA</Text>
            </View>
            
            <View style={{height: 100}} /> 
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff', elevation: 2
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#555', textTransform: 'uppercase' },
  crownContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', padding: 8, borderRadius: 20 },
  crownText: { fontSize: 16, fontWeight: 'bold', color: '#FFA000', marginLeft: 5 },
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingVertical: 30, alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#888', marginTop: 10 },
  levelRow: { alignItems: 'center', marginBottom: 25, position: 'relative', width: 100 },
  connector: { position: 'absolute', top: 50, width: 8, zIndex: -1, borderRadius: 4 },
  levelWrapper: { alignItems: 'center', justifyContent: 'center', width: 140 },
  levelButton: {
    width: 75, height: 75, borderRadius: 37.5, justifyContent: 'center', alignItems: 'center',
    borderBottomWidth: 5, elevation: 5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, marginBottom: 8,
  },
  levelTitle: { fontSize: 13, fontWeight: 'bold', color: '#555', textAlign: 'center', marginTop: 5 },
  starBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#fff', borderRadius: 10, padding: 3, elevation:2 },
  
  // ESTILO NOVO: BOTÃO INÍCIO AZUL
  startPoint: { backgroundColor: '#1154D9', paddingHorizontal: 25, paddingVertical: 8, borderRadius: 20, marginBottom: 25, elevation: 3 },
  startText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});