import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

console.log('[turmas.js] Carregando...');
initLayout();

let currentEditingId = null;
let allStudentsCache = []; 
let actionToConfirm = null; 

// Mapa de Níveis -> Anos (Fonte da Verdade)
const schoolYearsMap = {
  "Fundamental 1": ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"],
  "Fundamental 2": ["6º Ano", "7º Ano", "8º Ano", "9º Ano"],
  "Ensino Médio": ["1ª Série", "2ª Série", "3ª Série"]
};

// --- Funções Auxiliares de Modal (Corpo Omitido) ---
const getElement = (id) => document.getElementById(id);

const showStatus = (title, msg) => {
    const statusTitle = getElement('statusModalTitle');
    const statusMsg = getElement('statusModalMessage');
    const modalStatus = getElement('modalStatus');
    if (statusTitle) statusTitle.textContent = title;
    if (statusMsg) statusMsg.textContent = msg;
    if (modalStatus) modalStatus.style.display = 'flex';
};
const closeStatus = () => {
    const modalStatus = getElement('modalStatus');
    if (modalStatus) modalStatus.style.display = 'none';
};

const showConfirm = (msg, callback) => {
    const confirmacaoMessage = getElement('confirmacaoMessage');
    const modalConfirmacao = getElement('modalConfirmacao');
    if (confirmacaoMessage) confirmacaoMessage.textContent = msg;
    actionToConfirm = callback;
    if (modalConfirmacao) modalConfirmacao.style.display = 'flex';
};
const closeConfirm = () => {
    const modalConfirmacao = getElement('modalConfirmacao');
    if (modalConfirmacao) modalConfirmacao.style.display = 'none';
    actionToConfirm = null;
};
// --- FIM DAS FUNÇÕES AUXILIARES DE MODAL ---


