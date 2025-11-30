import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

console.log('[planos.js] Carregando...');
initLayout();

let actionToConfirm = null; 
let currentEditingId = null; // <- NOVO: Para saber se estamos editando

// Mapa de Níveis -> Anos (Para o Modal de Criação)
const schoolYearsMap = {
  "Fundamental 1": ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"],
  "Fundamental 2": ["6º Ano", "7º Ano", "8º Ano", "9º Ano"],
  "Ensino Médio": ["1ª Série", "2ª Série", "3ª Série"]
};

document.addEventListener('componentsLoaded', () => {
  // --- Seleção de Elementos ---
  const tabelaPlanosBody = document.getElementById('tabelaPlanosBody');
  const openModalPlanoBtn = document.getElementById('openModalPlanoBtn');
  const modalPlano = document.getElementById('modalPlano');
  const closeModalPlanoBtn = document.getElementById('closeModalPlanoBtn');
  const formPlano = document.getElementById('formPlano');
  const planoNameInput = document.getElementById('plano-name');
  const planoGradeInput = document.getElementById('plano-gradeLevel');
  const planoYearInput = document.getElementById('plano-schoolYear');
  const planoFileInput = document.getElementById('plano-file');
  const planosSearch = document.getElementById('planos-search');
  const planosFilterGrade = document.getElementById('planos-filter-grade');
  
  // Modais Genéricos
  const statusTitle = document.getElementById('statusModalTitle');
  const statusMsg = document.getElementById('statusModalMessage');
  const modalStatus = document.getElementById('modalStatus');
  const closeStatusBtn = document.getElementById('closeStatusModalBtn');
  const okStatusBtn = document.getElementById('okStatusModalBtn');
  const modalConfirmacao = document.getElementById('modalConfirmacao');
  const closeConfirmacaoBtn = document.getElementById('closeConfirmacaoModalBtn');
  const confirmarAcaoBtn = document.getElementById('confirmarAcaoBtn');
  const closePdfBtn = document.getElementById('closePdfBtn');

  // --- Funções Auxiliares de Modal ---
  const getElement = (id) => document.getElementById(id);
  const showStatus = (title, msg) => { /* ... */ };
  const closeStatus = () => { /* ... */ };
  const showConfirm = (msg, callback) => { /* ... */ };
  const closeConfirm = () => { /* ... */ };
  const openPDF = (url, title) => { /* ... */ };
  const closePDF = () => { /* ... */ };


  // --- Lógica de Planos ---
  
  // Cascata Nível -> Ano
  if (planoGradeInput) {
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
  }


  const loadPlanos = async () => {
    tabelaPlanosBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    const params = new URLSearchParams();
    if (planosSearch.value) params.append('search', planosSearch.value);
    if (planosFilterGrade.value) params.append('gradeLevel', planosFilterGrade.value);

    try {
      const planos = await api.get(`/api/plans?viewMode=admin&${params.toString()}`);
      tabelaPlanosBody.innerHTML = '';
      if (!planos || planos.length === 0) { tabelaPlanosBody.innerHTML = '<tr><td colspan="4">Nenhum plano.</td></tr>'; return; }
      planos.forEach(p => {
         const tr = document.createElement('tr');
         let btnPdf = p.pdfUrl ? `<button class="btn-link view-pdf-btn" data-url="${p.pdfUrl}" data-name="${p.name}" style="background:none;border:none;color:#007BFF;cursor:pointer;text-decoration:underline;">Ver PDF</button>` : '<span style="color:#ccc">Sem arquivo</span>';

         tr.innerHTML = `
           <td>${p.name}</td>
           <td>${p.gradeLevel} (${p.schoolYear || '-'})</td>
           <td>${btnPdf}</td>
           <td>
             <button class="btn btn-secondary btn-sm edit-btn-plano" data-id="${p.id}" style="margin-right: 5px;">Editar</button>
             <button class="btn btn-danger btn-sm delete-btn-plano" data-id="${p.id}">Apagar</button>
           </td>
         `;
         tabelaPlanosBody.appendChild(tr);
      });
    } catch (e) { tabelaPlanosBody.innerHTML = `<tr><td colspan="4" style="color: red;">${e.message}</td></tr>`; }
  };

  const handlePlanoFormSubmit = async (e) => {
    e.preventDefault();
    
    const isEditing = currentEditingId !== null;
    const file = planoFileInput.files[0];
    
    // Regra: Se está criando OU editando E não tem arquivo, precisa de um PDF
    if (!isEditing && !file) { 
        showStatus('Aviso', "Selecione um arquivo PDF."); 
        return; 
    } 

    const btn = formPlano.querySelector('button');
    const txtOriginal = btn.textContent;
    btn.textContent = "Enviando...";
    btn.disabled = true;

    // 1. Coleta dados: Envia TUDO (incluindo file, que pode ser undefined)
    const formData = new FormData();
    formData.append('name', planoNameInput.value);
    formData.append('gradeLevel', planoGradeInput.value);
    formData.append('schoolYear', planoYearInput.value);
    if (file) {
        formData.append('pdfFile', file);
    }
    
    // 2. Chama a API
    try {
      const token = localStorage.getItem("authToken");
      let url = '/api/plans';
      let method = 'POST';

      if (isEditing) {
        url = `/api/plans/${currentEditingId}`;
        method = 'PUT'; // O PUT (atualizar) deve aceitar FormData/Multipart
      }

      // IMPORTANTE: O PUT/POST com FormData deve ser feito via fetch, 
      // mas precisamos de uma solução que envie os campos text também.
      // O backend deve ser capaz de lidar com a ausência de req.file se for PUT.
      
      const response = await fetch(`http://localhost:3000${url}`, {
          method: method,
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.message || 'Falha na rede.');

      showStatus('Sucesso', `Plano ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
      modalPlano.style.display = 'none';
      loadPlanos();
    } catch (error) {
      showStatus('Erro', `Erro ao salvar plano: ${error.message}`);
    } finally {
      btn.textContent = txtOriginal;
      btn.disabled = false;
    }
  };


  // --- Funções do Modal (NOVO: Edit) ---

  const openModalCriar = () => {
    currentEditingId = null;
    formPlano.reset();
    planoYearInput.disabled = true;
    planoGradeInput.dispatchEvent(new Event('change')); // Limpa o dropdown Ano
    modalPlano.style.display = 'flex';
  };

  const openModalParaEditar = async (id) => {
    currentEditingId = id;
    
    const modalTitle = modalPlano.querySelector('h2');
    const submitBtn = formPlano.querySelector('button[type="submit"]');

    modalTitle.textContent = 'Editar Plano de Aula';
    submitBtn.textContent = 'Atualizar';
    formPlano.reset();

    try {
        const plano = await api.get(`/api/plans/${id}`);
        
        planoNameInput.value = plano.name || '';
        planoGradeInput.value = plano.gradeLevel || '';
        
        // Carrega Anos (Cascata)
        planoGradeInput.dispatchEvent(new Event('change'));

        setTimeout(() => {
            planoYearInput.value = plano.schoolYear || '';
        }, 50);

        // Seção para o PDF:
        const fileInput = document.getElementById('plano-file');
        const fileLabel = fileInput.closest('.form-group').querySelector('label[for="plano-file"]');
        
        if (plano.pdfUrl) {
            // Se já tem PDF, torna o input OPCIONAL e mostra o link
            fileInput.removeAttribute('required');
            fileLabel.innerHTML = `Arquivo PDF (Atual: <a href="${plano.pdfUrl}" target="_blank">Ver PDF</a> - *Opcional*)`;
        } else {
            fileInput.required = true;
            fileLabel.textContent = 'Arquivo PDF';
        }
        
        modalPlano.style.display = 'flex';
    } catch (e) {
        showStatus('Erro', e.message);
    }
  };
  // --- Listeners ---
  
  // Botão Adicionar
  openModalPlanoBtn.addEventListener('click', openModalCriar);
  closeModalPlanoBtn.addEventListener('click', () => modalPlano.style.display = 'none');
  formPlano.addEventListener('submit', handlePlanoFormSubmit);
  
  // Listener da Tabela
  tabelaPlanosBody.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    const id = target.dataset.id;
    const name = target.dataset.name;

    // 1. DELETE
    if (target.classList.contains('delete-btn-plano')) {
      showConfirm(`Tem certeza que quer apagar o plano '${name}'?`, async () => {
        try {
          await api.delete(`/api/plans/${id}`);
          showStatus('Sucesso', 'Plano apagado.');
          loadPlanos();
        } catch(e) { showStatus('Erro', e.message); }
      });
    }
    // 2. EDITAR
    if (target.classList.contains('edit-btn-plano')) {
        openModalParaEditar(id);
    }
    // 3. VIEW PDF
    if (target.classList.contains('view-pdf-btn')) {
        e.preventDefault();
        openPDF(target.dataset.url, target.dataset.name);
    }
  });


  // Cascata Nível -> Ano Listener (JÁ DEFINIDO ACIMA)


  // Filtros
  planosSearch.addEventListener('input', loadPlanos);
  planosFilterGrade.addEventListener('change', loadPlanos);

  // Modais Genéricos Listeners
  closeStatusBtn.addEventListener('click', closeStatus);
  okStatusBtn.addEventListener('click', closeStatus);
  closeConfirmacaoBtn.addEventListener('click', closeConfirm);
  cancelarConfirmacaoBtn.addEventListener('click', closeConfirm);
  confirmarAcaoBtn.addEventListener('click', () => {
    if (actionToConfirm) actionToConfirm();
    closeConfirm();
  });

  if (closePdfBtn) closePdfBtn.addEventListener('click', closePDF);

  // Init
  loadPlanos();
});