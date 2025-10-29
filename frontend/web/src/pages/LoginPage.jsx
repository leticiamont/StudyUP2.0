import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    try {
      // 🔹 Altere o endpoint conforme o seu backend
      const response = await axios.post("http://localhost:8000/api/login/", {
        email: email,
        senha: senha,
      });

      console.log("Resposta do servidor:", response.data);

      // 🔹 Se o login for bem-sucedido:
      if (response.status === 200) {
        // Salva o token (caso o backend envie)
        localStorage.setItem("token", response.data.token);

        // Redireciona para o Dashboard
        navigate("/dashboardP");
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      setErro("E-mail ou senha inválidos.");
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

          <button type="submit" className="login-button">
            Entrar
          </button>
        </form>
      </div>

      <div className="login-illustration">
        <img src="/images/school-16.svg" alt="Ilustração escolar" />
      </div>
    </div>
  );
}

export default LoginPage;
