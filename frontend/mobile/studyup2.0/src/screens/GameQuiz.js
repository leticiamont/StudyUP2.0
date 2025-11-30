import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, Modal, StatusBar, Dimensions, 
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../service/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function GameQuiz({ route }) {
  const navigation = useNavigation();
  const { pdfUrl, textContent, title, contentId } = route.params || {}; 

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  
  // Estados de Jogo (Múltipla Escolha)
  const [selectedOption, setSelectedOption] = useState(null);
  const [isOptionDisabled, setIsOptionDisabled] = useState(false);

  // Estados de Jogo (Desafio de Código)
  const [code, setCode] = useState('');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState(null); // 'success', 'error', null

  const [showResultModal, setShowResultModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- 1. CARREGA O QUIZ ---
  useEffect(() => {
    async function generateQuiz() {
      try {
        const payload = pdfUrl ? { pdfUrl } : { textContent };
        if (!pdfUrl && !textContent) throw new Error("Sem conteúdo");

        const data = await api.post('/api/ia/gerar-quiz', payload);
        
        if (Array.isArray(data) && data.length > 0) {
            setQuestions(data);
        } else {
            throw new Error("Formato inválido");
        }
      } catch (error) {
        Alert.alert("Ops", "Não foi possível criar o quiz.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    generateQuiz();
  }, []);

  // Reseta estados quando muda a pergunta
  useEffect(() => {
    if (questions.length > 0) {
        const q = questions[currentIndex];
        // Se for código, carrega o template inicial (se houver)
        if (q.type === 'code') {
            setCode(q.initialCode || '# Escreva seu código aqui\n');
            setTerminalOutput('');
            setCodeFeedback(null);
        }
        setSelectedOption(null);
        setIsOptionDisabled(false);
    }
  }, [currentIndex, questions]);

  // --- 2. VALIDAÇÃO (Múltipla Escolha) ---
  const validateOption = (index) => {
    setSelectedOption(index);
    setIsOptionDisabled(true);
    const question = questions[currentIndex];

    if (index === question.correctIndex) {
      setScore(score + (question.points || 10));
    }
    setTimeout(nextQuestion, 1500);
  };

  // --- 3. VALIDAÇÃO (Código) ---
  const runAndValidateCode = async () => {
    setIsRunning(true);
    setTerminalOutput('Executando...');
    const question = questions[currentIndex];

    try {
        // Envia para o backend rodar (igual à IDE)
        const data = await api.post('/api/ia/run-python', { code: code });
        const output = data.output ? data.output.trim() : '';
        
        setTerminalOutput(output);

        // Compara a saída com a esperada (Ex: esperado "Olá Mundo", saída "Olá Mundo")
        // A IA deve mandar 'expectedOutput' no objeto da pergunta
        if (output == question.expectedOutput?.trim()) {
            setCodeFeedback('success');
            setScore(score + (question.points || 20)); // Código vale mais pontos!
            setTimeout(nextQuestion, 2000);
        } else {
            setCodeFeedback('error');
            Alert.alert("Atenção", `Esperado: ${question.expectedOutput}\nRecebido: ${output}`);
        }
    } catch (error) {
        setTerminalOutput("Erro de execução.");
    } finally {
        setIsRunning(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex === questions.length - 1) {
      finishGame();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // --- 4. FINALIZAÇÃO ---
  const finishGame = async () => {
      setShowResultModal(true);
      if (score > 0) {
          setIsSaving(true);
          try {
              await api.post('/api/users/points', { points: score });
              if (contentId) {
                  const saved = await AsyncStorage.getItem('completed_levels');
                  const currentCompleted = saved ? JSON.parse(saved) : [];
                  if (!currentCompleted.includes(contentId)) {
                      currentCompleted.push(contentId);
                      await AsyncStorage.setItem('completed_levels', JSON.stringify(currentCompleted));
                  }
              }
          } catch (error) {
              console.log("Erro ao salvar progresso", error);
          } finally {
              setIsSaving(false);
          }
      }
  };

  if (loading) {
    return (
      <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
        <StatusBar barStyle="light-content" backgroundColor="#1154D9" />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{color:'#fff', marginTop: 20, fontWeight:'bold'}}>Preparando desafio...</Text>
      </View>
    );
  }

  const question = questions[currentIndex];

  // --- RENDERIZADORES ---

  const renderMultipleChoice = () => (
    <ScrollView style={styles.optionsArea}>
        {question.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrect = index === question.correctIndex;
            let bgColor = '#fff', borderColor = '#E0E0E0', textColor = '#333';

            if (isOptionDisabled) {
                if (isCorrect) { bgColor = '#4CAF50'; borderColor = '#388E3C'; textColor='#fff'; }
                else if (isSelected) { bgColor = '#F44336'; borderColor = '#D32F2F'; textColor='#fff'; }
            } else if (isSelected) {
                 bgColor = '#E3F2FD'; borderColor = '#1154D9';
            }

            return (
                <TouchableOpacity
                    key={index}
                    onPress={() => validateOption(index)}
                    disabled={isOptionDisabled}
                    style={[styles.optionCard, { backgroundColor: bgColor, borderColor: borderColor }]}
                >
                    <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                </TouchableOpacity>
            );
        })}
    </ScrollView>
  );

  const renderCodeChallenge = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.codeArea}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            
            {/* EDITOR EMBUTIDO */}
            <View style={styles.editorBox}>
                <View style={styles.editorHeader}>
                    <Text style={styles.editorLabel}>main.py</Text>
                    <MaterialCommunityIcons name="language-python" size={16} color="#BAF241" />
                </View>
                <TextInput 
                    style={styles.codeInput}
                    multiline
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Digite sua resposta..."
                    placeholderTextColor="#666"
                />
            </View>

            {/* TERMINAL DE SAÍDA */}
            <View style={styles.terminalBox}>
                <Text style={styles.terminalTitle}>SAÍDA:</Text>
                <Text style={[styles.terminalText, codeFeedback === 'success' && { color: '#4CAF50' }, codeFeedback === 'error' && { color: '#F44336' }]}>
                    {terminalOutput || '...'}
                </Text>
            </View>

            {/* BOTÃO EXECUTAR */}
            <TouchableOpacity 
                style={[styles.runButton, isRunning && { opacity: 0.7 }]} 
                onPress={runAndValidateCode}
                disabled={isRunning || codeFeedback === 'success'}
            >
                {isRunning ? <ActivityIndicator color="#fff" /> : (
                    <>
                        <MaterialCommunityIcons name={codeFeedback === 'success' ? "check" : "play"} size={24} color="#fff" />
                        <Text style={styles.runButtonText}>{codeFeedback === 'success' ? 'CORRETO!' : 'EXECUTAR & VERIFICAR'}</Text>
                    </>
                )}
            </TouchableOpacity>

        </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1154D9" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialCommunityIcons name="close" size={28} color="#fff" /></TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
        </View>
        <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{score}</Text>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color="#FFC107" />
        </View>
      </View>

      {/* ÁREA DA PERGUNTA */}
      <View style={styles.questionArea}>
        <Text style={styles.questionCounter}>DESAFIO {currentIndex + 1}</Text>
        <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
            <Text style={styles.questionText}>{question.question}</Text>
        </ScrollView>
      </View>

      {/* AREA DE RESPOSTA (DINÂMICA) */}
      {question.type === 'code' ? renderCodeChallenge() : renderMultipleChoice()}

      <Modal visible={showResultModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="trophy" size={80} color="#FFC107" />
            <Text style={styles.modalTitle}>Lição Concluída!</Text>
            <Text style={styles.modalScore}>Total: {score} XP</Text>
            {isSaving && <ActivityIndicator size="small" color="#1154D9" />}
            <TouchableOpacity style={styles.finishBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.finishBtnText}>CONTINUAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1154D9' },
  
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, justifyContent: 'space-between' },
  progressTrack: { flex: 1, height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, marginHorizontal: 15 },
  progressBar: { height: '100%', backgroundColor: '#BAF241', borderRadius: 5 },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  scoreText: { color: '#fff', fontWeight: 'bold', marginRight: 5 },

  // Pergunta
  questionArea: { flex: 0.25, paddingHorizontal: 20, paddingBottom: 10, justifyContent: 'center' },
  questionCounter: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  questionText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', lineHeight: 26 },

  // Múltipla Escolha
  optionsArea: { flex: 0.75, backgroundColor: '#f4f6fa', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  optionCard: { padding: 16, borderRadius: 15, borderWidth: 2, borderColor: '#E0E0E0', borderBottomWidth: 4, marginBottom: 12, backgroundColor: '#fff', justifyContent: 'center' },
  optionText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },

  // Desafio de Código
  codeArea: { flex: 0.75, backgroundColor: '#f4f6fa', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  editorBox: { height: 180, backgroundColor: '#282a36', borderRadius: 10, overflow: 'hidden', marginBottom: 10, elevation: 3 },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: '#444' },
  editorLabel: { color: '#ccc', fontSize: 12, fontWeight: 'bold' },
  codeInput: { flex: 1, color: '#f8f8f2', padding: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14, textAlignVertical: 'top' },
  
  terminalBox: { height: 80, backgroundColor: '#1e1e1e', borderRadius: 8, padding: 10, marginBottom: 15 },
  terminalTitle: { color: '#666', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  terminalText: { color: '#BAF241', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 },

  runButton: { backgroundColor: '#1154D9', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  runButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },

  // Modal Resultado
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 20, padding: 30, alignItems: 'center', elevation: 10 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#333', marginTop: 10 },
  modalScore: { fontSize: 20, color: '#1154D9', marginVertical: 10, fontWeight: 'bold' },
  finishBtn: { backgroundColor: '#1154D9', width: '100%', padding: 15, borderRadius: 30, alignItems: 'center', marginTop: 10 },
  finishBtnText: { color: '#fff', fontWeight: 'bold' }
});