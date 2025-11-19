import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

// --- Estado Global da Página ---
let plano = {
  id: null,
  name: '',
  gradeLevel: '',
  modules: [] 
};
let selectedModuleId = null;
let currentEditingModuleId = null;
let currentEditingTopicId = null;

// --- Seleção Principal de Elementos ---
// (Adiciona os seletores do Modal de Status)
let headerTitle, salvarPlanoBtn, planoNameInput, planoGradeInput, modulosList, topicosList, topicosHeaderTitle, openModalTopicoBtn;
let modalModulo, modalTopico, formModulo, formTopico;
let modalStatus, statusModalTitle, statusModalMessage, closeStatusModalBtn, okStatusModalBtn;

/**
 * @description Pega todos os elementos do DOM após o 'componentsLoaded'
 * Isso previne o 'TypeError: Cannot read properties of null'
 */
function selecionarElementosDOM() {
  headerTitle = document.getElementById('plano-header-title');
  salvarPlanoBtn = document.getElementById('salvarPlanoBtn');
  planoNameInput = document.getElementById('plano-name');
  planoGradeInput = document.getElementById('plano-gradeLevel');
  modulosList = document.getElementById('modulosList');
  topicosList = document.getElementById('topicosList');
  topicosHeaderTitle = document.getElementById('topicos-header-title');
  openModalTopicoBtn = document.getElementById('openModalTopicoBtn');
  
  // Modais
  modalModulo = document.getElementById('modalModulo');
  modalTopico = document.getElementById('modalTopico');
  formModulo = document.getElementById('formModulo');
  formTopico = document.getElementById('formTopico');
  
  // Modal de Status
  modalStatus = document.getElementById('modalStatus');
  statusModalTitle = document.getElementById('statusModalTitle');
  statusModalMessage = document.getElementById('statusModalMessage');
  closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
  okStatusModalBtn = document.getElementById('okStatusModalBtn');

  // Checagem de segurança
  if (!headerTitle || !modalModulo || !modalTopico || !modalStatus) {
    console.error("ERRO CRÍTICO: Elementos principais do Construtor de Planos não encontrados. Verifique o HTML.");
    return false;
  }
  return true;
}

/**
 * @description Gera um UUID simples
 */
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- Funções (Modal Status) ---
const showStatusModal = (title, message) => {
  if (!modalStatus) return; // Segurança
  statusModalTitle.textContent = title;
  statusModalMessage.textContent = message;
  modalStatus.style.display = 'flex';
};
const closeStatusModal = () => {
  if (modalStatus) modalStatus.style.display = 'none';
};

// --- Funções de Renderização (Atualizar a UI) ---

function renderModules() {
  modulosList.innerHTML = '';
  if (plano.modules.length === 0) {
    modulosList.innerHTML = '<li class="item-placeholder">Nenhum módulo criado.</li>';
    return;
  }
  plano.modules.forEach(mod => {
    const li = document.createElement('li');
    li.dataset.id = mod.id;
    li.className = (mod.id === selectedModuleId) ? 'active' : '';
    li.innerHTML = `
      <span>${mod.title} (${mod.totalPoints} pts)</span>
      <span class="item-actions">
        <button class="edit-btn-modulo material-symbols-rounded" data-id="${mod.id}" title="Editar Módulo">edit</button>
        <button class="delete-btn-modulo material-symbols-rounded" data-id="${mod.id}" title="Apagar Módulo">delete</button>
      </span>
    `;
    modulosList.appendChild(li);
  });
}

function renderTopics() {
  if (selectedModuleId === null) {
    topicosHeaderTitle.textContent = 'Tópicos (Aulas)';
    topicosList.innerHTML = '<li class="item-placeholder">Selecione um módulo para ver os tópicos.</li>';
    openModalTopicoBtn.disabled = true;
    return;
  }
  const modulo = plano.modules.find(m => m.id === selectedModuleId);
  if (!modulo) {
    selectedModuleId = null;
    renderTopics(); 
    return;
  }
  topicosHeaderTitle.textContent = `Tópicos de: ${modulo.title}`;
  openModalTopicoBtn.disabled = false;
  topicosList.innerHTML = ''; 
  if (modulo.topics.length === 0) {
    topicosList.innerHTML = '<li class="item-placeholder">Nenhum tópico criado.</li>';
    return;
  }
  modulo.topics.forEach(topic => {
    const li = document.createElement('li');
    li.dataset.id = topic.id;
    li.innerHTML = `
      <span>${topic.title}</span>
      <span class="item-actions">
        <button class="edit-btn-topico material-symbols-rounded" data-id="${topic.id}" title="Editar Tópico">edit</button>
        <button class="delete-btn-topico material-symbols-rounded" data-id="${topic.id}" title="Apagar Tópico">delete</button>
      </span>
    `;
    topicosList.appendChild(li);
  });
}

