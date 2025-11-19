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
 * @description Adiciona os listeners de clique para os botões do menu.
 * (Esta é a nova função de navegação)
 */
function setupNavigation() {
  // Mapeia o ID do botão para o arquivo HTML da página
  const routes = {
    "inicio": "../pages/inicio.html", // (Precisamos criar esta página)
    "professores": "../pages/professores.html",
    "alunos": "../pages/alunos.html",
    "turmasConteudos": "../pages/turmas-e-conteudos.html",
    // "suporte": "../pages/suporte.html",
    // "configuracao": "../pages/configuracao.html"
  };

  // Adiciona o listener para cada botão
  Object.keys(routes).forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener("click", () => {
        // Pega o caminho da página
        const path = routes[buttonId];
        
        // Navega para a nova página
        // (Verifica se já não está na página)
        if (window.location.pathname.endsWith(path)) {
          return; // Já estamos nesta página
        }
        window.location.href = path;
      });
    }
  });

  // (Botões "Suporte" e "Configuração" não estão no 'routes', então eles não farão nada por enquanto)
}

/**
 * @description Ponto de entrada: Carrega layout e ativa a navegação.
 */
export async function initLayout() {
  // 1. Carrega o HTML do menu e topbar
  await loadComponent("#menu-container", "../components/menu.html");
  await loadComponent("#topbar-container", "../components/topbar.html");

  // 2. ATIVA A NAVEGAÇÃO
  // (Adiciona os listeners de clique aos botões do menu que acabamos de carregar)
  setupNavigation();

  // 3. Avisa aos scripts da página (turmas.js, alunos.js) que o layout está pronto
  document.dispatchEvent(new Event("componentsLoaded"));
}