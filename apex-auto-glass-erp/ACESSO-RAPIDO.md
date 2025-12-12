# 🚀 Acesso Rápido - Apex Glass ERP

## 📱 Script Principal (Recomendado)

Use o script principal que oferece todas as opções:

```bash
./abrir-sistema.sh
```

Este script oferece:
1. **Abrir no navegador** (se o servidor já estiver rodando)
2. **Iniciar servidor e abrir no navegador**

Em ambos os casos, você poderá escolher:
- **Pelo IP** (`http://192.168.100.9:8081`) - Para acessar de outros dispositivos na rede
- **Pelo Localhost** (`http://localhost:8081`) - Apenas neste computador

---

## 🎯 Outras Formas de Iniciar

### Opção 1: Script Interativo (Escolhe IP ou Localhost)
```bash
./iniciar-ip.sh
```
Pergunta se você quer abrir pelo IP ou localhost após iniciar o servidor.

### Opção 2: Abrir no Navegador (Servidor já rodando)
```bash
./abrir-apex-glass.sh
```
Pergunta se você quer abrir pelo IP ou localhost.

### Opção 3: Modo Desenvolvimento Manual
```bash
npm run dev
```
Inicia o servidor, mas você precisa abrir o navegador manualmente:
- Pelo IP: `http://192.168.100.9:8081`
- Pelo Localhost: `http://localhost:8081`

---

## ⚠️ Importante

- **Porta**: O sistema roda na porta **8081** (não 8080)
- **IP**: Use o IP `192.168.100.9:8081` para acessar de outros dispositivos na mesma rede
- **Localhost**: Use `localhost:8081` apenas no mesmo computador
- **Escolha sempre**: Os scripts interativos perguntam qual opção você prefere!

---

## 🔧 Atalho no Desktop

Arraste o arquivo `Apex-Glass-ERP.desktop` para o desktop.

Ao clicar nele, você poderá escolher:
1. Abrir no navegador (servidor já rodando)
2. Iniciar servidor e abrir

E em ambos os casos, escolher entre IP ou Localhost!

