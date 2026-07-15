import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seeding endpoints are disabled in production' }, { status: 403 });
  }

  try {
    // 1. Connect to DB using Admin Client to bypass RLS for seeding
    const supabase = createAdminClient();

    // 2. Insert Parent Location
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .insert({
        name: 'Muara Sungai Pantai Nenang',
        slug: 'muara-sungai-pantai-nenang',
        description: 'Sample seeded location for 360 panoramas',
      })
      .select('id')
      .single();

    if (locationError) {
      return NextResponse.json({ success: false, error: locationError.message }, { status: 500 });
    }

    const locationId = location.id;

    // 3. Insert Spatial Nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('spatial_nodes')
      .insert([
        {
          location_id: locationId,
          longitude: 116.8,
          latitude: -1.2,
          image_url: 'https://example.com/muara-sungai-1.jpg', // Mock Supabase Storage URL
          is_published: true,
          capture_date: '2026-06-20',
        },
        {
          location_id: locationId,
          longitude: 116.805,
          latitude: -1.195,
          image_url: 'https://example.com/muara-sungai-2.jpg', // Mock Supabase Storage URL
          is_published: true,
          capture_date: '2026-06-20',
        }
      ])
      .select();

    if (nodesError) {
      return NextResponse.json({ success: false, error: nodesError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      location: locationId,
      nodes_inserted: nodes?.length,
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
