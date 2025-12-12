-- Adicionar status 'pausado' ao enum picking_status
-- Isso permite pausar separações ao invés de deletá-las

DO $$ 
BEGIN
    -- Adicionar 'pausado' ao enum se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'pausado' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'picking_status')
    ) THEN
        ALTER TYPE public.picking_status ADD VALUE 'pausado';
    END IF;
END $$;

-- Comentário explicativo
COMMENT ON TYPE public.picking_status IS 'Status do picking: em_separacao, pausado, separado, erro_falta, erro_danificado';

