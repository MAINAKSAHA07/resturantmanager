/**
 * Utility function to get the PocketBase image URL
 * Uses AWS_POCKETBASE_URL if available, otherwise falls back to localhost
 */
export function getImageUrl(collection: string, recordId: string, filename: string): string {
  // Use public environment variable for client-side access
  // This should be set to the AWS PocketBase URL in production
  const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 
                process.env.NEXT_PUBLIC_AWS_POCKETBASE_URL || 
                'http://localhost:8090';
  
  return `${pbUrl}/api/files/${collection}/${recordId}/${filename}`;
}

