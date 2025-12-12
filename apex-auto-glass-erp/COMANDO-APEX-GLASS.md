# 🎯 Comando `apex-glass` - Guia Rápido

## ✅ Instalação Concluída!

O comando `apex-glass` já está instalado e pronto para usar!

## 🚀 Como Usar

### Abrir o Sistema (Servidor já rodando)

1. Abra o terminal
2. Digite:
   ```bash
   apex-glass
   ```
3. Escolha uma opção:
   - **1** = Abrir pelo IP (`http://192.168.100.9:8081`)
   - **2** = Abrir pelo Localhost (`http://localhost:8081`)
4. O navegador abrirá automaticamente!

### Iniciar Servidor e Abrir

Se o servidor não estiver rodando:

1. Digite:
   ```bash
   apex-glass
   ```
2. Escolha **1** para iniciar o servidor
3. Escolha como deseja acessar (IP ou Localhost)
4. O servidor iniciará e o navegador abrirá automaticamente!

## 📍 Localização

- **Script**: `/home/samir/Documentos/apex-glass1.2/apex-auto-glass-erp/apex-glass`
- **Comando**: `~/bin/apex-glass` (link simbólico)
- **PATH**: Já adicionado ao `~/.bashrc`

## 🔄 Se não funcionar

Se ao digitar `apex-glass` receber erro, execute:

```bash
# Recarregar configurações
source ~/.bashrc

# Ou abrir um novo terminal
```

## 💡 Dica

Você pode criar um alias ainda mais curto editando `~/.bashrc`:

```bash
echo 'alias ag="apex-glass"' >> ~/.bashrc
source ~/.bashrc
```

Depois basta digitar `ag` no terminal!

