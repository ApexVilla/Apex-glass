# Apex Auto Glass - ERP

Sistema ERP completo para gestão de vidros automotivos.

## Como editar este código?

Você pode editar o código de várias formas:

**Use sua IDE preferida**

Se você quiser trabalhar localmente usando sua própria IDE, clone este repositório e faça push das alterações.

O único requisito é ter Node.js & npm instalados - [instale com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Siga estes passos:

```sh
# Passo 1: Clone o repositório usando a URL Git do projeto.
git clone <YOUR_GIT_URL>

# Passo 2: Navegue até o diretório do projeto.
cd apex-auto-glass-erp

# Passo 3: Instale as dependências necessárias.
npm install

# Passo 4: Inicie o servidor de desenvolvimento com auto-reload e preview instantâneo.
npm run dev

# O sistema estará disponível em:
# - http://localhost:8081 (no mesmo computador)
# - http://192.168.100.9:8081 (na rede local)
```

## 🚀 Acesso Rápido

### ⭐ Comando no Terminal (Mais Rápido!)
```bash
apex-glass
```
Simplesmente digite `apex-glass` no terminal! O comando:
- Verifica se o servidor está rodando
- Se não estiver, pergunta se você quer iniciar
- Oferece opções de abrir pelo **IP** ou **Localhost**
- Abre automaticamente no navegador

### Script Principal (Com Opções)
```bash
./abrir-sistema.sh
```
Este script oferece opções para:
1. Abrir no navegador (se o servidor já estiver rodando)
2. Iniciar servidor e abrir no navegador

E permite escolher entre:
- **Pelo IP** (`http://192.168.100.9:8081`) - Para acessar de outros dispositivos
- **Pelo Localhost** (`http://localhost:8081`) - Apenas neste computador

### Outras Opções
```bash
# Modo desenvolvimento manual
npm run dev

# Script interativo (escolhe IP ou localhost)
./iniciar-ip.sh

# Abrir no navegador (servidor já rodando)
./abrir-apex-glass.sh
```

### Atalho no Desktop
Arraste o arquivo `Apex-Glass-ERP.desktop` para o desktop. Ao clicar, você terá todas as opções!

**Edite um arquivo diretamente no GitHub**

- Navegue até o arquivo desejado.
- Clique no botão "Edit" (ícone de lápis) no canto superior direito da visualização do arquivo.
- Faça suas alterações e faça commit das mudanças.

**Use GitHub Codespaces**

- Navegue até a página principal do seu repositório.
- Clique no botão "Code" (botão verde) próximo ao canto superior direito.
- Selecione a aba "Codespaces".
- Clique em "New codespace" para iniciar um novo ambiente Codespace.
- Edite arquivos diretamente no Codespace e faça commit e push das alterações quando terminar.

## Quais tecnologias são usadas neste projeto?

Este projeto é construído com:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## Como fazer deploy deste projeto?

Para fazer deploy, você pode usar plataformas como:

- **Vercel**: Conecte seu repositório GitHub e faça deploy automático
- **Netlify**: Similar ao Vercel, com deploy contínuo
- **Railway**: Para aplicações full-stack
- **Render**: Alternativa simples e gratuita

Execute `npm run build` para gerar os arquivos de produção e depois faça upload da pasta `dist` para o serviço de hospedagem escolhido.

## Configuração do Supabase

Este projeto usa Supabase como backend. Você precisa configurar as variáveis de ambiente:

1. Crie um arquivo `.env` na raiz do projeto
2. Adicione suas credenciais do Supabase:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

## Posso conectar um domínio personalizado?

Sim, você pode!

Para conectar um domínio, você precisa configurá-lo na plataforma de hospedagem escolhida (Vercel, Netlify, etc.) seguindo as instruções específicas de cada plataforma.
