import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import api from "../../services/api";
import "./DashboardPageP.css";

export default function DashboardPageP() {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [viewMode, setViewMode] = useState('day'); 
  const [user, setUser] = useState({ displayName: "Professor" });
  const [loading, setLoading] = useState(true);
  
  const [notices, setNotices] = useState([]); 
  const [events, setEvents] = useState([]);   
  const [classes, setClasses] = useState([]); 
  
  const [agendaDoDia, setAgendaDoDia] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetails, setDayDetails] = useState({ date: null, items: [] });

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const teacherId = userData.uid;

  useEffect(() => {
    if (userData.displayName) setUser(userData);
    fetchDashboardData();
  }, []);

  useEffect(() => {
    generateCalendarGrid();
    // Garante que a agenda do dia atualize se as aulas ou eventos mudarem
    if (classes.length > 0 || events.length > 0) {
        processarAgendaDoDia(classes, events);
    }
  }, [currentDate, events, classes]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const newsRes = await api.get('/api/news');
      const allNews = newsRes.data;
      
      setNotices(allNews.filter(n => n.type === 'notice' || !n.type));
      setEvents(allNews.filter(n => n.type === 'event'));

      const classesRes = await api.get('/api/classes');
      const myClasses = classesRes.data.filter(c => c.teacherId === teacherId);
      setClasses(myClasses);

    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER: CORREÇÃO DA DATA ---
  const obterDataObjeto = (evento) => {
      // 1. Prioridade: Data agendada (eventDate)
      if (evento.eventDate) {
          // O formato no banco é YYYY-MM-DD (string)
          // Precisamos garantir que o Timezone não atrapalhe.
          // Vamos criar a data considerando o horário, se houver.
          const timeString = evento.eventTime || "00:00";
          return new Date(`${evento.eventDate}T${timeString}:00`); 
      }
      // 2. Fallback: Data de criação
      return new Date(evento.createdAt);
  };

  const formatarHora = (evento) => {
      // Se tiver o campo explícito de hora, usa ele (ex: "15:00")
      if (evento.eventTime) return evento.eventTime;
      
      // Senão, formata a data de criação
      const dateObj = new Date(evento.createdAt);
      return dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const converterParaMinutos = (timeStr) => {
      if(!timeStr || timeStr === '--') return 9999;
      let norm = timeStr.replace('h', ':'); if(!norm.includes(':')) norm += ':00';
      const [h, m] = norm.split(':').map(Number); return h * 60 + (m || 0);
  };

  const extrairHorario = (str) => { 
      const m = str.match(/\d{1,2}[:h]\d{0,2}/); 
      return m ? m[0] : '00:00'; 
  };

  // --- LÓGICA: AGENDA DO DIA (LISTA) ---
  const processarAgendaDoDia = (turmas, eventos) => {
    const hoje = new Date();
    const diaSemanaHoje = hoje.getDay(); 
    // Pega YYYY-MM-DD localmente para comparar com o banco
    const dataHojeStr = hoje.toLocaleDateString('en-CA'); // Formato ISO local YYYY-MM-DD
    
    const mapaDias = { 'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6, 'sáb': 6 };
    const normalizar = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Aulas de Hoje
    const aulasHoje = turmas.filter(t => {
        if (!t.schedule) return false;
        const diaTexto = normalizar(t.schedule).substring(0, 3);
        return mapaDias[diaTexto] === diaSemanaHoje;
    }).map(t => ({
        id: t.id, 
        time: extrairHorario(t.schedule), 
        title: `${t.name} - ${t.gradeLevel}`, 
        type: 'Aula', 
        color: '#1154D9'
    }));

    // 2. Eventos de Hoje (CORRIGIDO)
    const eventosHoje = eventos.filter(ev => {
        // Se tiver eventDate, compara string com string (2025-12-01 === 2025-11-26?)
        if (ev.eventDate) {
            return ev.eventDate === dataHojeStr;
        }
        // Fallback antigo
        const evDateObj = new Date(ev.createdAt);
        return evDateObj.toLocaleDateString('en-CA') === dataHojeStr;
    }).map(e => ({ 
        id: e.id, 
        time: formatarHora(e), // Usa a hora correta do banco
        title: e.title, 
        type: 'Evento', 
        color: '#E91E63' 
    }));

    const tudoHoje = [...aulasHoje, ...eventosHoje];
    
    tudoHoje.sort((a, b) => converterParaMinutos(a.time) - converterParaMinutos(b.time));

    if (tudoHoje.length === 0) {
        setAgendaDoDia([{ id: 'empty', time: '--', title: 'Nenhuma atividade para hoje.', type: 'Livre', color: '#ccc' }]);
    } else {
        setAgendaDoDia(tudoHoje);
    }
  };

  // --- LÓGICA: CALENDÁRIO MENSAL (GRID) ---
  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const grid = [];
    
    // Dias anteriores
    for (let i = startingWeekday - 1; i >= 0; i--) {
        grid.push({ dayNumber: new Date(year, month, 0).getDate() - i, isCurrentMonth: false, items: [] });
    }

    const mapaDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const normalizar = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Dias atuais
    for (let i = 1; i <= daysInMonth; i++) {
        const currentLoopDate = new Date(year, month, i);
        const dayOfWeek = currentLoopDate.getDay();
        const dateStr = currentLoopDate.toLocaleDateString('en-CA'); // YYYY-MM-DD Local

        // Aulas
        const aulas = classes.filter(t => t.schedule && normalizar(t.schedule).includes(mapaDias[dayOfWeek]))
            .map(t => ({ type: 'class', title: t.name, color: '#1154D9', time: extrairHorario(t.schedule) }));
        
        // Eventos (CORRIGIDO)
        const evts = events.filter(e => {
             if (e.eventDate) return e.eventDate === dateStr;
             return new Date(e.createdAt).toLocaleDateString('en-CA') === dateStr;
        }).map(e => ({ 
            type: 'event', 
            title: e.title, 
            color: '#E91E63', 
            time: formatarHora(e) 
        }));

        grid.push({
            date: currentLoopDate,
            dayNumber: i,
            isCurrentMonth: true,
            isToday: new Date().toDateString() === currentLoopDate.toDateString(),
            items: [...aulas, ...evts].sort((a,b) => converterParaMinutos(a.time) - converterParaMinutos(b.time))
        });
    }
    // Dias próximos
    while (grid.length < 42) {
        grid.push({ dayNumber: grid.length - startingWeekday - daysInMonth + 1, isCurrentMonth: false, items: [] });
    }
    setCalendarDays(grid);
  };

  const handleLogout = async () => {
    if (window.confirm("Sair?")) {
      await signOut(auth); localStorage.removeItem("token"); navigate("/");
    }
  };
  
  const handleDayClick = (day) => {
      if(!day.isCurrentMonth) return;
      setSelectedDay(day);
      setDayDetails({ 
          date: day.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }), 
          items: day.items 
      });
  };

  return (
    <div className="main-container">
      <header className="top-bar">
        <div className="logo"><img src="/src/assets/logo.png" className="logo-image" /><span className="logo-text"><span style={{color:'#0554F2'}}>STUDY</span><span style={{color:'#B2FF59'}}>UP</span></span></div>
        <div className="header-actions"><div className="user-profile" onClick={handleLogout}><span className="material-symbols-rounded icon-btn">account_circle</span><span className="user-role">{user.displayName} ▼</span></div></div>
      </header>

      <div className="content-wrapper">
        <aside className="sidebar">
          <nav className="nav-menu">
            <a href="#" className="nav-item active"><span className="material-symbols-rounded">home</span> Início</a>
            <a href="#" onClick={() => navigate('/turmasP')} className="nav-item"><span className="material-symbols-rounded">groups</span> Turmas</a>
            <a href="#" onClick={() => navigate('/conteudoP')} className="nav-item"><span className="material-symbols-rounded">menu_book</span> Conteúdo</a>
            <a href="#" onClick={() => navigate('/forumP')} className="nav-item"><span className="material-symbols-rounded">forum</span> Fórum</a>
            
          </nav>
        </aside>

        <main className="main-content">
          <div className="left-column-calendar">
            <div className="welcome-stripe">
              <h1>Olá, {user.displayName}!</h1>
              <p>Acompanhe suas aulas e eventos.</p>
            </div>

            <section className="calendar-section">
              <div className="section-header">
                <h2>{viewMode === 'day' ? 'Sua Agenda Hoje' : 'Calendário do Mês'}</h2>
                <div className="view-switcher">
                    <button className={`switch-btn ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>Dia</button>
                    <button className={`switch-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Mês</button>
                </div>
              </div>

              {loading ? <p>Carregando...</p> : (
                viewMode === 'day' ? (
                    <div className="agenda-day-list">
                        {agendaDoDia.map((item, idx) => (
                            <div key={idx} className="agenda-row">
                                <div className="time-col">
                                    <span className="time-text">{item.time}</span>
                                    <div className="time-line"></div>
                                </div>
                                <div className="event-card" style={{ borderLeftColor: item.color }}>
                                    <h3>{item.title}</h3>
                                    <span className="event-type">{item.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="calendar-container-full">
                        <div className="calendar-nav-header">
                            <span>{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                            <div className="nav-arrows">
                                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))}>&lt;</button>
                                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))}>&gt;</button>
                            </div>
                        </div>
                        <div className="calendar-weekdays">
                            {['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map(d => <div key={d}>{d}</div>)}
                        </div>
                        <div className="calendar-grid">
                            {calendarDays.map((day, idx) => (
                                <div key={idx} className={`day-cell ${!day.isCurrentMonth ? 'faded' : ''} ${day.isToday ? 'today' : ''}`} onClick={() => handleDayClick(day)}>
                                    <span className="day-num">{day.dayNumber}</span>
                                    <div className="day-dots">
                                        {day.items?.slice(0, 4).map((it, i) => <div key={i} className="dot" style={{backgroundColor: it.color}}></div>)}
                                        {day.items?.length > 4 && <span className="plus-more">+</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
              )}
            </section>
          </div>

          <div className="right-column-notices">
            <section className="notices-section">
              <div className="section-header-simple">
                <span className="material-symbols-rounded icon-bell">notifications_active</span>
                <h2>Mural de Avisos</h2>
              </div>
              <div className="notices-list">
                {notices.length === 0 ? <div className="empty-notice"><p>Sem avisos.</p></div> : notices.map(n => (
                    <div key={n.id} className="notice-card">
                        <div className="notice-top"><span className="notice-badge">AVISO</span><small>{new Date(n.createdAt).toLocaleDateString()}</small></div>
                        <h4>{n.title}</h4>
                        <p>{n.content}</p>
                    </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      {selectedDay && (
        <div className="modal-overlay">
            <div className="modal-box day-details-modal">
                <div className="modal-header">
                    <h3>{selectedDay.date && selectedDay.date.toLocaleDateString ? selectedDay.date.toLocaleDateString() : dayDetails.date}</h3>
                    <button onClick={() => setSelectedDay(null)} className="close-btn">✕</button>
                </div>
                <div className="modal-body">
                    {dayDetails.items.length === 0 ? (
                         <div className="empty-day"><span className="material-symbols-rounded">event_busy</span><p>Nada para este dia.</p></div>
                    ) : (
                        <div className="day-items-list">
                            {dayDetails.items.map((it, i) => (
                                <div key={i} className="day-item-row" style={{borderLeftColor: it.color}}>
                                    <strong className="item-time">{it.time}</strong> 
                                    <div className="item-info">
                                        <strong>{it.title}</strong>
                                        <span>{it.type}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}