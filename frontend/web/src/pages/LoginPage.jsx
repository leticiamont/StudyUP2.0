import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import axios from "axios";
import "./LoginPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- ESTADOS DO MODAL RESET ---
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState({ type: "", text: "" });

  // --- ESTADOS DO MODAL MUDAR SENHA (PRIMEIRO ACESSO) ---
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [tempToken, setTempToken] = useState(null);
  const [tempUserData, setTempUserData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    // Tratamento de username para email
    let loginEmail = email;
    if (!email.includes('@')) {
      loginEmail = `${email}@studyup.com`;
    }

    try {
      // 1. Login no Firebase
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, senha);
      const user = userCredential.user;
      const token = await user.getIdToken();

      // 2. Envia Token para Backend
      const response = await axios.post("http://localhost:3000/api/auth/login", {
        token: token,
      });

      // 3. Verifica Primeiro Acesso
      if (response.status === 200) {
        const userData = response.data.user;
        
        // 🚨 SE PRECISAR MUDAR SENHA, PARA AQUI E ABRE MODAL 🚨
        if (userData.needsPasswordChange) {
            setTempToken(token);
            setTempUserData(userData);
            setShowChangePasswordModal(true);
            setLoading(false);
            return; 
        }

        // Se não precisar, finaliza o login
        completeLogin(token, userData);
      }

    } catch (error) {
      console.error("Erro ao fazer login:", error);
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        setErro("E-mail ou senha incorretos.");
      } else if (error.code === 'auth/too-many-requests') {
        setErro("Muitas tentativas. Tente novamente mais tarde.");
      } else if (error.response) {
        setErro("Erro no servidor: " + (error.response.data.message || "Tente novamente."));
      } else {
        setErro("Erro de conexão. Verifique se o backend está rodando.");
      }
      setLoading(false);
    }
  };

  // Função auxiliar para finalizar o login
  const completeLogin = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userData", JSON.stringify(userData));
    
    if (userData.role === 'student' || userData.role === 'aluno') {
        navigate("/dashboardA"); 
    } else {
        navigate("/dashboardP"); 
    }
  };

  // Função para salvar a nova senha
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres.");
        return;
    }
    if (newPassword !== confirmNewPassword) {
        alert("As senhas não coincidem.");
        return;
    }

    try {
        await axios.post("http://localhost:3000/api/users/change-password", 
            { newPassword }, 
            { headers: { Authorization: `Bearer ${tempToken}` } }
        );
        
        alert("Senha alterada com sucesso! Entrando...");
        setShowChangePasswordModal(false);
        
        // Remove a flag localmente e entra
        const updatedUser = { ...tempUserData, needsPasswordChange: false };
        completeLogin(tempToken, updatedUser);

    } catch (error) {
        console.error(error);
        alert("Erro ao alterar senha: " + (error.response?.data?.error || error.message));
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetMessage({ type: '', text: '' });

    if (!resetEmail) {
      setResetMessage({ type: 'error', text: 'Digite seu e-mail ou usuário.' });
      return;
    }

    const isStudentEmail = resetEmail.includes('@studyup.com');
    const isUsername = !resetEmail.includes('@');

    if (isStudentEmail || isUsername) {
      setResetMessage({ 
        type: 'info', 
        text: 'Contas de aluno são gerenciadas pela escola. Por favor, peça ao seu Professor ou Diretor para redefinir sua senha.' 
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage({ 
        type: 'success', 
        text: 'E-mail de redefinição enviado! Verifique sua caixa de entrada.' 
      });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setResetMessage({ type: 'error', text: 'E-mail não encontrado.' });
      } else {
        setResetMessage({ type: 'error', text: 'Erro ao enviar e-mail.' });
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="logo">
          <span className="text-blue">STUDY</span>
          <span className="text-green">UP</span>
        </h1>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="text" // Mudado para text para aceitar username
              placeholder="Digite seu email ou usuário"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          {erro && <p className="error-text">{erro}</p>}

          <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '10px' }}>
            <button type="button" className="btn-link" onClick={() => setShowResetModal(true)}>
              Esqueceu a senha?
            </button>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>

      <div className="login-illustration">
        <img src="/images/school-16.svg" alt="Ilustração" onError={(e) => e.target.style.display='none'} />
      </div>

      {/* --- MODAL DE ESQUECI SENHA --- */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Redefinir Senha</h3>
            <p>Digite seu e-mail ou usuário abaixo.</p>
            
            <form onSubmit={handleForgotPassword} style={{ width: '100%' }}>
                <div className="input-group">
                    <input 
                    type="text" 
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="E-mail ou Usuário"
                    className="input-reset"
                    />
                </div>
                {resetMessage.text && (
                    <div className={`msg-box ${resetMessage.type}`}>
                        {resetMessage.text}
                    </div>
                )}
                <div className="modal-buttons">
                    <button type="button" className="btn-cancel" onClick={() => setShowResetModal(false)}>Fechar</button>
                    <button type="submit" className="btn-confirm">Enviar</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE PRIMEIRO ACESSO / TROCA DE SENHA --- */}
      {showChangePasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>🔐 Definir Nova Senha</h3>
            <p>Por segurança, você precisa alterar sua senha provisória.</p>
            
            <form onSubmit={handleChangePasswordSubmit} style={{ width: '100%' }}>
                <div className="input-group">
                    <label style={{fontSize: 14}}>Nova Senha</label>
                    <input 
                        type="password" 
                        className="input-reset" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="Mínimo 6 caracteres" 
                        required 
                    />
                </div>
                <div className="input-group">
                    <label style={{fontSize: 14}}>Confirmar Nova Senha</label>
                    <input 
                        type="password" 
                        className="input-reset" 
                        value={confirmNewPassword} 
                        onChange={(e) => setConfirmNewPassword(e.target.value)} 
                        placeholder="Repita a senha" 
                        required 
                    />
                </div>

                <div className="modal-buttons">
                    <button type="button" className="btn-cancel" onClick={() => {setShowChangePasswordModal(false); auth.signOut();}}>Cancelar (Sair)</button>
                    <button type="submit" className="btn-confirm">Salvar e Entrar</button>
                </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default LoginPage;