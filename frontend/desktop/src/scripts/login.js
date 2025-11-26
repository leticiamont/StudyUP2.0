import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- COPIE SUA API KEY DO MOBILE AQUI ---
const firebaseConfig = {
  apiKey: "AIzaSyCisZeEtSJYTjat4gCUei4taVnJYwG361Y", // Já copiei do seu upload!
  authDomain: "studyup2-cd10e.firebaseapp.com",
  projectId: "studyup2-cd10e",
  storageBucket: "studyup2-cd10e.firebasestorage.app",
  messagingSenderId: "530845484312",
  appId: "1:530845484312:web:05320479b068d2adf64a6d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const lembrarCheckbox = document.getElementById("lembrar");
const errorMessage = document.getElementById("errorMessage");
const toggleSenha = document.getElementById("toggleSenha");

const savedEmail = localStorage.getItem("studyupEmail");
if (savedEmail) {
  emailInput.value = savedEmail;
  lembrarCheckbox.checked = true;
}

if (toggleSenha) {
  toggleSenha.addEventListener("click", () => {
    const isPwd = senhaInput.type === "password";
    senhaInput.type = isPwd ? "text" : "password";
    toggleSenha.textContent = isPwd ? "visibility_off" : "visibility";
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMessage.textContent = "Autenticando...";
  errorMessage.style.color = "#666";

  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  try {
    // 1. Login no Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const token = await userCredential.user.getIdToken();

    // 2. Verifica com o Backend
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Erro no servidor.");

    // 3. Verifica se é Admin
    if (data.user.role !== 'admin') {
      throw new Error("Acesso negado: Apenas administradores.");
    }

    // 4. Sucesso -> Salva Token
    localStorage.setItem("authToken", token);
    if (lembrarCheckbox.checked) localStorage.setItem("studyupEmail", email);
    else localStorage.removeItem("studyupEmail");

    window.location.href = "inicio.html";

  } catch (error) {
    console.error(error);
    let msg = "Erro ao entrar.";
    if (error.code === 'auth/invalid-credential') msg = "Email ou senha incorretos.";
    if (error.message) msg = error.message;
    errorMessage.textContent = msg;
    errorMessage.style.color = "red";
  }
});