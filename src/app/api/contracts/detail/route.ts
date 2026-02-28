import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Contract ID is required' },
                { status: 400 }
            );
        }

        // Fetch contract details with related data
        const { data: contractData, error: contractError } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', id)
            .single();

        if (contractError) {
            throw contractError;
        }

        // Fetch history
        const { data: historyData, error: historyError } = await supabase
            .from('contract_history')
            .select('*')
            .eq('contract_id', id)
            .order('created_at', { ascending: false });

        if (historyError) {
            throw historyError;
        }

        const formattedContract = {
            id: contractData.id || '',
            name: contractData.name || '',
            vendorName: contractData.vendor_name || '',
            recipient: contractData.recipient || '',
            invoiceNumber: contractData.invoice_number || '',
            amount: contractData.amount ? parseFloat(contractData.amount) : 0,
            budgetType: contractData.budget_type || '',
            contractType: contractData.contract_type || '',
            category: contractData.category || '',
            location: contractData.location || '',
            status: contractData.status || 'Aktif',
            startDate: contractData.start_date || '',
            endDate: contractData.end_date || '',
            updatedAt: contractData.updated_at || contractData.created_at || '',
            progress: contractData.progress || 0,
            history: historyData || [],
        };

        return NextResponse.json({
            success: true,
            data: formattedContract,
        });
    } catch (error: any) {
        console.error('Error fetching contract details:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch contract details',
            },
            { status: 500 }
        );
    }
}
