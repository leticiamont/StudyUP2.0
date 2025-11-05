// Importa o 'api' e o 'initLayout'
import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

// Chama o initLayout() para carregar o menu
console.log('[turmas-e-conteudos.js] Carregando... Chamando initLayout().');
initLayout();

// Ouve o evento que o initLayout() vai disparar
document.addEventListener('componentsLoaded', () => {
  console.log('[turmas-e-conteudos.js] Evento "componentsLoaded" recebido. Iniciando script da página.');

  // --- 1. Seleção (Abas) ---
  const tabLinks = document.querySelectorAll('.sub-menu-item');
  const tabContents = document.querySelectorAll('.tab-content');

  // --- 2. Seleção (Turmas) ---
  const tabelaTurmasBody = document.getElementById('tabelaTurmasBody');
  const openModalTurmaBtn = document.getElementById('openModalTurmaBtn');
  const modalTurma = document.getElementById('modalTurma');
  const closeModalTurmaBtn = document.getElementById('closeModalTurmaBtn');
  const formTurma = document.getElementById('formTurma');
  
  // --- 3. Seleção (Planos) --- (NOVO)
  const tabelaPlanosBody = document.getElementById('tabelaPlanosBody');
  const openModalPlanoBtn = document.getElementById('openModalPlanoBtn');
  const modalPlano = document.getElementById('modalPlano');
  const closeModalPlanoBtn = document.getElementById('closeModalPlanoBtn');
  const formPlano = document.getElementById('formPlano');

  // Verificação de segurança (agora checa o modalPlano)
  if (!tabelaTurmasBody || !openModalTurmaBtn || !modalTurma || !modalPlano) {
    console.error('[turmas-e-conteudos.js] ERRO CRÍTICO: Elementos essenciais do DOM (abas, modais, tabelas) não encontrados.');
    return;
  }

  // --- 4. Lógica de Troca de Abas ---
  const switchTab = (targetTabId) => {
    tabContents.forEach(content => content.classList.remove('active'));
    tabLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(`.sub-menu-item[data-tab="${targetTabId}"]`).classList.add('active');
    document.getElementById(`tab-content-${targetTabId}`).classList.add('active');
    
    if (targetTabId === 'turmas') loadTurmas();
    else if (targetTabId === 'planos') loadPlanos();
  };

  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(e.target.getAttribute('data-tab'));
    });
  });

  // --- 5. Lógica de TURMAS (Sem mudança) ---
  const loadTurmas = async () => {
    tabelaTurmasBody.innerHTML = '<tr><td colspan="7">Carregando turmas...</td></tr>';
    try {
      const turmas = await api.get('/api/classes'); 
      tabelaTurmasBody.innerHTML = '';
      if (!turmas || turmas.length === 0) {
        tabelaTurmasBody.innerHTML = '<tr><td colspan="7">Nenhuma turma cadastrada.</td></tr>';
        return;
      }
      turmas.forEach(turma => {
        if (!turma.gradeLevel || !turma.teacherName) return; 
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${turma.name || 'N/A'}</td>
          <td>${turma.teacherName || 'N/A'}</td>
          <td>${turma.gradeLevel || 'N/A'}</td>
          <td>${turma.planId || 'Nenhum'}</td>
          <td>${turma.schedule || 'N/A'}</td>
          <td>${turma.studentCount !== undefined ? turma.studentCount : 0}</td>
          <td><button class="btn btn-secondary btn-sm" data-id="${turma.id}">Editar</button></td>
        `;
        tabelaTurmasBody.appendChild(tr);
      });
    } catch (error) {
      console.error('[loadTurmas] Erro:', error.message);
      tabelaTurmasBody.innerHTML = `<tr><td colspan="7" style="color: red;">Erro ao carregar turmas: ${error.message}</td></tr>`;
    }
  };

  const handleTurmaFormSubmit = async (e) => {
    e.preventDefault(); 
    const formData = new FormData(formTurma);
    const dadosTurma = {
      name: formData.get('name'),
      teacherName: formData.get('teacherName'),
      gradeLevel: formData.get('gradeLevel'),
      schedule: formData.get('schedule'),
      planId: formData.get('planId') || null,
    };
    try {
      await api.post('/api/classes', dadosTurma);
      alert('Turma criada com sucesso!');
      closeModalTurma();
      loadTurmas();
    } catch (error) {
      console.error('[handleTurmaFormSubmit] Erro:', error.message);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  const openModalTurma = () => modalTurma.style.display = 'flex';
  const closeModalTurma = () => {
    modalTurma.style.display = 'none';
    formTurma.reset();
  };
  openModalTurmaBtn.addEventListener('click', openModalTurma);
  closeModalTurmaBtn.addEventListener('click', closeModalTurma);
  formTurma.addEventListener('submit', handleTurmaFormSubmit);

  // --- 6. Lógica de PLANOS DE AULA (ATUALIZADA) ---

  const loadPlanos = async () => {
    if (!tabelaPlanosBody) return;
    tabelaPlanosBody.innerHTML = '<tr><td colspan="4">Carregando planos...</td></tr>';
    try {
      // 1. CHAMA O ENDPOINT GET QUE AGORA EXISTE
      const planos = await api.get('/api/plans');
      tabelaPlanosBody.innerHTML = '';

      if (!planos || planos.length === 0) {
        tabelaPlanosBody.innerHTML = '<tr><td colspan="4">Nenhum plano de aula cadastrado.</td></tr>';
        return;
      }
      
      // 2. EXIBE O NOVO SCHEMA
      planos.forEach(plano => {
         const tr = document.createElement('tr');
         tr.innerHTML = `
           <td>${plano.id}</td>
           <td>${plano.name || 'N/A'}</td>
           <td>${plano.gradeLevel || 'N/A'}</td>
           <td>
             <button class="btn btn-secondary btn-sm" data-id="${plano.id}">Editar</button>
           </td>
         `;
         tabelaPlanosBody.appendChild(tr);
      });

    } catch (error) {
       console.error('[loadPlanos] Erro ao buscar planos:', error.message);
       // 3. O 404 DEVE DESAPARECER
       tabelaPlanosBody.innerHTML = `<tr><td colspan="4" style="color: red;">Erro ao carregar planos: ${error.message}</td></tr>`;
    }
  };
  
  // 4. LÓGICA DO NOVO MODAL
  const handlePlanoFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(formPlano);
    const dadosPlano = {
        name: formData.get('name'),
        gradeLevel: formData.get('gradeLevel')
    };
    
    try {
        await api.post('/api/plans', dadosPlano);
        alert('Plano de Aula criado com sucesso!');
        closeModalPlano();
        loadPlanos(); // Recarrega a lista
    } catch (error) {
        console.error('[handlePlanoFormSubmit] Erro:', error.message);
        alert(`Erro ao salvar plano: ${error.message}`);
    }
  };
  
  const openModalPlano = () => modalPlano.style.display = 'flex';
  const closeModalPlano = () => {
    modalPlano.style.display = 'none';
    formPlano.reset();
  };
  
  // 5. LISTENERS DO NOVO MODAL
  openModalPlanoBtn.addEventListener('click', openModalPlano);
  closeModalPlanoBtn.addEventListener('click', closeModalPlano);
  formPlano.addEventListener('submit', handlePlanoFormSubmit);

  // --- 7. Inicialização ---
  switchTab('turmas'); // Continua começando na aba de turmas
});