document.addEventListener('componentsLoaded', () => {
  console.log('[turmas.js] Evento "componentsLoaded" recebido.');

  // --- 1. Seleção (Elementos) - SOMENTE TURMAS ---
  const tabelaTurmasBody = getElement('tabelaTurmasBody');
  const openModalTurmaBtn = getElement('openModalTurmaBtn');
  const modalTurma = getElement('modalTurma');
  const closeModalTurmaBtn = getElement('closeModalTurmaBtn');
  const formTurma = getElement('formTurma');
  const turmaModalTitle = getElement('turmaModalTitle');
  const turmaModalSubmitBtn = getElement('turmaModalSubmitBtn');
  
  const inputEducationLevel = getElement('turma-educationLevel');
  const inputSchoolYear = getElement('turma-schoolYear');
  const selectTeacher = getElement('turma-teacherId');
  const selectPlan = getElement('turma-planId');
  const studentContainer = getElement('student-selection-container');
  
  const turmasSearch = getElement('turmas-search');
  const turmasFilterGrade = getElement('turmas-filter-grade');
  const turmasFilterSort = getElement('turmas-filter-sort');

  // Modais Genéricos
  const closeStatusBtn = getElement('closeStatusBtn');
  const okStatusBtn = getElement('okStatusModalBtn');
  const closeConfirmacaoBtn = getElement('closeConfirmacaoModalBtn');
  const cancelarConfirmacaoBtn = getElement('cancelarConfirmacaoBtn');
  const confirmarAcaoBtn = getElement('confirmarAcaoBtn');

  // --- Lógica de Turmas (CRUD) ---
  
  const populateDropdowns = async () => {
    try {
      const [teachers, plans, students] = await Promise.all([
        api.get('/api/users?role=teacher'),
        api.get('/api/plans?viewMode=admin'),
        api.get('/api/users?role=student')
      ]);
      allStudentsCache = students;
      selectTeacher.innerHTML = '<option value="">Selecione...</option>';
      teachers.forEach(t => selectTeacher.innerHTML += `<option value="${t.id}">${t.displayName}</option>`);
      selectPlan.innerHTML = '<option value="">Selecione (Opcional)</option>';
      plans.forEach(p => selectPlan.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    } catch (error) { showStatus('Erro', 'Falha ao carregar Professores/Planos.'); }
  };
  
  function renderStudentList(studentIdsPreSelected = []) {
    if (!Array.isArray(studentIdsPreSelected)) studentIdsPreSelected = [];
    const selectedLevel = inputEducationLevel.value;
    const selectedYear = inputSchoolYear.value;
    studentContainer.innerHTML = '';

    if (!selectedLevel || !selectedYear) {
      studentContainer.innerHTML = '<div class="no-students-msg">Selecione Nível e Ano para ver alunos.</div>';
      return;
    }

    const filteredStudents = allStudentsCache.filter(s => {
      const alunoYear = (s.schoolYear || "").trim(); 
      const filtroYear = selectedYear.trim(); 
      const isMatch = (alunoYear === filtroYear);
      const isInThisClass = studentIdsPreSelected.includes(s.id);
      const hasNoClass = !s.classId;
      return isMatch && (hasNoClass || isInThisClass);
    });

    if (filteredStudents.length === 0) {
      studentContainer.innerHTML = '<div class="no-students-msg">Nenhum aluno disponível para este nível/ano.</div>';
      return;
    }

    filteredStudents.forEach(s => {
      const isChecked = studentIdsPreSelected.includes(s.id) ? 'checked' : '';
      const div = document.createElement('div');
      div.className = 'student-item';
      div.innerHTML = `<input type="checkbox" id="std-${s.id}" value="${s.id}" ${isChecked}><label for="std-${s.id}">${s.displayName} (${s.username})</label>`;
      studentContainer.appendChild(div);
    });
  }

  const loadTurmas = async () => {
    tabelaTurmasBody.innerHTML = '<tr><td colspan="7">Carregando...</td></tr>';
    const params = new URLSearchParams();
    if (turmasSearch.value) params.append('search', turmasSearch.value);
    if (turmasFilterGrade.value) params.append('gradeLevel', turmasFilterGrade.value);
    if (turmasFilterSort.value) params.append('sort', turmasFilterSort.value);

    try {
      const turmas = await api.get(`/api/classes?${params.toString()}`);
      tabelaTurmasBody.innerHTML = '';
      if (!turmas || turmas.length === 0) {
        tabelaTurmasBody.innerHTML = '<tr><td colspan="7">Nenhuma turma.</td></tr>'; return;
      }
      turmas.forEach(t => {
        const dias = t.daysOfWeek ? t.daysOfWeek.join(', ') : '';
        const horario = (t.startTime && t.endTime) ? `${dias} ${t.startTime}-${t.endTime}` : t.schedule || 'N/A';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${t.name}</td>
          <td>${t.teacherName || 'N/A'}</td>
          <td>${t.educationLevel || t.gradeLevel} - ${t.schoolYear || ''}</td>
          <td>${t.planName || 'Nenhum'}</td>
          <td>${horario}</td>
          <td>${t.studentCount || 0}</td>
          <td>
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${t.id}">Editar</button>
            <button class="btn btn-danger btn-sm delete-turma-btn" data-id="${t.id}" style="margin-left: 4px;">Apagar</button>
          </td>
        `;
        tabelaTurmasBody.appendChild(tr);
      });
    } catch (e) { showStatus('Erro', e.message); tabelaTurmasBody.innerHTML = `<tr><td colspan="7" style="color: red;">${e.message}</td></tr>`; }
  };

  const handleTurmaFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(formTurma);
    const selectedDays = [];
    formTurma.querySelectorAll('input[name="days"]:checked').forEach(cb => selectedDays.push(cb.value));
    const selectedStudents = [];
    studentContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => selectedStudents.push(cb.value));

    const dados = {
      name: formData.get('name'), educationLevel: formData.get('educationLevel'),
      schoolYear: formData.get('schoolYear'), daysOfWeek: selectedDays,
      startTime: formData.get('startTime'), endTime: formData.get('endTime'),
      teacherId: formData.get('teacherId'), planId: formData.get('planId'),
      studentIds: selectedStudents, gradeLevel: formData.get('educationLevel'),
      schedule: `${selectedDays.join(', ')} ${formData.get('startTime')}-${formData.get('endTime')}`
    };

    try {
      if (currentEditingId) {
        await api.put(`/api/classes/${currentEditingId}`, dados);
        showStatus('Sucesso', 'Turma atualizada!');
      } else {
        await api.post('/api/classes', dados);
        showStatus('Sucesso', 'Turma criada!');
      }
      closeModalTurma();
      loadTurmas();
    } catch (error) { showStatus('Erro', error.message); }
  };

  const openModalCriar = () => {
    currentEditingId = null;
    formTurma.reset();
    turmaModalTitle.textContent = 'Nova Turma';
    turmaModalSubmitBtn.textContent = 'Salvar';
    modalTurma.style.display = 'flex';
    studentContainer.innerHTML = '<div class="no-students-msg">Selecione Nível e Ano...</div>';
    populateDropdowns();
  };

  const openModalEditar = async (id) => {
    currentEditingId = id;
    turmaModalTitle.textContent = 'Editar Turma';
    turmaModalSubmitBtn.textContent = 'Atualizar';
    formTurma.reset();
    try {
      const turma = await api.get(`/api/classes/${id}`);
      await populateDropdowns();
      document.getElementById('turma-name').value = turma.name;
      document.getElementById('turma-educationLevel').value = turma.educationLevel || turma.gradeLevel;
      document.getElementById('turma-educationLevel').dispatchEvent(new Event('change'));
      setTimeout(() => {
          document.getElementById('turma-schoolYear').value = turma.schoolYear || '';
          renderStudentList(turma.studentIds || []);
      }, 100);
      document.getElementById('turma-startTime').value = turma.startTime || ''; document.getElementById('turma-endTime').value = turma.endTime || '';
      document.getElementById('turma-teacherId').value = turma.teacherId || ''; document.getElementById('turma-planId').value = turma.planId || '';
      if (turma.daysOfWeek) {
        turma.daysOfWeek.forEach(day => {
          const cb = formTurma.querySelector(`input[value="${day}"]`);
          if (cb) cb.checked = true;
        });
      }
      modalTurma.style.display = 'flex';
    } catch (e) { showStatus('Erro', e.message); }
  };

  const closeModalTurma = () => {
    modalTurma.style.display = 'none';
    formTurma.reset();
    currentEditingId = null; 
  };
  
  // --- Lógica de Cascata (Nível -> Ano) ---
  inputEducationLevel.addEventListener('change', () => {
    const level = inputEducationLevel.value;
    inputSchoolYear.innerHTML = '<option value="">Selecione...</option>';
    if (level && schoolYearsMap[level]) {
      inputSchoolYear.disabled = false;
      schoolYearsMap[level].forEach(year => {
        inputSchoolYear.innerHTML += `<option value="${year}">${year}</option>`;
      });
    } else {
      inputSchoolYear.disabled = true;
    }
    renderStudentList();
  });


  // --- Listeners ---
  openModalTurmaBtn.addEventListener('click', openModalCriar);
  closeModalTurmaBtn.addEventListener('click', closeModalTurma);
  formTurma.addEventListener('submit', handleTurmaFormSubmit);
  
  tabelaTurmasBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) openModalEditar(e.target.dataset.id);
    if (e.target.classList.contains('delete-turma-btn')) {
        const id = e.target.dataset.id;
        showConfirm("Tem certeza que quer APAGAR esta turma? Isso desvincula todos os alunos.", async () => {
             try {
                await api.delete(`/api/classes/${id}`);
                showStatus('Sucesso', 'Turma apagada.');
                loadTurmas();
             } catch(e) { showStatus('Erro', e.message); }
        });
    }
  });

  // Listeners de Filtros
  turmasSearch.addEventListener('input', loadTurmas);
  turmasFilterGrade.addEventListener('change', loadTurmas);
  turmasFilterSort.addEventListener('change', loadTurmas);
  inputSchoolYear.addEventListener('change', () => renderStudentList([]));


  // Listeners do Modal de Status
  const closeStatusBtnElement = getElement('closeStatusBtn');
  const okStatusBtnElement = getElement('okStatusModalBtn');
  const closeConfirmacaoBtnElement = getElement('closeConfirmacaoBtn');
  const cancelarConfirmacaoBtnElement = getElement('cancelarConfirmacaoBtn');
  const confirmarAcaoBtnElement = getElement('confirmarAcaoBtn');

  if (closeStatusBtnElement) closeStatusBtnElement.addEventListener('click', closeStatus);
  if (okStatusBtnElement) okStatusBtnElement.addEventListener('click', closeStatus);
  if (closeConfirmacaoBtnElement) closeConfirmacaoBtnElement.addEventListener('click', closeConfirm);
  if (cancelarConfirmacaoBtnElement) cancelarConfirmacaoBtnElement.addEventListener('click', closeConfirm);
  if (confirmarAcaoBtnElement) confirmarAcaoBtnElement.addEventListener('click', () => {
    if (actionToConfirm) actionToConfirm();
    closeConfirm();
  });

  // Init
  loadTurmas();
});