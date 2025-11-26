export async function loadComponent(selector, path) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(path);
    el.innerHTML = await res.text();
  } catch (err) { console.error(err); }
}

function setupNavigation() {
  const routes = {
    "inicio": "../pages/inicio.html",
    "professores": "../pages/professores.html",
    "alunos": "../pages/alunos.html",
    "turmasConteudos": "../pages/turmas-e-conteudos.html"
  };
  Object.keys(routes).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", () => {
        const path = routes[id];
        if (!window.location.href.includes(path.split('/').pop())) window.location.href = path;
    });
  });
}

function setupTopbar() {
  const profileBtn = document.getElementById('userProfileBtn');
  const dropdown = document.getElementById('userDropdown');
  const logoutBtn = document.getElementById('logoutBtn');

  if (profileBtn && dropdown) {
    profileBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('show'); });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
  }
  
  if (logoutBtn) {
      // Injeta modal de logout se não existir
      if (!document.getElementById('modalLogout')) {
          document.body.insertAdjacentHTML('beforeend', `
            <div id="modalLogout" class="modal-overlay" style="z-index:2000; display:none;">
              <div class="modal-content">
                <h2>Sair</h2><p>Deseja sair?</p>
                <div class="form-actions">
                  <button id="cancelLogout" class="btn btn-secondary">Cancelar</button>
                  <button id="confirmLogout" class="btn btn-primary" style="background:#d32f2f;">Sair</button>
                </div>
              </div>
            </div>`);
      }
      const modal = document.getElementById('modalLogout');
      logoutBtn.addEventListener('click', () => modal.style.display = 'flex');
      document.getElementById('cancelLogout').addEventListener('click', () => modal.style.display = 'none');
      document.getElementById('confirmLogout').addEventListener('click', () => {
          localStorage.removeItem('authToken');
          window.location.href = '../pages/login.html';
      });
  }
}

export async function initLayout() {
  const token = localStorage.getItem("authToken");
  
  // Se não tem token e não está no login -> CHUTA PARA O LOGIN
  if (!token && !window.location.href.includes("login.html")) {
    window.location.href = "../pages/login.html";
    return;
  }

  // Se tem token, carrega o layout
  if (token) {
      await loadComponent("#menu-container", "../components/menu.html");
      await loadComponent("#topbar-container", "../components/topbar.html");
      setupNavigation();
      setupTopbar();
  }

  document.dispatchEvent(new Event("componentsLoaded"));
}