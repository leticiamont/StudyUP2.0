import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import api from "../../services/api";
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { dracula } from '@uiw/codemirror-theme-dracula';
import "./AlunoIdeA.css";

export default function AlunoIdeA() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [code, setCode] = useState(`print("Olá, Mundo!")\n# Digite seu código aqui:`);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintText, setHintText] = useState("");
  const [hintLoading, setHintLoading] = useState(false);

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput("Executando...");
    try {
      const response = await api.post("/api/ia/run-python", { code });
      const resultado = response.data.output || "Código executado sem retorno.";
      setOutput(resultado);
    } catch (error) {
      setOutput("Erro ao conectar com o servidor.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleGetHint = async () => {
    setHintLoading(true); setHintText(""); setShowHintModal(true);
    const prompt = `Analise este código Python e dê uma dica curta:\n\n${code}`;
    try {
      const response = await api.post("/api/ia/gerar", { prompt });
      setHintText(response.data.resposta);
    } catch (error) { setHintText("Erro na IA."); } 
    finally { setHintLoading(false); }
  };

  const handleLogout = async () => {
    if (window.confirm("Sair?")) {
      await signOut(auth); localStorage.removeItem("token"); navigate("/");
    }
  };

  return (
    <div className="student-container">
      <aside className="student-sidebar">
        <div className="sidebar-logo"><span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span></div>
        <nav className="student-nav">
            <div onClick={() => navigate('/dashboardA')} className="s-nav-item"><span className="material-symbols-rounded">home</span> Início</div>
            <div onClick={() => navigate('/aluno/conteudo')} className="s-nav-item"><span className="material-symbols-rounded">book</span> Aulas</div>
            <div onClick={() => navigate('/aluno/ide')} className="s-nav-item active"><span className="material-symbols-rounded">terminal</span> IDE Python</div>
            
            {/* 🚨 CORREÇÃO DE NAVEGAÇÃO JOGOS */}
            <div onClick={() => navigate('/aluno/jogos')} className="s-nav-item"><span className="material-symbols-rounded">sports_esports</span> Jogos</div>
            
            <div className="s-nav-item"><span className="material-symbols-rounded">forum</span> Fórum</div>
        </nav>
        <button className="btn-logout" onClick={handleLogout}><span className="material-symbols-rounded">logout</span> Sair</button>
      </aside>

      <main className="ide-content">
        <header className="ide-header">
            <div className="ide-title"><span className="material-symbols-rounded python-icon">code</span><h1>Python Playground</h1></div>
            <div className="ide-actions">
                <button className="btn-hint" onClick={handleGetHint}><span className="material-symbols-rounded">lightbulb</span> Dica</button>
                <button className="btn-run" onClick={handleRunCode} disabled={isRunning}><span className="material-symbols-rounded">play_arrow</span> {isRunning ? "Rodando..." : "Executar"}</button>
            </div>
        </header>

        <div className="ide-workspace">
            <div className="editor-pane">
                <div className="pane-header">main.py</div>
                <div className="code-wrapper">
                    <CodeMirror value={code} height="100%" theme={dracula} extensions={[python()]} onChange={(val) => setCode(val)} className="codemirror-custom" />
                </div>
            </div>
            <div className="terminal-pane">
                <div className="pane-header">Terminal</div>
                <div className="terminal-output"><pre>{output || "Aguardando..."}</pre></div>
            </div>
        </div>
      </main>

      {showHintModal && (
        <div className="student-modal-overlay">
            <div className="student-modal-box">
                <div className="student-modal-header"><h3>Dica da IA</h3><button onClick={() => setShowHintModal(false)} className="close-btn">✕</button></div>
                <div className="student-modal-body">{hintLoading ? <div className="loading-ai">Analisando...</div> : <div className="hint-text">{hintText}</div>}</div>
            </div>
        </div>
      )}
    </div>
  );
}