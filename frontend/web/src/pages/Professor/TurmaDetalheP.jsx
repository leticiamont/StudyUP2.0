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
  const [viewingItem, setViewingItem] = useState(null);

  // 1. Carrega Dados da Turma
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

  // 2. Carrega Conteúdos (Ao mudar aba ou turma)
  useEffect(() => {
    if (!turma) return;
    fetchLista();
  }, [activeTab, turma]);

  const fetchLista = async () => {
    setLoading(true);
    const cacheBuster = `?t=${new Date().getTime()}`; // Evita cache

    try {
      if (activeTab === "alunos") {
        const response = await api.get(`/api/users?role=student&classId=${id}`);
        setListaDados(response.data);
      } else {
        // --- LÓGICA DE CONTEÚDOS ---
        let serieBusca = turma.gradeLevel; 
        const match = turma.name.match(/(\d+º?\s?(Ano|Série|Serie))/i);
        if (match) serieBusca = match[0];

        console.log(`[DEBUG] Buscando materiais para Série: ${serieBusca} | Turma ID: ${id}`);

        const allContents = await api.get(`/api/contents${cacheBuster}`); 
        
        // Filtra apenas os materiais relevantes
        const contents = allContents.data.filter(c => {
            // Se for exclusivo desta turma
            if (c.classId === id) return true;
            
            // Se for geral da série (E não tiver turma específica)
            // Normaliza strings para evitar erro de espaço/acento
            const cGrade = c.gradeLevel ? c.gradeLevel.trim() : "";
            const tGrade = turma.gradeLevel ? turma.gradeLevel.trim() : "";
            
            const isGeneral = !c.classId || c.classId === 'null';
            const matchGrade = cGrade === serieBusca || cGrade === tGrade;

            return isGeneral && matchGrade;
        });

        // Processa e VALIDA os itens (Remove sem ID)
        const validContents = contents
            .map(c => ({
                ...c,
                originType: c.classId === id ? 'Exclusivo' : 'Geral da Série'
            }))
            .filter(item => {
                if (!item.id) {
                    console.warn("⚠️ Item ignorado (Sem ID):", item);
                    return false;
                }
                return true;
            });

        console.log(`[DEBUG] Itens Válidos Encontrados: ${validContents.length}`);
        setListaDados(validContents);
      }
    } catch (error) {
      console.error("Erro ao buscar lista:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- AÇÕES ---

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("classId", id); 
    formData.append("name", file.name);
    formData.append("gradeLevel", turma.gradeLevel || ""); 
    formData.append("file", file);

    try {
      await api.post("/api/contents/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Arquivo enviado!");
      fetchLista();
    } catch (error) {
      alert("Erro no upload.");
    }
  };

  const handleDelete = async (itemId) => {
    if (!itemId) return alert("Erro: ID do item inválido.");
    if(!confirm("Remover este item?")) return;
    
    try {
        await api.delete(`/api/contents/${itemId}`);
        fetchLista(); // Recarrega a lista
    } catch(e) { 
        console.error(e);
        alert("Erro ao remover."); 
    }
  };

  const openPdfInNewTab = (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getPdfViewerUrl = (url) => {
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
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
             listaDados.length === 0 ? <div className="empty-state-web"><span className="material-symbols-rounded">folder_open</span><p>Nenhum conteúdo encontrado.</p></div> : (
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
                      <div key={item.id || Math.random()} className={`content-card-web ${item.originType === 'Exclusivo' ? 'specific' : 'general'}`}>
                        <div className={`file-icon ${item.url ? 'pdf' : 'text'}`}>
                          <span className="material-symbols-rounded">
                            {item.url ? 'picture_as_pdf' : 'article'}
                          </span>
                        </div>
                        <div className="file-details">
                          <h4>{item.name || "Sem Título"}</h4>
                          <span className="origin-tag">{item.originType}</span>
                        </div>
                        <div className="file-actions">
                            <button className="action-link" onClick={() => setViewingItem(item)} title="Ver">
                                <span className="material-symbols-rounded">visibility</span>
                            </button>
                            
                            {/* Botão Delete BLINDADO */}
                            <button 
                                className="action-link delete" 
                                onClick={() => item.id ? handleDelete(item.id) : alert("Erro: Item sem ID.")}
                                title="Excluir"
                                style={{ opacity: item.id ? 1 : 0.3 }}
                            >
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

      {/* MODAL VISUALIZAÇÃO */}
      {viewingItem && (
        <div className="modal-overlay">
          <div className="modal-box x-large">
            <div className="modal-header">
                <h3 style={{flex: 1}}>{viewingItem.name}</h3>
                <div className="header-controls">
                    {viewingItem.type !== 'text' && (
                        <button className="btn-open-external-header" onClick={() => openPdfInNewTab(viewingItem.url)}>
                            <span className="material-symbols-rounded">open_in_new</span> Abrir em Nova Aba
                        </button>
                    )}
                    <button onClick={() => setViewingItem(null)} className="close-btn">✕</button>
                </div>
            </div>
            <div className="modal-body view-mode">
                {viewingItem.type === 'text' ? (
                    <div className="text-content" dangerouslySetInnerHTML={{ __html: viewingItem.content }} />
                ) : (
                    <iframe src={getPdfViewerUrl(viewingItem.url)} className="pdf-frame-full" title="Visualizador"></iframe>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}