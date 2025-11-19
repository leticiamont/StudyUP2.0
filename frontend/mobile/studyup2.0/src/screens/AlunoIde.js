import React, { useState } from 'react'; 
import { 
    StyleSheet, 
    Text, 
    View, 
    TouchableOpacity, 
    Platform,
    StatusBar,
    ActivityIndicator 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import CodeMirror from '@uiw/react-codemirror';
import { darcula } from '@uiw/codemirror-theme-darcula'; 
import { python } from '@codemirror/lang-python';

export default function AlunoIde() {
  
  const [code, setCode] = useState(
`def saudar(nome):
    print(f"Olá, {nome}!")

saudar("Aluno")`
  );
  
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRunCode = async () => {
    setIsLoading(true);
    setTerminalOutput(''); 

    // ⚠️ Lembre-se: use 'localhost' para a web (w)
    const backendUrl = 'http://localhost:3000/api/ia/run-python';
    // ⚠️ ... e use o seu IP para o celular!
    // const backendUrl = 'http://192.168.0.90:3000/api/ia/run-python'; 

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }) 
      });

      const data = await response.json();

      if (response.ok) { 
        setTerminalOutput(data.output);
      } else {
        setTerminalOutput(data.error); 
      }
    } catch (err) {
      setTerminalOutput('Erro de rede. O backend está a rodar?');
    }
    setIsLoading(false);
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. CABEÇALHO (Header) */}
      <View style={styles.header}>
        <TouchableOpacity>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerPoints}>
          <MaterialCommunityIcons name="star" size={24} color="#FFC107" />
          <Text style={styles.headerText}>1200</Text>
        </View>
        <View style={styles.headerIcons}>
          <Text style={styles.headerText}>DICA</Text>
          <MaterialCommunityIcons name="lightbulb-on" size={24} color="#FFC107" style={{marginLeft: 5}} />
        </View>
      </View>

      {/* 2. ÁREA DO EDITOR DE CÓDIGO */}
      <View style={styles.editorContainer}>
        <CodeMirror
          value={code} 
          style={styles.codeEditor}
          theme={darcula}
          extensions={[python()]} 
          onChange={(newCode) => setCode(newCode)}
          basicSetup={{
            lineNumbers: true, 
            foldGutter: false,
            autocompletion: true,
          }}
        />
      </View>

      {/* 3. BARRA DO TERMINAL (Footer) */}
      <View style={styles.bottomBar}>
        <Text style={styles.terminalText}>
          {isLoading ? 'Executando...' : (terminalOutput || 'TERMINAL PYTHON')}
        </Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.runButton} onPress={handleRunCode} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="play" size={20} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton}>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#212121',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#333', 
  },
  headerPoints: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  headerIcons: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  headerText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    marginRight: 5,
    fontSize: 16
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#2d2d2d', 
  },
  codeEditor: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  terminalText: {
    color: '#fff', 
    fontWeight: 'bold',
    fontFamily: 'monospace',
    fontSize: 14,
    flex: 1, // 🆕 Permite que o texto cresça e quebre a linha
  },
  buttonGroup: {
    flexDirection: 'row',
    marginLeft: 10, // 🆕 Adiciona espaço entre o texto e os botões
  },
  runButton: {
    backgroundColor: '#1154D9', 
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#1154D9', 
    padding: 10,
    borderRadius: 8,
  },
});