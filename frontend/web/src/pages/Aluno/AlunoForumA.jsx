import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import api from "../../services/api";
import "./AlunoForumA.css";

export default function AlunoForumA() {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [user, setUser] = useState({ displayName: "Aluno", classId: null, uid: null });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- ESTADOS DO MODAL DE COMENTÁRIOS ---
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Modal de Criação de Post
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostText, setNewPostText] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("userData") || "{}");
    if (storedUser.uid) {
        setUser(prev => ({ ...prev, ...storedUser }));
        fetchPosts(storedUser.classId, storedUser.uid);
    }
  }, []);

  // 1. Busca os Posts da Turma
  const fetchPosts = useCallback(async (classId, userId) => {
    if (!classId) { setLoading(false); return; }
    if (!refreshing) setLoading(true);

    try {
      const endpoint = `/api/forum/posts?turmaId=${classId}`;
      const response = await api.get(endpoint);
      
      const processedPosts = response.data.map(p => ({
        ...p,
        userHasLiked: p.likedBy?.includes(userId) || false
      }));

      setPosts(processedPosts);
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // 2. Abre o Modal e Busca os Comentários
  const handleOpenPostDetails = async (post) => {
    setSelectedPost(post);
    setLoadingComments(true);
    setNewCommentText("");

    try {
      // Busca comentários (aqui é onde a falha de índice/dados acontece)
      const res = await api.get(`/api/forum/posts/${post.id}/comments`);
      setComments(res.data);
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  // 3. Enviar Comentário
  const handleSendComment = async () => {
    if (!newCommentText.trim() || !selectedPost) return;

    try {
      await api.post(`/api/forum/posts/${selectedPost.id}/comments`, { text: newCommentText });
      setNewCommentText("");
      
      // Recarrega comentários e atualiza o contador do post
      const res = await api.get(`/api/forum/posts/${selectedPost.id}/comments`);
      setComments(res.data);
      fetchPosts(user.classId, user.uid); 
    } catch (error) {
      alert("Falha ao publicar resposta.");
    }
  };

  const handleCreatePost = async () => {
    if (!user.classId) return alert("Você não está vinculado a uma turma.");
    if (!newPostText.trim()) return alert("Escreva a sua dúvida.");

    try {
      await api.post("/api/forum/posts", { text: newPostText, turmaId: user.classId });
      setNewPostText("");
      setShowCreateModal(false);
      fetchPosts(user.classId, user.uid);
    } catch (error) {
      alert("Erro ao publicar a dúvida.");
    }
  };
  
  const handleLike = async (postId) => {
    try {
      await api.post(`/api/forum/posts/${postId}/like`);
      setPosts(current => current.map(p => {
        if (p.id === postId) {
          const liked = p.likedBy?.includes(user.uid);
          const newLikedBy = liked 
            ? p.likedBy.filter(id => id !== user.uid)
            : [...(p.likedBy || []), user.uid];
          return { ...p, likedBy: newLikedBy, userHasLiked: !liked };
        }
        return p;
      }));
    } catch (error) { console.error("Erro like:", error); }
  };

  const navigateTo = (path) => navigate(path);

  return (
    <div className="student-container">
      {/* SIDEBAR */}
      <aside className="student-sidebar">
        <div className="sidebar-logo"><span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span></div>
        <nav className="student-nav">
            <div onClick={() => navigateTo('/dashboardA')} className="s-nav-item"><span className="material-symbols-rounded">home</span> Início</div>
            <div onClick={() => navigateTo('/aluno/conteudo')} className="s-nav-item"><span className="material-symbols-rounded">book</span> Aulas</div>
            <div onClick={() => navigateTo('/aluno/ide')} className="s-nav-item"><span className="material-symbols-rounded">terminal</span> IDE Python</div>
            <div onClick={() => navigateTo('/aluno/jogos')} className="s-nav-item"><span className="material-symbols-rounded">sports_esports</span> Jogos</div>
            <div onClick={() => navigateTo('/aluno/forum')} className="s-nav-item active"><span className="material-symbols-rounded">forum</span> Fórum</div>
        </nav>
      </aside>

      <main className="forum-content-aluno">
        
        <header className="forum-header">
            <h1>Fórum da Turma</h1>
            <button className="btn-new-post-aluno" onClick={() => setShowCreateModal(true)}>
                <span className="material-symbols-rounded">edit_note</span> Postar Dúvida
            </button>
        </header>

        <div className="forum-feed-aluno">
            {loading ? <p>Carregando dúvidas...</p> : posts.length === 0 ? (
                 <div className="empty-forum"><span className="material-symbols-rounded">question_mark</span><p>Nenhuma dúvida ou aviso na sua turma.</p></div>
            ) : (
                posts.map(post => (
                    <div key={post.id} className="post-card-aluno">
                        <div className="post-header-aluno">
                            <span className="material-symbols-rounded avatar-icon">account_circle</span>
                            <div className="author-info-aluno">
                                <strong>{post.authorName}</strong>
                                <span>{new Date(post.createdAt).toLocaleString('pt-BR')}</span>
                            </div>
                        </div>
                        <p className="post-text">{post.text}</p>
                        
                        <div className="post-footer-aluno">
                            <button className={`action-btn-aluno ${post.userHasLiked ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                                <span className="material-symbols-rounded">thumb_up</span>
                                {post.likedBy?.length || 0}
                            </button>
                            <button className="action-btn-aluno" onClick={() => handleOpenPostDetails(post)}>
                                <span className="material-symbols-rounded">comment</span>
                                {post.commentCount || 0} Comentários
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </main>

      {/* MODAL CRIAÇÃO DE POST (Mantido) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header"><h3>Nova Dúvida</h3><button onClick={() => setShowCreateModal(false)} className="close-btn">✕</button></div>
            <div className="modal-body">
                <p>O que você precisa de ajuda em **{user.gradeLevel}**?</p>
                <textarea className="post-textarea" placeholder="Descreva sua dúvida ou poste um aviso..." value={newPostText} onChange={e => setNewPostText(e.target.value)}></textarea>
            </div>
            <div className="modal-footer"><button className="btn-save-post" onClick={handleCreatePost}>Publicar</button></div>
          </div>
        </div>
      )}

      {/* 🚨 MODAL DE COMENTÁRIOS (FINAL) */}
      {selectedPost && (
        <div className="modal-overlay">
          <div className="modal-box large comments-modal-design">
            <div className="modal-header">
                <h3>Discussão: {selectedPost.text.substring(0, 30)}...</h3>
                <button onClick={() => setSelectedPost(null)} className="close-btn">✕</button>
            </div>
            
            <div className="modal-body post-detail-scroll">
                
                {/* 1. POST ORIGINAL (TOP SECTION) */}
                <div className="original-post-area">
                    <div className="original-post-header">
                         <span className="material-symbols-rounded avatar-icon-small">account_circle</span>
                         <div className="author-info-post">
                             <strong>{selectedPost.authorName}</strong>
                             <span className="date-post">{new Date(selectedPost.createdAt).toLocaleString('pt-BR')}</span>
                         </div>
                    </div>
                    <p className="post-text-body">{selectedPost.text}</p>
                    <hr className="divider-line" />
                </div>

                <h4 className="comment-list-title">Respostas ({comments.length})</h4>
                
                {/* 2. LISTA DE COMENTÁRIOS */}
                {loadingComments ? <p>Carregando respostas...</p> : (
                    <div className="comments-feed-list">
                        {comments.length === 0 ? <p className="no-comments-msg">Seja o primeiro a responder.</p> : (
                            comments.map(comment => {
                                const isTeacher = comment.authorName.includes('Professor');
                                
                                return (
                                    <div key={comment.id} className={`comment-item-box ${isTeacher ? 'teacher-reply' : ''}`}>
                                        <span className="material-symbols-rounded reply-icon">reply</span>
                                        <div className="comment-body-info">
                                            <strong className={isTeacher ? 'teacher-name' : ''}>{comment.authorName}</strong>
                                            <p>{comment.text}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* 3. CAIXA DE RESPOSTA FIXA */}
            <div className="reply-box-footer-modal">
                <textarea 
                    placeholder="Escreva sua resposta..."
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    className="reply-textarea"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); }}}
                />
                <button className="btn-send-comment-modal" onClick={handleSendComment}>
                    <span className="material-symbols-rounded">send</span>
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}