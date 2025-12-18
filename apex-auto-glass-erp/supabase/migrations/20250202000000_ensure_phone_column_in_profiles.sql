-- Migration: Ensure phone column exists in profiles table
-- Date: 2025-02-02
-- Description: Adds phone column to profiles if it doesn't exist

-- Adicionar coluna phone se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
        RAISE NOTICE 'Coluna phone adicionada à tabela profiles';
    ELSE
        RAISE NOTICE 'Coluna phone já existe na tabela profiles';
    END IF;
END $$;

