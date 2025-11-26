import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

// Páginas Públicas
import LoginPage from "../pages/LoginPage";

// Páginas do Professor
import DashboardPageP from "../pages/Professor/DashboardPageP";
import TurmasPageP from "../pages/Professor/TurmasPageP";
import TurmaDetalheP from "../pages/Professor/TurmaDetalheP";
import ConteudoPageP from "../pages/Professor/ConteudoPageP";
import ForumPageP from "../pages/Professor/ForumPageP";
import ConfiguracoesPageP from "../pages/Professor/ConfiguracoesPageP";

// Páginas do Aluno
import DashboardPageA from "../pages/Aluno/DashboardPageA";
import AlunoConteudoA from "../pages/Aluno/AlunoConteudoA";
import AlunoIdeA from "../pages/Aluno/AlunoIdeA";
import AlunoJogosA from "../pages/Aluno/AlunoJogosA"; // <--- 🚨 NOVO
import GameQuizA from "../pages/Aluno/GameQuizA";     // <--- NOVO (Sub-rota)
import AlunoForumA from "../pages/Aluno/AlunoForumA";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rota Pública */}
      <Route path="/" element={<LoginPage />} />

      {/* --- ROTAS DO PROFESSOR --- */}
      <Route path="/dashboardP" element={<ProtectedRoute><DashboardPageP /></ProtectedRoute>} />
      <Route path="/turmasP" element={<ProtectedRoute><TurmasPageP /></ProtectedRoute>} />
      <Route path="/turmasP/:id" element={<ProtectedRoute><TurmaDetalheP /></ProtectedRoute>} />
      <Route path="/conteudoP" element={<ProtectedRoute><ConteudoPageP /></ProtectedRoute>} />
      <Route path="/forumP" element={<ProtectedRoute><ForumPageP /></ProtectedRoute>} />
      <Route path="/configuracoesP" element={<ProtectedRoute><ConfiguracoesPageP /></ProtectedRoute>} />

      {/* --- ROTAS DO ALUNO --- */}
      <Route path="/dashboardA" element={<ProtectedRoute><DashboardPageA /></ProtectedRoute>} />
      <Route path="/aluno/conteudo" element={<ProtectedRoute><AlunoConteudoA /></ProtectedRoute>} />
      <Route path="/aluno/ide" element={<ProtectedRoute><AlunoIdeA /></ProtectedRoute>} />
      
      {/* 🚨 ROTA DO MAPA DE JOGOS */}
      <Route path="/aluno/jogos" element={<ProtectedRoute><AlunoJogosA /></ProtectedRoute>} />
      
      {/* ROTA DO QUIZ (Sub-rota do jogo) */}
      <Route path="/aluno/jogos/quiz" element={<ProtectedRoute><GameQuizA /></ProtectedRoute>} />
      
      <Route path="/aluno/forum" element={<ProtectedRoute><AlunoForumA /></ProtectedRoute>} />
    </Routes>
  );
}