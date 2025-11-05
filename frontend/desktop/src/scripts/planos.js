const backendURL = "http://localhost:3000/plans";

const modal = document.getElementById("modal");
const btnAdd = document.getElementById("btnAdd");
const btnFechar = document.getElementById("btnFechar");
const formAddPlan = document.getElementById("formAddPlan");
const tableBody = document.getElementById("tableBody");

// Abrir modal
btnAdd.addEventListener("click", () => modal.classList.remove("hidden"));
// Fechar modal
btnFechar.addEventListener("click", () => modal.classList.add("hidden"));

// Carregar planos
async function carregarPlanos() {
  const res = await fetch(backendURL);
  const data = await res.json();

  tableBody.innerHTML = "";
  data.forEach((plan) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${plan.title}</td>
      <td>${plan.description}</td>
      <td>${plan.grade}</td>
      <td>${new Date(plan.createdAt).toLocaleDateString("pt-BR")}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Cadastrar plano
formAddPlan.addEventListener("submit", async (e) => {
  e.preventDefault();

  const plano = {
    title: titulo.value,
    description: descricao.value,
    grade: nivel.value,
    createdAt: new Date().toISOString(),
  };

  const res = await fetch(backendURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plano),
  });

  if (res.ok) {
    alert("Plano adicionado com sucesso!");
    modal.classList.add("hidden");
    formAddPlan.reset();
    carregarPlanos();
  } else {
    alert("Erro ao adicionar plano.");
  }
});

carregarPlanos();
