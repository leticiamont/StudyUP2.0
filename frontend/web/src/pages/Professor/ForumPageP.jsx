import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./ForumPageP.css";

export default function ForumPageP() {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const teacherId = userData.uid;

  // Estados de Dados
  const [turmas, setTurmas] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedTurma, setSelectedTurma] = useState(null); // null = Todas
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados de Criação de Post
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostText, setNewPostText] = useState("");

  // Estados de Detalhes do Post (Comentários)
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // 1. Carregar Turmas
  useEffect(() => {
    async function loadTurmas() {
      try {
        const res = await api.get("/api/classes");
        const myClasses = res.data.filter(c => c.teacherId === teacherId);
        setTurmas(myClasses);
      } catch (error) {
        console.error("Erro turmas:", error);
      }
    }
    loadTurmas();
  }, [teacherId]);

  // 2. Carregar Posts (Sempre que mudar a turma selecionada)
  useEffect(() => {
    fetchPosts();
  }, [selectedTurma]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let url = "/api/forum/posts";
      if (selectedTurma) {
        url += `?turmaId=${selectedTurma.id}`;
      }
      const res = await api.get(url);
      // Opcional: Filtrar localmente se o backend retornar tudo quando não tem filtro
      // Mas vamos assumir que o backend filtra se passarmos ?turmaId
      setPosts(res.data);
    } catch (error) {
      console.error("Erro posts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Ação: Criar Post
  const handleCreatePost = async () => {
    if (!selectedTurma) return alert("Selecione uma turma para postar.");
    if (!newPostText.trim()) return alert("Escreva algo.");

    try {
      await api.post("/api/forum/posts", {
        text: newPostText,
        turmaId: selectedTurma.id
      });
      setNewPostText("");
      setShowCreateModal(false);
      fetchPosts();
    } catch (error) {
      alert("Erro ao criar post.");
    }
  };

  // Ação: Curtir Post
  const handleLike = async (postId) => {
    try {
      await api.post(`/api/forum/posts/${postId}/like`);
      // Atualiza localmente para ser rápido
      setPosts(current => current.map(p => {
        if (p.id === postId) {
          const hasLiked = p.likedBy?.includes(teacherId);
          const newLikes = hasLiked 
            ? p.likedBy.filter(id => id !== teacherId)
            : [...(p.likedBy || []), teacherId];
          return { ...p, likedBy: newLikes };
        }
        return p;
      }));
    } catch (error) {
      console.error("Erro like:", error);
    }
  };

  // Ação: Abrir Post (Ver Comentários)
  const openPostDetails = async (post) => {
    setSelectedPost(post);
    setLoadingComments(true);
    try {
      const res = await api.get(`/api/forum/posts/${post.id}/comments`);
      setComments(res.data);
    } catch (error) {
      alert("Erro ao carregar comentários.");
    } finally {
      setLoadingComments(false);
    }
  };

  // Ação: Enviar Comentário
  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    try {
      await api.post(`/api/forum/posts/${selectedPost.id}/comments`, {
        text: newComment
      });
      setNewComment("");
      // Recarrega comentários
      const res = await api.get(`/api/forum/posts/${selectedPost.id}/comments`);
      setComments(res.data);
      // Atualiza contagem no feed
      fetchPosts(); 
    } catch (error) {
      alert("Erro ao comentar.");
    }
  };

  // Filtro de busca local
  const filteredPosts = posts.filter(p => 
    p.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.authorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="main-container">
      <header className="top-bar">
        <div className="logo">
          <img src="/src/assets/logo.png" alt="Logo" className="logo-image" />
          <span className="logo-text"><span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span></span>
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
            <a href="/dashboardP" className="nav-item"><span className="material-symbols-rounded">home</span> Início</a>
            <a href="/turmasP" className="nav-item"><span className="material-symbols-rounded">groups</span> Turmas</a>
            <a href="/conteudoP" className="nav-item"><span className="material-symbols-rounded">menu_book</span> Conteúdo</a>
            <a href="/forumP" className="nav-item active"><span className="material-symbols-rounded">forum</span> Fórum</a>
            <a href="/configuracoesP" className="nav-item"><span className="material-symbols-rounded">settings</span> Configurações</a>
          </nav>
        </aside>

        <main className="forum-content">
          
          {/* COLUNA ESQUERDA: FILTROS */}
          <div className="forum-sidebar">
            <h3>Filtrar por Turma</h3>
            <div className="class-list">
              <button 
                className={`class-filter-btn ${!selectedTurma ? 'active' : ''}`}
                onClick={() => setSelectedTurma(null)}
              >
                <span className="material-symbols-rounded">public</span>
                Todas as Turmas
              </button>
              {turmas.map(turma => (
                <button 
                  key={turma.id}
                  className={`class-filter-btn ${selectedTurma?.id === turma.id ? 'active' : ''}`}
                  onClick={() => setSelectedTurma(turma)}
                >
                  <span className="material-symbols-rounded">group</span>
                  {turma.name}
                </button>
              ))}
            </div>
          </div>

          {/* COLUNA DIREITA: FEED */}
          <div className="forum-feed">
            <div className="feed-header">
              <div className="search-box">
                <span className="material-symbols-rounded">search</span>
                <input 
                  type="text" placeholder="Pesquisar dúvidas..." 
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-new-post" onClick={() => setShowCreateModal(true)}>
                <span className="material-symbols-rounded">add</span> Novo Aviso
              </button>
            </div>

            <div className="posts-list">
              {loading ? <p className="loading-text">Carregando posts...</p> : 
               filteredPosts.length === 0 ? (
                 <div className="empty-feed">
                    <span className="material-symbols-rounded">chat_bubble_outline</span>
                    <p>Nenhuma dúvida ou aviso encontrado.</p>
                 </div>
               ) : (
                 filteredPosts.map(post => (
                   <div key={post.id} className="post-card">
                     <div className="post-header">
                       <div className="author-avatar">
                         <span className="material-symbols-rounded">person</span>
                       </div>
                       <div className="author-info">
                         <strong>{post.authorName}</strong>
                         <span>{new Date(post.createdAt).toLocaleString()}</span>
                       </div>
                       {/* Tag da Turma (se estiver vendo todas) */}
                       {!selectedTurma && (
                          <span className="turma-tag">
                            {turmas.find(t => t.id === post.turmaId)?.name || 'Geral'}
                          </span>
                       )}
                     </div>
                     
                     <p className="post-body">{post.text}</p>
                     
                     <div className="post-footer">
                       <button 
                         className={`action-btn ${post.likedBy?.includes(teacherId) ? 'liked' : ''}`}
                         onClick={() => handleLike(post.id)}
                       >
                         <span className="material-symbols-rounded">thumb_up</span>
                         {post.likedBy?.length || 0}
                       </button>
                       <button className="action-btn" onClick={() => openPostDetails(post)}>
                         <span className="material-symbols-rounded">comment</span>
                         {post.commentCount || 0} Comentários
                       </button>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>

        </main>
      </div>

      {/* MODAL CRIAR POST */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Novo Aviso / Dúvida</h3>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">✕</button>
            </div>
            <div className="modal-body">
              {!selectedTurma ? (
                <p className="warning-text">Selecione uma turma na barra lateral para postar.</p>
              ) : (
                <>
                  <p className="posting-to">Publicando em: <strong>{selectedTurma.name}</strong></p>
                  <textarea 
                    className="post-textarea"
                    placeholder="Escreva seu aviso aqui..."
                    value={newPostText}
                    onChange={e => setNewPostText(e.target.value)}
                  ></textarea>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-primary-web" onClick={handleCreatePost} disabled={!selectedTurma}>Publicar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES (COMENTÁRIOS) */}
      {selectedPost && (
        <div className="modal-overlay">
          <div className="modal-box large">
            <div className="modal-header">
              <h3>Discussão</h3>
              <button onClick={() => setSelectedPost(null)} className="close-btn">✕</button>
            </div>
            
            <div className="modal-body scrollable">
              {/* Post Original */}
              <div className="original-post">
                <div className="author-info">
                   <strong>{selectedPost.authorName}</strong>
                   <span>{new Date(selectedPost.createdAt).toLocaleString()}</span>
                </div>
                <p>{selectedPost.text}</p>
              </div>

              <hr className="divider"/>

              {/* Lista de Comentários */}
              <div className="comments-section">
                {loadingComments ? <p>Carregando respostas...</p> : 
                 comments.length === 0 ? <p className="no-comments">Seja o primeiro a responder.</p> : (
                   comments.map(comment => (
                     <div key={comment.id} className="comment-item">
                        <strong>{comment.authorName}</strong>
                        <p>{comment.text}</p>
                     </div>
                   ))
                 )}
              </div>
            </div>

            {/* Input de Resposta */}
            <div className="modal-footer comment-input-area">
               <input 
                 type="text" 
                 placeholder="Escreva uma resposta..." 
                 value={newComment}
                 onChange={e => setNewComment(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleSendComment()}
               />
               <button className="btn-send" onClick={handleSendComment}>
                 <span className="material-symbols-rounded">send</span>
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}