// --- Funções Principais (Carregar e Salvar) ---

async function loadPlanoData() {
  const urlParams = new URLSearchParams(window.location.search);
  const planoId = urlParams.get('id');

  if (planoId) {
    // --- MODO EDIÇÃO ---
    try {
      const data = await api.get(`/api/plans/${planoId}`);
      plano = data; 
      headerTitle.textContent = `Editando Plano: ${plano.name}`;
      planoNameInput.value = plano.name;
      planoGradeInput.value = plano.gradeLevel;
      if (!plano.modules) plano.modules = [];
      plano.modules.forEach(m => { if (!m.topics) m.topics = []; });
    } catch (error) {
      headerTitle.textContent = 'Erro ao Carregar Plano';
      showStatusModal('Erro ao Carregar', 'Não foi possível carregar este plano: ' + error.message);
    }
  } else {
    // --- MODO CRIAÇÃO ---
    headerTitle.textContent = 'Novo Plano de Aula';
  }
  renderModules();
  renderTopics();
}

/**
 * @description Salva o objeto 'plano' inteiro e REDIRECIONA
 */
async function salvarPlano() {
  console.log('Salvando plano...', plano);
  
  plano.name = planoNameInput.value;
  plano.gradeLevel = planoGradeInput.value;
  
  if (!plano.name || !plano.gradeLevel) {
    showStatusModal('Erro', 'Nome do Plano e Nível Escolar são obrigatórios.');
    return;
  }

  showStatusModal('Salvando...', 'A guardar alterações no plano.');

  try {
    if (plano.id) {
      // --- MODO EDIÇÃO (PUT) ---
      await api.put(`/api/plans/${plano.id}`, plano);
    } else {
      // --- MODO CRIAÇÃO (POST + PUT) ---
      const dadosBasicos = { name: plano.name, gradeLevel: plano.gradeLevel };
      const novoPlano = await api.post('/api/plans', dadosBasicos);
      plano.id = novoPlano.id; 
      
      if (plano.modules.length > 0) {
        await api.put(`/api/plans/${plano.id}`, plano);
      }
    }
    
    // --- SUCESSO E REDIRECIONAMENTO (A CORREÇÃO ESTÁ AQUI) ---
    statusModalTitle.textContent = 'Sucesso!';
    statusModalMessage.textContent = 'Plano salvo. A voltar para a lista...';
    
    setTimeout(() => {
      // AVISA para qual aba voltar (adiciona ?tab=planos)
      window.location.href = './turmas-e-conteudos.html?tab=planos';
    }, 1500);

  } catch (error) {
    console.error('Erro ao salvar plano:', error);
    showStatusModal('Erro ao Salvar', error.message);
  }
}

// --- Ponto de Entrada Principal ---

// 1. Carrega o layout (Menu/Topbar)
initLayout(); 

