import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
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
      // 1. Login no Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;
      const token = await user.getIdToken();

      // 2. Envia o Token para o Backend para pegar os dados do banco (Role/ClassId)
      const response = await axios.post("http://localhost:3000/api/auth/login", {
        token: token,
      });

      console.log("Login Sucesso:", response.data);

      // 3. Verifica e Redireciona
      if (response.status === 200) {
        const userData = response.data.user;
        
        localStorage.setItem("token", token);
        localStorage.setItem("userData", JSON.stringify(userData));
        
        // 🚨 LÓGICA DE REDIRECIONAMENTO 🚨
        if (userData.role === 'student' || userData.role === 'aluno') {
            navigate("/dashboardA"); // Vai para o Dashboard do Aluno
        } else {
            navigate("/dashboardP"); // Vai para o Dashboard do Professor
        }
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
        <img src="/images/school-16.svg" alt="Ilustração" onError={(e) => e.target.style.display='none'} />
      </div>
    </div>
  );
}

export default LoginPage;