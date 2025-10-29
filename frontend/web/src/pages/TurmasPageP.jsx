import React from "react";
import { useNavigate } from "react-router-dom";

export default function TurmasPageP() {
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
            <a href="#" className="nav-item active">
              👥 Turmas
            </a>
            <a href="#" onClick={() => navigate('/conteudoP')} className="nav-item">
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
            <h1>Gerenciar Turmas</h1>
            <p>Aqui você pode criar, editar e gerenciar suas turmas.</p>
          </div>

          <section className="turmas-section">
            <h2>Minhas Turmas</h2>
            <div className="turmas-grid">
              <div className="turma-card">
                <h3>Turma A - Matemática</h3>
                <p>25 alunos matriculados</p>
                <button className="btn-primary">Gerenciar</button>
              </div>
              <div className="turma-card">
                <h3>Turma B - Português</h3>
                <p>22 alunos matriculados</p>
                <button className="btn-primary">Gerenciar</button>
              </div>
              <div className="turma-card">
                <h3>Turma C - Ciências</h3>
                <p>28 alunos matriculados</p>
                <button className="btn-primary">Gerenciar</button>
              </div>
            </div>
            <button className="btn-secondary">+ Criar Nova Turma</button>
          </section>
        </main>
      </div>
    </div>
  );
}
