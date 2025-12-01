import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import api from "../../services/api";
import "./AlunoConteudoA.css";

export default function AlunoConteudoA() {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [user, setUser] = useState({ displayName: "Aluno", gradeLevel: "" });
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingContent, setViewingContent] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("userData") || "{}");
    if (storedUser.uid) {
      setUser(prev => ({ ...prev, ...storedUser }));
      fetchContents(storedUser);
    }
  }, []);

  const fetchContents = async (userData) => {
    setLoading(true);
    try {
      let endpoint = `/api/contents?`;
      const params = [];
      
      if (userData.classId) params.push(`classId=${userData.classId}`);
      if (userData.gradeLevel) params.push(`gradeLevel=${encodeURIComponent(userData.gradeLevel)}`);
      params.push(`t=${new Date().getTime()}`);

      if (params.length === 0) { setLoading(false); return; }

      const response = await api.get(endpoint + params.join('&'));
      setContents(response.data);
    } catch (error) { console.error("Erro:", error); } 
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    if (window.confirm("Sair?")) {
      await signOut(auth); localStorage.removeItem("token"); localStorage.removeItem("userData"); navigate("/");
    }
  };

  const handleOpenActivity = (item) => {
    if (item.type === 'text') {
      setViewingContent(item);
    } else {
      window.open(item.url, '_blank');
    }
  };

  return (
    <div className="student-container">
      <aside className="student-sidebar">
        <div className="sidebar-logo"><span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span></div>
        <nav className="student-nav">
            <div onClick={() => navigate('/dashboardA')} className="s-nav-item"><span className="material-symbols-rounded">home</span> Início</div>
            <div onClick={() => navigate('/aluno/conteudo')} className="s-nav-item active"><span className="material-symbols-rounded">book</span> Aulas</div>
            <div onClick={() => navigate('/aluno/ide')} className="s-nav-item"><span className="material-symbols-rounded">terminal</span> IDE Python</div>
            <div onClick={() => navigate('/aluno/jogos')} className="s-nav-item"><span className="material-symbols-rounded">sports_esports</span> Jogos</div>
            <div onClick={() => navigate('/aluno/forum')} className="s-nav-item"><span className="material-symbols-rounded">forum</span> Fórum</div>
        </nav>
        <button className="btn-logout" onClick={handleLogout}><span className="material-symbols-rounded">logout</span> Sair</button>
      </aside>

      <main className="student-content">
        
        <header className="student-header-simple">
            <h1>Área de Estudos</h1>
            <span className="header-subtitle">Explore seus materiais</span>
        </header>

        {/* 🚨 NOVO: CARD AZUL DE DESTAQUE (Igual Mobile) 🚨 */}
        <div className="blue-header-card">
            <div className="blue-card-content">
                <span className="material-symbols-rounded card-icon-large">school</span>
                <div>
                    <h2>Aulas Disponíveis</h2>
                    {/* Mostra o nível do aluno dinamicamente */}
                    <p>Conteúdo para {user.gradeLevel || "sua turma"}</p>
                </div>
            </div>
            {/* Ícone de fundo decorativo */}
            <span className="material-symbols-rounded bg-deco-icon">auto_stories</span>
        </div>
        {/* -------------------------------------------------- */}

        <section className="activities-list-section">
            <h3 className="section-label">Materiais Recentes</h3>
            
            {loading ? <p>Carregando materiais...</p> : contents.length === 0 ? (
                <div className="empty-state-student">
                    <span className="material-symbols-rounded">auto_stories</span>
                    <p>Nenhuma aula disponível ainda.</p>
                </div>
            ) : (
                <div className="activities-list-clean">
                    {contents.map((item) => (
                        <div key={item.id} className="task-card-clean" onClick={() => handleOpenActivity(item)}>
                            <div className={`task-icon-circle ${item.type === 'text' ? 'blue' : 'orange'}`}>
                                <span className="material-symbols-rounded">
                                    {item.type === 'text' ? 'description' : 'picture_as_pdf'}
                                </span>
                            </div>
                            <div className="task-info-clean">
                                <h4>{item.name}</h4>
                                <span>{item.type === 'text' ? 'Leitura & Estudo' : 'Arquivo PDF'}</span>
                            </div>
                            <span className="material-symbols-rounded status-icon">chevron_right</span>
                        </div>
                    ))}
                </div>
            )}
        </section>

      </main>

      {viewingContent && (
        <div className="student-modal-overlay">
            <div className="student-modal-box">
                <div className="student-modal-header"><h3>{viewingContent.name}</h3><button onClick={() => setViewingContent(null)} className="close-btn">✕</button></div>
                <div className="student-modal-body"><div className="text-reader" dangerouslySetInnerHTML={{ __html: viewingContent.content }} /></div>
                <div className="student-modal-footer"><button className="btn-finish" onClick={() => setViewingContent(null)}>Concluir</button></div>
            </div>
        </div>
      )}
    </div>
  );
}