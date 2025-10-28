import React from "react";
import { useNavigate } from "react-router-dom";

export default function ForumPageP() {
  const navigate = useNavigate();

  return (
    <div className="main-container">
      {/* Header */}
      <header className="top-bar">
        <div className="logo">
          <img src="/src/assets/logo.png" alt="Logo" className="logo-image" />
          <span className="logo-text">
            <span className="logo-study">STUDY</span>
            <span className="logo-up">UP</span>
          </span>
        </div>
        <div className="header-actions">
          <button className="icon-button">🔔</button>
          <button className="icon-button">👤</button>
          <span className="user-role">Professor ▼</span>
        </div>
      </header>

      {/* Sidebar and Main Content */}
      <div className="content-wrapper">
        <aside className="sidebar">
          <nav className="nav-menu">
            <a href="#" onClick={() => navigate('/dashboardP')} className="nav-item">
              🏠 Início
            </a>
            <a href="#" onClick={() => navigate('/turmasP')} className="nav-item">
              👥 Turmas
            </a>
            <a href="#" onClick={() => navigate('/conteudoP')} className="nav-item">
              📚 Conteúdo
            </a>
            <a href="#" className="nav-item active">
              💬 Fórum
            </a>
            <a href="#" onClick={() => navigate('/configuracoesP')} className="nav-item">
              ⚙️ Configurações
            </a>
          </nav>
        </aside>

        <main className="main-content">
          <div className="welcome-box">
            <h1>Fórum do Professor</h1>
            <p>Interaja com alunos e colegas professores.</p>
          </div>

          <section className="forum-section">
            <h2>Discussões Ativas</h2>
            <div className="forum-posts">
              <div className="forum-post">
                <h3>Dúvida sobre equações do 2º grau</h3>
                <p>João Silva - Turma A</p>
                <p>Como resolver x² + 5x + 6 = 0?</p>
                <button className="btn-primary">Responder</button>
              </div>
              <div className="forum-post">
                <h3>Projeto de Ciências - Ideias</h3>
                <p>Maria Santos - Turma B</p>
                <p>Alguém tem sugestões para experimentos simples?</p>
                <button className="btn-primary">Responder</button>
              </div>
              <div className="forum-post">
                <h3>Correção da prova</h3>
                <p>Carlos Oliveira - Turma C</p>
                <p>Professor, posso revisar minha prova?</p>
                <button className="btn-primary">Responder</button>
              </div>
            </div>
            <button className="btn-secondary">+ Iniciar Nova Discussão</button>
          </section>
        </main>
      </div>
    </div>
  );
}
