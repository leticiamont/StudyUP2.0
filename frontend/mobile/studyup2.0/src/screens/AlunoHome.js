import React from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    ScrollView, 
    TouchableOpacity, 
    SafeAreaView 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 

export default function AlunoFeed({ route }) {
  const user = route.params?.user || {};
  
  const fullName = user.name || user.displayName || 'Aluno';
  
  const firstName = fullName.split(' ')[0]; 

  const points = 1200; 

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* 1. CABEÇALHO (Header) */}
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          <MaterialCommunityIcons name="account-circle" size={28} color="#1154D9" />
          <Text style={styles.headerText}>{firstName.toUpperCase()}</Text>
        </View>
        <View style={styles.headerPoints}>
          <MaterialCommunityIcons name="star" size={24} color="#FFC107" />
          <Text style={styles.headerText}>{points}</Text>
        </View>
        <TouchableOpacity>
          <MaterialCommunityIcons name="bell" size={26} color="#555" />
        </TouchableOpacity>
      </View>

      {/* 2. CONTEÚDO (Scroll) ) */}
      <ScrollView contentContainerStyle={styles.container}>
        
        <TouchableOpacity style={styles.moduleButton}>
          <Text style={styles.moduleButtonText}>MODULO 1 - INTRODUÇÃO</Text>
          <MaterialCommunityIcons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Resto do seu código do progressMap que será colocado depois ... */}
        <View style={styles.progressMap}>
          
          {/* Item 1 (CPU) */}
          <View style={[styles.mapItem, { alignSelf: 'flex-end', marginRight: '20%' }]}>
            <TouchableOpacity style={styles.stepCircle}>
              <MaterialCommunityIcons name="cpu-64-bit" size={35} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={[styles.dotRow, { justifyContent: 'flex-start', marginLeft: '30%' }]}>
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          
          {/* Item 2 (Desktop) */}
          <View style={[styles.mapItem, { alignSelf: 'flex-start', marginLeft: '20%' }]}>
            <TouchableOpacity style={styles.stepCircle}>
              <MaterialCommunityIcons name="desktop-tower-monitor" size={35} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={[styles.dotRow, { justifyContent: 'flex-end', marginRight: '30%' }]}>
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          {/* Item 3 (WiFi) */}
          <View style={[styles.mapItem, { alignSelf: 'flex-end', marginRight: '10%' }]}>
            <TouchableOpacity style={styles.stepCircle}>
              <MaterialCommunityIcons name="wifi" size={35} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={[styles.dotRow, { justifyContent: 'flex-start', marginLeft: '40%' }]}>
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          {/* Item 4 (Laptop) */}
          <View style={[styles.mapItem, { alignSelf: 'center' }]}>
            <TouchableOpacity style={styles.stepCircle}>
              <MaterialCommunityIcons name="laptop" size={35} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  container: {
    paddingHorizontal: 20,
  },
  moduleButton: {
    backgroundColor: '#1154D9', 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 30, 
    marginVertical: 25,
    width: '100%',
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
  progressMap: {
    width: '100%',
    paddingVertical: 20,
  },
  mapItem: {
    marginBottom: 10,
  },
  stepCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1154D9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  dotRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#BAF241', 
    marginHorizontal: 6,
  }
});