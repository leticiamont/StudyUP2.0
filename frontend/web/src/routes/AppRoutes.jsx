import React from "react";
import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPageP from "../pages/DashboardPageP";
import TurmasPageP from "../pages/TurmasPageP";
import ConteudoPageP from "../pages/ConteudoPageP";
import ForumPageP from "../pages/ForumPageP";
import ConfiguracoesPageP from "../pages/ConfiguracoesPageP";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboardP" element={<DashboardPageP />} />
      <Route path="/turmasP" element={<TurmasPageP />} />
      <Route path="/conteudoP" element={<ConteudoPageP />} />
      <Route path="/forumP" element={<ForumPageP />} />
      <Route path="/configuracoesP" element={<ConfiguracoesPageP />} />
    </Routes>
  );
}
