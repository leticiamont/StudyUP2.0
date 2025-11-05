// Importa o 'api' e o 'initLayout'
import api from '../services/api.js';
import { initLayout } from './componentLoader.js';

// 1. Carrega o Menu/Layout
console.log('[alunos.js] Carregando... Chamando initLayout().');
initLayout();

// 2. Ouve o evento de layout carregado
document.addEventListener('componentsLoaded', () => {
  console.log('[alunos.js] "componentsLoaded" recebido. Iniciando script.');

  // --- 1. Seleção de Elementos ---
  const tabelaAlunosBody = document.getElementById('tabelaAlunosBody');
  const openModalAlunoBtn = document.getElementById('openModalAlunoBtn');
  const modalAluno = document.getElementById('modalAluno');
  const closeModalAlunoBtn = document.getElementById('closeModalAlunoBtn');
  const formAluno = document.getElementById('formAluno');

  if (!tabelaAlunosBody || !openModalAlunoBtn || !modalAluno) {
    console.error('[alunos.js] ERRO CRÍTICO: Elementos essenciais do DOM (modal, tabela) não encontrados.');
    return;
  }

  // --- 2. Funções Helper (Geração de Credenciais) ---

  /**
   * @description Gera um username a partir do nome completo.
   * Ex: "Leticia Santos" -> "leticia.santos"
   */
  const gerarUsername = (nomeCompleto) => {
    if (!nomeCompleto) return '';
    const partes = nomeCompleto.toLowerCase()
      .normalize("NFD") // Remove acentos
      .replace(/[\u0300-\u036f]/g, "")
      .split(' ');
    
    if (partes.length === 1) return partes[0];
    
    const primeiroNome = partes[0];
    const ultimoSobrenome = partes[partes.length - 1];
    
    // (MVP: Não estamos checando duplicatas, mas funciona)
    return `${primeiroNome}.${ultimoSobrenome}`; 
  };
  
  /**
   * @description Gera uma senha provisória simples.
   */
  const gerarSenhaProvisoria = () => {
    // Para o MVP, uma senha fixa é aceitável.
    // Futuramente, podemos usar: Math.random().toString(36).slice(-8);
    return 'studyup123';
  };


  // --- 3. Funções Principais ---

  const loadAlunos = async () => {
    tabelaAlunosBody.innerHTML = '<tr><td colspan="5">Carregando alunos...</td></tr>';
    try {
      // Chama o endpoint com o filtro de 'role'
      const alunos = await api.get('/api/users?role=student');
      
      tabelaAlunosBody.innerHTML = ''; // Limpa "Carregando"

      if (!alunos || alunos.length === 0) {
        tabelaAlunosBody.innerHTML = '<tr><td colspan="5">Nenhum aluno cadastrado.</td></tr>';
        return;
      }

      // Popula a tabela
      alunos.forEach(aluno => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${aluno.displayName || 'N/A'}</td>
          <td>${aluno.username || 'N/A'}</td> <td>${aluno.gradeLevel || 'Não definido'}</td> <td>${aluno.classId || 'Nenhuma'}</td> <td>
            <button class="btn btn-secondary btn-sm" data-id="${aluno.id}">Editar</button>
          </td>
        `;
        tabelaAlunosBody.appendChild(tr);
      });

    } catch (error) {
      console.error('[loadAlunos] Erro:', error.message);
      tabelaAlunosBody.innerHTML = `<tr><td colspan="5" style="color: red;">Erro ao carregar alunos: ${error.message}</td></tr>`;
    }
  };

  /**
   * @description Manipula o submit do formulário de novo aluno
   */
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(formAluno);
    const displayName = formData.get('displayName');

    if (!displayName) {
      alert('Por favor, preencha o Nome Completo.');
      return;
    }
    
    // Gera as credenciais IDEAIS (sem sufixo)
    const username = gerarUsername(displayName);
    const emailFalso = `${username}@studyup.com`;
    const password = gerarSenhaProvisoria();
    
    const dadosAluno = {
      displayName,
      username,         // O backend vai tratar duplicatas deste
      email: emailFalso, // O backend vai tratar duplicatas deste
      password,
      role: 'student'
    };

    console.log('[alunos.js] Enviando dados para criação do aluno:', dadosAluno);

    try {
      // Chama o POST /api/users
      // O backend vai retornar o username e senha FINAIS
      const creationResult = await api.post('/api/users', dadosAluno);
      
      // SUCESSO!
      // Usa os dados da RESPOSTA do backend, não os que geramos aqui.
      alert(
        `Aluno(a) criado com sucesso!\n\n` +
        `Username: ${creationResult.username}\n` + // <-- Vem do backend
        `Senha Provisória: ${creationResult.password}\n\n` + // <-- Vem do backend
        `(Anote essas credenciais!)`
      );
      
      closeModal();
      loadAlunos(); // Recarrega a lista

    } catch (error) {
      console.error('[handleFormSubmit] Erro:', error.message);
      // O 'error.message' já vai conter a mensagem de erro (ex: Erro 400: ...)
      alert(`Erro ao salvar aluno: ${error.message}`);
    }
  };

  // --- 4. Funções do Modal ---
  const openModal = () => modalAluno.style.display = 'flex';
  const closeModal = () => {
    modalAluno.style.display = 'none';
    formAluno.reset();
  };

  // --- 5. Listeners ---
  openModalAlunoBtn.addEventListener('click', openModal);
  closeModalAlunoBtn.addEventListener('click', closeModal);
  formAluno.addEventListener('submit', handleFormSubmit);

  // --- 6. Inicialização ---
  loadAlunos();
});