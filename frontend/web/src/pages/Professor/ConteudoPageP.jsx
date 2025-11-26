import React, { useState, useEffect } from "react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from "../../services/api";
import "./ConteudoPageP.css";

export default function ConteudoPageP() {
  // --- ESTADOS ---
  const [viewMode, setViewMode] = useState("years"); // 'years' (Níveis) ou 'details' (Dentro do Nível)
  const [selectedLevel, setSelectedLevel] = useState(null);
  
  const [levelList, setLevelList] = useState([]);
  const [seriesData, setSeriesData] = useState({}); // Dados agrupados por série
  const [loading, setLoading] = useState(false);

  // Master-Detail: Qual série está selecionada na esquerda?
  const [activeSerie, setActiveSerie] = useState(null);

  // Modais
  const [showIAModal, setShowIAModal] = useState(false);
  const [iaPrompt, setIaPrompt] = useState("");
  const [iaResponse, setIaResponse] = useState("");
  const [iaLoading, setIaLoading] = useState(false);
  
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  
  const [viewingItem, setViewingItem] = useState(null); // Modal de Visualização

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const teacherId = userData.uid;

  // Configuração do Editor Rico (Quill)
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ]
  };

  // 1. Carrega Níveis Gerais (Tela Inicial)
  useEffect(() => {
    async function fetchLevels() {
      setLoading(true);
      try {
        const response = await api.get("/api/classes");
        const myClasses = response.data.filter(c => c.teacherId === teacherId);
        const uniqueLevels = [...new Set(myClasses.map(c => c.gradeLevel))].sort();
        setLevelList(uniqueLevels);
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    }
    fetchLevels();
  }, [teacherId]);

  // 2. Lógica de Carga e Agrupamento (Ao entrar num nível)
  const handleSelectLevel = async (level) => {
    setSelectedLevel(level);
    setViewMode("details");
    loadContents(level);
  };

  const loadContents = async (level) => {
    setLoading(true);
    try {
      const [plansRes, contentsRes, classesRes] = await Promise.all([
        api.get(`/api/plans`),
        api.get(`/api/contents`),
        api.get(`/api/classes`)
      ]);

      // Descobre quais séries o professor tem neste nível
      const myClassesInLevel = classesRes.data.filter(c => c.teacherId === teacherId && c.gradeLevel === level);
      const uniqueSeries = new Set();
      
      myClassesInLevel.forEach(cls => {
        // Tenta extrair "3º Ano" do nome "3º Ano A"
        const match = cls.name.match(/(\d+º?\s?(Ano|Série|Serie))/i);
        if (match) uniqueSeries.add(match[0]);
        else uniqueSeries.add(cls.name);
      });

      // Se não achar séries (ex: curso único), usa o nome do nível
      if (uniqueSeries.size === 0) uniqueSeries.add(level);

      const seriesArray = Array.from(uniqueSeries).sort();
      const grouped = {};

      // Agrupa Planos e Conteúdos por Série
      seriesArray.forEach(serieName => {
        // Plano: Tenta achar plano específico da série ou geral do nível
        const plan = plansRes.data.find(p => p.gradeLevel === level && (p.name.includes(serieName) || seriesArray.length === 1)) || null;
        
        // Conteúdo: Filtra exato pela série
        const contents = contentsRes.data.filter(c => c.teacherId === teacherId && c.gradeLevel === serieName);
        
        grouped[serieName] = { plan, contents };
      });

      setSeriesData(grouped);

      // Seleciona a primeira série automaticamente se nenhuma estiver selecionada
      if (seriesArray.length > 0 && !activeSerie) {
        setActiveSerie(seriesArray[0]);
      } else if (seriesArray.length > 0 && !seriesArray.includes(activeSerie)) {
        setActiveSerie(seriesArray[0]);
      }

    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  // --- AÇÕES ---

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);
    formData.append("gradeLevel", activeSerie); // Salva na série ativa da direita

    try {
      await api.post("/api/contents/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Arquivo salvo!");
      loadContents(selectedLevel);
    } catch (error) { alert("Erro no upload."); }
  };

  const handleSaveIA = async () => {
    try {
      await api.post("/api/contents", {
        name: `IA: ${iaPrompt.substring(0, 20)}...`,
        content: iaResponse,
        type: "text",
        gradeLevel: activeSerie
      });
      alert("Salvo!");
      setShowIAModal(false);
      loadContents(selectedLevel);
    } catch (error) { alert("Erro ao salvar."); }
  };

  const handleGenerateIA = async () => {
    if(!iaPrompt.trim()) return;
    setIaLoading(true);
    try {
        const res = await api.post("/api/ia/gerar", { prompt: iaPrompt });
        // Formata quebras de linha para HTML
        setIaResponse(res.data.resposta.split('\n').map(p => `<p>${p}</p>`).join(''));
    } catch(e) { alert("Erro IA"); }
    setIaLoading(false);
  };

  const handleDelete = async (id) => {
    if(!confirm("Apagar este material?")) return;
    try { await api.delete(`/api/contents/${id}`); loadContents(selectedLevel); } catch(e){}
  };
  
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try { 
        await api.put(`/api/contents/${editingItem.id}`, { 
            name: editTitle, 
            ...(editingItem.type === 'text' && { content: editBody }) 
        }); 
        alert("Atualizado!"); 
        setEditingItem(null); 
        loadContents(selectedLevel); 
    } catch (error) { alert("Erro."); }
  };

  // Helper para URL do PDF (Google Viewer)
  const getPdfViewerUrl = (url) => {
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  };

  // Helper para abrir PDF em nova aba
  const openPdfInNewTab = (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="main-container">
      {/* Header Global */}
      <header className="top-bar">
        <div className="logo"><img src="/src/assets/logo.png" className="logo-image" /><span className="logo-text"><span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span></span></div>
        <div className="header-actions"><span className="material-symbols-rounded icon-btn">notifications</span><span className="material-symbols-rounded icon-btn">account_circle</span><span className="user-role">Professor ▼</span></div>
      </header>

      <div className="content-wrapper">
        <aside className="sidebar">
          <nav className="nav-menu">
            <a href="/dashboardP" className="nav-item"><span className="material-symbols-rounded">home</span> Início</a>
            <a href="/turmasP" className="nav-item"><span className="material-symbols-rounded">groups</span> Turmas</a>
            <a href="/conteudoP" className="nav-item active"><span className="material-symbols-rounded">menu_book</span> Conteúdo</a>
            <a href="/forumP" className="nav-item"><span className="material-symbols-rounded">forum</span> Fórum</a>
            <a href="/configuracoesP" className="nav-item"><span className="material-symbols-rounded">settings</span> Configurações</a>
          </nav>
        </aside>

        <main className="conteudo-content">
          {/* TELA 1: SELEÇÃO DE NÍVEL */}
          {viewMode === "years" && (
            <div className="years-view">
              <h1>Gestão de Conteúdos</h1>
              <p>Selecione o nível escolar para organizar seus materiais:</p>
              <div className="years-grid">
                {levelList.map((level) => (
                  <div key={level} className="year-card" onClick={() => handleSelectLevel(level)}>
                    <span className="material-symbols-rounded year-icon">school</span>
                    <h3>{level}</h3>
                    <span>Acessar Séries →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TELA 2: MASTER-DETAIL (Séries e Materiais) */}
          {viewMode === "details" && (
            <div className="details-view">
              <div className="details-header">
                <button className="btn-back-link" onClick={() => setViewMode("years")}>
                  <span className="material-symbols-rounded">arrow_back</span> Voltar
                </button>
                <h2>{selectedLevel}</h2>
              </div>

              <div className="content-split">
                
                {/* ESQUERDA: Menu de Séries */}
                <div className="left-selector-column">
                    <h3 className="column-title">Séries Disponíveis</h3>
                    <div className="series-list-selector">
                        {Object.keys(seriesData).map((serieName) => {
                            const plan = seriesData[serieName].plan;
                            const isActive = activeSerie === serieName;
                            return (
                                <div key={serieName} className={`serie-selector-card ${isActive ? 'active' : ''}`} onClick={() => setActiveSerie(serieName)}>
                                    <div className="selector-info">
                                        <h4>{serieName}</h4>
                                        {plan ? <div className="plan-badge-row"><span className="material-symbols-rounded">verified</span><span>Plano Disponível</span></div> : <span className="no-plan">Sem plano escolar</span>}
                                    </div>
                                    {plan && (
                                        <button className="btn-view-plan-icon" title="Ver Plano" onClick={(e) => { e.stopPropagation(); setViewingItem({ ...plan, type: 'pdf', url: plan.url || null }); }}>
                                            <span className="material-symbols-rounded">menu_book</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* DIREITA: Área de Trabalho (Materiais) */}
                <div className="right-workspace-column">
                    {activeSerie && seriesData[activeSerie] ? (
                        <div className="teacher-workspace">
                            <div className="workspace-header">
                                <div className="workspace-title">
                                    <span className="material-symbols-rounded">folder_open</span>
                                    <h3>Materiais: {activeSerie}</h3>
                                </div>
                                <div className="workspace-actions">
                                    <button className="btn-ai-pill" onClick={() => { setIaPrompt(""); setIaResponse(""); setShowIAModal(true); }}>
                                        <span className="material-symbols-rounded">auto_awesome</span> Criar com IA
                                    </button>
                                    <label className="btn-pdf-pill">
                                        <span className="material-symbols-rounded">upload_file</span> Upload PDF
                                        <input type="file" hidden onChange={handleUpload} accept="application/pdf" />
                                    </label>
                                </div>
                            </div>

                            <div className="workspace-body">
                                {seriesData[activeSerie].contents.length === 0 ? (
                                    <div className="empty-state-workspace">
                                        <span className="material-symbols-rounded">post_add</span>
                                        <p>Nenhum material adicionado para o {activeSerie}.</p>
                                    </div>
                                ) : (
                                    <div className="my-contents-list">
                                        {seriesData[activeSerie].contents.map(item => (
                                            <div key={item.id} className="my-content-card">
                                                <div className={`file-icon ${item.url ? 'pdf' : 'text'}`}>
                                                    <span className="material-symbols-rounded">{item.url ? 'picture_as_pdf' : 'article'}</span>
                                                </div>
                                                <div className="file-info">
                                                    <strong>{item.name}</strong>
                                                    <span>{item.type === 'text' ? 'Conteúdo IA' : 'Arquivo PDF'}</span>
                                                </div>
                                                <div className="card-actions">
                                                    {/* Botão VISUALIZAR */}
                                                    <button className="btn-icon-small view" onClick={() => setViewingItem(item)} title="Visualizar">
                                                        <span className="material-symbols-rounded">visibility</span>
                                                    </button>
                                                    
                                                    {/* Botão EDITAR (Só texto) */}
                                                    {item.type === 'text' && (
                                                        <button className="btn-icon-small edit" onClick={() => { setEditingItem(item); setEditTitle(item.name); setEditBody(item.content); }} title="Editar">
                                                            <span className="material-symbols-rounded">edit</span>
                                                        </button>
                                                    )}
                                                    
                                                    {/* Botão APAGAR */}
                                                    <button className="btn-icon-small delete" onClick={() => handleDelete(item.id)} title="Apagar">
                                                        <span className="material-symbols-rounded">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p style={{padding:'20px'}}>Selecione uma série ao lado para ver os materiais.</p>
                    )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* --- MODAL IA --- */}
      {showIAModal && (
        <div className="modal-overlay">
          <div className="modal-box large">
            <div className="modal-header"><h3>Criar para {activeSerie}</h3><button onClick={() => setShowIAModal(false)} className="close-btn">✕</button></div>
            <div className="modal-body">
                {!iaResponse ? (
                    <><textarea className="prompt-area" placeholder="O que você precisa?" value={iaPrompt} onChange={(e) => setIaPrompt(e.target.value)}></textarea>{iaLoading && <div className="loading-ai">Gerando...</div>}</>
                ) : (
                    <ReactQuill theme="snow" value={iaResponse} onChange={setIaResponse} modules={modules} className="custom-quill" />
                )}
            </div>
            <div className="modal-footer">{iaResponse ? <button className="btn-save-ai" onClick={handleSaveIA}>Salvar</button> : <button className="btn-generate" onClick={handleGenerateIA}>Gerar</button>}</div>
          </div>
        </div>
      )}

      {/* --- MODAL VISUALIZAÇÃO (LAYOUT CORRIGIDO) --- */}
      {viewingItem && (
        <div className="modal-overlay">
          <div className="modal-box x-large">
            
            {/* CABEÇALHO COM O BOTÃO DE NOVA ABA */}
            <div className="modal-header">
                <h3 style={{flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{viewingItem.name}</h3>
                
                <div className="header-controls">
                    {/* Se for PDF ou Arquivo (não texto IA), mostra o botão de abrir fora */}
                    {viewingItem.type !== 'text' && (
                        <button 
                            className="btn-open-external-header" 
                            onClick={() => openPdfInNewTab(viewingItem.url)}
                            title="Abrir PDF em Nova Aba"
                        >
                            <span className="material-symbols-rounded">open_in_new</span>
                            Abrir em Nova Aba
                        </button>
                    )}
                    
                    <button onClick={() => setViewingItem(null)} className="close-btn">✕</button>
                </div>
            </div>

            {/* CORPO (OCUPA 100% DO ESPAÇO RESTANTE) */}
            <div className="modal-body view-mode">
                {viewingItem.type === 'text' ? (
                    <div className="text-content" dangerouslySetInnerHTML={{ __html: viewingItem.content }} />
                ) : (
                    // IFRAME PURO OCUPANDO TUDO
                    <iframe 
                        src={getPdfViewerUrl(viewingItem.url)} 
                        className="pdf-frame-full" 
                        title="Visualizador"
                    ></iframe>
                )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL EDIÇÃO --- */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-box large">
            <div className="modal-header"><h3>Editar</h3><button onClick={() => setEditingItem(null)} className="close-btn">✕</button></div>
            <div className="modal-body">
                <label className="label-edit">Título</label>
                <input type="text" className="input-edit" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                {editingItem.type === 'text' && <ReactQuill theme="snow" value={editBody} onChange={setEditBody} modules={modules} className="custom-quill" />}
            </div>
            <div className="modal-footer"><button className="btn-save-edit" onClick={handleSaveEdit}>Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}