import { app, BrowserWindow, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("src/pages/CadastroAluno.html");

  const menu = Menu.buildFromTemplate([
    {
      label: "Cadastros",
      submenu: [
        {
          label: "Cadastrar Aluno",
          click: () => win.loadFile("src/pages/CadastroAluno.html"),
        },
        {
          label: "Cadastrar Professor",
          click: () => win.loadFile("src/pages/CadastroProfessor.html"),
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);
