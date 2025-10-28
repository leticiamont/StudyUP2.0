import React from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardPageP.css";

export default function DashboardPageP() {
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
            <a href="#" className="nav-item active">
              🏠 Início
            </a>
            <a href="#" onClick={() => navigate('/turmasP')} className="nav-item">
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
            <h1>Olá, Professor! Bem vindo ao STUDYUP!</h1>
            <p>Aqui está suas próximas aulas:</p>
          </div>

          <section className="calendar-section">
            <h2>Calendário</h2>
            <table className="calendar-table">
              <thead>
                <tr>
                  <th>Segunda</th>
                  <th>Terça</th>
                  <th>Quarta</th>
                  <th>Quinta</th>
                  <th>Sexta</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="avisos-section">
            <h2>Avisos Importantes</h2>
            <div className="avisos-container">
              <div className="aviso-card">
                <div className="aviso-header">
                  <span className="aviso-icon">📢</span>
                  <span className="aviso-date">15/12/2024</span>
                </div>
                <h3>Reunião de Professores</h3>
                <p>Reunião obrigatória amanhã às 14h na sala de professores para discutir o calendário do próximo semestre.</p>
              </div>
              <div className="aviso-card">
                <div className="aviso-header">
                  <span className="aviso-icon">📚</span>
                  <span className="aviso-date">14/12/2024</span>
                </div>
                <h3>Atualização do Sistema</h3>
                <p>O sistema ficará indisponível para manutenção das 22h às 24h. Por favor, salve seus trabalhos.</p>
              </div>
              <div className="aviso-card">
                <div className="aviso-header">
                  <span className="aviso-icon">🎓</span>
                  <span className="aviso-date">13/12/2024</span>
                </div>
                <h3>Feira de Ciências</h3>
                <p>As inscrições para a Feira de Ciências estão abertas até 20/12. Todos os projetos são bem-vindos!</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
