import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

console.log('[professores.js] Carregando... Chamando initLayout().');
initLayout();

let currentEditingId = null;
let actionToConfirm = null; // Guarda a ação para executar depois do "Sim"

document.addEventListener('componentsLoaded', () => {
  // --- Seletores ---
  const tabelaBody = document.getElementById('tabelaProfessoresBody');
  const openModalBtn = document.getElementById('openModalProfessorBtn');
  const modalProfessor = document.getElementById('modalProfessor');
  const closeModalBtn = document.getElementById('closeModalProfessorBtn');
  const formProfessor = document.getElementById('formProfessor');
  const modalTitle = document.getElementById('modalTitle');
  
  const profNameInput = document.getElementById('prof-name');
  const profEmailInput = document.getElementById('prof-email');
  const profSearch = document.getElementById('prof-search');
  const profFilterSort = document.getElementById('prof-filter-sort');

  // Modal Status
  const modalStatus = document.getElementById('modalStatus');
  const statusTitle = document.getElementById('statusModalTitle');
  const statusMsg = document.getElementById('statusModalMessage');
  const closeStatusBtn = document.getElementById('closeStatusModalBtn');
  const okStatusBtn = document.getElementById('okStatusModalBtn');

  // Modal Confirmação (NOVO)
  const modalConfirmacao = document.getElementById('modalConfirmacao');
  const confirmacaoMessage = document.getElementById('confirmacaoMessage');
  const closeConfirmacaoModalBtn = document.getElementById('closeConfirmacaoModalBtn');
  const cancelarConfirmacaoBtn = document.getElementById('cancelarConfirmacaoBtn');
  const confirmarAcaoBtn = document.getElementById('confirmarAcaoBtn');

  if (!tabelaBody || !modalProfessor || !modalConfirmacao) return;

  // --- Helpers ---
  const showStatus = (title, msg) => {
    statusTitle.textContent = title;
    statusMsg.textContent = msg;
    modalStatus.style.display = 'flex';
  };
  const closeStatus = () => modalStatus.style.display = 'none';

  const showConfirm = (msg, callback) => {
    confirmacaoMessage.textContent = msg;
    actionToConfirm = callback; // Guarda o que fazer
    modalConfirmacao.style.display = 'flex';
  };
  const closeConfirm = () => {
    modalConfirmacao.style.display = 'none';
    actionToConfirm = null;
  };

  // --- Listagem ---
  const loadProfessores = async () => {
    tabelaBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    const params = new URLSearchParams({ role: 'teacher' });
    if (profSearch.value) params.append('search', profSearch.value);
    if (profFilterSort.value) params.append('sort', profFilterSort.value);

    try {
      const data = await api.get(`/api/users?${params.toString()}`);
      tabelaBody.innerHTML = '';
      
      if (!data || data.length === 0) {
        tabelaBody.innerHTML = '<tr><td colspan="5">Nenhum professor.</td></tr>';
        return;
      }

      data.forEach(prof => {
        const tr = document.createElement('tr');
        
        const isActive = prof.isActive !== false; 
        const statusLabel = isActive ? 
          '<span style="color: green; font-weight: bold;">Ativo</span>' : 
          '<span style="color: red; font-weight: bold;">Inativo</span>';
        
        const toggleBtnText = isActive ? 'Desativar' : 'Ativar';
        const toggleBtnClass = isActive ? 'btn-danger' : 'btn-primary';
        
        tr.innerHTML = `
          <td>${prof.displayName}</td>
          <td>${prof.email}</td>          
          <td>${prof.classCount || 0}</td>
          <td>${statusLabel}</td>
          <td>
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${prof.id}">Editar</button>
            <button class="btn ${toggleBtnClass} btn-sm toggle-btn" 
                    data-id="${prof.id}" 
                    data-status="${isActive}"
                    style="margin-left: 5px;">
              ${toggleBtnText}
            </button>
          </td>
        `;
        tabelaBody.appendChild(tr);
      });
    } catch (error) {
      tabelaBody.innerHTML = `<tr><td colspan="5" style="color: red;">${error.message}</td></tr>`;
    }
  };

  // --- Cadastro / Edição ---
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const dados = {
      displayName: profNameInput.value,
      email: profEmailInput.value,
      role: 'teacher'
    };

    try {
      if (currentEditingId) {
        await api.put(`/api/users/${currentEditingId}`, dados);
        showStatus('Sucesso', 'Dados atualizados.');
      } else {
        await api.post('/api/users', dados);
        showStatus('Sucesso', 'Professor criado!\nSenha padrão: professor123');
      }
      closeModal();
      loadProfessores();
    } catch (error) {
      showStatus('Erro', error.message);
    }
  };

  // --- Ação de Desativar/Ativar (CORRIGIDA) ---
  const handleToggleStatus = (id, currentStatus) => {
    const newStatus = !currentStatus; 
    const actionName = newStatus ? "Ativar" : "Desativar";
    
    // SUBSTITUI O confirm() NATIVO PELO MODAL
    showConfirm(`Tem certeza que deseja ${actionName.toUpperCase()} este professor?`, async () => {
      try {
        // Usa fetch manual para garantir o PATCH
        await fetch(`http://localhost:3000/api/users/${id}/status`, {
           method: 'PATCH',
           headers: { 
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${localStorage.getItem('authToken')}`
           },
           body: JSON.stringify({ isActive: newStatus })
        });
        
        showStatus('Sucesso', `Professor ${actionName.toLowerCase()} com sucesso.`);
        loadProfessores();
      } catch (error) {
        showStatus('Erro', 'Falha ao alterar status.');
        console.error(error);
      }
    });
  };

  // --- Modais ---
  const openModalCriar = () => {
    currentEditingId = null;
    if(modalTitle) modalTitle.textContent = 'Novo Professor';
    formProfessor.reset();
    profEmailInput.disabled = false; 
    modalProfessor.style.display = 'flex';
  };

  const openModalEditar = async (id) => {
    currentEditingId = id;
    if(modalTitle) modalTitle.textContent = 'Editar Professor';
    formProfessor.reset();
    try {
      const prof = await api.get(`/api/users/${id}`);
      profNameInput.value = prof.displayName;
      profEmailInput.value = prof.email;
      profEmailInput.disabled = true; 
      modalProfessor.style.display = 'flex';
    } catch (error) { showStatus('Erro', error.message); }
  };

  const closeModal = () => {
    modalProfessor.style.display = 'none';
    formProfessor.reset();
  };

  // --- Listeners ---
  openModalBtn.addEventListener('click', openModalCriar);
  closeModalBtn.addEventListener('click', closeModal);
  formProfessor.addEventListener('submit', handleFormSubmit);
  
  profSearch.addEventListener('input', loadProfessores);
  profFilterSort.addEventListener('change', loadProfessores);

  tabelaBody.addEventListener('click', (e) => {
    const btn = e.target;
    if (btn.classList.contains('edit-btn')) {
      openModalEditar(btn.dataset.id);
    }
    if (btn.classList.contains('toggle-btn')) {
      const currentStatus = btn.dataset.status === 'true';
      handleToggleStatus(btn.dataset.id, currentStatus);
    }
  });

  closeStatusBtn.addEventListener('click', closeStatus);
  okStatusBtn.addEventListener('click', closeStatus);
  
  // Listeners Confirmação
  closeConfirmacaoModalBtn.addEventListener('click', closeConfirm);
  cancelarConfirmacaoBtn.addEventListener('click', closeConfirm);
  confirmarAcaoBtn.addEventListener('click', () => {
    if (actionToConfirm) actionToConfirm();
    closeConfirm();
  });

  loadProfessores();
});