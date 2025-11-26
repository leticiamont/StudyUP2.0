import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import api from "../../services/api";
import "./DashboardPageA.css";

export default function DashboardPageA() {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [user, setUser] = useState({ displayName: "Aluno", points: 0 });
  const [nextActivities, setNextActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const badges = [
    { id: 1, icon: "local_fire_department", color: "#FF5722", title: "3 Dias Seguidos" },
    { id: 2, icon: "verified", color: "#4CAF50", title: "Primeira Nota 10" },
    { id: 3, icon: "code", color: "#1154D9", title: "Dev Iniciante" },
  ];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("userData") || "{}");
    if (storedUser.uid) {
        setUser(prev => ({ ...prev, ...storedUser }));
        fetchStudentData(storedUser.uid);
    }
  }, []);

  const fetchStudentData = async (uid) => {
    setLoading(true);
    try {
      const userRes = await api.get(`/api/users/${uid}`);
      const userData = userRes.data;
      setUser(userData);
      localStorage.setItem("userData", JSON.stringify(userData));

      if (userData.classId) {
        const contentRes = await api.get(`/api/contents?classId=${userData.classId}`);
        setNextActivities(contentRes.data.slice(0, 2));
      }
    } catch (error) { console.error("Erro:", error); } 
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    if (window.confirm("Sair do StudyUp?")) {
      await signOut(auth);
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      navigate("/");
    }
  };

  const getFirstName = (name) => name?.split(' ')[0] || 'Aluno';

  return (
    <div className="student-container">
      <aside className="student-sidebar">
        <div className="sidebar-logo">
            <span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span>
        </div>
        <nav className="student-nav">
            <div onClick={() => navigate('/dashboardA')} className="s-nav-item active">
                <span className="material-symbols-rounded">home</span> Início
            </div>
            <div onClick={() => navigate('/aluno/conteudo')} className="s-nav-item">
                <span className="material-symbols-rounded">book</span> Aulas
            </div>
            <div onClick={() => navigate('/aluno/ide')} className="s-nav-item">
                <span className="material-symbols-rounded">terminal</span> IDE Python
            </div>
            {/* 🚨 CORREÇÃO DE NAVEGAÇÃO JOGOS */}
            <div onClick={() => navigate('/aluno/jogos')} className="s-nav-item">
                <span className="material-symbols-rounded">sports_esports</span> Jogos
            </div>
            <div className="s-nav-item"><span className="material-symbols-rounded">forum</span> Fórum</div>
        </nav>
        <button className="btn-logout" onClick={handleLogout}><span className="material-symbols-rounded">logout</span> Sair</button>
      </aside>

      <main className="student-content">
        <header className="student-header-clean">
           <div className="xp-pill"><span className="material-symbols-rounded xp-star">star</span><span className="xp-value">{user.points || 0}</span></div>
           <div className="profile-circle"><span className="material-symbols-rounded">account_circle</span></div>
        </header>

        <section className="hero-card-mobile-style">
            <div className="hero-text-content">
                <h1>Olá, {getFirstName(user.displayName)}!</h1>
                <p>Pronta para aprender hoje?</p>
                <button className="btn-continue" onClick={() => navigate('/aluno/conteudo')}>
                    Continuar Módulo 1 <span className="material-symbols-rounded">arrow_forward</span>
                </button>
            </div>
            <div className="hero-illustration"><span className="material-symbols-rounded rocket-icon">rocket_launch</span></div>
        </section>

        <section className="section-container">
            <h3>Para Hoje</h3>
            <div className="tasks-list-clean">
                {loading ? <p>Carregando...</p> : nextActivities.length === 0 ? (
                    <div className="task-card-clean empty"><p>Tudo em dia!</p></div>
                ) : (
                    nextActivities.map(item => (
                        <div key={item.id} className="task-card-clean">
                            <div className={`task-icon-circle ${item.type === 'text' ? 'blue' : 'orange'}`}><span className="material-symbols-rounded">{item.type === 'text' ? 'description' : 'picture_as_pdf'}</span></div>
                            <div className="task-info-clean"><h4>{item.name}</h4><span>{item.type === 'text' ? 'Leitura' : 'PDF'}</span></div>
                            <span className="material-symbols-rounded status-icon">radio_button_unchecked</span>
                        </div>
                    ))
                )}
            </div>
        </section>
        
        <section className="section-container">
            <h3>Conquistas</h3>
            <div className="badges-grid-clean">
                {badges.map(badge => (
                    <div key={badge.id} className="badge-box">
                        <span className="material-symbols-rounded badge-icon-clean" style={{color: badge.color}}>{badge.icon}</span>
                        <span className="badge-label">{badge.title}</span>
                    </div>
                ))}
            </div>
        </section>
      </main>
    </div>
  );
}