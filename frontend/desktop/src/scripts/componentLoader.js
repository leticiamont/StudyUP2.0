/**
 * @description Carrega um componente HTML em um seletor.
 */
export async function loadComponent(selector, path) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(path);
    const html = await res.text();
    el.innerHTML = html;
  } catch (err) {
    console.error("Error loading component", path, err);
  }
}

/**
 * @description Configura a lógica do Topbar (Menu Perfil e Logout)
 */
function setupTopbar() {
  const userProfileBtn = document.getElementById('userProfileBtn');
  const userDropdown = document.getElementById('userDropdown');
  const logoutBtn = document.getElementById('logoutBtn');

  if (userProfileBtn && userDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => {
      if (userDropdown.classList.contains('show')) {
        userDropdown.classList.remove('show');
      }
    });
  }

  // Lógica de Logout (Usa modal injetado pelo initLayout)
  if (logoutBtn) {
    const modalLogout = document.getElementById('modalLogout');
    const confirmBtn = document.getElementById('confirmLogoutBtn');
    
    // Abre o modal de logout customizado
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault(); 
      if (modalLogout) modalLogout.style.display = 'flex';
    });
    
    // Confirma e limpa token
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      window.location.href = '../pages/login.html';
    });
  }
}

/**
 * @description Adiciona os listeners de clique para os botões do menu.
 */
function setupNavigation() {
  // --- ROTAS ATUALIZADAS (Turmas e Planos Separados) ---
  const routes = {
    "inicio": "../pages/inicio.html",
    "professores": "../pages/professores.html",
    "alunos": "../pages/alunos.html",
    "turmas": "../pages/turmas.html", 
    "planos": "../pages/planos.html"
  };

  Object.keys(routes).forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener("click", () => {
        const path = routes[buttonId];
        // Evita recarregar a página se já estiver nela
        if (!window.location.href.includes(path.split('/').pop())) {
           window.location.href = path;
        }
      });
    }
  });
}

/**
 * @description Ponto de entrada
 */
export async function initLayout() {
  const token = localStorage.getItem("authToken");
  
  // Porteiro
  if (!token && !window.location.href.includes("login.html")) {
    window.location.href = "../pages/login.html";
    return;
  }

  // Carrega Layout
  if (token) {
      // 1. Injeta o modal de Logout (para não travar)
      if (!document.getElementById('modalLogout')) {
          document.body.insertAdjacentHTML('beforeend', `
            <div id="modalLogout" class="modal-overlay" style="z-index:2000; display:none;">
              <div class="modal-content">
                <span id="closeLogoutModalBtn" class="modal-close">&times;</span>
                <h2>Sair do Sistema</h2>
                <p>Tem certeza que deseja encerrar sua sessão?</p>
                <div class="form-actions">
                  <button id="cancelLogoutBtn" class="btn btn-secondary">Cancelar</button>
                  <button id="confirmLogoutBtn" class="btn btn-primary" style="background-color: #d32f2f;">Sair</button>
                </div>
              </div>
            </div>`);
      }
      
      await loadComponent("#menu-container", "../components/menu.html");
      await loadComponent("#topbar-container", "../components/topbar.html");
      
      setupNavigation(); // Ativa menu lateral
      setupTopbar();     // Ativa menu de perfil/logout
      
      // Adiciona listeners para fechar o modal injetado
      const closeBtn = document.getElementById('closeLogoutModalBtn');
      const cancelBtn = document.getElementById('cancelLogoutBtn');
      const modal = document.getElementById('modalLogout');
      if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
      if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');
  }

  document.dispatchEvent(new Event("componentsLoaded"));
}