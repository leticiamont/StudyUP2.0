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
  ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../config/firebaseConfig'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const navigation = useNavigation();
    
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); 

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

      // ⚠️ IMPORTANTE: Use 'localhost' para a web (w)
      const backendUrl = 'http://localhost:3000/api/auth/login';
      // ⚠️ ... e use o seu IP para o celular
      // const backendUrl = 'http://192.168.0.90:3000/api/auth/login'; 

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token }) 
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao validar usuário no servidor.');
      }
      
      const userRole = data.user?.role;

      if (userRole === 'aluno' || userRole === 'student') {
        navigation.replace('AlunoHome', { user: data.user }); 
      } 
      else if (userRole === 'professor' || userRole === 'teacher') {
        navigation.replace('ProfessorHome', { user: data.user }); 
      } else {
        setErrorMessage('Perfil de usuário (role) inválido recebido do servidor.');
      }

    } catch (error) {

      console.error("Erro no login:", error.code, error.message);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setErrorMessage('Email ou senha incorretos.');
      } else if (error.message.includes('Failed to connect') || error.message.includes('Failed to fetch')) {
        setErrorMessage('Não foi possível conectar ao servidor. Verifique a URL e se o backend está rodando.');
      } else {
        setErrorMessage('Ocorreu um erro. Tente novamente.');
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
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#aaa"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />
        
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

        <View style={styles.forgotPasswordContainer}>
          <Text style={styles.forgotPasswordText}>Esqueceu a senha? </Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>Clique aqui</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  forgotPasswordText: {
    color: '#888',
  },
  linkText: {
    color: '#1154D9',
    fontWeight: 'bold',
  },
});