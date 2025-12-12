-- Create suppliers table
create table if not exists public.suppliers (
    id uuid default gen_random_uuid() primary key,
    
    -- Basic Info
    tipo_pessoa text not null check (tipo_pessoa in ('PF', 'PJ')),
    nome_razao text not null,
    nome_fantasia text,
    cpf_cnpj text not null unique,
    ie text, -- Inscrição Estadual
    im text, -- Inscrição Municipal
    cnae text,
    regime_tributario text check (regime_tributario in ('Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'Isento')),
    
    -- Address
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    uf text,
    pais text default 'Brasil',
    
    -- Contacts
    telefone1 text,
    telefone2 text,
    whatsapp text,
    email_principal text,
    email_financeiro text,
    contato_principal text,
    vendedor_fornecedor text,
    observacoes text,
    
    -- Financial
    banco text,
    agencia text,
    conta text,
    tipo_conta text check (tipo_conta in ('Corrente', 'Poupança')),
    pix text,
    limite_credito numeric(15,2),
    condicao_pagamento text,
    metodo_pagamento text,
    retencao_impostos boolean default false,
    impostos_retidos jsonb, -- Stores {irrf, pis, cofins, csll, iss_retido} as percentages
    
    -- Fiscal
    regime_icms text,
    indicador_contribuinte text check (indicador_contribuinte in ('Contribuinte', 'Não Contribuinte', 'Isento')),
    cod_municipio text,
    aliquota_iss numeric(5,2),
    lista_servicos text,
    retem_iss boolean default false,
    
    -- Config
    ativo boolean default true,
    categoria text, -- Produtos, Serviços, Transporte, etc.
    prioridade text check (prioridade in ('Alto', 'Médio', 'Baixo')),
    is_transportadora boolean default false,
    emite_nfe boolean default false,
    emite_nfse boolean default false,
    
    -- System
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references auth.users(id)
);

-- Add RLS policies
alter table public.suppliers enable row level security;

create policy "Enable read access for authenticated users"
on public.suppliers for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on public.suppliers for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on public.suppliers for update
to authenticated
using (true);

create policy "Enable delete access for authenticated users"
on public.suppliers for delete
to authenticated
using (true);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_suppliers_updated_at
before update on public.suppliers
for each row
execute procedure public.handle_updated_at();
