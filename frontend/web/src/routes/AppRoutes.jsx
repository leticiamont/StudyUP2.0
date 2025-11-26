import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute"; // Importe a proteção

// Páginas Gerais
import LoginPage from "../pages/LoginPage";

// Páginas do Professor (Caminhos corrigidos para a pasta Professor)
import DashboardPageP from "../pages/Professor/DashboardPageP";
import TurmasPageP from "../pages/Professor/TurmasPageP";
import TurmaDetalheP from "../pages/Professor/TurmaDetalheP";
import ConteudoPageP from "../pages/Professor/ConteudoPageP";
import ForumPageP from "../pages/Professor/ForumPageP";
import ConfiguracoesPageP from "../pages/Professor/ConfiguracoesPageP";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rota Pública */}
      <Route path="/" element={<LoginPage />} />

      {/* Rotas Protegidas do Professor */}
      <Route 
        path="/dashboardP" 
        element={
          <ProtectedRoute>
            <DashboardPageP />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/turmasP" 
        element={
          <ProtectedRoute>
            <TurmasPageP />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/turmasP/:id" 
        element={
          <ProtectedRoute>
            <TurmaDetalheP />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/conteudoP" 
        element={
          <ProtectedRoute>
            <ConteudoPageP />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/forumP" 
        element={
          <ProtectedRoute>
            <ForumPageP />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/configuracoesP" 
        element={
          <ProtectedRoute>
            <ConfiguracoesPageP />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}