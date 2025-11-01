import api from "../api/api.js";

document.getElementById("formProfessor").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  const data = {
    nome,
    email,
    senha,
    tipo: "professor",
    turmas: [],
    ativo: true,
    dataCadastro: new Date().toISOString(),
  };

  try {
    const res = await api.post("/users", data);
    document.getElementById("status").innerText = "✅ Professor cadastrado com sucesso!";
    console.log(res.data);
    e.target.reset();
  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "❌ Erro ao cadastrar professor.";
  }
});
