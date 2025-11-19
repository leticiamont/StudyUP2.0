import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

console.log('[alunos.js] Carregando... Chamando initLayout().');
initLayout();

// --- Variável de Estado ---
// Guarda o ID do aluno que estamos editando.
let currentEditingId = null;

document.addEventListener('componentsLoaded', () => {
  console.log('[alunos.js] "componentsLoaded" recebido.');

  // --- 1. Seleção (Modais) ---
  const modalAluno = document.getElementById('modalAluno');
  const modalStatus = document.getElementById('modalStatus');
  const modalConfirmacao = document.getElementById('modalConfirmacao');
  
  // --- 2. Seleção (Elementos da Página) ---
  const tabelaAlunosBody = document.getElementById('tabelaAlunosBody');
  const openModalAlunoBtn = document.getElementById('openModalAlunoBtn');
  const importarAlunosBtn = document.getElementById('importarAlunosBtn');
  const csvFileInput = document.getElementById('csvFileInput');
  
  // --- 3. Seleção (Filtros) ---
  const alunosSearch = document.getElementById('alunos-search');
  const alunosFilterGrade = document.getElementById('alunos-filter-grade');
  const alunosFilterSort = document.getElementById('alunos-filter-sort');

  // --- 4. Seleção (Modal Aluno) ---
  const closeModalAlunoBtn = document.getElementById('closeModalAlunoBtn');
  const formAluno = document.getElementById('formAluno');
  const alunoModalTitle = document.getElementById('alunoModalTitle');
  const alunoModalSubmitBtn = document.getElementById('alunoModalSubmitBtn');
  const alunoModalInfo = document.getElementById('alunoModalInfo');
  // (Campos do formulário)
  const alunoNameInput = document.getElementById('aluno-name');
  const alunoDobInput = document.getElementById('aluno-dob');
  const alunoGradeInput = document.getElementById('aluno-gradeLevel');

  // --- 5. Seleção (Modal Status) ---
  const statusModalTitle = document.getElementById('statusModalTitle');
  const statusModalMessage = document.getElementById('statusModalMessage');
  const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
  const okStatusModalBtn = document.getElementById('okStatusModalBtn');
  
  // --- 6. Seleção (Modal Confirmação) ---
  // (Seletores do modal de confirmação CSV)
  const closeConfirmacaoModalBtn = document.getElementById('closeConfirmacaoModalBtn');
  const cancelarConfirmacaoBtn = document.getElementById('cancelarConfirmacaoBtn');
  const confirmarSalvarBtn = document.getElementById('confirmarSalvarBtn');

  // ... (Verificação de segurança) ...

  // --- 7. Funções (Modais Status/Confirmação) ---
  const showStatusModal = (title, message) => {
    statusModalTitle.textContent = title;
    statusModalMessage.textContent = message;
    modalStatus.style.display = 'flex';
  };
  const closeStatusModal = () => modalStatus.style.display = 'none';
  const closeConfirmacaoModal = () => {
     document.getElementById('modalConfirmacao').style.display = 'none';
     // (limpar a lista global)
  };
  // (Função showConfirmacaoModal() também está aqui)

  // --- 8. Funções (Helpers) ---
  const gerarUsername = (nomeCompleto) => {
    if (!nomeCompleto) return '';
    const partes = nomeCompleto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ');
    if (partes.length === 1) return partes[0];
    return `${partes[0]}.${partes[partes.length - 1]}`; 
  };
  const gerarSenhaProvisoria = () => 'studyup123';
  // (Helper para formatar AAAA-MM-DD para input date)
  const formatISODate = (dateString) => {
    if (!dateString) return '';
    return dateString.split('T')[0]; // Pega 'AAAA-MM-DD' de 'AAAA-MM-DDT12:00:00Z'
  };


  // --- 9. Funções Principais (Listagem) ---
  const loadAlunos = async () => {
    // ... (Esta função está 100% correta, com o 'className' e o 'edit-btn') ...
    tabelaAlunosBody.innerHTML = '<tr><td colspan="6">Carregando alunos...</td></tr>';
    const params = new URLSearchParams({ role: 'student' });
    if (alunosSearch.value) params.append('search', alunosSearch.value);
    if (alunosFilterGrade.value) params.append('gradeLevel', alunosFilterGrade.value);
    if (alunosFilterSort.value) params.append('sort', alunosFilterSort.value);
    try {
      const alunos = await api.get(`/api/users?${params.toString()}`);
      tabelaAlunosBody.innerHTML = ''; 
      if (!alunos || alunos.length === 0) {
        tabelaAlunosBody.innerHTML = '<tr><td colspan="6">Nenhum aluno encontrado.</td></tr>';
        return;
      }
      alunos.forEach(aluno => {
        const tr = document.createElement('tr');
        const dataNasc = aluno.dateOfBirth ? new Date(aluno.dateOfBirth).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A';
        const nomeTurma = aluno.className || 'Nenhuma'; 
        tr.innerHTML = `
          <td>${aluno.displayName || 'N/A'}</td>
          <td>${aluno.username || 'N/A'}</td>
          <td>${dataNasc}</td>
          <td>${aluno.gradeLevel || 'N/A'}</td>
          <td>${nomeTurma}</td>
          <td>
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${aluno.id}">Editar</button>
          </td>
        `;
        tabelaAlunosBody.appendChild(tr);
      });
    } catch (error) {
      showStatusModal('Erro ao Carregar', error.message);
      tabelaAlunosBody.innerHTML = `<tr><td colspan="6" style="color: red;">${error.message}</td></tr>`;
    }
  };

  // --- 10. Funções Principais (Formulário: Criar e Editar) ---
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    const dadosForm = {
      displayName: alunoNameInput.value,
      dateOfBirth: alunoDobInput.value,
      gradeLevel: alunoGradeInput.value,
      role: 'student' // Sempre 'student'
    };
    
    if (!dadosForm.displayName || !dadosForm.dateOfBirth || !dadosForm.gradeLevel) {
      showStatusModal('Erro de Validação', 'Por favor, preencha todos os campos.');
      return;
    }

    try {
      if (currentEditingId) {
        // --- MODO EDIÇÃO ---
        console.log(`[alunos.js] Editando aluno ID: ${currentEditingId}`);
        await api.put(`/api/users/${currentEditingId}`, dadosForm);
        showStatusModal('Sucesso!', 'Aluno(a) atualizado com sucesso!');
        
      } else {
        // --- MODO CRIAÇÃO ---
        const username = gerarUsername(dadosForm.displayName);
        dadosForm.username = username;
        dadosForm.email = `${username}@studyup.com`;
        dadosForm.password = gerarSenhaProvisoria();
        
        console.log('[alunos.js] Criando novo aluno...');
        const creationResult = await api.post('/api/users', dadosForm);
        const successMessage = `Username: ${creationResult.username}\nSenha Provisória: ${creationResult.password}\n\n(Anote essas credenciais!)`;
        showStatusModal('Aluno(a) criado com sucesso!', successMessage);
      }
      
      closeModal();
      loadAlunos();

    } catch (error) {
      console.error('[handleFormSubmit] Erro:', error);
      showStatusModal('Erro ao Salvar', error.message);
    }
  };

  // --- 11. Lógica de Importação (Sem mudança) ---
  const handleFileImport = async (event) => { /* ... */ };
  const handleConfirmarSalvar = async () => { /* ... */ };
  // (A lógica de 'showConfirmacaoModal' e 'closeConfirmacaoModal' também)

  // --- 12. Funções do Modal (Abrir/Fechar) ---
  const openModalParaCriar = () => {
    currentEditingId = null;
    alunoModalTitle.textContent = 'Novo Aluno';
    alunoModalSubmitBtn.textContent = 'Salvar e Gerar Credenciais';
    alunoModalInfo.style.display = 'block'; // Mostra info da senha
    
    formAluno.reset();
    modalAluno.style.display = 'flex';
  };

  const openModalParaEditar = async (id) => {
    currentEditingId = id;
    alunoModalTitle.textContent = 'Editar Aluno';
    alunoModalSubmitBtn.textContent = 'Atualizar';
    alunoModalInfo.style.display = 'none'; // Esconde info da senha
    
    formAluno.reset();
    
    try {
      // Busca os dados atuais do aluno
      const aluno = await api.get(`/api/users/${id}`);
      
      // Preenche o formulário
      alunoNameInput.value = aluno.displayName || '';
      alunoDobInput.value = formatISODate(aluno.dateOfBirth); // Converte '2010-05-20T12:00:00Z' para '2010-05-20'
      alunoGradeInput.value = aluno.gradeLevel || '';
      
      modalAluno.style.display = 'flex';
      
    } catch (error) {
      showStatusModal('Erro', 'Erro ao buscar dados do aluno: ' + error.message);
    }
  };

  const closeModal = () => {
    modalAluno.style.display = 'none';
    formAluno.reset();
    currentEditingId = null; // Limpa o estado
  };

  // --- 13. Listeners ---
  openModalAlunoBtn.addEventListener('click', openModalParaCriar);
  closeModalAlunoBtn.addEventListener('click', closeModal);
  formAluno.addEventListener('submit', handleFormSubmit);
  
  // Listeners de Lote
  importarAlunosBtn.addEventListener('click', () => csvFileInput.click());
  csvFileInput.addEventListener('change', handleFileImport);
  
  // Listeners dos Filtros
  alunosSearch.addEventListener('input', loadAlunos);
  alunosFilterGrade.addEventListener('change', loadAlunos);
  alunosFilterSort.addEventListener('change', loadAlunos);
  
  // Listeners dos Modais Status/Confirmação
  closeStatusModalBtn.addEventListener('click', closeStatusModal);
  okStatusModalBtn.addEventListener('click', closeStatusModal);
  confirmarSalvarBtn.addEventListener('click', handleConfirmarSalvar);
  closeConfirmacaoModalBtn.addEventListener('click', closeConfirmacaoModal);
  cancelarConfirmacaoBtn.addEventListener('click', closeConfirmacaoModal);

  // Listener da Tabela (para os botões "Editar")
  tabelaAlunosBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
      const id = e.target.getAttribute('data-id');
      openModalParaEditar(id);
    }
  });

  // --- 14. Inicialização ---
  loadAlunos();
});