import React, { useState, useEffect } from 'react'; 
import { 
    StyleSheet, Text, View, TouchableOpacity, Platform, StatusBar, 
    ActivityIndicator, TextInput, KeyboardAvoidingView, ScrollView, Modal, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../service/apiService'; // Certifique-se de que a API está importada

// Importações condicionais para WEB
let CodeMirror, darcula, python;
if (Platform.OS === 'web') {
  CodeMirror = require('@uiw/react-codemirror').default;
  darcula = require('@uiw/codemirror-theme-darcula').darcula;
  python = require('@codemirror/lang-python').python;
}

export default function AlunoIde() {
  
  const [code, setCode] = useState(
`def saudar(nome):
    print(f"Olá, {nome}!")

saudar("Mundo")`
  );
  
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // NOVOS ESTADOS PARA A DICA DA IA
  const [hintModalVisible, setHintModalVisible] = useState(false);
  const [hintText, setHintText] = useState('');
  const [isHintLoading, setIsHintLoading] = useState(false);


  // Função auxiliar para inserir texto (símbolo) no código
  const insertSymbol = (symbol) => {
    setCode(prev => prev + symbol);
  };
  const codeSymbols = ['    ', ':', '(', ')', '[', ']', '{', '}', '=', '"', "'", '#', '+', '-', '*', '/'];


  const handleRunCode = async () => {
    setIsLoading(true);
    setTerminalOutput('Executando...'); 

    // O backendUrl precisa ser o mesmo da sua configuração. Se o 'apiService.js' estiver correto,
    // a rota direta é '/api/ia/run-python'
    const backendUrl = Platform.OS === 'web' 
        ? 'http://localhost:3000/api/ia/run-python'
        : 'http://192.168.1.10:3000/api/ia/run-python'; // <--- VERIFIQUE SEU IP

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }) 
      });

      const data = await response.json();

      if (response.ok) { 
        setTerminalOutput(data.output || 'Código executado sem retorno.');
      } else {
        setTerminalOutput(`Erro: ${data.error}`); 
      }
    } catch (err) {
      console.log(err);
      setTerminalOutput('Erro de conexão.\nVerifique se o backend está rodando e se o IP está correto.');
    }
    setIsLoading(false);
  };

  // --- FUNÇÃO DA DICA (ENVIA O CÓDIGO PARA A IA) ---
  const handleGetHint = async () => {
    setIsHintLoading(true);
    setHintText('');
    setHintModalVisible(true);

    const prompt = `Analise o código Python abaixo e forneça uma DICA curta (máximo 2 frases) sobre o que o aluno deve fazer, ou o que pode estar errado, sem dar a resposta final. Se o código for muito básico, dê uma dica sobre o próximo passo em lógica de programação.
    CÓDIGO: \n\n${code}`;
    
    try {
        const data = await api.post('/api/ia/gerar', { prompt: prompt });
        setHintText(data.resposta);
    } catch (error) {
        setHintText("Não foi possível conectar ao Assistente IA para obter a dica.");
    } finally {
        setIsHintLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#212121" />
      
      {/* 1. CABEÇALHO */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="code-tags" size={28} color="#BAF241" />
          <Text style={styles.headerTitle}>Python IDE</Text>
        </View>
        
        {/* BOTÃO DICA (MÁGICO) */}
        <TouchableOpacity style={styles.helpBtn} onPress={handleGetHint}>
          <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#333" />
          <Text style={styles.helpText}>Dica</Text>
        </TouchableOpacity>
      </View>

      {/* 2. ÁREA DO EDITOR (Lógica Híbrida) */}
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

      {/* Barra de Atalhos (Só aparece no Mobile) */}
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

      {/* 3. TERMINAL / CONSOLE */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.terminalContainer}
      >
        <View style={styles.terminalHeader}>
          <Text style={styles.terminalLabel}>TERMINAL</Text>
          {/* Botão Executar Flutuante */}
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
      </KeyboardAvoidingView>

      {/* --- MODAL DA DICA --- */}
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
              <Text style={styles.hintTitle}>Assistente de Dicas</Text>
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
            <Text style={styles.hintFooter}>Dicas usam pontos de experiência (XP).</Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#212121' },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2b2b2b',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 18, marginLeft: 10 },
  helpBtn: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#BAF241', 
      paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 
  },
  helpText: { fontWeight: 'bold', color: '#333', marginLeft: 4, fontSize: 12 },

  // Editor Area
  editorContainer: { flex: 1, backgroundColor: '#282a36' }, 
  mobileInput: {
    flex: 1,
    color: '#f8f8f2', 
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 16,
    padding: 20,
    textAlignVertical: 'top',
  },

  // Toolbar
  toolbarContainer: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 5,
    height: 50,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  symbolBtn: {
    backgroundColor: '#444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 4,
    justifyContent: 'center',
    minWidth: 40,
    alignItems: 'center',
  },
  symbolText: {
    color: '#BAF241',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Terminal Area
  terminalContainer: {
    height: 200,
    backgroundColor: '#1e1e1e',
    borderTopWidth: 2,
    borderTopColor: '#444',
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#252526',
  },
  terminalLabel: { color: '#aaa', fontWeight: 'bold', fontSize: 12 },
  outputBox: {
    flex: 1,
    padding: 15,
    backgroundColor: '#1e1e1e',
  },
  outputText: {
    color: '#BAF241', 
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1154D9',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  runText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
  
  // MODAL DA DICA
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 0, 0, 0.6)' 
  },
  hintBox: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 10,
  },
  hintHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  hintTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    flex: 1, 
    marginLeft: 10 
  },
  hintContent: { maxHeight: 150, marginBottom: 15 },
  hintText: { fontSize: 15, color: '#333', lineHeight: 22 },
  hintFooter: { fontSize: 12, color: '#888', fontStyle: 'italic', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }
});