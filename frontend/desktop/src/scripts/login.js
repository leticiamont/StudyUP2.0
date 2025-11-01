// src/scripts/login.js
// usando módulos do Firebase via CDN (versões estáveis) - sem bundler necessário
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ----------------- CONFIGURE AQUI (substituir pelos dados do seu Web App) -----------------
const firebaseConfig = {
  apiKey: "AIzaSyCisZeEtSJYTjat4gCUei4taVnJYwG361Y",
  authDomain: "studyup2-cd10e.firebaseapp.com",
  projectId: "studyup2-cd10e",
  storageBucket: "studyup2-cd10e.firebasestorage.app",
  messagingSenderId: "530845484312",
  appId: "1:530845484312:web:05320479b068d2adf64a6d",
  measurementId: "G-6787BX411N"
};
// ------------------------------------------------------------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const lembrarCheckbox = document.getElementById("lembrar");
const errorMessage = document.getElementById("errorMessage");

// Preencher email salvo
const savedEmail = localStorage.getItem("studyupEmail");
if (savedEmail) {
  emailInput.value = savedEmail;
  lembrarCheckbox.checked = true;
}

// Mostrar / ocultar senha handler (se toggle estiver no HTML)
const toggleSenha = document.getElementById("toggleSenha");
if (toggleSenha) {
  toggleSenha.addEventListener("click", () => {
    const isPwd = senhaInput.type === "password";
    senhaInput.type = isPwd ? "text" : "password";
    toggleSenha.textContent = isPwd ? "visibility" : "visibility_off";
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMessage.textContent = "";

  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email || !senha) {
    errorMessage.textContent = "Preencha email e senha.";
    return;
  }

  try {
    // Login direto com Firebase Auth (frontend)
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    const user = cred.user;

    // Pega ID token (JWT gerado pelo Firebase)
    const token = await user.getIdToken();

    // Envia para o backend para validação e leitura do role
    const res = await fetch("http://localhost:3000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const body = await res.json();
    if (!res.ok) {
      errorMessage.textContent = body.message || "Erro ao autenticar.";
      return;
    }

    // backend retornou user e role
    const backendUser = body.user || {};
    // desktop só permite admin
    if (backendUser.role !== "admin") {
      // opcional: deslogar do firebase para segurança
      await auth.signOut();
      return errorMessage.textContent = "Acesso restrito: apenas administradores podem entrar aqui.";
    }

    // Lembrar email se marcado
    if (lembrarCheckbox.checked) {
      localStorage.setItem("studyupEmail", email);
    } else {
      localStorage.removeItem("studyupEmail");
    }

    // Login OK — redireciona para o painel do admin
    window.location.href = "inicio.html";
  } catch (err) {
    console.error("Erro no login:", err);
    // mensagem amigável
    errorMessage.textContent = "Email ou senha incorretos.";
  }
});
