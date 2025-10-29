import React from "react";
import { useNavigate } from "react-router-dom";

export default function ConteudoPageP() {
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
            <a href="#" className="nav-item active">
              📚 Conteúdo
            </a>
            <a href="#" onClick={() => navigate('/forumP')} className="nav-item">
              💬 Fórum
            </a>
            <a href="#" onClick={() => navigate('/configuracoesP')} className="nav-item">
              ⚙️ Configurações
            </a>
          </nav>
        </aside>

        <main className="main-content">
          <div className="welcome-box">
            <h1>Gerenciar Conteúdo</h1>
            <p>Crie e organize materiais didáticos para suas aulas.</p>
          </div>

          <section className="conteudo-section">
            <h2>Meus Materiais</h2>
            <div className="conteudo-grid">
              <div className="conteudo-card">
                <h3>Aula 1: Introdução à Matemática</h3>
                <p>PDF - 2.5 MB</p>
                <button className="btn-primary">Editar</button>
              </div>
              <div className="conteudo-card">
                <h3>Exercícios de Português</h3>
                <p>DOCX - 1.8 MB</p>
                <button className="btn-primary">Editar</button>
              </div>
              <div className="conteudo-card">
                <h3>Vídeo: Experimentos de Ciências</h3>
                <p>MP4 - 45 MB</p>
                <button className="btn-primary">Editar</button>
              </div>
            </div>
            <button className="btn-secondary">+ Adicionar Novo Material</button>
          </section>
        </main>
      </div>
    </div>
  );
}
