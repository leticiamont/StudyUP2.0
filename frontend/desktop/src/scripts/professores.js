import api from '../services/api.js'; // (Agora importa o api.js com o .put)
import { initLayout } from './componentLoader.js';

console.log('[professores.js] Carregando... Chamando initLayout().');
initLayout();

// Variável de Estado
let currentEditingId = null; 

document.addEventListener('componentsLoaded', () => {
  console.log('[professores.js] "componentsLoaded" recebido.');

  // --- 1. Seleção (Modal e Tabela) ---
  const tabelaProfessoresBody = document.getElementById('tabelaProfessoresBody');
  const openModalProfessorBtn = document.getElementById('openModalProfessorBtn');
  const modalProfessor = document.getElementById('modalProfessor');
  const closeModalProfessorBtn = document.getElementById('closeModalProfessorBtn');
  const formProfessor = document.getElementById('formProfessor');
  
  const modalTitle = modalProfessor.querySelector('h2');
  const modalSubmitBtn = modalProfessor.querySelector('button[type="submit"]');
  const profNameInput = document.getElementById('prof-name');
  const profEmailInput = document.getElementById('prof-email');
  const profPasswordInput = document.getElementById('prof-password');
  const profPasswordGroup = document.getElementById('prof-password-group'); // (Grupo da senha)
  
  // --- 2. Seleção (Filtros) ---
  const profSearch = document.getElementById('prof-search');
  const profFilterSort = document.getElementById('prof-filter-sort');

  // --- 3. Seleção (MODAL DE STATUS) ---
  const modalStatus = document.getElementById('modalStatus'); // (Agora existe no HTML)
  const statusModalTitle = document.getElementById('statusModalTitle');
  const statusModalMessage = document.getElementById('statusModalMessage');
  const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
  const okStatusModalBtn = document.getElementById('okStatusModalBtn');

  // Verificação de segurança
  if (!tabelaProfessoresBody || !modalProfessor || !modalStatus) {
    console.error('[professores.js] ERRO CRÍTICO: Elementos essenciais do DOM (modais, tabela) não encontrados.');
    return;
  }

  // --- 4. Funções (Modal Status) ---
  const showStatusModal = (title, message) => {
    statusModalTitle.textContent = title;
    statusModalMessage.textContent = message;
    modalStatus.style.display = 'flex';
  };
  const closeStatusModal = () => modalStatus.style.display = 'none';

  // --- 5. Funções Principais (Listagem) ---
  const loadProfessores = async () => {
    tabelaProfessoresBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    const params = new URLSearchParams({ role: 'teacher' });
    if (profSearch.value) params.append('search', profSearch.value);
    if (profFilterSort.value) params.append('sort', profFilterSort.value);
    try {
      const professores = await api.get(`/api/users?${params.toString()}`);
      tabelaProfessoresBody.innerHTML = ''; 
      if (!professores || professores.length === 0) {
        tabelaProfessoresBody.innerHTML = '<tr><td colspan="4">Nenhum professor cadastrado.</td></tr>';
        return;
      }
      professores.forEach(prof => {
        const tr = document.createElement('tr');
        const turmas = prof.classCount || 0; 
        tr.innerHTML = `
          <td>${prof.displayName || 'N/A'}</td>
          <td>${prof.email || 'N/A'}</td>
          <td>${turmas}</td>
          <td>
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${prof.id}">Editar</button>
          </td>
        `;
        tabelaProfessoresBody.appendChild(tr);
      });
    } catch (error) {
      showStatusModal('Erro ao Carregar', error.message);
      tabelaProfessoresBody.innerHTML = `<tr><td colspan="4" style="color: red;">${error.message}</td></tr>`;
    }
  };

  // --- 6. Funções Principais (Formulário: Criar e Editar) ---
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    const dadosForm = {
      displayName: profNameInput.value,
      email: profEmailInput.value,
      role: 'teacher'
    };

    try {
      if (currentEditingId) {
        // --- MODO EDIÇÃO ---
        console.log(`[professores.js] Editando professor ID: ${currentEditingId}`);
        // AGORA O api.put EXISTE!
        await api.put(`/api/users/${currentEditingId}`, dadosForm);
        showStatusModal('Sucesso!', 'Professor(a) atualizado com sucesso!');
        
      } else {
        // --- MODO CRIAÇÃO ---
        dadosForm.password = profPasswordInput.value;
        if (!dadosForm.password) {
          showStatusModal('Erro', 'Senha provisória é obrigatória para criar.');
          return;
        }
        console.log('[professores.js] Criando novo professor...');
        await api.post('/api/users', dadosForm);
        showStatusModal('Sucesso!', 'Professor(a) criado com sucesso!');
      }
      
      closeModal();
      loadProfessores();

    } catch (error) {
      console.error('[handleFormSubmit] Erro:', error);
      // Agora o showStatusModal vai funcionar e mostrar o erro
      showStatusModal('Erro ao Salvar', error.message);
    }
  };

  // --- 7. Funções do Modal (Abrir/Fechar) ---
  const openModalParaCriar = () => {
    currentEditingId = null; 
    modalTitle.textContent = 'Novo Professor';
    modalSubmitBtn.textContent = 'Salvar';
    profPasswordGroup.style.display = 'block'; // Mostra o campo de senha
    profPasswordInput.required = true; // Torna obrigatório
    formProfessor.reset();
    modalProfessor.style.display = 'flex';
  };

  const openModalParaEditar = async (id) => {
    currentEditingId = id;
    modalTitle.textContent = 'Editar Professor';
    modalSubmitBtn.textContent = 'Atualizar';
    profPasswordGroup.style.display = 'none'; // Esconde o campo de senha
    profPasswordInput.required = false; // NÃO é obrigatório (corrige o aviso amarelo)
    formProfessor.reset();
    
    try {
      const professor = await api.get(`/api/users/${id}`);
      profNameInput.value = professor.displayName || '';
      profEmailInput.value = professor.email || '';
      modalProfessor.style.display = 'flex';
    } catch (error) {
      showStatusModal('Erro', 'Erro ao buscar dados do professor: ' + error.message);
    }
  };

  const closeModal = () => {
    modalProfessor.style.display = 'none';
    formProfessor.reset();
    currentEditingId = null;
  };

  // --- 8. Listeners ---
  openModalProfessorBtn.addEventListener('click', openModalParaCriar);
  closeModalProfessorBtn.addEventListener('click', closeModal);
  formProfessor.addEventListener('submit', handleFormSubmit);
  
  profSearch.addEventListener('input', loadProfessores);
  profFilterSort.addEventListener('change', loadProfessores);

  tabelaProfessoresBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
      const id = e.target.getAttribute('data-id');
      openModalParaEditar(id);
    }
  });

  // Listeners do Modal de Status
  closeStatusModalBtn.addEventListener('click', closeStatusModal);
  okStatusModalBtn.addEventListener('click', closeStatusModal);

  // --- 9. Inicialização ---
  loadProfessores();
});