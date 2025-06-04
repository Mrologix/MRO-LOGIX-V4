import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import prisma from '@/lib/db';
import { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';

interface SessionCallbackParams {
  session: Session;
  token: JWT;
}

interface JWTCallbackParams {
  token: JWT;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export async function getServerSession() {
  try {
    console.log('Getting server session...');
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    console.log('Auth token found:', token ? 'Yes' : 'No');
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    
    if (!token) {
      console.log('No auth token found');
      return null;
    }
    
    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as {
        id: string;
        email: string;
        name: string;
      };
      console.log('Token decoded successfully:', { id: decoded.id, email: decoded.email });
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true
        }
      });
      
      console.log('User found in database:', user ? 'Yes' : 'No');
      
      if (!user) {
        console.log('User not found in database');
        return null;
      }
      
      return {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          username: user.username
        }
      };
    } catch (verifyError) {
      console.error('Error verifying token:', verifyError);
      return null;
    }
  } catch (error) {
    console.error('Error in getServerSession:', error);
    return null;
  }
}

export const authOptions = {
  // This is a placeholder to maintain compatibility with the existing code
  // The actual authentication is handled by the JWT token system
  providers: [],
  callbacks: {
    async session({ session }: SessionCallbackParams) {
      return session;
    },
    async jwt({ token }: JWTCallbackParams) {
      return token;
    }
  }
}; 