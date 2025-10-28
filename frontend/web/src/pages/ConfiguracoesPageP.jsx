import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ConfiguracoesPageP() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.body.classList.add('dark-mode');
    }
  }, []);

  const handleDarkModeToggle = (e) => {
    const isChecked = e.target.checked;
    setDarkMode(isChecked);
    localStorage.setItem('darkMode', isChecked);
    if (isChecked) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

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
            <a href="#" onClick={() => navigate('/forumP')} className="nav-item">
              💬 Fórum
            </a>
            <a href="#" className="nav-item active">
              ⚙️ Configurações
            </a>
          </nav>
        </aside>

        <main className="main-content">
          <div className="welcome-box">
            <h1>Configurações do Professor</h1>
            <p>Gerencie suas preferências e configurações da conta.</p>
          </div>

          <section className="configuracoes-section">
            <h2>Perfil</h2>
            <div className="config-form">
              <div className="form-group">
                <label>Nome:</label>
                <input type="text" defaultValue="Professor João Silva" />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input type="email" defaultValue="joao.silva@escola.com" />
              </div>
              <div className="form-group">
                <label>Disciplina:</label>
                <select defaultValue="matematica">
                  <option value="matematica">Matemática</option>
                  <option value="portugues">Português</option>
                  <option value="ciencias">Ciências</option>
                </select>
              </div>
            </div>

            <h2>Preferências</h2>
            <div className="config-options">
              <label>
                <input type="checkbox" defaultChecked /> Receber notificações por email
              </label>
              <label>
                <input type="checkbox" defaultChecked /> Mostrar lembretes de aulas
              </label>
              <label>
                <input type="checkbox" checked={darkMode} onChange={handleDarkModeToggle} /> Tema escuro
              </label>
            </div>

            <button className="btn-primary">Salvar Alterações</button>
          </section>
        </main>
      </div>
    </div>
  );
}
