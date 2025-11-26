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

// --- FUNÇÃO DE CONTROLE DE ABA (RESOLVE O REFERENCERROR) ---
// Esta função é definida no escopo principal do módulo.
function switchTab(targetTabId) {
    const tabLinks = document.querySelectorAll('.sub-menu-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 1. Altera as classes ativas
    tabContents.forEach(content => content.classList.remove('active'));
    tabLinks.forEach(link => link.classList.remove('active'));
    
    const targetLink = document.querySelector(`.sub-menu-item[data-tab="${targetTabId}"]`);
    const targetContent = document.getElementById(`tab-content-${targetTabId}`);
    
    if (targetLink && targetContent) {
        targetLink.classList.add('active');
        targetContent.classList.add('active');
    }
    
    // 2. Carrega os dados da aba correta
    if (targetTabId === 'turmas') {
        const tabelaTurmasBody = document.getElementById('tabelaTurmasBody');
        if (tabelaTurmasBody) loadTurmas();
    }
    else if (targetTabId === 'planos') {
        const tabelaPlanosBody = document.getElementById('tabelaPlanosBody');
        if (tabelaPlanosBody) loadPlanos();
    }
}
// --- FIM DA FUNÇÃO DE CONTROLE DE ABA ---


document.addEventListener('componentsLoaded', () => {
  console.log('[turmas-e-conteudos.js] Evento "componentsLoaded" recebido.');

  // --- 1. Seleção (Elementos) ---
  const tabelaTurmasBody = document.getElementById('tabelaTurmasBody');
  const openModalTurmaBtn = document.getElementById('openModalTurmaBtn');
  const modalTurma = document.getElementById('modalTurma');
  const closeModalTurmaBtn = document.getElementById('closeModalTurmaBtn');
  const formTurma = document.getElementById('formTurma');
  const turmaModalTitle = document.getElementById('turmaModalTitle');
  const turmaModalSubmitBtn = document.getElementById('turmaModalSubmitBtn');
  const inputEducationLevel = document.getElementById('turma-educationLevel');
  const inputSchoolYear = document.getElementById('turma-schoolYear');
  const selectTeacher = document.getElementById('turma-teacherId');
  const selectPlan = document.getElementById('turma-planId');
  const studentContainer = document.getElementById('student-selection-container');
  const turmasSearch = document.getElementById('turmas-search');
  const turmasFilterGrade = document.getElementById('turmas-filter-grade');
  const turmasFilterSort = document.getElementById('turmas-filter-sort');

  const tabelaPlanosBody = document.getElementById('tabelaPlanosBody');
  const openModalPlanoBtn = document.getElementById('openModalPlanoBtn');
  const modalPlano = document.getElementById('modalPlano');
  const closeModalPlanoBtn = document.getElementById('closeModalPlanoBtn');
  const formPlano = document.getElementById('formPlano');
  const planoGradeInput = document.getElementById('plano-gradeLevel');
  const planoYearInput = document.getElementById('plano-schoolYear');
  const planoFileInput = document.getElementById('plano-file');
  const planosSearch = document.getElementById('planos-search');
  const planosFilterGrade = document.getElementById('planos-filter-grade');

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

  const modalViewPDF = document.getElementById('modalViewPDF');
  const pdfViewerFrame = document.getElementById('pdfViewerFrame');
  const closePdfBtn = document.getElementById('closePdfBtn');
  const pdfTitle = document.getElementById('pdfTitle');


  // --- Funções Auxiliares de Modal ---
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

  const openPDF = (url, title) => {
    if (!modalViewPDF) return;
    pdfTitle.textContent = title || "Visualizando Arquivo";
    const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
    pdfViewerFrame.src = googleViewerUrl;
    modalViewPDF.style.display = 'flex';
  };
  const closePDF = () => {
    if (!modalViewPDF) return;
    modalViewPDF.style.display = 'none';
    pdfViewerFrame.src = "about:blank";
  };


  // --- Lógica de Turmas ---
  
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
    } catch (e) { tabelaTurmasBody.innerHTML = `<tr><td colspan="7">${e.message}</td></tr>`; }
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
      document.getElementById('turma-startTime').value = turma.startTime || '';
      document.getElementById('turma-endTime').value = turma.endTime || '';
      document.getElementById('turma-teacherId').value = turma.teacherId || '';
      document.getElementById('turma-planId').value = turma.planId || '';
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
  
  // --- Lógica dos Planos ---
  if (document.getElementById('plano-gradeLevel')) { 
    document.getElementById('plano-gradeLevel').addEventListener('change', () => {
      const planoGradeInput = document.getElementById('plano-gradeLevel');
      const planoYearInput = document.getElementById('plano-schoolYear');
      const level = planoGradeInput.value;
      planoYearInput.innerHTML = '<option value="">Selecione...</option>';
      if (level && schoolYearsMap[level]) {
        planoYearInput.disabled = false;
        schoolYearsMap[level].forEach(year => {
          planoYearInput.innerHTML += `<option value="${year}">${year}</option>`;
        });
      } else {
        planoYearInput.disabled = true;
      }
    });
  }

  const loadPlanos = async () => {
    tabelaPlanosBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    const params = new URLSearchParams();
    if (document.getElementById('planos-search').value) params.append('search', document.getElementById('planos-search').value);
    if (document.getElementById('planos-filter-grade').value) params.append('gradeLevel', document.getElementById('planos-filter-grade').value);

    try {
      const planos = await api.get(`/api/plans?viewMode=admin&${params.toString()}`);
      tabelaPlanosBody.innerHTML = '';
      if (!planos || planos.length === 0) {
        tabelaPlanosBody.innerHTML = '<tr><td colspan="4">Nenhum plano.</td></tr>'; return;
      }
      planos.forEach(p => {
         const tr = document.createElement('tr');
         let btnPdf = '<span style="color:#ccc">Sem arquivo</span>';
         if (p.pdfUrl) {
             btnPdf = `<button class="btn-link view-pdf-btn" data-url="${p.pdfUrl}" data-name="${p.name}" style="background:none;border:none;color:#007BFF;cursor:pointer;text-decoration:underline;">Ver PDF</button>`;
         }

         tr.innerHTML = `
           <td>${p.name}</td>
           <td>${p.gradeLevel} (${p.schoolYear || '-'})</td>
           <td>${btnPdf}</td>
           <td>
             <button class="btn btn-danger btn-sm delete-btn-plano" data-id="${p.id}">Apagar</button>
           </td>
         `;
         tabelaPlanosBody.appendChild(tr);
      });
    } catch (e) { tabelaPlanosBody.innerHTML = `<tr><td colspan="4">${e.message}</td></tr>`; }
  };

  const handlePlanoFormSubmit = async (e) => {
    e.preventDefault();
    const file = document.getElementById('plano-file').files[0];
    if (!file) { showStatus('Aviso', "Selecione um arquivo PDF."); return; } 

    const btn = formPlano.querySelector('button');
    const txtOriginal = btn.textContent;
    btn.textContent = "Enviando...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('name', document.getElementById('plano-name').value);
    formData.append('gradeLevel', document.getElementById('plano-gradeLevel').value);
    formData.append('schoolYear', document.getElementById('plano-schoolYear').value);
    formData.append('pdfFile', file);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch('http://localhost:3000/api/plans', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.message || 'Falha na rede.');

      showStatus('Sucesso', 'Plano criado com sucesso!');
      modalPlano.style.display = 'none';
      loadPlanos();
    } catch (error) {
      showStatus('Erro', `Erro ao salvar plano: ${error.message}`);
    } finally {
      btn.textContent = txtOriginal;
      btn.disabled = false;
    }
  };

  // --- Listeners ---
  openModalTurmaBtn.addEventListener('click', openModalCriar);
  closeModalTurmaBtn.addEventListener('click', () => modalTurma.style.display = 'none');
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

  turmasSearch.addEventListener('input', loadTurmas);
  turmasFilterGrade.addEventListener('change', loadTurmas);
  turmasFilterSort.addEventListener('change', loadTurmas);
  
  // Planos
  openModalPlanoBtn.addEventListener('click', () => {
    formPlano.reset();
    planoYearInput.disabled = true;
    modalPlano.style.display = 'flex';
  });
  closeModalPlanoBtn.addEventListener('click', () => modalPlano.style.display = 'none');
  formPlano.addEventListener('submit', handlePlanoFormSubmit);
  
  tabelaPlanosBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn-plano')) {
      const id = e.target.dataset.id;
      showConfirm("Tem certeza que quer apagar este plano?", async () => {
        try {
          await api.delete(`/api/plans/${id}`);
          showStatus('Sucesso', 'Plano apagado.');
          loadPlanos();
        } catch(e) { showStatus('Erro', e.message); }
      });
    }
    if (e.target.classList.contains('view-pdf-btn')) {
        e.preventDefault();
        const url = e.target.dataset.url;
        const name = e.target.dataset.name;
        openPDF(url, name);
    }
  });

  planoGradeInput.addEventListener('change', () => {
    const level = planoGradeInput.value;
    planoYearInput.innerHTML = '<option value="">Selecione...</option>';
    if (level && schoolYearsMap[level]) {
      planoYearInput.disabled = false;
      schoolYearsMap[level].forEach(year => {
        planoYearInput.innerHTML += `<option value="${year}">${year}</option>`;
      });
    } else {
      planoYearInput.disabled = true;
    }
  });


  // Modais Genéricos Listeners
  closeStatusBtn.addEventListener('click', closeStatus);
  okStatusBtn.addEventListener('click', closeStatus);
  closeConfirmacaoBtn.addEventListener('click', closeConfirm);
  cancelarConfirmacaoBtn.addEventListener('click', closeConfirm);
  confirmarAcaoBtn.addEventListener('click', () => {
    if (actionToConfirm) actionToConfirm();
    closeConfirm();
  });

  const closePdfBtnElement = document.getElementById('closePdfBtn');
  if (closePdfBtnElement) closePdfBtnElement.addEventListener('click', closePDF);

  // Init
  const urlParams = new URLSearchParams(window.location.search);
  const aba = urlParams.get('tab');
  switchTab(aba === 'planos' ? 'planos' : 'turmas');
});