import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

console.log('[turmas-e-conteudos.js] Carregando... Chamando initLayout().');
initLayout();

// --- Variável de Estado (para o modal de Turmas) ---
let currentEditingId = null;

document.addEventListener('componentsLoaded', () => {
  console.log('[turmas-e-conteudos.js] Evento "componentsLoaded" recebido.');

  // --- 1. Seleção (Abas) ---
  const tabLinks = document.querySelectorAll('.sub-menu-item');
  const tabContents = document.querySelectorAll('.tab-content');

  // --- 2. Seleção (Turmas) ---
  const tabelaTurmasBody = document.getElementById('tabelaTurmasBody');
  const openModalTurmaBtn = document.getElementById('openModalTurmaBtn');
  const modalTurma = document.getElementById('modalTurma');
  const closeModalTurmaBtn = document.getElementById('closeModalTurmaBtn');
  const formTurma = document.getElementById('formTurma');
  const turmaModalTitle = document.getElementById('turmaModalTitle');
  const turmaModalSubmitBtn = document.getElementById('turmaModalSubmitBtn');
  const selectTeacher = document.getElementById('turma-teacherId');
  const selectPlan = document.getElementById('turma-planId');
  const selectStudents = document.getElementById('turma-studentIds');
  const turmasSearch = document.getElementById('turmas-search');
  const turmasFilterGrade = document.getElementById('turmas-filter-grade');
  const turmasFilterSort = document.getElementById('turmas-filter-sort');

  // --- 3. Seleção (Planos) ---
  const tabelaPlanosBody = document.getElementById('tabelaPlanosBody');
  const openModalPlanoBtn = document.getElementById('openModalPlanoBtn');
  const planosSearch = document.getElementById('planos-search');
  const planosFilterGrade = document.getElementById('planos-filter-grade');
  
  // --- Verificação de Segurança (Corrigida) ---
  if (!tabelaTurmasBody || !openModalTurmaBtn || !modalTurma || !tabelaPlanosBody || !openModalPlanoBtn) {
     console.error('[turmas-e-conteudos.js] ERRO CRÍTICO: Elementos essenciais (tabelas, botões de adicionar) não encontrados.');
     return;
  }

  // --- 4. Lógica de Troca de Abas ---
  const switchTab = (targetTabId) => {
    tabContents.forEach(content => content.classList.remove('active'));
    tabLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(`.sub-menu-item[data-tab="${targetTabId}"]`).classList.add('active');
    document.getElementById(`tab-content-${targetTabId}`).classList.add('active');
    
    // Carrega os dados da aba correta
    if (targetTabId === 'turmas') loadTurmas();
    else if (targetTabId === 'planos') loadPlanos();
  };
  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(e.target.getAttribute('data-tab'));
    });
  });

  // --- 5. Lógica de TURMAS (Completa e Funcional) ---
  // (Todas as funções de Turmas (loadTurmas, populate, submit, open/close modals)
  // vêm aqui, sem nenhuma mudança. Elas estão corretas.)

  const populateTurmaModalDropdowns = async (turmaAtual = null) => {
    selectTeacher.innerHTML = '<option value="">Carregando...</option>';
    selectPlan.innerHTML = '<option value="">Carregando...</option>';
    selectStudents.innerHTML = '<option value="">Carregando...</option>';
    try {
      const [teachers, plans, students] = await Promise.all([
        api.get('/api/users?role=teacher'),
        api.get('/api/plans'),
        api.get('/api/users?role=student')
      ]);
      selectTeacher.innerHTML = '<option value="">Selecione um professor</option>';
      teachers.forEach(t => {
        const selected = (turmaAtual && turmaAtual.teacherId === t.id) ? 'selected' : '';
        selectTeacher.innerHTML += `<option value="${t.id}" ${selected}>${t.displayName}</option>`;
      });
      selectPlan.innerHTML = '<option value="">Selecione um plano (Opcional)</option>';
      plans.forEach(p => {
        const selected = (turmaAtual && turmaAtual.planId === p.id) ? 'selected' : '';
        selectPlan.innerHTML += `<option value="${p.id}" ${selected}>${p.name} (${p.gradeLevel})</option>`;
      });
      selectStudents.innerHTML = '';
      const alunosDaTurma = turmaAtual ? turmaAtual.studentIds : [];
      students.forEach(s => {
        let label = `${s.displayName} (${s.username})`;
        let disabled = false, selected = false;
        if (alunosDaTurma.includes(s.id)) {
          selected = true;
        } else if (s.classId) {
          label += ` - (Em outra turma)`;
          disabled = true;
        }
        selectStudents.innerHTML += `<option value="${s.id}" ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${label}</option>`;
      });
    } catch (error) { console.error('Erro ao popular dropdowns:', error); }
  };

  const loadTurmas = async () => {
    tabelaTurmasBody.innerHTML = '<tr><td colspan="7">Carregando turmas...</td></tr>';
    const params = new URLSearchParams();
    if (turmasSearch.value) params.append('search', turmasSearch.value);
    if (turmasFilterGrade.value) params.append('gradeLevel', turmasFilterGrade.value);
    if (turmasFilterSort.value) params.append('sort', turmasFilterSort.value);
    try {
      const turmas = await api.get(`/api/classes?${params.toString()}`); 
      tabelaTurmasBody.innerHTML = '';
      if (!turmas || turmas.length === 0) {
        tabelaTurmasBody.innerHTML = '<tr><td colspan="7">Nenhuma turma encontrada.</td></tr>';
        return;
      }
      turmas.forEach(turma => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${turma.name || 'N/A'}</td>
          <td>${turma.teacherName || 'N/A'}</td>
          <td>${turma.gradeLevel || 'N/A'}</td>
          <td>${turma.planName || 'Nenhum'}</td>
          <td>${turma.schedule || 'N/A'}</td>
          <td>${turma.studentCount || 0}</td>
          <td><button class="btn btn-secondary btn-sm edit-btn" data-id="${turma.id}">Editar</button></td>
        `;
        tabelaTurmasBody.appendChild(tr);
      });
    } catch (error) {
      tabelaTurmasBody.innerHTML = `<tr><td colspan="7" style="color: red;">${error.message}</td></tr>`;
    }
  };

  const handleTurmaFormSubmit = async (e) => {
    e.preventDefault(); 
    const formData = new FormData(formTurma);
    const studentIds = Array.from(selectStudents.selectedOptions).map(option => option.value);
    const dadosTurma = {
      name: formData.get('name'),
      gradeLevel: formData.get('gradeLevel'),
      schedule: formData.get('schedule'),
      teacherId: formData.get('teacherId'),
      planId: formData.get('planId'),
      studentIds: studentIds
    };
    try {
      if (currentEditingId) {
        await api.put(`/api/classes/${currentEditingId}`, dadosTurma);
        alert('Turma atualizada com sucesso!');
      } else {
        await api.post('/api/classes', dadosTurma);
        alert('Turma criada e alunos vinculados com sucesso!');
      }
      closeModalTurma();
      loadTurmas();
    } catch (error) {
      alert(`Erro ao salvar turma: ${error.message}`);
    }
  };

  const openModalParaCriar = () => {
    currentEditingId = null;
    turmaModalTitle.textContent = 'Nova Turma (Centro de Comando)';
    turmaModalSubmitBtn.textContent = 'Salvar Turma e Vínculos';
    formTurma.reset();
    modalTurma.style.display = 'flex';
    populateTurmaModalDropdowns(null); 
  };
  
  const openModalParaEditar = async (id) => {
    currentEditingId = id;
    turmaModalTitle.textContent = 'Editar Turma';
    turmaModalSubmitBtn.textContent = 'Atualizar';
    formTurma.reset();
    try {
      const turma = await api.get(`/api/classes/${id}`);
      formTurma.elements['name'].value = turma.name || '';
      formTurma.elements['gradeLevel'].value = turma.gradeLevel || '';
      formTurma.elements['schedule'].value = turma.schedule || '';
      await populateTurmaModalDropdowns(turma);
      modalTurma.style.display = 'flex';
    } catch (error) {
       alert('Erro ao buscar dados da turma: ' + error.message);
    }
  };

  const closeModalTurma = () => {
    modalTurma.style.display = 'none';
    formTurma.reset();
    currentEditingId = null; 
  };
  
  // (Listeners de Turmas)
  openModalTurmaBtn.addEventListener('click', openModalParaCriar);
  closeModalTurmaBtn.addEventListener('click', closeModalTurma);
  formTurma.addEventListener('submit', handleTurmaFormSubmit);
  tabelaTurmasBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
      const id = e.target.getAttribute('data-id');
      openModalParaEditar(id);
    }
  });
  turmasSearch.addEventListener('input', loadTurmas);
  turmasFilterGrade.addEventListener('change', loadTurmas);
  turmasFilterSort.addEventListener('change', loadTurmas);

  // --- 6. Lógica de PLANOS DE AULA (Corrigida e Limpa) ---
  
  const loadPlanos = async () => {
    // CORREÇÃO: Colspan de 4 para 3
    tabelaPlanosBody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
    
    const params = new URLSearchParams();
    if (planosSearch.value) params.append('search', planosSearch.value);
    if (planosFilterGrade.value) params.append('gradeLevel', planosFilterGrade.value);

    try {
      const planos = await api.get(`/api/plans?${params.toString()}`);
      tabelaPlanosBody.innerHTML = '';
      if (!planos || planos.length === 0) {
        // CORREÇÃO: Colspan de 4 para 3
        tabelaPlanosBody.innerHTML = '<tr><td colspan="3">Nenhum plano encontrado.</td></tr>';
        return;
      }
      planos.forEach(plano => {
         const tr = document.createElement('tr');
         
         // CORREÇÃO: Removemos a <td> do 'plano.id'
         tr.innerHTML = `
           <td>${plano.name || 'N/A'}</td>
           <td>${plano.gradeLevel || 'N/A'}</td>
           <td>
             <button class="btn btn-secondary btn-sm edit-btn-plano" data-id="${plano.id}">Editar Grade</button>
             <button class="btn btn-danger btn-sm delete-btn-plano" data-id="${plano.id}">Apagar</button>
           </td>
         `;
         tabelaPlanosBody.appendChild(tr);
      });
    } catch (error) {
       // CORREÇÃO: Colspan de 4 para 3
       tabelaPlanosBody.innerHTML = `<tr><td colspan="3" style="color: red;">${error.message}</td></tr>`;
    }
  };
  
  // --- REMOVIDO ---
  // (As funções handlePlanoFormSubmit, openModalPlano, closeModalPlano
  // que dependiam do modalPlano foram removidas)
  
  // --- Listeners de Planos (Corrigidos) ---
  
  // 1. Botão "Adicionar"
  openModalPlanoBtn.addEventListener('click', () => {
    // Apenas navega, como você queria
    window.location.href = './plano-detalhe.html';
  });
  
  // 2. Listener da Tabela (Editar e Apagar)
  tabelaPlanosBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-btn-plano')) {
      const id = e.target.getAttribute('data-id');
      window.location.href = `./plano-detalhe.html?id=${id}`;
    }
    if (e.target.classList.contains('delete-btn-plano')) {
      const id = e.target.getAttribute('data-id');
      if (confirm(`Tem certeza que quer apagar este plano? (ID: ${id})`)) {
        try {
          await api.delete(`/api/plans/${id}`);
          alert('Plano apagado com sucesso.');
          loadPlanos();
        } catch (error) {
          alert('Erro ao apagar plano: ' + error.message);
        }
      }
    }
  });

  planosSearch.addEventListener('input', loadPlanos);
  planosFilterGrade.addEventListener('change', loadPlanos);

  // --- 7. Inicialização (COM CORREÇÃO DE ABA) ---
  
  // Lê a URL para ver se precisa abrir uma aba específica
  const urlParams = new URLSearchParams(window.location.search);
  const abaAlvo = urlParams.get('tab'); // Vai ser 'planos' ou 'null'

  if (abaAlvo === 'planos') {
    // Se a URL pedir, abre a aba de Planos
    switchTab('planos');
  } else {
    // Caso contrário, abre o padrão (Turmas)
    switchTab('turmas'); 
  }
});