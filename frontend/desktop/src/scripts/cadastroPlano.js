import { postPlan } from "../api/api.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("titulo").value;
    const description = document.getElementById("descricao").value;
    const grade = document.getElementById("ano").value;

    const plan = { title, description, grade };

    try {
      const response = await postPlan(plan);
      console.log("Plano cadastrado:", response);
      alert("Plano cadastrado com sucesso!");
    } catch (error) {
      console.error("Erro ao cadastrar plano:", error);
      alert("Erro ao cadastrar plano.");
    }
  });
});
