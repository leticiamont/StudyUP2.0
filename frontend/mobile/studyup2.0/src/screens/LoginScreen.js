import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView // Importante para garantir rolagem se necessário
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; 
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"; 
import { auth } from '../config/firebaseConfig'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../service/apiService';

export default function LoginScreen() {
  const navigation = useNavigation();
    
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); 

  // Estados dos Modais
  const [forgotPwdModalVisible, setForgotPwdModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const [changePwdModalVisible, setChangePwdModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSavingPwd, setIsSavingPwd] = useState(false);
  const [tempUserData, setTempUserData] = useState(null);

  // --- FUNÇÃO DE LOGIN ---
  const handleLogin = async () => {
    setErrorMessage(''); 
    setIsLoading(true); 

    let loginEmail = email.trim();
    if (loginEmail && !loginEmail.includes('@')) {
      loginEmail = `${loginEmail}@studyup.com`;
    }

    if (!loginEmail || !senha) {
        setErrorMessage('Preencha todos os campos.');
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, senha);
      const user = userCredential.user;
      const token = await user.getIdToken();

      await AsyncStorage.setItem('userToken', token);

      const data = await api.post('/api/auth/login', { token: token });
      
      if (data.user.needsPasswordChange) {
        setTempUserData(data.user);
        setChangePwdModalVisible(true);
        setIsLoading(false);
        return;
      }

      proceedToDashboard(data.user);

    } catch (error) {
      console.error("Erro login:", error);
      // Mensagens amigáveis
      if (String(error.code).includes('invalid-credential') || String(error.message).includes('401')) {
          setErrorMessage('Email ou senha incorretos.');
      } else {
          setErrorMessage('Erro de conexão. Verifique se o backend está rodando.');
      }
      setIsLoading(false); 
    }
  };

  const proceedToDashboard = (userData) => {
    const role = userData.role;
    if (role === 'student') navigation.replace('AlunoHome', { user: userData });
    else if (role === 'teacher') navigation.replace('ProfessorHome', { user: userData });
    else setErrorMessage('Perfil desconhecido.');
  };

  // --- FUNÇÕES DOS MODAIS ---
  const handleChangePassword = async () => {
    if (newPassword.length < 6) { Alert.alert("Erro", "Senha muito curta."); return; }
    if (newPassword !== confirmNewPassword) { Alert.alert("Erro", "Senhas não conferem."); return; }

    setIsSavingPwd(true);
    try {
      await api.post('/api/users/change-password', { newPassword });
      Alert.alert("Sucesso", "Senha alterada!");
      setChangePwdModalVisible(false);
      proceedToDashboard({ ...tempUserData, needsPasswordChange: false });
    } catch (error) {
      Alert.alert("Erro", "Falha ao alterar senha.");
    } finally {
      setIsSavingPwd(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail) {
        Alert.alert("Atenção", "Digite o e-mail.");
        return;
    }

    const isStudent = resetEmail.includes('@studyup.com') || !resetEmail.includes('@');
    
    if (isStudent) {
        // Alerta específico para Web (onde Alert.alert é limitado)
        if (Platform.OS === 'web') {
            alert("Contas de aluno são gerenciadas pela escola. Peça ao seu professor.");
        } else {
            Alert.alert("Atenção", "Contas de aluno são gerenciadas pela escola.\nPeça ao seu professor.");
        }
        return;
    }

    try {
        await sendPasswordResetEmail(auth, resetEmail);
        const msg = "E-mail enviado! Verifique sua caixa de entrada.";
        Platform.OS === 'web' ? alert(msg) : Alert.alert("Sucesso", msg);
        
        setForgotPwdModalVisible(false);
        setResetEmail('');
    } catch (error) {
        console.error(error);
        const msg = "Erro ao enviar. Verifique o e-mail.";
        Platform.OS === 'web' ? alert(msg) : Alert.alert("Erro", msg);
    }
  };

  return (
    // Wrapper principal (View) para tirar os modais de dentro do KeyboardAvoidingView
    <View style={{ flex: 1 }}>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.innerContainer}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
            
            <TextInput
              style={styles.input}
              placeholder="Email ou Usuário"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#aaa"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
            />
            
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Entrar</Text>}
            </TouchableOpacity>

            {/* Botão ESQUECI A SENHA */}
            <View style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Esqueceu a senha? </Text>
              <TouchableOpacity 
                onPress={() => {
                  console.log("Botão Esqueci a Senha Clicado!"); // Debug
                  setResetEmail(email); 
                  setForgotPwdModalVisible(true);
                }}
                style={{ padding: 5 }} // Aumenta área de toque
              >
                <Text style={styles.linkText}>Clique aqui</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- MODAIS (AGORA FORA DO FLUXO PRINCIPAL) --- */}
      
      {/* Modal 1: Esqueci a Senha */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={forgotPwdModalVisible}
        onRequestClose={() => setForgotPwdModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Redefinir Senha</Text>
            <Text style={styles.modalSub}>Digite seu e-mail abaixo:</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="E-mail"
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleSendResetEmail}>
              <Text style={styles.modalButtonText}>Enviar Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{marginTop: 15, padding: 5}} onPress={() => setForgotPwdModalVisible(false)}>
                <Text style={{color: '#666'}}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Primeiro Acesso */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={changePwdModalVisible}
        onRequestClose={() => {}} 
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔐 Nova Senha</Text>
            <Text style={styles.modalSub}>Defina sua senha pessoal.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Nova Senha"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Confirmar"
              secureTextEntry
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleChangePassword} disabled={isSavingPwd}>
              {isSavingPwd ? <ActivityIndicator color="#fff"/> : <Text style={styles.modalButtonText}>Salvar</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity style={{marginTop: 15}} onPress={() => { setChangePwdModalVisible(false); setSenha(''); }}>
                <Text style={{color: '#666'}}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  innerContainer: { width: '80%', alignItems: 'center' },
  logo: { width: 100, height: 100, resizeMode: 'contain', marginBottom: 50 },
  input: { width: '100%', height: 50, borderColor: '#1154D9', borderWidth: 1.5, borderRadius: 25, paddingHorizontal: 20, marginBottom: 15, fontSize: 16, color: '#333' },
  errorText: { color: 'red', fontSize: 14, marginBottom: 10, alignSelf: 'flex-start' },
  button: { width: '100%', height: 50, backgroundColor: '#BAF241', borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 5 },
  buttonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  forgotPasswordContainer: { flexDirection: 'row', marginTop: 20, alignItems: 'center' },
  forgotPasswordText: { color: '#888' },
  linkText: { color: '#1154D9', fontWeight: 'bold' },
  
  // Estilos do Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalSub: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  modalInput: { width: '100%', height: 45, backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, color: '#333' },
  modalButton: { width: '100%', height: 45, backgroundColor: '#1154D9', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});