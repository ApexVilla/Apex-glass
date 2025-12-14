
import { createClient } from '@supabase/supabase-js';

// dotenv removed


const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInventory() {
    console.log('🔍 Debugging Inventory Movements...');


    // 0. Check products access
    const { data: products, error: prodError } = await supabase.from('products').select('id').limit(5);
    if (prodError) {
        console.error('❌ Error fetching products:', prodError);
    } else {
        console.log(`✅ Found ${products.length} products.`);
    }

    // 1. Fetch last 50 movements

    const { data: movements, error } = await supabase
        .from('inventory_movements')
        .select(`
      id,
      created_at,
      type,
      quantity,
      reference_id,
      reference_type,
      product:products(name)
    `)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('❌ Error fetching movements:', error);
        return;
    }

    console.log(`✅ Found ${movements.length} movements.`);

    // 2. Analyze types
    const types = movements.reduce((acc: any, m: any) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
    }, {});

    console.log('📊 Movement Types Distribution:', types);

    // 3. List details of 'saida_separacao' and 'entrada_devolucao_cliente'
    const interestingTypes = ['saida_separacao', 'entrada_devolucao_cliente', 'out', 'in'];

    console.log('\n📋 Detailed List of Interesting Movements:');
    movements
        .filter((m: any) => interestingTypes.some(t => m.type.includes(t)))
        .forEach((m: any) => {
            console.log(`- [${m.created_at}] Type: ${m.type}, Qty: ${m.quantity}, RefType: ${m.reference_type}, RefID: ${m.reference_id}, Product: ${m.product?.name}`);
        });

}

debugInventory();
