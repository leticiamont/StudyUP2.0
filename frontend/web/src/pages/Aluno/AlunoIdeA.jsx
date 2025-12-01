import React, { useState, useEffect } from "react";
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

  const [user, setUser] = useState({ points: 0 });
  const [code, setCode] = useState(`def saudar(nome):\n    print(f"Olá, {nome}!")\n\nsaudar("Mundo")`);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  
  // Estados da Dica (IA)
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintText, setHintText] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  
  // Estados de Compra (Novo)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  // Lógica de Cobrança
  const [hintsUsed, setHintsUsed] = useState(() => {
    return parseInt(localStorage.getItem('hints_used') || '0');
  });

  const COST_PER_HINT = 20; 

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("userData") || "{}");
    if (storedUser.uid) {
      setUser(storedUser);
      fetchUserData(storedUser.uid);
    }
  }, []);

  const fetchUserData = async (uid) => {
    try {
      const res = await api.get(`/api/users/${uid}`);
      setUser(res.data);
      localStorage.setItem("userData", JSON.stringify(res.data));
    } catch (error) { console.error("Erro ao atualizar user", error); }
  };

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

  // --- FUNÇÃO CENTRAL: GERA A DICA ---
  const generateHint = async () => {
    setHintLoading(true);
    setHintText("");
    setShowHintModal(true); // Abre o modal da dica (vazio carregando)
    
    const prompt = `Analise o código Python abaixo e forneça uma DICA curta e educativa (máximo 2 frases) sobre o que o aluno deve fazer ou corrigir. Não dê a resposta completa.\n\nCÓDIGO:\n${code}`;

    try {
      const response = await api.post("/api/ia/gerar", { prompt });
      setHintText(response.data.resposta);
      
      // Incrementa contador local
      const newCount = hintsUsed + 1;
      setHintsUsed(newCount);
      localStorage.setItem('hints_used', newCount.toString());

    } catch (error) {
      setHintText("Não foi possível obter uma dica agora.");
    } finally {
      setHintLoading(false);
    }
  };

  // --- BOTÃO DICA: DECISOR ---
  const handleGetHintClick = () => {
    // 1. Se ainda tem grátis, gera direto
    if (hintsUsed < 2) {
        generateHint();
    } 
    // 2. Se acabou a grátis, abre modal de confirmação de compra
    else {
        setShowPurchaseModal(true);
    }
  };

  // --- CONFIRMAR COMPRA ---
  const handleConfirmPurchase = async () => {
    if ((user.points || 0) < COST_PER_HINT) {
        alert("XP Insuficiente! Jogue mais quizzes para ganhar pontos.");
        setShowPurchaseModal(false);
        return;
    }

    try {
        // Deduz pontos no backend
        await api.post('/api/users/deduct-points', { amount: COST_PER_HINT });
        
        // Atualiza visualmente
        fetchUserData(user.uid);
        
        // Fecha modal de compra e abre a dica
        setShowPurchaseModal(false);
        generateHint(); 

    } catch (error) {
        alert("Erro ao processar a troca de pontos.");
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Sair?")) {
      await signOut(auth); localStorage.removeItem("token"); navigate("/");
    }
  };

  // Navegação
  const navigateTo = (path) => navigate(path);

  return (
    <div className="student-container">
      <aside className="student-sidebar">
        <div className="sidebar-logo"><span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span></div>
        <nav className="student-nav">
            <div onClick={() => navigateTo('/dashboardA')} className="s-nav-item"><span className="material-symbols-rounded">home</span> Início</div>
            <div onClick={() => navigateTo('/aluno/conteudo')} className="s-nav-item"><span className="material-symbols-rounded">book</span> Aulas</div>
            <div onClick={() => navigateTo('/aluno/ide')} className="s-nav-item active"><span className="material-symbols-rounded">terminal</span> IDE Python</div>
            <div onClick={() => navigateTo('/aluno/jogos')} className="s-nav-item"><span className="material-symbols-rounded">sports_esports</span> Jogos</div>
            <div onClick={() => navigateTo('/aluno/forum')} className="s-nav-item"><span className="material-symbols-rounded">forum</span> Fórum</div>
        </nav>
        <button className="btn-logout" onClick={handleLogout}><span className="material-symbols-rounded">logout</span> Sair</button>
      </aside>

      <main className="ide-content">
        <header className="ide-header">
            <div className="ide-header-left">
                <span className="material-symbols-rounded python-icon">code</span>
                <h1>Python Playground</h1>
            </div>
            <div className="ide-xp-display">
                <span className="material-symbols-rounded">bolt</span> {user.points || 0} XP
            </div>
            <div className="ide-actions">
                <button className="btn-hint-mobile" onClick={handleGetHintClick}>
                    <span className="material-symbols-rounded">lightbulb</span>
                    {hintsUsed < 2 ? "Dica Grátis" : "Dica (-20 XP)"}
                </button>
                <button className="btn-run-mobile" onClick={handleRunCode} disabled={isRunning}>
                    {isRunning ? <span className="material-symbols-rounded spinning">sync</span> : <span className="material-symbols-rounded">play_arrow</span>}
                    {isRunning ? "Rodando..." : "Executar"}
                </button>
            </div>
        </header>

        <div className="ide-workspace">
            <div className="editor-pane">
                <div className="pane-header"><span>main.py</span><span className="material-symbols-rounded lang-icon">data_object</span></div>
                <div className="code-wrapper">
                    <CodeMirror value={code} height="100%" theme={dracula} extensions={[python()]} onChange={(val) => setCode(val)} className="codemirror-custom" />
                </div>
            </div>
            <div className="terminal-pane">
                <div className="pane-header terminal-header"><span>TERMINAL</span></div>
                <div className="terminal-output"><pre>{output || "..."}</pre></div>
            </div>
        </div>
      </main>

      {/* --- MODAL DICA (Resultado) --- */}
      {showHintModal && (
        <div className="student-modal-overlay">
            <div className="student-modal-box hint-modal-design">
                <div className="hint-modal-header">
                    <span className="material-symbols-rounded hint-bulb-icon">lightbulb</span>
                    <h3>Assistente de Dicas</h3>
                    <button onClick={() => setShowHintModal(false)} className="close-btn">✕</button>
                </div>
                <div className="hint-modal-body">
                    {hintLoading ? (
                        <div className="loading-hint"><div className="spinner-blue"></div><p>Analisando seu código...</p></div>
                    ) : (
                        <p className="hint-text-content">{hintText}</p>
                    )}
                </div>
                <div className="hint-modal-footer">
                    <span className="xp-info">{hintsUsed <= 2 ? "Dica gratuita usada." : "20 XP deduzidos."}</span>
                    <button className="btn-finish-hint" onClick={() => setShowHintModal(false)}>Entendi</button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL CONFIRMAÇÃO DE COMPRA (Novo) --- */}
      {showPurchaseModal && (
        <div className="student-modal-overlay">
            <div className="student-modal-box purchase-modal-design">
                <div className="purchase-header">
                    <span className="material-symbols-rounded lock-icon-large">lock</span>
                    <h3>Desbloquear Dica?</h3>
                </div>
                <div className="purchase-body">
                    <p>Você já usou suas 2 dicas gratuitas.</p>
                    <p className="purchase-price">Custo: <strong>20 XP</strong></p>
                    <p className="user-balance">Seu saldo: {user.points || 0} XP</p>
                </div>
                <div className="purchase-footer">
                    <button className="btn-cancel-purchase" onClick={() => setShowPurchaseModal(false)}>Cancelar</button>
                    <button className="btn-confirm-purchase" onClick={handleConfirmPurchase}>
                        <span className="material-symbols-rounded">check</span> Desbloquear
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}