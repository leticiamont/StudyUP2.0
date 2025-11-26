import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./TurmaDetalheP.css";

export default function TurmaDetalheP() {
  const { id } = useParams(); 
  const navigate = useNavigate();

  const [turma, setTurma] = useState(null);
  const [activeTab, setActiveTab] = useState("alunos"); 
  const [listaDados, setListaDados] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Carrega Turma
  useEffect(() => {
    async function loadTurma() {
      try {
        const response = await api.get(`/api/classes/${id}`);
        setTurma(response.data);
      } catch (error) {
        console.error("Erro ao carregar turma:", error);
        navigate("/turmasP");
      }
    }
    loadTurma();
  }, [id, navigate]);

  // Carrega Listas da Turma
  useEffect(() => {
    if (!turma) return;
    fetchLista();
  }, [activeTab, turma]);

  const fetchLista = async () => {
    setLoading(true);
    try {
      if (activeTab === "alunos") {
        const response = await api.get(`/api/users?role=student&classId=${id}`);
        setListaDados(response.data);
      } else {
        // Lógica de Conteúdos (APENAS MATERIAIS, SEM PLANOS)
        let serieBusca = turma.gradeLevel; 
        const match = turma.name.match(/(\d+º?\s?(Ano|Série|Serie))/i);
        if (match) serieBusca = match[0];

        const allContents = await api.get(`/api/contents`); 
        // Removida a chamada para /api/plans

        // Filtra CONTEÚDOS
        const contents = allContents.data.filter(c => 
            c.classId === id || 
            c.gradeLevel === serieBusca ||
            c.gradeLevel === turma.gradeLevel
        );
        
        // Marca visualmente
        const processedContents = contents.map(c => ({
            ...c,
            originType: c.classId === id ? 'Exclusivo' : 'Geral da Série'
        }));

        setListaDados(processedContents); // Salva APENAS conteúdos
      }
    } catch (error) {
      console.error("Erro ao buscar lista:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Máximo 5MB."); return; }

    const formData = new FormData();
    formData.append("classId", id); 
    formData.append("name", file.name);
    formData.append("gradeLevel", turma.gradeLevel || ""); 
    formData.append("file", file);

    try {
      await api.post("/api/contents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("Arquivo enviado!");
      fetchLista();
    } catch (error) {
      alert("Erro no upload.");
    }
  };

  const handleDelete = async (itemId) => {
    if(!confirm("Remover este item?")) return;
    try {
        await api.delete(`/api/contents/${itemId}`);
        fetchLista();
    } catch(e) { alert("Erro ao remover."); }
  };

  // Função para abrir PDF em nova aba (Mais robusto)
  const openPdf = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!turma) return <div className="loading-screen">Carregando...</div>;

  return (
    <div className="main-container">
      <header className="top-bar">
        <div className="logo"><img src="/src/assets/logo.png" className="logo-image" /><span className="logo-text"><span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span></span></div>
        <div className="header-actions"><span className="material-symbols-rounded icon-btn">notifications</span><span className="material-symbols-rounded icon-btn">account_circle</span><span className="user-role">Professor ▼</span></div>
      </header>

      <div className="content-wrapper">
        <aside className="sidebar">
          <nav className="nav-menu">
            <a href="#" onClick={() => navigate('/dashboardP')} className="nav-item"><span className="material-symbols-rounded">home</span> Início</a>
            <a href="#" onClick={() => navigate('/turmasP')} className="nav-item active"><span className="material-symbols-rounded">groups</span> Turmas</a>
            <a href="#" onClick={() => navigate('/conteudoP')} className="nav-item"><span className="material-symbols-rounded">menu_book</span> Conteúdo</a>
            <a href="#" onClick={() => navigate('/forumP')} className="nav-item"><span className="material-symbols-rounded">forum</span> Fórum</a>
            <a href="#" onClick={() => navigate('/configuracoesP')} className="nav-item"><span className="material-symbols-rounded">settings</span> Configurações</a>
          </nav>
        </aside>

        <main className="main-content-detail">
          <div className="breadcrumb">
            <button className="btn-back-link" onClick={() => navigate("/turmasP")}>
              <span className="material-symbols-rounded">arrow_back</span> Voltar para Turmas
            </button>
          </div>

          <div className="turma-header-wide">
            <div className="turma-info-main">
              <h1>{turma.name}</h1>
              <div className="turma-meta">
                <span className="meta-tag"><span className="material-symbols-rounded">school</span> {turma.gradeLevel}</span>
                <span className="meta-tag"><span className="material-symbols-rounded">schedule</span> {turma.schedule || 'Sem horário'}</span>
              </div>
            </div>
            <div className="turma-stats-box">
              <span className="material-symbols-rounded big-icon">group</span>
              <div className="stats-text"><strong>{turma.studentIds?.length || 0}</strong><span>Alunos Matriculados</span></div>
            </div>
          </div>

          <div className="controls-bar">
            <div className="tabs-web">
              <button className={`tab-link ${activeTab === "alunos" ? "active" : ""}`} onClick={() => setActiveTab("alunos")}>Alunos</button>
              <button className={`tab-link ${activeTab === "conteudo" ? "active" : ""}`} onClick={() => setActiveTab("conteudo")}>Conteúdo & Aulas</button>
            </div>
            {activeTab === "conteudo" && (
              <div className="action-buttons">
                <label className="btn-primary-web"><span className="material-symbols-rounded">cloud_upload</span> Enviar para esta Turma
                  <input type="file" hidden onChange={handleFileUpload} accept="application/pdf" />
                </label>
              </div>
            )}
          </div>

          <div className="data-container">
            {loading ? <div className="loading-state"><span className="material-symbols-rounded spinning">progress_activity</span><p>Carregando...</p></div> : 
             listaDados.length === 0 ? <div className="empty-state-web"><span className="material-symbols-rounded">folder_open</span><p>Nenhum conteúdo encontrado (Geral ou da Turma).</p></div> : (
              <>
                {activeTab === "alunos" && (
                  <table className="web-table">
                    <thead><tr><th>Nome</th><th>Email</th><th style={{width: '100px'}}>Ações</th></tr></thead>
                    <tbody>{listaDados.map(aluno => (<tr key={aluno.id}><td><div className="user-info-cell"><div className="avatar-initial">{aluno.displayName?.charAt(0).toUpperCase()}</div>{aluno.displayName}</div></td><td>{aluno.email}</td><td><button className="icon-action-btn"><span className="material-symbols-rounded">more_vert</span></button></td></tr>))}</tbody>
                  </table>
                )}

                {activeTab === "conteudo" && (
                  <div className="contents-grid">
                    {listaDados.map(item => (
                      <div key={item.id} className={`content-card-web ${item.originType === 'Exclusivo' ? 'specific' : 'general'}`}>
                        <div className={`file-icon ${item.url ? 'pdf' : 'text'}`}>
                          <span className="material-symbols-rounded">
                            {item.url ? 'picture_as_pdf' : 'article'}
                          </span>
                        </div>
                        <div className="file-details">
                          <h4>{item.name}</h4>
                          <span className="origin-tag">{item.originType}</span>
                        </div>
                        <div className="file-actions">
                            {/* BOTÃO VER: Abre direto se for PDF, ou Modal se for texto */}
                            <button className="action-link" onClick={() => item.url ? openPdf(item.url) : alert("Texto (IA) - Use a tela de Conteúdos para ver.")} title="Ver">
                                <span className="material-symbols-rounded">visibility</span>
                            </button>
                            <button className="action-link delete" onClick={() => handleDelete(item.id)}>
                                <span className="material-symbols-rounded">delete</span>
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}