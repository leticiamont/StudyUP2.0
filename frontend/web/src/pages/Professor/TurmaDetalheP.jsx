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
  
  const [openMenuId, setOpenMenuId] = useState(null);

  // --- NOVOS ESTADOS PARA O MODAL ---
  const [modalOpen, setModalOpen] = useState(false);
  const [alunoToReset, setAlunoToReset] = useState(null);
  const [resetStage, setResetStage] = useState('confirm'); // 'confirm' | 'success' | 'error'

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
        // Lógica de Conteúdos (MANTIDA)
        let serieBusca = turma.gradeLevel; 
        const match = turma.name.match(/(\d+º?\s?(Ano|Série|Serie))/i);
        if (match) serieBusca = match[0];

        const allContents = await api.get(`/api/contents`); 
        
        const contents = allContents.data.filter(c => 
            c.classId === id || 
            c.gradeLevel === serieBusca ||
            c.gradeLevel === turma.gradeLevel
        );
        
        const processedContents = contents.map(c => ({
            ...c,
            originType: c.classId === id ? 'Exclusivo' : 'Geral da Série'
        }));

        setListaDados(processedContents); 
      }
    } catch (error) {
      console.error("Erro ao buscar lista:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÕES DO MODAL DE RESET ---
  
  const openResetModal = (aluno) => {
    setOpenMenuId(null); // Fecha menu
    setAlunoToReset(aluno);
    setResetStage('confirm'); // Reseta para o estágio de pergunta
    setModalOpen(true);
  };

  const closeResetModal = () => {
    setModalOpen(false);
    setAlunoToReset(null);
  };

  const confirmReset = async () => {
    if (!alunoToReset) return;
    try {
      await api.post(`/api/users/${alunoToReset.id}/reset-password`);
      setResetStage('success'); // Muda para sucesso
    } catch (error) {
      console.error(error);
      setResetStage('error'); // Muda para erro
    }
  };

  // Funções originais mantidas
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

  const openPdf = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!turma) return <div className="loading-screen">Carregando...</div>;

  return (
    <div className="main-container" onClick={() => setOpenMenuId(null)}>
      <header className="top-bar">
        <div className="logo"><img src="/src/assets/logo.png" className="logo-image" /><span className="logo-text"><span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span></span></div>
        <div className="header-actions"><span className="material-symbols-rounded icon-btn">account_circle</span><span className="user-role">Professor ▼</span></div>
      </header>

      <div className="content-wrapper">
        <aside className="sidebar">
          <nav className="nav-menu">
            <a href="#" onClick={() => navigate('/dashboardP')} className="nav-item"><span className="material-symbols-rounded">home</span> Início</a>
            <a href="#" onClick={() => navigate('/turmasP')} className="nav-item active"><span className="material-symbols-rounded">groups</span> Turmas</a>
            <a href="#" onClick={() => navigate('/conteudoP')} className="nav-item"><span className="material-symbols-rounded">menu_book</span> Conteúdo</a>
            <a href="#" onClick={() => navigate('/forumP')} className="nav-item"><span className="material-symbols-rounded">forum</span> Fórum</a>
           
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
                    <tbody>
                      {listaDados.map(aluno => (
                        <tr key={aluno.id}>
                          <td><div className="user-info-cell"><div className="avatar-initial">{aluno.displayName?.charAt(0).toUpperCase()}</div>{aluno.displayName}</div></td>
                          <td>{aluno.email}</td>
                          <td style={{position: 'relative'}}>
                            <button 
                              className="icon-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === aluno.id ? null : aluno.id);
                              }}
                            >
                              <span className="material-symbols-rounded">more_vert</span>
                            </button>
                            
                            {openMenuId === aluno.id && (
                              <div className="dropdown-menu-web">
                                {/* BOTÃO CHAMA O MODAL AGORA */}
                                <button onClick={() => openResetModal(aluno)}>
                                  <span className="material-symbols-rounded">lock_reset</span> Redefinir Senha
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
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
                            <button className="action-link" onClick={() => item.url ? openPdf(item.url) : alert("Texto (IA)")} title="Ver">
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

      {/* --- MODAL DE CONFIRMAÇÃO (CSS JÁ ESTÁ NO ARQUIVO) --- */}
      {modalOpen && (
        <div className="modal-overlay-web">
          <div className="modal-content-web">
            
            {/* ESTÁGIO 1: CONFIRMAR */}
            {resetStage === 'confirm' && (
              <>
                <h3 className="modal-title-web">Redefinir Senha</h3>
                <p className="modal-text-web">
                  Tem certeza que deseja resetar a senha de <strong>{alunoToReset?.displayName}</strong>?
                </p>
                <p className="modal-warning-web">
                  ⚠️ A senha voltará a ser o padrão: <strong>studyup123</strong>
                </p>
                <div className="modal-actions-web">
                  <button className="btn-cancel-web" onClick={closeResetModal}>Cancelar</button>
                  <button className="btn-confirm-web" onClick={confirmReset}>Sim, Resetar</button>
                </div>
              </>
            )}

            {/* ESTÁGIO 2: SUCESSO */}
            {resetStage === 'success' && (
              <>
                <div className="modal-icon-success">✅</div>
                <h3 className="modal-title-web">Senha Redefinida!</h3>
                <p className="modal-text-web">A senha do aluno agora é:</p>
                <div className="password-display-web">studyup123</div>
                <p className="modal-info-web">Avise o aluno para trocá-la no próximo login.</p>
                <div className="modal-actions-web">
                  <button className="btn-primary-web" onClick={closeResetModal}>Fechar</button>
                </div>
              </>
            )}

            {/* ESTÁGIO 3: ERRO */}
            {resetStage === 'error' && (
              <>
                <div className="modal-icon-error">❌</div>
                <h3 className="modal-title-web">Erro</h3>
                <p className="modal-text-web">Não foi possível redefinir a senha.</p>
                <div className="modal-actions-web">
                  <button className="btn-cancel-web" onClick={closeResetModal}>Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}