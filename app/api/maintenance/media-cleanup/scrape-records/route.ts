import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize a service-role client for background ingestion
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DotPermitRecord {
  permit_type?: string;
  permittee?: string;
  on_street?: string;
  location?: string;
  issued_date?: string;
  status?: string;
  [key: string]: unknown;
}

export async function GET(request: Request) {
  // Verify cron secret header for security (e.g. Vercel Cron)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Example: Fetch recent DOT Street Construction Permits via NYC OpenData SODA API
    // Dataset endpoint: https://data.cityofnewyork.us/Transportation/Street-Construction-Permits-Related-Agency/cj3v-xdpd
    const response = await fetch(
      'https://data.cityofnewyork.us/resource/cj3v-xdpd.json?$limit=100&$order=issued_date DESC',
      {
        headers: {
          ...(process.env.NYC_OPEN_DATA_APP_TOKEN && {
            'X-App-Token': process.env.NYC_OPEN_DATA_APP_TOKEN,
          }),
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      throw new Error(`NYC OpenData fetch failed with status ${response.status}`);
    }

    const permits: DotPermitRecord[] = await response.json();
    let insertedCount = 0;

    for (const permit of permits) {
      // Upsert or process records into Supabase district_permits
      const { error } = await supabaseAdmin.from('district_permits').upsert(
        {
          permit_type: permit.permit_type || 'General Construction',
          permittee_name: permit.permittee || 'Unknown',
          location_address: permit.on_street || permit.location || 'NYC Corridor',
          issued_date: permit.issued_date || new Date().toISOString(),
          status: permit.status || 'Active',
          raw_payload: permit,
        },
        { onConflict: 'id' }
      );

      if (!error) insertedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${insertedCount} public records into STANCE ledger.`,
    });
  } catch (err: unknown) {
    console.error('Scraper maintenance error:', err);
    const errorMessage =
      err instanceof Error ? err.message : 'An unexpected error occurred during ingestion.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}