import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

console.log('[alunos.js] Carregando...');
initLayout();

let currentEditingId = null;
let listaDeAlunosParaConfirmar = []; 
let actionToConfirm = null; 

const schoolYearsMap = {
  "Fundamental 1": ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"],
  "Fundamental 2": ["6º Ano", "7º Ano", "8º Ano", "9º Ano"],
  "Ensino Médio": ["1ª Série", "2ª Série", "3ª Série"]
};

document.addEventListener('componentsLoaded', () => {
  // --- Seletores ---
  const tabelaAlunosBody = document.getElementById('tabelaAlunosBody');
  const openModalAlunoBtn = document.getElementById('openModalAlunoBtn');
  const importarAlunosBtn = document.getElementById('importarAlunosBtn');
  const csvFileInput = document.getElementById('csvFileInput');
  
  const alunosSearch = document.getElementById('alunos-search');
  const alunosFilterGrade = document.getElementById('alunos-filter-grade');
  const alunosFilterSort = document.getElementById('alunos-filter-sort');

  const modalAluno = document.getElementById('modalAluno');
  const closeModalAlunoBtn = document.getElementById('closeModalAlunoBtn');
  const formAluno = document.getElementById('formAluno');
  const alunoModalTitle = document.getElementById('alunoModalTitle');
  const alunoModalSubmitBtn = document.getElementById('alunoModalSubmitBtn');
  const alunoModalInfo = document.getElementById('alunoModalInfo');
  
  const alunoNameInput = document.getElementById('aluno-name');
  const alunoDobInput = document.getElementById('aluno-dob');
  const alunoGradeInput = document.getElementById('aluno-gradeLevel');
  const alunoYearInput = document.getElementById('aluno-schoolYear');

  const modalStatus = document.getElementById('modalStatus');
  const statusTitle = document.getElementById('statusModalTitle');
  const statusMsg = document.getElementById('statusModalMessage');
  const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
  const okStatusModalBtn = document.getElementById('okStatusModalBtn');

  const modalPreviewCSV = document.getElementById('modalPreviewCSV');
  const previewTabelaBody = document.getElementById('previewTabelaBody');
  const previewErros = document.getElementById('previewErros');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const cancelarPreviewBtn = document.getElementById('cancelarPreviewBtn');
  const salvarCsvBtn = document.getElementById('salvarCsvBtn');

  const modalConfirmacao = document.getElementById('modalConfirmacao');
  const confirmacaoMessage = document.getElementById('confirmacaoMessage');
  const closeConfirmacaoModalBtn = document.getElementById('closeConfirmacaoModalBtn');
  const cancelarConfirmacaoBtn = document.getElementById('cancelarConfirmacaoBtn');
  const confirmarAcaoBtn = document.getElementById('confirmarAcaoBtn');

  if (!tabelaAlunosBody || !modalAluno) return;

  // --- Helpers ---
  const gerarUsername = (nome) => {
    if (!nome) return '';
    const p = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ');
    return p.length === 1 ? p[0] : `${p[0]}.${p[p.length-1]}`;
  };
  const gerarSenhaProvisoria = () => 'studyup123';
  const formatISODate = (d) => d ? d.split('T')[0] : '';

  const showStatus = (title, msg) => {
    statusTitle.textContent = title;
    statusMsg.textContent = msg;
    modalStatus.style.display = 'flex';
  };
  const closeStatus = () => modalStatus.style.display = 'none';

  const showConfirm = (msg, callback) => {
    confirmacaoMessage.textContent = msg;
    actionToConfirm = callback;
    modalConfirmacao.style.display = 'flex';
  };
  const closeConfirm = () => {
    modalConfirmacao.style.display = 'none';
    actionToConfirm = null;
  };

  // --- Ação: Resetar Senha (NOVO) ---
  const handleResetPassword = (id, nomeAluno) => {
    showConfirm(`Deseja resetar a senha de ${nomeAluno}?`, async () => {
      try {
        showStatus('Processando...', 'Gerando nova senha...');
        
        // Chama a API de Reset
        const response = await api.post(`/api/users/${id}/reset-password`, {});
        
        // Pega a nova senha retornada pelo backend
        const novaSenha = response.newPassword;
        
        showStatus('Senha Resetada!', 
          `A nova senha provisória para ${nomeAluno} é:\n\n` +
          `👉 ${novaSenha} 👈\n\n` +
          `Informe ao aluno. Ele deverá trocá-la no próximo login.`
        );
        
      } catch (error) {
        showStatus('Erro', 'Falha ao resetar senha: ' + error.message);
      }
    });
  };

  // --- Lógica de Cascata ---
  alunoGradeInput.addEventListener('change', () => {
    const level = alunoGradeInput.value;
    alunoYearInput.innerHTML = '<option value="">Selecione...</option>';
    if (level && schoolYearsMap[level]) {
      alunoYearInput.disabled = false;
      schoolYearsMap[level].forEach(year => {
        alunoYearInput.innerHTML += `<option value="${year}">${year}</option>`;
      });
    } else {
      alunoYearInput.disabled = true;
    }
  });

  // --- Listagem ---
  const loadAlunos = async () => {
    tabelaAlunosBody.innerHTML = '<tr><td colspan="7">Carregando...</td></tr>';
    const params = new URLSearchParams({ role: 'student' });
    if (alunosSearch.value) params.append('search', alunosSearch.value);
    if (alunosFilterGrade.value) params.append('gradeLevel', alunosFilterGrade.value);
    
    // Removemos o sort do backend para evitar erro de índice e fazemos local
    // if (alunosFilterSort.value) params.append('sort', alunosFilterSort.value);

    try {
      let alunos = await api.get(`/api/users?${params.toString()}`);
      tabelaAlunosBody.innerHTML = ''; 
      if (!alunos || alunos.length === 0) {
        tabelaAlunosBody.innerHTML = '<tr><td colspan="7">Nenhum aluno encontrado.</td></tr>';
        return;
      }
      
      // Ordenação Local
      const ordem = alunosFilterSort.value;
      alunos.sort((a, b) => {
        const nomeA = (a.displayName || '').toLowerCase();
        const nomeB = (b.displayName || '').toLowerCase();
        return ordem === 'asc' ? nomeA.localeCompare(nomeB) : nomeB.localeCompare(nomeA);
      });

      alunos.forEach(aluno => {
        const tr = document.createElement('tr');
        const dataNasc = aluno.dateOfBirth ? new Date(aluno.dateOfBirth).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A';
        const nomeTurma = aluno.className || 'Nenhuma'; 
        const isActive = aluno.isActive !== false; 
        const statusLabel = isActive ? '<span style="color:green;font-weight:bold;">Ativo</span>' : '<span style="color:red;font-weight:bold;">Inativo</span>';
        const btnText = isActive ? 'Desativar' : 'Ativar';
        const btnClass = isActive ? 'btn-danger' : 'btn-primary';
        const nivelAno = aluno.schoolYear ? `${aluno.gradeLevel} (${aluno.schoolYear})` : (aluno.gradeLevel || 'N/A');

        tr.innerHTML = `
          <td>${aluno.displayName || 'N/A'}</td>
          <td>${aluno.username || 'N/A'}</td>
          <td>${statusLabel}</td>
          <td>${dataNasc}</td>
          <td>${nivelAno}</td>
          <td>${nomeTurma}</td>
          <td>
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${aluno.id}" title="Editar">
                Editar
            </button>
            
            <button class="btn btn-warning btn-sm reset-btn" data-id="${aluno.id}" data-nome="${aluno.displayName}" title="Resetar Senha" style="background-color: #f0ad4e; color: white; border: none; margin-left: 4px;">
              <span class="material-symbols-rounded" style="font-size:16px;">vpn_key</span>
            </button>

            <button class="btn ${btnClass} btn-sm toggle-btn" data-id="${aluno.id}" data-status="${isActive}" style="margin-left: 4px;">
              ${btnText}
            </button>
          </td>
        `;
        tabelaAlunosBody.appendChild(tr);
      });
    } catch (error) {
      tabelaAlunosBody.innerHTML = `<tr><td colspan="7" style="color: red;">${error.message}</td></tr>`;
    }
  };

  // --- Form Submit ---
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const dados = {
      displayName: alunoNameInput.value,
      dateOfBirth: alunoDobInput.value,
      gradeLevel: alunoGradeInput.value,
      schoolYear: alunoYearInput.value,
      role: 'student'
    };
    
    if (!dados.displayName || !dados.dateOfBirth || !dados.gradeLevel || !dados.schoolYear) {
      showStatus('Erro', 'Preencha todos os campos.');
      return;
    }

    try {
      if (currentEditingId) {
        await api.put(`/api/users/${currentEditingId}`, dados);
        showStatus('Sucesso', 'Aluno atualizado.');
      } else {
        const username = gerarUsername(dados.displayName);
        dados.username = username;
        dados.email = `${username}@studyup.com`;
        dados.password = gerarSenhaProvisoria();
        
        const res = await api.post('/api/users', dados);
        showStatus('Sucesso', `Username: ${res.username}\nSenha: ${res.password}`);
      }
      closeModalAluno();
      loadAlunos();
    } catch (error) { showStatus('Erro', error.message); }
  };

  // --- CSV ---
  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    showStatus('Processando...', 'Lendo CSV...');
    const formData = new FormData();
    formData.append('csvFile', file);
    try {
        const token = localStorage.getItem("authToken");
        const response = await fetch('http://localhost:3000/api/users/batch-preview', {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        });
        const preview = await response.json();
        if (!response.ok) throw new Error(preview.error || 'Erro no backend');
        closeStatus();
        
        previewTabelaBody.innerHTML = '';
        preview.listaValidada.forEach(a => {
            const tr = document.createElement('tr');
            const dn = new Date(a.dateOfBirth).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            tr.innerHTML = `<td>${a.displayName}</td><td>${dn}</td><td>${a.gradeLevel} - ${a.schoolYear}</td><td>${a.username}</td>`;
            previewTabelaBody.appendChild(tr);
        });
        previewErros.textContent = preview.erros.length > 0 ? `Atenção: ${preview.erros.length} erros.` : '';
        listaDeAlunosParaConfirmar = preview.listaValidada;
        modalPreviewCSV.style.display = 'flex';
    } catch (error) { showStatus('Erro', error.message); }
    finally { csvFileInput.value = ''; }
  };

  const handleSalvarCsv = async () => {
    if (listaDeAlunosParaConfirmar.length === 0) return;
    const lista = [...listaDeAlunosParaConfirmar];
    modalPreviewCSV.style.display = 'none';
    showStatus('Salvando...', 'Guardando alunos...');
    try {
        const relatorio = await api.post('/api/users/batch-confirm', lista);
        showStatus('Concluído', `Sucessos: ${relatorio.sucessos}\nFalhas: ${relatorio.falhas}`);
        loadAlunos();
    } catch (error) { showStatus('Erro', error.message); }
  };

  const handleToggleStatus = (id, status) => {
    const newStatus = !status;
    const action = newStatus ? "Ativar" : "Desativar";
    showConfirm(`Deseja ${action} este aluno?`, async () => {
        try {
            await api.patch(`/api/users/${id}/status`, { isActive: newStatus });
            showStatus('Sucesso', `Aluno ${action}do.`);
            loadAlunos();
        } catch (error) { showStatus('Erro', 'Falha ao alterar status.'); }
    });
  };

  // --- Modais ---
  const openModalAlunoCriar = () => {
    currentEditingId = null;
    alunoModalTitle.textContent = 'Novo Aluno';
    alunoModalSubmitBtn.textContent = 'Salvar';
    alunoModalInfo.style.display = 'block';
    formAluno.reset();
    alunoYearInput.innerHTML = '<option value="">Selecione o Nível...</option>';
    alunoYearInput.disabled = true;
    modalAluno.style.display = 'flex';
  };

  const openModalParaEditar = async (id) => {
    currentEditingId = id;
    alunoModalTitle.textContent = 'Editar Aluno';
    alunoModalSubmitBtn.textContent = 'Atualizar';
    alunoModalInfo.style.display = 'none';
    formAluno.reset();
    try {
      const aluno = await api.get(`/api/users/${id}`);
      alunoNameInput.value = aluno.displayName || '';
      alunoDobInput.value = formatISODate(aluno.dateOfBirth);
      alunoGradeInput.value = aluno.gradeLevel || '';
      alunoGradeInput.dispatchEvent(new Event('change'));
      setTimeout(() => { alunoYearInput.value = aluno.schoolYear || ''; }, 50);
      modalAluno.style.display = 'flex';
    } catch (error) { showStatus('Erro', error.message); }
  };

  const closeModalAluno = () => { modalAluno.style.display = 'none'; formAluno.reset(); };

  // --- Listeners ---
  openModalAlunoBtn.addEventListener('click', openModalAlunoCriar);
  closeModalAlunoBtn.addEventListener('click', closeModalAluno);
  formAluno.addEventListener('submit', handleFormSubmit);

  importarAlunosBtn.addEventListener('click', () => csvFileInput.click());
  csvFileInput.addEventListener('change', handleFileImport);
  
  if(closePreviewBtn) closePreviewBtn.addEventListener('click', () => modalPreviewCSV.style.display = 'none');
  if(cancelarPreviewBtn) cancelarPreviewBtn.addEventListener('click', () => modalPreviewCSV.style.display = 'none');
  if(salvarCsvBtn) salvarCsvBtn.addEventListener('click', handleSalvarCsv);
  
  // Modais Genéricos
  closeStatusModalBtn.addEventListener('click', closeStatus);
  okStatusModalBtn.addEventListener('click', closeStatus);
  closeConfirmacaoModalBtn.addEventListener('click', closeConfirm);
  cancelarConfirmacaoBtn.addEventListener('click', closeConfirm);
  confirmarAcaoBtn.addEventListener('click', () => {
    if (actionToConfirm) actionToConfirm();
    closeConfirm();
  });
  
  tabelaAlunosBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('edit-btn')) openModalParaEditar(btn.dataset.id);
    if (btn.classList.contains('toggle-btn')) handleToggleStatus(btn.dataset.id, btn.dataset.status === 'true');
    // LISTENER DE RESET
    if (btn.classList.contains('reset-btn')) handleResetPassword(btn.dataset.id, btn.dataset.nome);
  });

  alunosSearch.addEventListener('input', loadAlunos);
  alunosFilterGrade.addEventListener('change', loadAlunos);
  alunosFilterSort.addEventListener('change', loadAlunos);

  loadAlunos();
});