// src/utils/generateCredentials.js
import { db } from "../config/firebase.js";

// 🔹 Função para gerar nome de usuário único (primeiroNome.ultimoSobrenome)
export async function generateUsername(fullName) {
  if (!fullName) throw new Error("Nome completo é obrigatório");

  const nomes = fullName.trim().toLowerCase().split(" ");
  const primeiroNome = nomes[0];
  const ultimoSobrenome = nomes[nomes.length - 1];
  let baseUsername = `${primeiroNome}.${ultimoSobrenome}`;
  let username = baseUsername;

  // Verifica se já existe no banco
  let exists = true;
  let count = 1;

  while (exists) {
    const snapshot = await db.collection("users").where("username", "==", username).get();
    if (snapshot.empty) {
      exists = false;
    } else {
      username = `${baseUsername}${count}`;
      count++;
    }
  }

  return username;
}

// 🔹 Senha padrão temporária (fixa para o primeiro acesso)
export function generateTemporaryPassword() {
  return "Study123!"; // Pode trocar se quiser
}
