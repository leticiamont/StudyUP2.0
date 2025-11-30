import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

console.log('[planos.js] Carregando...');
initLayout();

let currentEditingId = null; // Variável para controlar se é Edição ou Criação
let actionToConfirm = null; 

// Mapa de Níveis -> Anos
const schoolYearsMap = {
  "Fundamental 1": ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"],
  "Fundamental 2": ["6º Ano", "7º Ano", "8º Ano", "9º Ano"],
  "Ensino Médio": ["1ª Série", "2ª Série", "3ª Série"]
};

document.addEventListener('componentsLoaded', () => {
  console.log('[planos.js] Evento "componentsLoaded" recebido.');

  // --- Funções Auxiliares de Modal ---
  const getElement = (id) => document.getElementById(id);

  const showStatus = (title, msg) => {
    const modalStatus = getElement('modalStatus');
    if (modalStatus) {
        getElement('statusModalTitle').textContent = title;
        getElement('statusModalMessage').textContent = msg;
        modalStatus.style.display = 'flex';
    }
  };
  const closeStatus = () => getElement('modalStatus').style.display = 'none';

  const showConfirm = (msg, callback) => {
    const modalConfirmacao = getElement('modalConfirmacao');
    if (modalConfirmacao) {
        getElement('confirmacaoMessage').textContent = msg;
        actionToConfirm = callback;
        modalConfirmacao.style.display = 'flex';
    }
  };
  const closeConfirm = () => {
    const modalConfirmacao = getElement('modalConfirmacao');
    if (modalConfirmacao) modalConfirmacao.style.display = 'none';
    actionToConfirm = null;
  };

  const openPDF = (url, title) => {
    const modalViewPDF = getElement('modalViewPDF');
    if (!modalViewPDF) return;
    getElement('pdfTitle').textContent = title || "Visualizando Arquivo";
    const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
    getElement('pdfViewerFrame').src = googleViewerUrl;
    modalViewPDF.style.display = 'flex';
  };
  const closePDF = () => {
    const modalViewPDF = getElement('modalViewPDF');
    if (modalViewPDF) modalViewPDF.style.display = 'none';
    if (getElement('pdfViewerFrame')) getElement('pdfViewerFrame').src = "about:blank";
  };


  // --- 1. Seleção (Elementos) ---
  const tabelaPlanosBody = getElement('tabelaPlanosBody');
  const openModalPlanoBtn = getElement('openModalPlanoBtn');
  const modalPlano = getElement('modalPlano');
  const closeModalPlanoBtn = getElement('closeModalPlanoBtn');
  const formPlano = getElement('formPlano');
  
  const planoNameInput = getElement('plano-name');
  const planoGradeInput = getElement('plano-gradeLevel');
  const planoYearInput = getElement('plano-schoolYear');
  const planoFileInput = getElement('plano-file');
  
  // Elementos dinâmicos do modal (Título e Botão)
  const modalTitle = modalPlano.querySelector('h2');
  const submitBtn = formPlano.querySelector('button[type="submit"]');

  const planosSearch = getElement('planos-search');
  const planosFilterGrade = getElement('planos-filter-grade');

  const closeStatusBtn = getElement('closeStatusModalBtn');
  const okStatusBtn = getElement('okStatusModalBtn');
  const closeConfirmacaoBtn = getElement('closeConfirmacaoModalBtn');
  const cancelarConfirmacaoBtn = getElement('cancelarConfirmacaoBtn');
  const confirmarAcaoBtn = getElement('confirmarAcaoBtn');
  const closePdfBtn = getElement('closePdfBtn');


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
      if (!planos || planos.length === 0) {
        tabelaPlanosBody.innerHTML = '<tr><td colspan="4">Nenhum plano.</td></tr>'; return;
      }
      planos.forEach(p => {
         const tr = document.createElement('tr');
         let btnPdf = p.pdfUrl ? `<button class="btn-link view-pdf-btn" data-url="${p.pdfUrl}" data-name="${p.name}" style="background:none;border:none;color:#007BFF;cursor:pointer;text-decoration:underline;">Ver PDF</button>` : '<span style="color:#ccc">Sem arquivo</span>';

         tr.innerHTML = `
           <td>${p.name}</td>
           <td>${p.gradeLevel} (${p.schoolYear || '-'})</td>
           <td>${btnPdf}</td>
           <td>
             <button class="btn btn-secondary btn-sm edit-btn-plano" data-id="${p.id}">Editar</button>
             <button class="btn btn-danger btn-sm delete-btn-plano" data-id="${p.id}">Apagar</button>
           </td>
         `;
         tabelaPlanosBody.appendChild(tr);
      });
    } catch (e) { tabelaPlanosBody.innerHTML = `<tr><td colspan="4" style="color: red;">${e.message}</td></tr>`; }
  };

  // --- FUNÇÃO UNIFICADA DE SUBMIT (CRIAR E EDITAR) ---
  const handlePlanoFormSubmit = async (e) => {
    e.preventDefault();
    
    const file = planoFileInput.files[0];
    const isEditing = currentEditingId !== null;

    // Validação: Se for criar, PDF é obrigatório. Se for editar, é opcional.
    if (!isEditing && !file) { 
        showStatus('Aviso', "Selecione um arquivo PDF."); 
        return; 
    } 

    const btn = formPlano.querySelector('button');
    const txtOriginal = btn.textContent;
    btn.textContent = "Enviando...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('name', planoNameInput.value);
    formData.append('gradeLevel', planoGradeInput.value);
    formData.append('schoolYear', planoYearInput.value);
    
    // Só anexa o arquivo se ele foi selecionado
    if (file) {
        formData.append('pdfFile', file);
    }

    try {
      const token = localStorage.getItem("authToken");
      let url = '/api/plans';
      let method = 'POST';

      if (isEditing) {
          url = `/api/plans/${currentEditingId}`; // URL de atualização
          method = 'PUT';
      }

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

  // --- FUNÇÕES DE MODAL (ABRIR) ---

  const openModalCriar = () => {
    currentEditingId = null;
    formPlano.reset();
    
    // Reseta textos
    modalTitle.textContent = 'Novo Plano de Aula';
    submitBtn.textContent = 'Salvar e Enviar PDF';
    
    // Reseta estado dos inputs
    planoYearInput.disabled = true;
    planoYearInput.innerHTML = '<option value="">Selecione o nível primeiro</option>';
    
    // PDF Obrigatório na criação
    const fileLabel = formPlano.querySelector('label[for="plano-file"]');
    fileLabel.innerHTML = 'Arquivo PDF';
    planoFileInput.required = true;

    modalPlano.style.display = 'flex';
  };

  const openModalEditar = async (id) => {
    currentEditingId = id;
    formPlano.reset();
    
    modalTitle.textContent = 'Editar Plano de Aula';
    submitBtn.textContent = 'Atualizar Plano';
    
    try {
        // Busca os dados atuais
        const plano = await api.get(`/api/plans/${id}`);
        
        // Preenche os campos
        planoNameInput.value = plano.name || '';
        planoGradeInput.value = plano.gradeLevel || '';
        
        // Dispara evento para carregar os anos
        planoGradeInput.dispatchEvent(new Event('change'));
        
        // Seleciona o ano correto após carregar
        setTimeout(() => {
            planoYearInput.value = plano.schoolYear || '';
        }, 50);

        // PDF Opcional na edição
        const fileLabel = formPlano.querySelector('label[for="plano-file"]');
        planoFileInput.removeAttribute('required');
        
        if (plano.pdfUrl) {
            fileLabel.innerHTML = `Arquivo PDF (Atual: <a href="${plano.pdfUrl}" target="_blank">Ver</a> - *Opcional*)`;
        } else {
            fileLabel.textContent = 'Arquivo PDF (Opcional)';
        }

        modalPlano.style.display = 'flex';

    } catch (e) {
        showStatus('Erro', 'Erro ao carregar dados do plano: ' + e.message);
    }
  };

  // --- Listeners ---
  openModalPlanoBtn.addEventListener('click', openModalCriar);
  
  closeModalPlanoBtn.addEventListener('click', () => modalPlano.style.display = 'none');
  formPlano.addEventListener('submit', handlePlanoFormSubmit);
  
  tabelaPlanosBody.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    const id = target.dataset.id;
    const name = target.dataset.name;

    if (target.classList.contains('delete-btn-plano')) {
      showConfirm(`Tem certeza que quer apagar o plano '${name}'?`, async () => {
        try {
          await api.delete(`/api/plans/${id}`);
          showStatus('Sucesso', 'Plano apagado.');
          loadPlanos();
        } catch(e) { showStatus('Erro', e.message); }
      });
    }
    // AGORA SIM: EDITAR ABRE O MODAL CERTO
    if (target.classList.contains('edit-btn-plano')) {
        openModalEditar(id);
    }
    if (target.classList.contains('view-pdf-btn')) {
        e.preventDefault();
        const url = target.dataset.url;
        openPDF(url, name);
    }
  });

  // Filtros
  planosSearch.addEventListener('input', loadPlanos);
  planosFilterGrade.addEventListener('change', loadPlanos);

  // Modais Genéricos
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