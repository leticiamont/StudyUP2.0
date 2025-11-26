import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth"; // Importa login do Firebase
import { auth } from "../config/firebaseConfig"; // Importa nossa config
import axios from "axios";
import "./LoginPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      // 1. Login no Firebase (Igual ao Mobile)
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;
      const token = await user.getIdToken();

      // 2. Envia o Token para o Backend Node.js
      // OBS: Corrigido para porta 3000 e rota /api/auth/login
      const response = await axios.post("http://localhost:3000/api/auth/login", {
        token: token,
      });

      console.log("Login Sucesso:", response.data);

      // 3. Salva o token e Redireciona
      if (response.status === 200) {
        localStorage.setItem("token", token);
        // Opcional: Salvar dados do usuário se precisar exibir no dashboard
        localStorage.setItem("userData", JSON.stringify(response.data.user));
        
        navigate("/dashboardP");
      }

    } catch (error) {
      console.error("Erro ao fazer login:", error);
      
      // Tratamento de erros amigável
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        setErro("E-mail ou senha incorretos.");
      } else if (error.code === 'auth/too-many-requests') {
        setErro("Muitas tentativas. Tente novamente mais tarde.");
      } else if (error.response) {
        setErro("Erro no servidor: " + (error.response.data.message || "Tente novamente."));
      } else {
        setErro("Erro de conexão. Verifique se o backend está rodando.");
      }
    } finally {
      setLoading(false);
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
              type="email"
              placeholder="Digite seu email"
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

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>

      <div className="login-illustration">
        {/* Se a imagem não existir, não quebrará o layout */}
        <img src="/images/school-16.svg" alt="Ilustração" onError={(e) => e.target.style.display='none'} />
      </div>
    </div>
  );
}

export default LoginPage;