import React, { useState, useEffect } from 'react'; 
import { 
    StyleSheet, Text, View, TouchableOpacity, Platform, StatusBar, 
    ActivityIndicator, TextInput, KeyboardAvoidingView, ScrollView, Modal, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importações condicionais para WEB
let CodeMirror, darcula, python;
if (Platform.OS === 'web') {
  CodeMirror = require('@uiw/react-codemirror').default;
  darcula = require('@uiw/codemirror-theme-darcula').darcula;
  python = require('@codemirror/lang-python').python;
}

export default function AlunoIde({ route }) {
  const { user } = route.params || {}; // Usuário inicial (cache)

  const [code, setCode] = useState(
`# Exemplo:
nome = "Maria"
print(f"Olá, {nome}!")`
  );
  
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // ESTADOS DA DICA
  const [hintModalVisible, setHintModalVisible] = useState(false);
  const [hintText, setHintText] = useState('');
  const [isHintLoading, setIsHintLoading] = useState(false);
  
  // ESTADOS DE CONTROLE (Pontos e Dicas)
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(user?.points || 0);

  // --- 1. CARREGA DADOS AO ABRIR ---
  useEffect(() => {
      // Carrega contador de dicas
      AsyncStorage.getItem('ide_hints_count').then(val => {
          if (val) setHintsUsedCount(parseInt(val));
      });

      // Carrega saldo de pontos ATUALIZADO da API
      async function fetchPoints() {
          try {
              const response = await api.get(`/api/users/${user.uid}`);
              if (response.data && response.data.points !== undefined) {
                  setCurrentPoints(response.data.points);
              }
          } catch (e) {
              console.log("Erro ao atualizar saldo:", e);
          }
      }
      if (user?.uid) fetchPoints();
  }, []);

  const insertSymbol = (symbol) => {
    setCode(prev => prev + symbol);
  };
  const codeSymbols = ['    ', ':', '(', ')', '[', ']', '{', '}', '=', '"', "'", '#', '+', '-', '*', '/'];

  const handleRunCode = async () => {
    setIsLoading(true);
    setTerminalOutput('Executando...'); 

    try {
      const response = await api.post('/api/ia/run-python', { code });
      if (response.output) { 
        setTerminalOutput(response.output);
      } else {
        setTerminalOutput('Código executado sem retorno.'); 
      }
    } catch (err) {
      console.log(err);
      setTerminalOutput('Erro de conexão.\nVerifique sua internet.');
    }
    setIsLoading(false);
  };

  // --- LÓGICA DE DICAS CORRIGIDA ---
  const handleGetHint = () => {
      // Se tiver dicas grátis (0 ou 1 usada), libera direto
      if (hintsUsedCount < 2) {
          fetchHint(false);
      } else {
          // Se acabaram as grátis, pede confirmação
          showConfirmationDialog();
      }
  };

  const showConfirmationDialog = () => {
      const title = "Dica Premium";
      const msg = "Suas 2 dicas grátis acabaram. Deseja usar 5 XP para obter uma nova dica?";

      // Lógica compatível com Web e Mobile
      if (Platform.OS === 'web') {
          if (window.confirm(`${title}\n${msg}`)) {
              checkBalanceAndFetch();
          }
      } else {
          Alert.alert(title, msg, [
              { text: "Cancelar", style: "cancel" },
              { text: "Usar 5 XP", onPress: () => checkBalanceAndFetch() }
          ]);
      }
  };

  const checkBalanceAndFetch = () => {
      if (currentPoints < 5) {
          const msg = `Saldo Insuficiente. Você tem apenas ${currentPoints} XP.`;
          Platform.OS === 'web' ? alert(msg) : Alert.alert("Ops!", msg);
          return;
      }
      fetchHint(true);
  };

  const fetchHint = async (isPaid) => {
    setIsHintLoading(true);
    setHintText('');
    setHintModalVisible(true);

    const prompt = `Analise o código Python abaixo e forneça uma DICA curta sobre o erro ou próximo passo. Não dê a resposta completa.\nCÓDIGO:\n${code}`;
    
    try {
        const data = await api.post('/api/ia/gerar', { prompt: prompt });
        setHintText(data.resposta);

        if (isPaid) {
            // Desconta no backend
            await api.post('/api/users/points', { points: -5 });
            // Atualiza na tela na hora
            setCurrentPoints(prev => prev - 5);
        }

        // Incrementa uso
        const newCount = hintsUsedCount + 1;
        setHintsUsedCount(newCount);
        AsyncStorage.setItem('ide_hints_count', newCount.toString());

    } catch (error) {
        setHintText("Não foi possível conectar ao Assistente IA.");
    } finally {
        setIsHintLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#212121" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="code-tags" size={28} color="#BAF241" />
          <Text style={styles.headerTitle}>Python IDE</Text>
        </View>
        
        {/* BOTÃO DICA COM SALDO */}
        <TouchableOpacity style={styles.helpBtn} onPress={handleGetHint}>
          <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#333" />
          <View>
            <Text style={styles.helpText}>
                {hintsUsedCount < 2 ? "Dica Grátis" : "Dica (-5 XP)"}
            </Text>
            {/* Mostra saldo pequeno embaixo */}
            <Text style={{fontSize:9, color:'#333', fontWeight:'bold', textAlign:'right'}}>
                Saldo: {currentPoints}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* EDITOR */}
      <View style={styles.editorContainer}>
        {Platform.OS === 'web' ? (
          <CodeMirror
            value={code} 
            height="100%"
            theme={darcula}
            extensions={[python()]} 
            onChange={(newCode) => setCode(newCode)}
            style={{fontSize: 16}}
          />
        ) : (
          <TextInput
              style={styles.mobileInput}
              multiline
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Escreva seu código Python aqui..."
              placeholderTextColor="#666"
              textAlignVertical="top"
          />
        )}
      </View>

      {/* BARRA DE SÍMBOLOS */}
      {Platform.OS !== 'web' && (
        <View style={styles.toolbarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always">
            {codeSymbols.map((sym, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.symbolBtn} 
                onPress={() => insertSymbol(sym)}
              >
                <Text style={styles.symbolText}>{sym === '    ' ? 'TAB' : sym}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* TERMINAL */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.terminalContainer}
      >
        <View style={styles.terminalHeader}>
          <Text style={styles.terminalLabel}>TERMINAL</Text>
          <TouchableOpacity style={styles.runButton} onPress={handleRunCode} disabled={isLoading}>
            {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
            ) : (
            <>
              <MaterialCommunityIcons name="play" size={24} color="#fff" />
              <Text style={styles.runText}>EXECUTAR</Text>
            </>
            )}
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.outputBox} nestedScrollEnabled={true}>
          <Text style={styles.outputText}>{terminalOutput || 'Aguardando execução...'}</Text>
        </ScrollView>

        <View style={styles.warningBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#FFC107" />
            <Text style={styles.warningText}>
                Nota: <Text style={{fontWeight:'bold'}}>input()</Text> não funciona aqui. Use variáveis fixas.
            </Text>
        </View>

      </KeyboardAvoidingView>

      {/* MODAL DA DICA */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={hintModalVisible}
        onRequestClose={() => setHintModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.hintBox}>
            <View style={styles.hintHeader}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#FFC107" />
              <Text style={styles.hintTitle}>Assistente IA</Text>
              <TouchableOpacity onPress={() => setHintModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.hintContent}>
                {isHintLoading ? (
                    <ActivityIndicator size="small" color="#1154D9" />
                ) : (
                    <Text style={styles.hintText}>{hintText}</Text>
                )}
            </ScrollView>
            <Text style={styles.hintFooter}>
                {hintsUsedCount <= 2 ? "Você usou uma dica grátis." : "5 XP foram descontados."}
            </Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#212121' },
  
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 15, backgroundColor: '#2b2b2b', borderBottomWidth: 1, borderBottomColor: '#333',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 18, marginLeft: 10 },
  
  // BOTÃO DICA REAJUSTADO
  helpBtn: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#BAF241', 
      paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 
  },
  helpText: { fontWeight: 'bold', color: '#333', marginLeft: 4, fontSize: 12 },

  editorContainer: { flex: 1, backgroundColor: '#282a36' }, 
  mobileInput: {
    flex: 1, color: '#f8f8f2', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 16, padding: 20, textAlignVertical: 'top',
  },

  toolbarContainer: {
    backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 5,
    height: 50, borderTopWidth: 1, borderTopColor: '#444',
  },
  symbolBtn: {
    backgroundColor: '#444', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6,
    marginHorizontal: 4, justifyContent: 'center', minWidth: 40, alignItems: 'center',
  },
  symbolText: {
    color: '#BAF241', fontWeight: 'bold', fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  terminalContainer: {
    height: 240, backgroundColor: '#1e1e1e', borderTopWidth: 2, borderTopColor: '#444',
  },
  terminalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#252526',
  },
  terminalLabel: { color: '#aaa', fontWeight: 'bold', fontSize: 12 },
  outputBox: { flex: 1, padding: 15, backgroundColor: '#1e1e1e' },
  outputText: { color: '#BAF241', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14 },
  runButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1154D9',
    paddingVertical: 6, paddingHorizontal: 15, borderRadius: 5,
  },
  runText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
  
  warningBox: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#2b2b2b',
      padding: 8, borderTopWidth: 1, borderTopColor: '#333'
  },
  warningText: { color: '#aaa', fontSize: 11, marginLeft: 6, flex: 1 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  hintBox: { width: '90%', backgroundColor: '#fff', borderRadius: 10, padding: 20, elevation: 10 },
  hintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  hintTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1, marginLeft: 10 },
  hintContent: { maxHeight: 150, marginBottom: 15 },
  hintText: { fontSize: 15, color: '#333', lineHeight: 22 },
  hintFooter: { fontSize: 12, color: '#888', fontStyle: 'italic', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }
});