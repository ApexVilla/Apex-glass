import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
    id: string;
    name: string;
    internal_code?: string | null;
    brand?: string | null;
    ncm?: string | null;
    description?: string | null;
}

interface ProductSearchComboboxProps {
    products: Product[];
    value?: string;
    onSelect: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    allowClear?: boolean;
    clearLabel?: string;
}

export function ProductSearchCombobox({
    products,
    value,
    onSelect,
    disabled = false,
    placeholder = "Selecione um produto...",
    className,
    allowClear = false,
    clearLabel = "Limpar seleção",
}: ProductSearchComboboxProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Debug: Log quando produtos mudarem
    useEffect(() => {
        console.log('🔍 ProductSearchCombobox: Produtos recebidos:', products?.length || 0);
        if (products && products.length > 0) {
            console.log('📦 ProductSearchCombobox: Primeiro produto:', products[0]);
            console.log('📦 ProductSearchCombobox: Todos os IDs:', products.map(p => p.id).slice(0, 10));
        } else {
            console.warn('⚠️ ProductSearchCombobox: Array de produtos vazio ou undefined');
            console.warn('⚠️ products:', products);
        }
    }, [products]);

    const selectedProduct = products.find((p) => String(p.id) === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedProduct
                            ? `${selectedProduct.name}${selectedProduct.internal_code ? ` - ${selectedProduct.internal_code}` : ''}`
                            : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Buscar por nome, código, marca..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {products.length === 0 
                                ? 'Nenhum produto disponível.' 
                                : 'Nenhum produto encontrado.'}
                        </CommandEmpty>
                        <CommandGroup>
                            {allowClear && (
                                <CommandItem
                                    value="__clear__"
                                    onSelect={() => {
                                        onSelect('');
                                        setOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            !value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="text-muted-foreground">{clearLabel}</span>
                                </CommandItem>
                            )}
                            {products && products.length > 0 ? (
                                products
                                .filter((product) => {
                                    if (!search.trim()) return true;
                                    const term = search.toLowerCase().trim();
                                    const code = String(product.internal_code || '').toLowerCase();
                                    const name = String(product.name || '').toLowerCase();
                                    const description = String(product.description || '').toLowerCase();
                                    const brand = String(product.brand || '').toLowerCase();

                                    return (
                                        code.includes(term) ||
                                        name.includes(term) ||
                                        description.includes(term) ||
                                        brand.includes(term)
                                    );
                                })
                                .slice(0, 100) // Aumentado para 100 itens
                                .map((product) => (
                                    <CommandItem
                                        key={product.id}
                                        value={String(product.id)}
                                        onSelect={() => {
                                            onSelect(String(product.id));
                                            setOpen(false);
                                            setSearch('');
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === String(product.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col w-full overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold truncate">{product.name}</span>
                                                {product.brand && (
                                                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{product.brand}</span>
                                                )}
                                            </div>
                                            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                                <span>Cód: {product.internal_code || '-'}</span>
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))
                            ) : (
                                <CommandItem disabled>
                                    <span className="text-muted-foreground">
                                        {products.length === 0 ? 'Nenhum produto disponível' : 'Carregando produtos...'}
                                    </span>
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
