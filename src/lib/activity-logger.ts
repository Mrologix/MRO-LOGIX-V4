import prisma from '@/lib/db';

export type ActivityAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'ADDED_FLIGHT_RECORD'
  | 'DELETED_FLIGHT_RECORD'
  | 'UPDATED_FLIGHT_RECORD'
  | 'ADDED_STOCK_INVENTORY'
  | 'DELETED_STOCK_INVENTORY'
  | 'UPDATED_STOCK_INVENTORY'
  | 'ADDED_TEMPERATURE_CONTROL'
  | 'DELETED_TEMPERATURE_CONTROL'
  | 'UPDATED_TEMPERATURE_CONTROL'
  | 'ADDED_AIRPORT_ID'
  | 'DELETED_AIRPORT_ID'
  | 'UPDATED_AIRPORT_ID'
  | 'ADDED_INCOMING_INSPECTION'
  | 'DELETED_INCOMING_INSPECTION'
  | 'UPDATED_INCOMING_INSPECTION'
  | 'CREATED_TECHNICAL_QUERY'
  | 'UPDATED_TECHNICAL_QUERY'
  | 'DELETED_TECHNICAL_QUERY'
  | 'CREATED_TECHNICAL_QUERY_VOTE'
  | 'UPDATED_TECHNICAL_QUERY_VOTE'
  | 'REMOVED_TECHNICAL_QUERY_VOTE'
  | 'CREATED_TECHNICAL_QUERY_RESPONSE'
  | 'CREATED_TECHNICAL_QUERY_RESPONSE_VOTE'
  | 'UPDATED_TECHNICAL_QUERY_RESPONSE_VOTE'
  | 'REMOVED_TECHNICAL_QUERY_RESPONSE_VOTE';

export type ResourceType = 
  | 'FLIGHT_RECORD'
  | 'STOCK_INVENTORY'
  | 'TEMPERATURE_CONTROL'
  | 'AIRPORT_ID'
  | 'INCOMING_INSPECTION'
  | 'AUTHENTICATION'
  | 'TECHNICAL_QUERY'
  | 'TECHNICAL_QUERY_RESPONSE';

interface LogActivityParams {
  userId: string;
  action: ActivityAction;
  resourceType?: ResourceType;
  resourceId?: string;
  resourceTitle?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity({
  userId,
  action,
  resourceType,
  resourceId,
  resourceTitle,
  metadata,
  ipAddress,
  userAgent,
}: LogActivityParams): Promise<void> {
  try {
    await prisma.userActivity.create({
      data: {
        userId,
        action,
        resourceType: resourceType || null,
        resourceId: resourceId || null,
        resourceTitle: resourceTitle || null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    // Log the error but don't throw it to avoid breaking the main operation
    console.error('Failed to log user activity:', error);
  }
}

// Helper function to extract IP address and user agent from request
export function getRequestInfo(request: Request): { ipAddress?: string; userAgent?: string } {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
} 