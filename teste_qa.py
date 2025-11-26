import requests

# --- CONFIGURAÇÕES ---
BASE_URL = "http://localhost:3000"

# DADOS DE TESTE (Use um usuário que já existe no seu Authentication do Firebase)
EMAIL_TESTE = "leticia@professor.com"
SENHA_TESTE = "leticia123" 

# 🔴 IMPORTANTE: COLE SUA API KEY DO FIREBASE AQUI
# (Pegue do arquivo frontend/mobile/studyup2.0/src/config/firebaseConfig.js)
FIREBASE_WEB_API_KEY = "AIzaSyCisZeEtSJYTjat4gCUei4taVnJYwG361Y" 

# --- FUNÇÃO AUXILIAR: PEGAR TOKEN NO GOOGLE ---
def autenticar_no_firebase(email, senha):
    """
    Vai até o servidor do Google validar o email/senha e pega o Token.
    Simula o que o App Mobile faz.
    """
    print(f"📡 Conectando ao Firebase para autenticar {email}...")
    
    # URL oficial do Google para login via REST
    url_google = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
    
    payload = {
        "email": email,
        "password": senha,
        "returnSecureToken": True
    }
    
    resp = requests.post(url_google, json=payload)
    
    if resp.status_code == 200:
        print("🔑 Token do Firebase obtido com sucesso!")
        return resp.json()['idToken']
    else:
        print(f"❌ Erro ao logar no Firebase: {resp.text}")
        return None

# --- FUNÇÕES DE TESTE DO SEU BACKEND ---

def rodar_teste_login():
    """
    CT-001: Envia o Token do Firebase para o seu Backend validar.
    """
    print("\n🔹 [TESTE 1] Testando Login no Backend (/api/auth/login)...")
    
    # 1. Primeiro, precisamos do Token válido
    token_firebase = autenticar_no_firebase(EMAIL_TESTE, SENHA_TESTE)
    if not token_firebase:
        return None # Aborta se não conseguiu logar no Google

    # 2. Agora mandamos pro SEU servidor
    url = f"{BASE_URL}/api/auth/login"
    
    # O authController.js espera { "token": "..." }
    dados_para_backend = {
        "token": token_firebase
    }

    try:
        resposta = requests.post(url, json=dados_para_backend)

        if resposta.status_code == 200:
            print("✅ SUCESSO: Backend aceitou o token!")
            print(f"   Mensagem: {resposta.json().get('message')}")
            # Retorna o token para ser usado nos próximos testes
            return token_firebase 
        else:
            print(f"❌ FALHA: Backend rejeitou. Código {resposta.status_code}")
            print(f"   Resposta: {resposta.text}")

    except Exception as e:
        print(f"⛔ ERRO DE CONEXÃO: {e}")

    return None

def rodar_teste_listar_turmas(token):
    """
    CT-005: Tenta listar turmas usando o token validado.
    """
    print("\n🔹 [TESTE 2] Listar Turmas (Rota Protegida)...")
    
    if not token:
        print("⏭️ Pular: Sem token.")
        return

    # Atenção para o /api/classes (conforme seu index.js)
    url = f"{BASE_URL}/api/classes"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }

    resposta = requests.get(url, headers=headers)

    if resposta.status_code == 200:
        turmas = resposta.json()
        print(f"✅ SUCESSO: Turmas listadas. Total: {len(turmas)}")
    else:
        print(f"❌ FALHA: Erro {resposta.status_code} - {resposta.text}")


# TESTE IA

def rodar_teste_ia(token):
    """
    CT-IA-001: Verifica se a integração com o Gemini está respondendo.
    """
    print("\n🔹 [TESTE 3] Testando IA Generativa (Rota /api/ia/gerar)...")

    # Endpoint definido no seu iaRoutes.js
    url = f"{BASE_URL}/api/ia/gerar"
    
    # Cabeçalho com o Token (para garantir que funcionaria se a rota fosse protegida)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # O iaController.js espera receber { "prompt": "..." }
    payload = {
        "prompt": "Explique brevemente o que é um laço For em programação para um aluno iniciante."
    }

    try:
        # Envia a pergunta para sua API (que vai repassar pro Google Gemini)
        resposta = requests.post(url, json=payload, headers=headers)

        if resposta.status_code == 200:
            dados = resposta.json()
            texto_ia = dados.get("resposta", "")
            
            # Validações QA
            if texto_ia and len(texto_ia) > 10:
                print("✅ SUCESSO: A IA respondeu corretamente!")
                print(f"   🤖 Resposta da IA: {texto_ia[:100]}...") # Mostra só o começo
            else:
                print("⚠️ ALERTA: Status 200, mas a resposta veio vazia.")
        else:
            print(f"❌ FALHA: Erro na IA. Código {resposta.status_code}")
            print(f"   Detalhe: {resposta.text}")
            
    except Exception as e:
        print(f"⛔ ERRO DE CONEXÃO NO TESTE IA: {e}")



# --- EXECUÇÃO ---
if __name__ == "__main__":
    print("--- INICIANDO QA COM AUTENTICAÇÃO REAL ---")
    
    if FIREBASE_WEB_API_KEY == "COLE_SUA_API_KEY_AQUI_DENTRO_DAS_ASPAS":
        print("⚠️  ATENÇÃO: Configure sua API Key no script.")
    else:
        # Passo 1: Login
        token_valido = rodar_teste_login()
        
        # Só continua se o login funcionar
        if token_valido:
            # Passo 2: Listagem de Turmas
            rodar_teste_listar_turmas(token_valido)
            
            # Passo 3: Teste da IA (NOVO)
            rodar_teste_ia(token_valido)
            
    print("\n--- FIM ---")