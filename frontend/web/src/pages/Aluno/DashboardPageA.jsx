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

  // Lógica de Conquistas (Baseada no Mobile)
  const getBadges = (userPoints, completedCount = 0) => {
      const badges = [];

      // Nível de XP
      if (userPoints >= 500) {
          badges.push({ icon: 'emoji_events', color: '#FFD700', label: 'Mestre do XP', desc: '+500 pontos' }); // crown -> emoji_events
      } else if (userPoints >= 100) {
          badges.push({ icon: 'military_tech', color: '#C0C0C0', label: 'Aprendiz', desc: '+100 pontos' }); // medal -> military_tech
      } else {
          badges.push({ icon: 'face', color: '#CD7F32', label: 'Novato', desc: 'Começando...' }); // baby-face -> face
      }

      // Nível de Exploração
      if (completedCount >= 5) {
          badges.push({ icon: 'map', color: '#4CAF50', label: 'Explorador', desc: '5 Fases Feitas' }); // map-check -> map
      } else if (completedCount >= 1) {
          badges.push({ icon: 'hiking', color: '#2196F3', label: 'Primeiros Passos', desc: '1ª Fase Feita' }); // foot-print -> hiking
      } else {
          badges.push({ icon: 'bedtime', color: '#ccc', label: 'Dorminhoco', desc: 'Nenhuma fase' }); // sleep -> bedtime
      }

      // Conquista Fixa
      badges.push({ icon: 'auto_stories', color: '#E91E63', label: 'Estudioso', desc: 'Sempre Ativo' }); // book-open -> auto_stories
      
      return badges;
  };

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
        const cacheBuster = `t=${new Date().getTime()}`;
        const contentRes = await api.get(`/api/contents?classId=${userData.classId}&${cacheBuster}`);
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

  const handleOpenActivity = (item) => {
    if (item.type === 'text') {
        alert("Leitura: " + item.name);
    } else {
        window.open(item.url, '_blank');
    }
  };

  // Calcula as conquistas atuais (Mockando completedCount como 1 para teste, ou pegando do user se tiver)
  const currentBadges = getBadges(user.points || 0, user.completedCount || 1);

  return (
    <div className="student-container">
      <aside className="student-sidebar">
        <div className="sidebar-logo">
            <span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span>
        </div>
        <nav className="student-nav">
            <div onClick={() => navigate('/dashboardA')} className="s-nav-item active"><span className="material-symbols-rounded">home</span> Início</div>
            <div onClick={() => navigate('/aluno/conteudo')} className="s-nav-item"><span className="material-symbols-rounded">book</span> Aulas</div>
            <div onClick={() => navigate('/aluno/ide')} className="s-nav-item"><span className="material-symbols-rounded">terminal</span> IDE Python</div>
            <div onClick={() => navigate('/aluno/jogos')} className="s-nav-item"><span className="material-symbols-rounded">sports_esports</span> Jogos</div>
            <div onClick={() => navigate('/aluno/forum')} className="s-nav-item"><span className="material-symbols-rounded">forum</span> Fórum</div>
        </nav>
        <button className="btn-logout" onClick={handleLogout}><span className="material-symbols-rounded">logout</span> Sair</button>
      </aside>

      <main className="student-content">
        <header className="student-header-clean">
           <div className="xp-pill">
              <span className="material-symbols-rounded xp-star">star</span>
              <span className="xp-value">{user.points || 0} XP</span>
           </div>
           <div className="profile-circle"><span className="material-symbols-rounded">account_circle</span></div>
        </header>

        <section className="hero-card-mobile-style">
            <div className="hero-text-content">
                <h1>Olá, {getFirstName(user.displayName)}!</h1>
                <p>Vamos continuar aprendendo?</p>
                <button className="btn-continue" onClick={() => navigate('/aluno/conteudo')}>
                    Minhas Aulas <span className="material-symbols-rounded">arrow_forward</span>
                </button>
            </div>
            <div className="hero-illustration"><span className="material-symbols-rounded rocket-icon">rocket_launch</span></div>
        </section>

        <section className="section-container">
            <h3>Para Hoje</h3>
            <div className="tasks-list-clean">
                {loading ? <p>Carregando...</p> : nextActivities.length === 0 ? (
                    <div className="task-card-clean empty"><p>Nenhuma atividade pendente.</p></div>
                ) : (
                    nextActivities.map(item => (
                        <div key={item.id} className="task-card-clean" onClick={() => handleOpenActivity(item)}>
                            <div className={`task-icon-circle ${item.type === 'text' ? 'blue' : 'orange'}`}>
                                <span className="material-symbols-rounded">{item.type === 'text' ? 'description' : 'picture_as_pdf'}</span>
                            </div>
                            <div className="task-info-clean">
                                <h4>{item.name}</h4>
                                <span>{item.type === 'text' ? 'Leitura' : 'PDF'}</span>
                            </div>
                            <span className="material-symbols-rounded status-icon">chevron_right</span>
                        </div>
                    ))
                )}
            </div>
        </section>
        
        <section className="section-container">
            <h3>Minhas Conquistas</h3>
            <div className="badges-grid-clean">
                {currentBadges.map((badge, index) => (
                    <div key={index} className="badge-card">
                        <div className="badge-icon-circle" style={{ backgroundColor: `${badge.color}20` }}>
                            <span 
                                className="material-symbols-rounded badge-icon"
                                style={{ color: badge.color }}
                            >
                                {badge.icon}
                            </span>
                        </div>
                        <div className="badge-info">
                            <span className="badge-title">{badge.label}</span>
                            <span className="badge-desc">{badge.desc}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      </main>
    </div>
  );
}