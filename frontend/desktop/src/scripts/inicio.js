import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

console.log('[inicio.js] Carregando...');
initLayout();

let actionToConfirm = null;

document.addEventListener('componentsLoaded', () => {
  // --- Seletores ---
  const kpiAlunos = document.getElementById('kpi-alunos');
  const kpiProfessores = document.getElementById('kpi-professores');
  const kpiTurmas = document.getElementById('kpi-turmas');
  const leaderboardTableBody = document.getElementById('leaderboardTableBody');
  const newsListContainer = document.getElementById('newsListContainer');
  
  // Modal Notícia (Campos Novos)
  const modalNoticia = document.getElementById('modalNoticia');
  const openModalNoticiaBtn = document.getElementById('openModalNoticiaBtn');
  const closeModalNoticiaBtn = document.getElementById('closeModalNoticiaBtn');
  const formNoticia = document.getElementById('formNoticia');
  
  const newsTitle = document.getElementById('newsTitle');
  const newsType = document.getElementById('newsType'); // Novo
  const newsDate = document.getElementById('newsDate'); // Novo
  const newsTime = document.getElementById('newsTime'); // Novo
  const newsContent = document.getElementById('newsContent');

  // Modais Genéricos
  const modalStatus = document.getElementById('modalStatus');
  const statusTitle = document.getElementById('statusModalTitle');
  const statusMsg = document.getElementById('statusModalMessage');
  const closeStatusBtn = document.getElementById('closeStatusModalBtn');
  const okStatusBtn = document.getElementById('okStatusModalBtn');
  const modalConfirmacao = document.getElementById('modalConfirmacao');
  const confirmacaoMessage = document.getElementById('confirmacaoMessage');
  const closeConfirmacaoBtn = document.getElementById('closeConfirmacaoModalBtn');
  const cancelarConfirmacaoBtn = document.getElementById('cancelarConfirmacaoBtn');
  const confirmarAcaoBtn = document.getElementById('confirmarAcaoBtn');

  if (!modalNoticia || !modalStatus) return;

  // --- Helpers ---
  const showStatus = (title, msg) => {
    statusTitle.textContent = title;
    statusMsg.textContent = msg;
    modalStatus.style.display = 'flex';
  };
  const closeStatus = () => modalStatus.style.display = 'none';
  const showConfirm = (msg, cb) => {
    confirmacaoMessage.textContent = msg;
    actionToConfirm = cb;
    modalConfirmacao.style.display = 'flex';
  };
  const closeConfirm = () => {
    modalConfirmacao.style.display = 'none';
    actionToConfirm = null;
  };

  // --- Carregamento ---
  const loadStats = async () => {
    try {
      const stats = await api.get('/api/dashboard/stats');
      kpiAlunos.textContent = stats.studentCount;
      kpiProfessores.textContent = stats.teacherCount;
      kpiTurmas.textContent = stats.classCount;
    } catch (e) { kpiAlunos.textContent = '-'; }
  };

  const loadLeaderboard = async () => {
    leaderboardTableBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    try {
      const ranking = await api.get('/api/dashboard/leaderboard');
      leaderboardTableBody.innerHTML = ''; 
      if (!ranking || ranking.length === 0) {
        leaderboardTableBody.innerHTML = '<tr><td colspan="4">Nenhum aluno pontuou.</td></tr>'; return;
      }
      ranking.forEach((a, i) => {
        let medal = `${i + 1}º`;
        if (i===0) medal='🥇'; if (i===1) medal='🥈'; if (i===2) medal='🥉';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align:center; font-weight:bold;">${medal}</td>
          <td><b>${a.displayName}</b><br><span style="font-size:11px;color:#777;">${a.username}</span></td>
          <td>${a.className}</td>
          <td style="color:#007BFF; font-weight:bold;">${a.points}</td>
        `;
        leaderboardTableBody.appendChild(tr);
      });
    } catch (e) { leaderboardTableBody.innerHTML = `<tr><td colspan="4" style="color:red;">${e.message}</td></tr>`; }
  };

  const loadNews = async () => {
    newsListContainer.innerHTML = '<li>Carregando...</li>';
    try {
      const news = await api.get('/api/news');
      newsListContainer.innerHTML = '';
      if (!news || news.length === 0) {
        newsListContainer.innerHTML = '<li>Nenhum aviso publicado.</li>'; return;
      }
      
      news.forEach(item => {
        const li = document.createElement('li');
        li.className = 'news-feed-item';
        
        // Formata Data e Hora
        let dataFormatada = '';
        if (item.eventDate) {
            const [y, m, d] = item.eventDate.split('-');
            dataFormatada = `${d}/${m}/${y}`;
        }
        if (item.eventTime) {
            dataFormatada += ` às ${item.eventTime}`;
        }
        
        // Ícone e Cor baseados no Tipo
        const isEvent = item.type === 'event';
        const icon = isEvent ? '📅' : '📢';
        const typeLabel = isEvent ? 'Evento' : 'Aviso';
        const color = isEvent ? '#E65100' : '#1154D9'; // Laranja para evento, Azul para aviso

        li.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:start;">
             <h4 style="color:${color}; margin:0;">${icon} ${item.title}</h4>
             <span style="font-size:11px; background:#eee; padding:2px 6px; borderRadius:4px;">${typeLabel}</span>
          </div>
          <p>${item.content}</p>
          <div class="meta">
            <span class="date">Data: ${dataFormatada}</span>
            <button class="delete-news-btn material-symbols-rounded" data-id="${item.id}" title="Apagar">delete</button>
          </div>
        `;
        newsListContainer.appendChild(li);
      });
    } catch (e) { newsListContainer.innerHTML = '<li>Erro ao carregar.</li>'; }
  };

  // --- Submit Notícia ---
  const handleNewsSubmit = async (e) => {
    e.preventDefault();
    
    const dados = {
      title: newsTitle.value,
      content: newsContent.value,
      type: newsType.value, // 'event' ou 'notice'
      date: newsDate.value,
      time: newsTime.value
    };

    showStatus('Publicando...', 'Enviando dados...');

    try {
      await api.post('/api/news', dados);
      closeStatus();
      formNoticia.reset();
      // Reseta data para hoje por conveniência
      newsDate.valueAsDate = new Date();
      
      document.getElementById('modalNoticia').style.display = 'none';
      await loadNews();
    } catch (error) {
      showStatus('Erro', error.message);
    }
  };

  const handleNewsDelete = async (e) => {
    if (!e.target.classList.contains('delete-news-btn')) return;
    const id = e.target.dataset.id;
    showConfirm('Apagar este aviso?', async () => {
      try {
        await api.delete(`/api/news/${id}`);
        await loadNews();
        closeConfirm();
      } catch (error) { showStatus('Erro', error.message); }
    });
  };

  // --- Listeners ---
  openModalNoticiaBtn.addEventListener('click', () => {
      formNoticia.reset();
      // Preenche data de hoje automaticamente
      newsDate.valueAsDate = new Date();
      document.getElementById('modalNoticia').style.display = 'flex';
  });
  closeModalNoticiaBtn.addEventListener('click', () => document.getElementById('modalNoticia').style.display = 'none');
  formNoticia.addEventListener('submit', handleNewsSubmit);
  newsListContainer.addEventListener('click', handleNewsDelete);

  // Listeners Modais
  closeStatusBtn.addEventListener('click', closeStatus);
  okStatusBtn.addEventListener('click', closeStatus);
  closeConfirmacaoBtn.addEventListener('click', closeConfirm);
  cancelarConfirmacaoBtn.addEventListener('click', closeConfirm);
  confirmarAcaoBtn.addEventListener('click', () => { if(actionToConfirm) actionToConfirm(); });

  // Init
  loadStats();
  loadLeaderboard();
  loadNews();
});