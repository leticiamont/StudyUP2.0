// Importa o 'api' service (nosso wrapper do Axios)
// O api.js deve estar exportando 'api' como default e ser type="module"
import api from '../services/api.js';

/**
 * Ponto de entrada do script da página de turmas.
 * SÓ EXECUTA QUANDO O 'componentsLoaded' (disparado pelo componentLoader) é ouvido.
 */
document.addEventListener('componentsLoaded', () => {
  console.log('[turmas.js] Componentes carregados. Iniciando script da página.');

  // --- 1. Seleção de Elementos do DOM ---
  // (Agora é seguro selecionar, pois o DOM (incluindo menu/topbar) está pronto)
  const tabelaBody = document.getElementById('tabelaTurmasBody');
  const openModalBtn = document.getElementById('openModalBtn');
  const modal = document.getElementById('modal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const formTurma = document.getElementById('formTurma');

  // Verificação de segurança (boa prática)
  if (!tabelaBody || !openModalBtn || !modal || !closeModalBtn || !formTurma) {
    console.error('[turmas.js] Erro crítico: Elementos essenciais do DOM (modal, tabela ou form) não encontrados.');
    return;
  }

  // --- 2. Funções Principais ---

  /**
   * @description Busca as turmas na API (backend) e popula a tabela.
   */
  const loadTurmas = async () => {
    try {
      // Limpa a tabela antes de carregar (previne duplicatas)
      tabelaBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';

      // Chama o endpoint GET /api/classes (baseURL: http://localhost:3000)
      const response = await api.get('/api/classes');
      const turmas = response.data;

      // Limpa o "Carregando..."
      tabelaBody.innerHTML = '';

      if (turmas.length === 0) {
        tabelaBody.innerHTML = '<tr><td colspan="5">Nenhuma turma cadastrada.</td></tr>';
        return;
      }

      // Popula a tabela
      turmas.forEach(turma => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${turma.name || 'N/A'}</td>
          <td>${turma.grade || 'N/A'}</td>
          <td>${turma.teacher || 'N/A'}</td>
          <td>${turma.schedule || 'N/A'}</td>
          <td>
            <button class="btn btn-secondary btn-sm" data-id="${turma.id}">Editar</button>
          </td>
        `;
        tabelaBody.appendChild(tr);
      });

    } catch (error) {
      console.error('[turmas.js:loadTurmas] Erro ao buscar turmas:', error);
      tabelaBody.innerHTML = `<tr><td colspan="5" style="color: red;">Erro ao carregar turmas. Verifique o console.</td></tr>`;
    }
  };

  /**
   * @description Manipula o envio do formulário de nova turma.
   */
  const handleFormSubmit = async (event) => {
    event.preventDefault(); // Impede o recarregamento da página

    // Coleta dados do formulário
    const formData = new FormData(formTurma);
    const dadosTurma = {
      name: formData.get('name'),
      grade: formData.get('grade'),
      teacher: formData.get('teacher'),
      schedule: formData.get('schedule'),
      planId: formData.get('planId') || null, // Garante null se vazio
    };

    try {
      // Chama o endpoint POST /api/classes
      await api.post('/api/classes', dadosTurma);

      // Sucesso!
      alert('Turma criada com sucesso!');
      closeModal(); // Fecha o modal
      formTurma.reset(); // Limpa o formulário
      await loadTurmas(); // Recarrega a lista de turmas

    } catch (error) {
      console.error('[turmas.js:handleFormSubmit] Erro ao criar turma:', error);
      alert(`Erro ao salvar turma: ${error.response?.data?.error || error.message}`);
    }
  };

  // --- 3. Funções do Modal ---
  const openModal = () => modal.style.display = 'flex';
  const closeModal = () => modal.style.display = 'none';

  // --- 4. Event Listeners ---
  openModalBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  formTurma.addEventListener('submit', handleFormSubmit);

  // Fecha o modal se clicar fora da área de conteúdo
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // --- 5. Inicialização ---
  // Carrega as turmas assim que o script é inicializado (após 'componentsLoaded')
  loadTurmas();
});