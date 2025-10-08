import api from "../api/api.js";

document.getElementById("formProfessor").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nome: document.getElementById("nome").value,
    email: document.getElementById("email").value,
    area: document.getElementById("area").value,
    curriculo: document.getElementById("curriculo").value,
    tipo: "professor",
    aprovado: false,
    dataCadastro: new Date().toISOString(),
  };

  try {
    const res = await api.post("/users", data);
    document.getElementById("status").innerText = "✅ Professor cadastrado com sucesso!";
    console.log(res.data);
  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "❌ Erro ao cadastrar professor.";
  }
});
