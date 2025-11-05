// Importa o 'api' e o 'initLayout'
import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

// 1. Carrega o Menu/Layout
console.log('[professores.js] Carregando... Chamando initLayout().');
initLayout();

// 2. Ouve o evento de layout carregado
document.addEventListener('componentsLoaded', () => {
  console.log('[professores.js] "componentsLoaded" recebido. Iniciando script.');

  // --- 1. Seleção de Elementos ---
  const tabelaProfessoresBody = document.getElementById('tabelaProfessoresBody');
  const openModalProfessorBtn = document.getElementById('openModalProfessorBtn');
  const modalProfessor = document.getElementById('modalProfessor');
  const closeModalProfessorBtn = document.getElementById('closeModalProfessorBtn');
  const formProfessor = document.getElementById('formProfessor');

  // Verificação
  if (!tabelaProfessoresBody || !openModalProfessorBtn || !modalProfessor) {
    console.error('[professores.js] ERRO CRÍTICO: Elementos essenciais do DOM (modal, tabela) não encontrados.');
    return;
  }

  // --- 2. Funções Principais ---

  /**
   * @description Carrega a lista de usuários com role 'teacher'
   */
  const loadProfessores = async () => {
    tabelaProfessoresBody.innerHTML = '<tr><td colspan="4">Carregando professores...</td></tr>';
    
    try {
      // Chama o endpoint com o filtro de 'role'
      // (Isso vai funcionar assim que ajustarmos o backend)
      const professores = await api.get('/api/users?role=teacher');
      
      tabelaProfessoresBody.innerHTML = ''; // Limpa "Carregando"

      if (!professores || professores.length === 0) {
        tabelaProfessoresBody.innerHTML = '<tr><td colspan="4">Nenhum professor cadastrado.</td></tr>';
        return;
      }

      // Popula a tabela
      professores.forEach(prof => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${prof.displayName || 'Nome não definido'}</td>
          <td>${prof.email || 'N/A'}</td>
          <td>${prof.assignedClasses || 0}</td> <td>
            <button class="btn btn-secondary btn-sm" data-id="${prof.id}">Editar</button>
          </td>
        `;
        tabelaProfessoresBody.appendChild(tr);
      });

    } catch (error) {
      console.error('[loadProfessores] Erro:', error.message);
      // Se o backend ainda não foi ajustado, o erro 500 ou 400 do service cairá aqui
      tabelaProfessoresBody.innerHTML = `<tr><td colspan="4" style="color: red;">Erro ao carregar professores: ${error.message}</td></tr>`;
    }
  };

  /**
   * @description Manipula o submit do formulário de novo professor
   */
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(formProfessor);
    
    const dadosProfessor = {
      displayName: formData.get('displayName'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: 'teacher' // Definimos o cargo aqui
    };

    // Validação simples
    if (!dadosProfessor.displayName || !dadosProfessor.email || !dadosProfessor.password) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    try {
      // Chama o endpoint de criação de usuário (POST /api/users)
      // O 'userService.createUser' vai receber esse objeto no 'req.body'
      await api.post('/api/users', dadosProfessor);
      
      alert('Professor(a) criado com sucesso!');
      closeModal();
      loadProfessores(); // Recarrega a lista

    } catch (error) {
      console.error('[handleFormSubmit] Erro:', error.message);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  // --- 3. Funções do Modal ---
  const openModal = () => modalProfessor.style.display = 'flex';
  const closeModal = () => {
    modalProfessor.style.display = 'none';
    formProfessor.reset();
  };

  // --- 4. Listeners ---
  openModalProfessorBtn.addEventListener('click', openModal);
  closeModalProfessorBtn.addEventListener('click', closeModal);
  formProfessor.addEventListener('submit', handleFormSubmit);

  // --- 5. Inicialização ---
  loadProfessores();
});
