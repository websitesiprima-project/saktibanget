import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const sortBy = searchParams.get('sortBy') || 'created_at';
        const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

        // Calculate pagination
        const start = (page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        let query = supabase
            .from('contracts')
            .select(
                `
        id,
        name,
        vendor_name,
        recipient,
        invoice_number,
        amount,
        budget_type,
        contract_type,
        category,
        location,
        status,
        start_date,
        end_date,
        updated_at,
        created_at,
        progress
      `,
                { count: 'exact' }
            )
            .range(start, end);

        // Apply filters
        if (search) {
            query = query.or(
                `name.ilike.%${search}%,vendor_name.ilike.%${search}%,category.ilike.%${search}%,location.ilike.%${search}%`
            );
        }

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        // Apply sorting
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        const { data, error, count } = await query;

        if (error) {
            throw error;
        }

        // Format data
        const formattedData = data?.map((contract: any) => ({
            id: contract.id || '',
            name: contract.name || '',
            vendorName: contract.vendor_name || '',
            recipient: contract.recipient || '',
            invoiceNumber: contract.invoice_number || '',
            amount: contract.amount ? parseFloat(contract.amount) : 0,
            budgetType: contract.budget_type || '',
            contractType: contract.contract_type || '',
            category: contract.category || '',
            location: contract.location || '',
            status: contract.status || 'Aktif',
            startDate: contract.start_date || '',
            endDate: contract.end_date || '',
            updatedAt: contract.updated_at || contract.created_at || '',
            progress: contract.progress || 0,
        })) || [];

        const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

        return NextResponse.json({
            success: true,
            data: formattedData,
            pagination: {
                page,
                pageSize: PAGE_SIZE,
                total: count || 0,
                totalPages,
            },
        });
    } catch (error: any) {
        console.error('Error fetching contracts:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch contracts',
            },
            { status: 500 }
        );
    }
}
