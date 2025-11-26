import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./GameQuizA.css";

// Editor simples para questões de código
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { dracula } from '@uiw/codemirror-theme-dracula';

export default function GameQuizA() {
  const location = useLocation();
  const navigate = useNavigate();
  const { levelData } = location.state || {};

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gameStatus, setGameStatus] = useState('loading'); // loading, playing, finished
  
  // Estados de Resposta
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [codeOutput, setCodeOutput] = useState("");
  const [isCodeRunning, setIsCodeRunning] = useState(false);

  useEffect(() => {
    if (!levelData) {
        alert("Erro ao carregar fase.");
        navigate('/aluno/jogos');
        return;
    }
    generateQuiz();
  }, []);

  const generateQuiz = async () => {
    try {
        // Chama a IA para criar o quiz baseado no PDF ou Texto
        const payload = levelData.type === 'text' 
            ? { textContent: levelData.content } 
            : { pdfUrl: levelData.url };
            
        const response = await api.post("/api/ia/gerar-quiz", payload);
        
        if (Array.isArray(response.data)) {
            setQuestions(response.data);
            setGameStatus('playing');
        } else {
            throw new Error("Formato inválido");
        }
    } catch (error) {
        console.error("Erro quiz:", error);
        alert("Não foi possível criar o desafio agora.");
        navigate('/aluno/jogos');
    } finally {
        setLoading(false);
    }
  };

  // --- Lógica de Jogo ---
  
  const handleOptionClick = (index) => {
      if (isAnswerChecked) return;
      setSelectedOption(index);
      setIsAnswerChecked(true);

      if (index === questions[currentIndex].correctIndex) {
          setScore(s => s + questions[currentIndex].points);
      }

      // Avança após 2s
      setTimeout(nextQuestion, 2000);
  };

  const handleRunCode = async () => {
      setIsCodeRunning(true);
      setCodeOutput("Executando...");
      const currentQ = questions[currentIndex];

      try {
          const res = await api.post("/api/ia/run-python", { code: codeAnswer });
          const output = res.data.output ? res.data.output.trim() : "";
          setCodeOutput(output);

          if (output == currentQ.expectedOutput?.trim()) {
             setScore(s => s + currentQ.points);
             setTimeout(nextQuestion, 2000); // Acertou, avança
          } else {
             alert(`Saída incorreta. Esperado: ${currentQ.expectedOutput}`);
          }
      } catch (e) { setCodeOutput("Erro de execução."); }
      finally { setIsCodeRunning(false); }
  };

  const nextQuestion = () => {
      if (currentIndex < questions.length - 1) {
          setCurrentIndex(c => c + 1);
          setSelectedOption(null);
          setIsAnswerChecked(false);
          setCodeAnswer("");
          setCodeOutput("");
      } else {
          setGameStatus('finished');
          // Aqui você poderia salvar os pontos no backend (updateUser)
      }
  };

  // --- Renderização ---

  if (loading) return (
    <div className="quiz-loading">
        <div className="spinner"></div>
        <h2>Preparando o Desafio com IA...</h2>
        <p>Lendo o material: {levelData?.title}</p>
    </div>
  );

  if (gameStatus === 'finished') return (
    <div className="quiz-finished">
        <span className="material-symbols-rounded trophy-icon">emoji_events</span>
        <h1>Parabéns!</h1>
        <p>Você completou o desafio.</p>
        <div className="final-score">
            <span>Pontuação Total:</span>
            <strong>{score} XP</strong>
        </div>
        <button className="btn-back-map" onClick={() => navigate('/aluno/jogos')}>Voltar ao Mapa</button>
    </div>
  );

  const currentQ = questions[currentIndex];

  return (
    <div className="quiz-container">
        <div className="quiz-header">
            <button onClick={() => navigate('/aluno/jogos')} className="btn-quit">✕ Sair</button>
            <div className="progress-bar-quiz">
                <div className="progress-fill-quiz" style={{width: `${((currentIndex + 1) / questions.length) * 100}%`}}></div>
            </div>
            <div className="score-quiz">
                <span className="material-symbols-rounded">star</span> {score}
            </div>
        </div>

        <div className="quiz-content">
            <div className="question-box">
                <span className="q-num">Questão {currentIndex + 1}</span>
                <h2>{currentQ.question}</h2>
            </div>

            {currentQ.type === 'code' ? (
                <div className="code-challenge-area">
                    <div className="editor-quiz">
                        <CodeMirror 
                            value={codeAnswer || currentQ.initialCode || ""} 
                            height="200px" 
                            theme={dracula} 
                            extensions={[python()]} 
                            onChange={(val) => setCodeAnswer(val)} 
                        />
                    </div>
                    <div className="terminal-quiz">
                        <span>Saída:</span>
                        <pre>{codeOutput}</pre>
                    </div>
                    <button className="btn-run-quiz" onClick={handleRunCode} disabled={isCodeRunning}>
                        {isCodeRunning ? 'Rodando...' : 'Executar e Verificar'}
                    </button>
                </div>
            ) : (
                <div className="options-grid">
                    {currentQ.options.map((opt, idx) => {
                        let statusClass = "";
                        if (isAnswerChecked) {
                            if (idx === currentQ.correctIndex) statusClass = "correct";
                            else if (idx === selectedOption) statusClass = "wrong";
                        }
                        return (
                            <button 
                                key={idx} 
                                className={`option-btn ${statusClass}`} 
                                onClick={() => handleOptionClick(idx)}
                                disabled={isAnswerChecked}
                            >
                                {opt}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    </div>
  );
}