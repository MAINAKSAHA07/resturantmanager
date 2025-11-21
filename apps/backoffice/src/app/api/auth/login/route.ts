import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    console.log('Login attempt:', { email, pbUrl });
    
    // Create PocketBase client directly to ensure correct URL
    const pb = new PocketBase(pbUrl);
    console.log('PocketBase client created, baseUrl:', pb.baseUrl);

    // Try admin auth first (since user collection may not exist)
    // This allows using PocketBase admin credentials for initial setup
    try {
      console.log('Attempting admin auth...');
      const adminAuth = await pb.admins.authWithPassword(email, password);
      console.log('Admin auth successful');
      
      const response = NextResponse.json({
        token: pb.authStore.token,
        user: { id: adminAuth.admin?.id, email: adminAuth.admin?.email },
        type: 'admin',
      });

      response.cookies.set('pb_auth_token', pb.authStore.token || '', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });

      return response;
    } catch (adminError: any) {
      const adminStatus = adminError?.response?.status || adminError?.status;
      const adminResponse = adminError?.response?.data || adminError?.response;
      
      console.error('Admin auth failed:', {
        message: adminError.message,
        status: adminStatus,
        response: adminResponse,
        email: email,
        url: pbUrl,
      });
      
      // If admin auth fails with 400/401, it's invalid credentials - don't try user auth
      if (adminStatus === 400 || adminStatus === 401) {
        let errorMsg = 'Invalid email or password';
        if (adminError?.response?.data?.message) {
          errorMsg = adminError.response.data.message;
        } else if (adminError?.message && !adminError.message.includes('resource wasn\'t found')) {
          errorMsg = adminError.message;
        }
        
        return NextResponse.json(
          { error: errorMsg },
          { status: 401 }
        );
      }
      
      // If admin auth fails with 404 or other errors, try user (staff member) auth
      // but only if user collection exists
      try {
        console.log('Attempting user auth...');
        const authData = await pb.collection('user').authWithPassword(email, password);
        console.log('User auth successful');
        
        const response = NextResponse.json({
          token: pb.authStore.token,
          user: authData.record,
          type: 'user',
        });

        response.cookies.set('pb_auth_token', pb.authStore.token || '', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
          path: '/',
        });

        return response;
      } catch (userError: any) {
        console.error('User auth also failed:', {
          message: userError.message,
          status: userError.status,
          response: userError.response?.data,
        });
        
        // If user collection doesn't exist (404), return admin error
        if (userError.status === 404) {
          let errorMsg = 'Invalid email or password';
          if (adminError?.response?.data?.message) {
            errorMsg = adminError.response.data.message;
          } else if (adminError?.message && !adminError.message.includes('resource wasn\'t found')) {
            errorMsg = adminError.message;
          }
          
          return NextResponse.json(
            { error: errorMsg },
            { status: 401 }
          );
        }
        
        // Return more specific error message
        let errorMsg = 'Invalid email or password';
        
        if (adminError?.response?.data?.message) {
          errorMsg = adminError.response.data.message;
        } else if (userError?.response?.data?.message) {
          errorMsg = userError.response.data.message;
        } else if (adminError?.message) {
          errorMsg = adminError.message;
        } else if (userError?.message) {
          errorMsg = userError.message;
        }
        
        return NextResponse.json(
          { error: errorMsg },
          { status: 401 }
        );
      }
    }
  } catch (error: any) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    
    let errorMsg = 'An error occurred during login';
    if (error.message) {
      errorMsg = error.message;
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message;
    }
    
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

