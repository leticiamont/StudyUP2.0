import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import api from "../../services/api";
import "./AlunoConteudoA.css";

export default function AlunoConteudoA() {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [user, setUser] = useState({ displayName: "Aluno" });
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState(1);
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
      // 🚨 CORREÇÃO: Envia classId E gradeLevel juntos para a busca híbrida
      let endpoint = `/api/contents?`;
      const params = [];
      
      if (userData.classId) {
          params.push(`classId=${userData.classId}`);
      } 
      // Sempre manda o nível se tiver, para pegar os gerais
      if (userData.gradeLevel) {
          params.push(`gradeLevel=${encodeURIComponent(userData.gradeLevel)}`);
      }
      
      if (params.length === 0) {
          setLoading(false); 
          return;
      }

      // Adiciona timestamp para evitar cache
      const cacheBuster = `t=${new Date().getTime()}`;
      params.push(cacheBuster);

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

  // Função de abrir (com suporte a PDF em nova aba)
  const handleOpenActivity = (item) => {
    if (item.type === 'text') {
      setViewingContent(item);
    } else {
      // Abre PDF direto em nova aba
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const modules = [
    { id: 1, title: "Módulo Atual", subtitle: "Fundamentos", progress: 100, status: "active", color: "#1154D9" },
    { id: 2, title: "Próximo Nível", subtitle: "Em breve...", progress: 0, status: "locked", color: "#A0A0A0" },
  ];

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
            <h1>Minhas Aulas</h1>
            <span className="header-subtitle">{user.gradeLevel || "Bons estudos!"}</span>
        </header>

        <section className="modules-track">
            {modules.map(mod => (
                <div key={mod.id} className={`module-card ${mod.status}`} style={{ '--mod-color': mod.color }} onClick={() => mod.status === 'active' && setActiveModule(mod.id)}>
                    <div className="mod-top"><span className="mod-title">{mod.title}</span>{mod.status === 'active' && <span className="material-symbols-rounded star-icon">star</span>}</div>
                    <span className="mod-sub">{mod.subtitle}</span>
                    <div className="mod-progress-bar"><div className="mod-progress-fill" style={{width: `${mod.progress}%`}}></div></div>
                    <span className="mod-count">{mod.id === 1 ? `${contents.length} atividades` : 'Bloqueado'}</span>
                </div>
            ))}
        </section>

        <section className="activities-list-section">
            <h3 className="section-label">Conteúdo do Módulo {activeModule}</h3>
            {loading ? <p>Carregando...</p> : contents.length === 0 ? <div className="empty-state-student"><p>Nenhuma aula encontrada para sua turma.</p></div> : (
                <div className="activities-grid">
                    {contents.map((item) => (
                        <div key={item.id} className="activity-card" onClick={() => handleOpenActivity(item)}>
                            <div className="act-left">
                                <div className={`act-icon ${item.type === 'text' ? 'blue' : 'pink'}`}>
                                    <span className="material-symbols-rounded">{item.type === 'text' ? 'menu_book' : 'picture_as_pdf'}</span>
                                </div>
                                <div className="act-info">
                                    <h4>{item.name}</h4>
                                    <span>{item.type === 'text' ? 'Leitura' : 'PDF'}</span>
                                    {/* Tag para diferenciar origem (opcional) */}
                                    {item.classId && <span className="tag-origin">Da Turma</span>}
                                </div>
                            </div>
                            <span className="material-symbols-rounded arrow-act">chevron_right</span>
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