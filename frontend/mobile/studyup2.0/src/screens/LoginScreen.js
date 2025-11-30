import React, { useState, useEffect } from 'react';
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
  Alert 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../config/firebaseConfig'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../service/apiService'; 

// --- DEFINIÇÃO DOS ESTILOS MOVIDA PARA O TOPO (CORRIGE O REFERENCERROR) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    width: '80%',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 50,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#1154D9',
    borderWidth: 1.5,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputPassword: {
    width: '100%',
    height: 50,
    borderColor: '#1154D9',
    borderWidth: 1.5,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 0, 
    paddingRight: 50,
    fontSize: 16,
    color: '#333',
  },
  toggleButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  optionsRow: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      marginBottom: 20,
      marginLeft: 10
  },
  rememberMeText: {
      color: '#555',
      fontSize: 14,
      marginLeft: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#BAF241',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
// ------------------------------------------------------------------------------------------

export default function LoginScreen() {
  const navigation = useNavigation();
    
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); 
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // --- LÓGICA: CARREGAR EMAIL SALVO ---
  useEffect(() => {
    const loadSavedEmail = async () => {
      const savedEmail = await AsyncStorage.getItem('studyupEmail');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true); 
      }
    };
    loadSavedEmail();
  }, []);

  // --- FUNÇÃO DE LOGIN ---
  const handleLogin = async () => {
    setErrorMessage(''); 
    setIsLoading(true); 

    if (!email || !senha) {
        setErrorMessage('Por favor, preencha o email e a senha.');
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;
      const token = await user.getIdToken();

      await AsyncStorage.setItem('userToken', token);
      
      if (rememberMe) {
          await AsyncStorage.setItem('studyupEmail', email);
      } else {
          await AsyncStorage.removeItem('studyupEmail');
      }

      const data = await api.post('/api/auth/login', { token });
      
      const userRole = data.user?.role;

      if (userRole === 'aluno' || userRole === 'student') {
        navigation.replace('AlunoHome', { user: data.user }); 
      } 
      else if (userRole === 'professor' || userRole === 'teacher') {
        navigation.replace('ProfessorHome', { user: data.user }); 
      } else {
        setErrorMessage('Perfil de usuário inválido.');
      }

    } catch (error) {
      console.error("Erro login:", error.code, error.message);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setErrorMessage('Email ou senha incorretos.');
      } else {
        setErrorMessage(`Ocorreu um erro de rede/servidor. Verifique a conexão com ${api.BASE_URL}.`);
      }
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Image
          source={require('../../assets/logo.png')} 
          style={styles.logo}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        {/* CAMPO DE SENHA COM OLHINHO */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Senha"
            placeholderTextColor="#aaa"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry={!showPassword} 
          />
          <TouchableOpacity 
            style={styles.toggleButton} 
            onPress={() => setShowPassword(prev => !prev)}
          >
            <MaterialCommunityIcons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={24} 
              color="#1154D9" 
            />
          </TouchableOpacity>
        </View>

        {/* CHECKBOX LEMBRAR LOGIN */}
        <TouchableOpacity style={styles.optionsRow} onPress={() => setRememberMe(prev => !prev)}>
            <MaterialCommunityIcons 
                name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"} 
                size={20} 
                color="#1154D9" 
            />
            <Text style={styles.rememberMeText}>Lembrar meu Email</Text>
        </TouchableOpacity>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin} 
          disabled={isLoading} 
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}