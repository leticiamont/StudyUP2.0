// Função para trocar de páginas do desktop
function abrirPagina(pagina) {
  window.location.href = `../pages/${pagina}.html`;
}

// Quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
  const botoes = {
    inicio: "inicio",
    professores: "professores",
    alunos: "alunos",
    turmasConteudos: "turmas",
    suporte: "suporte",
    configuracao: "configuracao",
  };

  Object.entries(botoes).forEach(([id, pagina]) => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener("click", () => abrirPagina(pagina));
    }
  });
});