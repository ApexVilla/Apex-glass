# 📝 O que é "Slug" (URL-friendly)?

## 🎯 Definição Simples

**Slug** é uma versão "amigável" do nome da empresa que pode ser usada em URLs e identificadores únicos.

## 📋 Características

- ✅ **Apenas letras minúsculas**
- ✅ **Números permitidos**
- ✅ **Hífens (-) ao invés de espaços**
- ✅ **Sem acentos ou caracteres especiais**
- ✅ **Único** (não pode repetir)

## 🔤 Exemplos

### Nome da Empresa → Slug

| Nome da Empresa | Slug |
|----------------|------|
| Minha Empresa Ltda | `minha-empresa-ltda` |
| João Silva & Cia | `joao-silva-cia` |
| Apex Glass | `apex-glass` |
| Beta Comércio ME | `beta-comercio-me` |
| Empresa 123 | `empresa-123` |

## 🎯 Para que Serve?

1. **Identificador único** - Cada empresa tem um slug único
2. **URLs amigáveis** - Pode ser usado em URLs: `https://app.com/empresa-alpha`
3. **Busca rápida** - Mais fácil de buscar do que UUID
4. **Legível** - Humanos conseguem ler e entender

## 📝 Como Criar um Slug

### Regras:

1. **Tudo minúsculo**
2. **Espaços viram hífens (-)**
3. **Remove acentos** (á → a, ç → c)
4. **Remove caracteres especiais** (&, @, #, etc.)
5. **Mantém apenas letras, números e hífens**

### Exemplo de Conversão:

```
Nome: "Minha Empresa & Cia Ltda"
  ↓
Remove caracteres especiais: "Minha Empresa  Cia Ltda"
  ↓
Remove acentos: (não tem neste caso)
  ↓
Tudo minúsculo: "minha empresa  cia ltda"
  ↓
Espaços viram hífens: "minha-empresa--cia-ltda"
  ↓
Remove hífens duplos: "minha-empresa-cia-ltda"
  ↓
Slug final: "minha-empresa-cia-ltda"
```

## 💡 No Sistema Multi-Tenant

No seu sistema, o slug é usado para:

1. **Identificar a empresa** de forma única
2. **Buscar empresas** rapidamente
3. **URLs futuras** (se quiser criar URLs como `/empresa/minha-empresa`)

### Exemplo no Banco:

```sql
-- Tabela tenants
id: 123e4567-e89b-12d3-a456-426614174000
name: "Minha Empresa Ltda"
slug: "minha-empresa-ltda"  ← Este é o slug
```

## ✅ Dicas para Escolher um Slug

1. **Seja descritivo:** `minha-empresa` é melhor que `me1`
2. **Seja único:** Não use slugs que outras empresas já usam
3. **Seja simples:** Evite muito hífens: `empresa-abc-xyz-123` é confuso
4. **Use o nome:** Geralmente é o nome da empresa sem espaços e caracteres especiais

## 🔍 Como o Sistema Gera Automaticamente

No formulário de signup (`app/signup/page.tsx`), o slug é gerado automaticamente:

```typescript
const generateSlug = (name: string) => {
  return name
    .toLowerCase()                    // Tudo minúsculo
    .normalize('NFD')                 // Remove acentos
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacríticos
    .replace(/[^a-z0-9]+/g, '-')      // Espaços e especiais viram hífen
    .replace(/(^-|-$)/g, '')          // Remove hífens do início/fim
}
```

**Exemplo:**
- Você digita: "Minha Empresa"
- Sistema gera: "minha-empresa"
- Você pode editar se quiser

## ⚠️ Importante

- **Slug deve ser único** - Duas empresas não podem ter o mesmo slug
- **Não pode mudar facilmente** - Se mudar, pode quebrar referências
- **Use apenas letras, números e hífens** - Sem espaços, sem caracteres especiais

## 🎯 Resumo

**Slug = Nome da empresa formatado para URLs**

- `Minha Empresa` → `minha-empresa`
- `João & Cia` → `joao-cia`
- `Empresa 123` → `empresa-123`

É como um "apelido" único e limpo para sua empresa no sistema!

---

**Agora você sabe o que é slug!** ✅

