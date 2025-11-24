import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route for PocketBase images to bypass CORS issues
 * Usage: /api/images/menuItem/{recordId}/{filename}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathSegments = path;
    
    if (pathSegments.length < 3) {
      return NextResponse.json(
        { error: 'Invalid image path' },
        { status: 400 }
      );
    }

    // Reconstruct the PocketBase file path
    // pathSegments = ['menuItem', 'recordId', 'filename']
    const collection = pathSegments[0];
    const recordId = pathSegments[1];
    const filename = pathSegments.slice(2).join('/'); // In case filename has slashes

    // Get PocketBase URL - prioritize local for development
    const pbUrl = process.env.POCKETBASE_URL || 
                  process.env.AWS_POCKETBASE_URL || 
                  'http://localhost:8090';

    // Construct the full URL
    const imageUrl = `${pbUrl}/api/files/${collection}/${recordId}/${filename}`;

    // Fetch the image from PocketBase
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image from PocketBase: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Image not found' },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error: any) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

