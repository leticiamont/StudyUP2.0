import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./TurmasPageP.css";

export default function TurmasPageP() {
  const navigate = useNavigate();
  
  const [turmas, setTurmas] = useState([]);
  const [filteredTurmas, setFilteredTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const teacherId = userData.uid; 

  useEffect(() => {
    fetchTurmas();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredTurmas(turmas);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      const filtrados = turmas.filter(t => 
        t.name.toLowerCase().includes(lowerTerm) || 
        t.gradeLevel.toLowerCase().includes(lowerTerm)
      );
      setFilteredTurmas(filtrados);
    }
  }, [searchTerm, turmas]);

  const fetchTurmas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/classes');
      const data = response.data;
      
      // Filtra apenas as turmas deste professor
      const minhasTurmas = teacherId 
        ? data.filter(t => t.teacherId === teacherId)
        : data; 
      
      setTurmas(minhasTurmas);
      setFilteredTurmas(minhasTurmas);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container">
      <header className="top-bar">
        <div className="logo">
          <img src="/src/assets/logo.png" alt="Logo" className="logo-image" />
          <span className="logo-text">
            <span className="logo-study">STUDY</span><span className="logo-up">UP</span>
          </span>
        </div>
        <div className="header-actions">
          <span className="material-symbols-rounded icon-btn">notifications</span>
          <span className="material-symbols-rounded icon-btn">account_circle</span>
          <span className="user-role">Professor ▼</span>
        </div>
      </header>

      <div className="content-wrapper">
        <aside className="sidebar">
          <nav className="nav-menu">
            <a href="#" onClick={() => navigate('/dashboardP')} className="nav-item">
              <span className="material-symbols-rounded">home</span> Início
            </a>
            <a href="#" className="nav-item active">
              <span className="material-symbols-rounded">groups</span> Turmas
            </a>
            <a href="#" onClick={() => navigate('/conteudoP')} className="nav-item">
              <span className="material-symbols-rounded">menu_book</span> Conteúdo
            </a>
            <a href="#" onClick={() => navigate('/forumP')} className="nav-item">
              <span className="material-symbols-rounded">forum</span> Fórum
            </a>
            <a href="#" onClick={() => navigate('/configuracoesP')} className="nav-item">
              <span className="material-symbols-rounded">settings</span> Configurações
            </a>
          </nav>
        </aside>

        <main className="turmas-content">
          <div className="page-header">
            <div className="page-title">
              <h1>Minhas Turmas</h1>
              <p>Gerencie seus alunos e diários de classe</p>
            </div>

            <div className="header-controls">
              <div className="search-bar">
                <span className="material-symbols-rounded">search</span>
                <input 
                  type="text" 
                  placeholder="Buscar turma..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="turmas-grid">
            {loading ? (
              <p className="loading-state">Carregando turmas...</p>
            ) : filteredTurmas.length === 0 ? (
              <div className="empty-state">
                <h3>Nenhuma turma encontrada.</h3>
                <p>Você ainda não está vinculado a nenhuma turma.</p>
              </div>
            ) : (
              filteredTurmas.map(turma => (
                <div 
                  key={turma.id} 
                  className="turma-card"
                  onClick={() => navigate(`/turmasP/${turma.id}`)}
                >
                  <div className="card-header">
                    <div>
                      <h3>{turma.name}</h3>
                      <div className="tags-row">
                         <span className="tag-level"><span className="material-symbols-rounded icon-tiny">school</span> {turma.gradeLevel}</span>
                         {turma.schedule && <span className="tag-time"><span className="material-symbols-rounded icon-tiny">schedule</span> {turma.schedule}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-footer">
                    <div className="student-count">
                        <span className="material-symbols-rounded icon-green">group</span>
                        <strong>{turma.studentCount || 0}</strong>
                        <span className="label-small">ALUNOS MATRICULADOS</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}