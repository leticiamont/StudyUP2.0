import api from "../api/api.js";

document.getElementById("formAluno").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nome: document.getElementById("nome").value,
    email: document.getElementById("email").value,
    matricula: document.getElementById("matricula").value,
    curso: document.getElementById("curso").value,
    tipo: "aluno",
    dataCadastro: new Date().toISOString(),
  };

  try {
    const res = await api.post("/users", data);
    document.getElementById("status").innerText = "✅ Aluno cadastrado com sucesso!";
    console.log(res.data);
  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "❌ Erro ao cadastrar aluno.";
  }
});
