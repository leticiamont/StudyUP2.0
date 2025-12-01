import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import api from "../../services/api";
import "./AlunoJogosA.css";

export default function AlunoJogosA() {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [user, setUser] = useState({ displayName: "Aluno", points: 0 });
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ícones e Cores para as fases
  const ICONS = ['egg', 'star', 'emoji_events', 'local_fire_department', 'bolt', 'sports_esports'];
  const COLORS = ['#FFC107', '#FF9800', '#1154D9', '#4CAF50', '#9C27B0', '#E91E63'];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("userData") || "{}");
    if (storedUser.uid) {
        // 1. Carrega dados do cache para mostrar rápido
        setUser(prev => ({ ...prev, ...storedUser }));
        
        // 2. Busca Níveis
        fetchLevels(storedUser);

        // 3. 🚨 IMPORTANTE: Busca dados frescos do usuário (Pontos atualizados)
        fetchUserData(storedUser.uid);
    }
  }, []);

  // Nova função para atualizar os pontos
  const fetchUserData = async (uid) => {
    try {
        const response = await api.get(`/api/users/${uid}`);
        const dadosAtualizados = response.data;
        
        // Atualiza estado e cache
        setUser(dadosAtualizados);
        localStorage.setItem("userData", JSON.stringify(dadosAtualizados));
        
        console.log("Pontos atualizados:", dadosAtualizados.points);
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
    }
  };

  const fetchLevels = async (userData) => {
    setLoading(true);
    try {
      let endpoint = `/api/contents`;
      if (userData.classId) endpoint += `?classId=${userData.classId}`;
      else if (userData.gradeLevel) endpoint += `?gradeLevel=${userData.gradeLevel}`;
      else { setLoading(false); return; }

      const response = await api.get(endpoint);
      
      const dynamicLevels = response.data.map((item, index) => ({
        id: item.id,
        title: item.name.replace('.pdf', ''),
        type: item.type,
        url: item.url,
        content: item.content,
        icon: ICONS[index % ICONS.length],
        color: COLORS[index % COLORS.length],
        status: 'active',
        stars: 0
      }));

      setLevels(dynamicLevels);
    } catch (error) { console.error("Erro:", error); } 
    finally { setLoading(false); }
  };

  const handlePlayLevel = (level) => {
    navigate('/aluno/jogos/quiz', { state: { levelData: level } });
  };

  const handleLogout = async () => {
    if (window.confirm("Sair?")) {
      await signOut(auth); localStorage.removeItem("token"); localStorage.removeItem("userData"); navigate("/");
    }
  };

  return (
    <div className="student-container">
      <aside className="student-sidebar">
        <div className="sidebar-logo"><span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span></div>
        <nav className="student-nav">
            <div onClick={() => navigate('/dashboardA')} className="s-nav-item"><span className="material-symbols-rounded">home</span> Início</div>
            <div onClick={() => navigate('/aluno/conteudo')} className="s-nav-item"><span className="material-symbols-rounded">book</span> Aulas</div>
            <div onClick={() => navigate('/aluno/ide')} className="s-nav-item"><span className="material-symbols-rounded">terminal</span> IDE Python</div>
            
            <div onClick={() => navigate('/aluno/jogos')} className="s-nav-item active"><span className="material-symbols-rounded">sports_esports</span> Jogos</div>
            
            <div onClick={() => navigate('/aluno/forum')} className="s-nav-item"><span className="material-symbols-rounded">forum</span> Fórum</div>
        </nav>
        <button className="btn-logout" onClick={handleLogout}><span className="material-symbols-rounded">logout</span> Sair</button>
      </aside>

      <main className="student-content game-bg">
        
        <header className="student-header-clean">
           <div className="xp-pill">
              <span className="material-symbols-rounded xp-star">star</span>
              {/* Mostra os pontos atualizados */}
              <span className="xp-value">{user.points || 0}</span>
           </div>
           <div className="profile-circle"><span className="material-symbols-rounded">account_circle</span></div>
        </header>

        <div className="map-container">
            <h1 className="map-title">Trilha do Conhecimento</h1>
            <p className="map-subtitle">Complete os desafios para ganhar XP!</p>

            {loading ? <div className="loading-ai">Carregando fases...</div> : levels.length === 0 ? (
                <div className="empty-map"><span className="material-symbols-rounded">sentiment_dissatisfied</span><p>Nenhuma fase disponível ainda.</p></div>
            ) : (
                <div className="levels-path">
                    {levels.map((level, index) => (
                        <div key={level.id} className={`level-node ${index % 2 === 0 ? 'left' : 'right'}`}>
                            
                            {index < levels.length - 1 && <div className="path-line"></div>}

                            <div 
                                className="level-button" 
                                style={{ backgroundColor: level.color, boxShadow: `0 8px 0 ${level.color}99` }}
                                onClick={() => handlePlayLevel(level)}
                            >
                                <span className="material-symbols-rounded level-icon">{level.icon}</span>
                            </div>
                            
                            <div className="level-info">
                                <h3>Fase {index + 1}</h3>
                                <span>{level.title}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </main>
    </div>
  );
}