// 2. Ouve o evento do layout (para garantir que o HTML do menu está pronto)
document.addEventListener('componentsLoaded', () => {
  console.log('[plano-detalhe.js] Componentes carregados.');
  
  // 3. AGORA é seguro selecionar os elementos do DOM
  if (!selecionarElementosDOM()) {
    return; // Para se os elementos não forem encontrados
  }

  // 4. Carrega os dados do plano (da URL)
  loadPlanoData();

  // 5. Anexa todos os listeners
  
  // Botão "Salvar Alterações" (no topo)
  salvarPlanoBtn.addEventListener('click', salvarPlano);

  // --- Lógica dos Módulos (Coluna 2) ---
  document.getElementById('openModalModuloBtn').addEventListener('click', () => {
    currentEditingModuleId = null;
    formModulo.reset();
    document.getElementById('modalModuloTitle').textContent = 'Novo Módulo';
    modalModulo.style.display = 'flex';
  });
  
  modulosList.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li || !li.dataset.id) return;
    const id = li.dataset.id;
    
    if (e.target.classList.contains('delete-btn-modulo')) {
      if (confirm('Tem certeza que quer apagar este módulo e TODOS os tópicos dentro dele?')) {
        plano.modules = plano.modules.filter(m => m.id !== id);
        if (selectedModuleId === id) selectedModuleId = null;
        renderModules();
        renderTopics();
      }
    } 
    else if (e.target.classList.contains('edit-btn-modulo')) {
      currentEditingModuleId = id;
      const modulo = plano.modules.find(m => m.id === id);
      formModulo.elements['title'].value = modulo.title;
      formModulo.elements['totalPoints'].value = modulo.totalPoints;
      document.getElementById('modalModuloTitle').textContent = 'Editar Módulo';
      modalModulo.style.display = 'flex';
    }
    else {
      selectedModuleId = id;
      renderModules();
      renderTopics();
    }
  });

  // Salvar (Formulário do Modal Módulo)
  formModulo.addEventListener('submit', (e) => {
    e.preventDefault(); // <-- Isto previne o recarregamento (o bug #1)
    const data = new FormData(formModulo);
    const moduloData = {
      title: data.get('title'),
      totalPoints: parseInt(data.get('totalPoints'), 10)
    };
    if (currentEditingModuleId) {
      const index = plano.modules.findIndex(m => m.id === currentEditingModuleId);
      plano.modules[index] = { ...plano.modules[index], ...moduloData };
    } else {
      moduloData.id = uuidv4();
      moduloData.topics = [];
      plano.modules.push(moduloData);
    }
    modalModulo.style.display = 'none';
    renderModules();
  });
  
  // --- Lógica dos Tópicos (Coluna 3) ---
  openModalTopicoBtn.addEventListener('click', () => {
    currentEditingTopicId = null;
    formTopico.reset();
    document.getElementById('modalTopicoTitle').textContent = 'Novo Tópico';
    modalTopico.style.display = 'flex';
  });

  topicosList.addEventListener('click', (e) => {
    const id = e.target.closest('li')?.dataset.id;
    if (!id) return;
    const modulo = plano.modules.find(m => m.id === selectedModuleId);
    if (!modulo) return;

    if (e.target.classList.contains('delete-btn-topico')) {
      if (confirm('Tem certeza que quer apagar este tópico?')) {
        modulo.topics = modulo.topics.filter(t => t.id !== id);
        renderTopics();
      }
    } 
    else if (e.target.classList.contains('edit-btn-topico')) {
      currentEditingTopicId = id;
      const topico = modulo.topics.find(t => t.id === id);
      formTopico.elements['title'].value = topico.title;
      formTopico.elements['description'].value = topico.description;
      document.getElementById('modalTopicoTitle').textContent = 'Editar Tópico';
      modalTopico.style.display = 'flex';
    }
  });

  // Salvar (Formulário do Modal Tópico)
  formTopico.addEventListener('submit', (e) => {
    e.preventDefault(); // <-- Isto previne o recarregamento
    const data = new FormData(formTopico);
    const topicoData = {
      title: data.get('title'),
      description: data.get('description')
    };
    const modulo = plano.modules.find(m => m.id === selectedModuleId);
    if (currentEditingTopicId) {
      const index = modulo.topics.findIndex(t => t.id === currentEditingTopicId);
      modulo.topics[index] = { ...modulo.topics[index], ...topicoData };
    } else {
      topicoData.id = uuidv4();
      modulo.topics.push(topicoData);
    }
    modalTopico.style.display = 'none';
    renderTopics();
  });

  // Listeners para fechar modais
  document.getElementById('closeModalModuloBtn').addEventListener('click', () => modalModulo.style.display = 'none');
  document.getElementById('closeModalTopicoBtn').addEventListener('click', () => modalTopico.style.display = 'none');
  
  // Listeners do Modal de Status (NOVO)
  closeStatusModalBtn.addEventListener('click', closeStatusModal);
  okStatusModalBtn.addEventListener('click', closeStatusModal);
});