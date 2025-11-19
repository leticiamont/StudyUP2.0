import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

console.log('[inicio.js] Carregando... Chamando initLayout().');
initLayout();

document.addEventListener('componentsLoaded', () => {
  console.log('[inicio.js] "componentsLoaded" recebido.');

  // --- 1. Seleção (KPIs e Leaderboard) ---
  const kpiAlunos = document.getElementById('kpi-alunos');
  const kpiProfessores = document.getElementById('kpi-professores');
  const kpiTurmas = document.getElementById('kpi-turmas');
  const leaderboardTableBody = document.getElementById('leaderboardTableBody');

  // --- 2. Seleção (Mural de Notícias) ---
  const newsListContainer = document.getElementById('newsListContainer');
  
  // --- 3. Seleção (NOVO MODAL DE NOTÍCIA) ---
  const modalNoticia = document.getElementById('modalNoticia');
  const openModalNoticiaBtn = document.getElementById('openModalNoticiaBtn');
  const closeModalNoticiaBtn = document.getElementById('closeModalNoticiaBtn');
  const formNoticia = document.getElementById('formNoticia');
  const newsTitle = document.getElementById('newsTitle');
  const newsContent = document.getElementById('newsContent');
  const newsImageUrl = document.getElementById('newsImageUrl');


  // --- 4. Função: Buscar KPIs ---
  const loadStats = async () => {
    // ... (Esta função está correta, sem mudanças) ...
    try {
      const stats = await api.get('/api/dashboard/stats');
      kpiAlunos.textContent = stats.studentCount;
      kpiProfessores.textContent = stats.teacherCount;
      kpiTurmas.textContent = stats.classCount;
    } catch (error) { kpiAlunos.textContent = 'Erro'; }
  };

  // --- 5. Função: Buscar Leaderboard ---
  const loadLeaderboard = async () => {
    // ... (Esta função está correta, sem mudanças) ...
    leaderboardTableBody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
    try {
      const ranking = await api.get('/api/dashboard/leaderboard');
      leaderboardTableBody.innerHTML = ''; 
      if (!ranking || ranking.length === 0) {
        leaderboardTableBody.innerHTML = '<tr><td colspan="3">Nenhum aluno com pontuação.</td></tr>';
        return;
      }
      ranking.forEach((aluno, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${index + 1}º</td>
          <td>${aluno.displayName}</td>
          <td>${aluno.points}</td>
        `;
        leaderboardTableBody.appendChild(tr);
      });
    } catch (error) {
      leaderboardTableBody.innerHTML = `<tr><td colspan="3" style="color: red;">Erro: ${error.message}</td></tr>`;
    }
  };

  // --- 6. Funções: Mural de Notícias ---
  
  const loadNews = async () => {
    // ... (Esta função está correta, sem mudanças) ...
    newsListContainer.innerHTML = '<li>Carregando notícias...</li>';
    try {
      const news = await api.get('/api/news');
      newsListContainer.innerHTML = '';
      if (!news || news.length === 0) {
        newsListContainer.innerHTML = '<li>Nenhuma notícia publicada.</li>';
        return;
      }
      news.forEach(item => {
        const li = document.createElement('li');
        li.className = 'news-feed-item';
        const dataFormatada = new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const imagemHtml = item.imageUrl ? `<img src="${item.imageUrl}" alt="Banner" style="width: 100%; border-radius: 4px; margin-bottom: 8px;">` : '';
        li.innerHTML = `
          ${imagemHtml}
          <h4>${item.title}</h4>
          <p>${item.content}</p>
          <div class="meta">
            <span class="date">Em: ${dataFormatada}</span>
            <button class="delete-news-btn material-symbols-rounded" data-id="${item.id}" title="Apagar notícia">delete</button>
          </div>
        `;
        newsListContainer.appendChild(li);
      });
    } catch (error) { newsListContainer.innerHTML = '<li>Erro ao carregar notícias.</li>'; }
  };

  const handleNewsSubmit = async (e) => {
    // ... (Esta função está quase correta, só precisa fechar o modal) ...
    e.preventDefault();
    const dadosNoticia = {
      title: newsTitle.value,
      content: newsContent.value,
      imageUrl: newsImageUrl.value || null
    };
    try {
      await api.post('/api/news', dadosNoticia);
      formNoticia.reset();
      closeModalNoticia(); // <-- ADICIONA ESTA LINHA
      await loadNews();
    } catch (error) {
      alert('Erro ao publicar notícia: ' + error.message);
    }
  };

  const handleNewsDelete = async (e) => {
    // ... (Esta função está correta, sem mudanças) ...
    if (!e.target.classList.contains('delete-news-btn')) return;
    const newsId = e.target.getAttribute('data-id');
    if (!confirm('Tem certeza que quer apagar esta notícia?')) return;
    try {
      await api.delete(`/api/news/${newsId}`);
      await loadNews();
    } catch (error) {
      alert('Erro ao apagar notícia: ' + error.message);
    }
  };

  // --- 7. Funções e Listeners (NOVO MODAL DE NOTÍCIA) ---
  const openModalNoticia = () => {
    modalNoticia.style.display = 'flex';
  };
  const closeModalNoticia = () => {
    modalNoticia.style.display = 'none';
    formNoticia.reset();
  };

  // Listeners do Modal
  openModalNoticiaBtn.addEventListener('click', openModalNoticia);
  closeModalNoticiaBtn.addEventListener('click', closeModalNoticia);

  // --- 8. Inicialização e Listeners (Antigos) ---
  formNoticia.addEventListener('submit', handleNewsSubmit);
  newsListContainer.addEventListener('click', handleNewsDelete);

  loadStats();
  loadLeaderboard();
  loadNews();
});