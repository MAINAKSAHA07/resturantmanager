/**
 * Utility function to get the PocketBase image URL
 * Uses proxy route to bypass CORS issues
 */
export function getImageUrl(collection: string, recordId: string, filename: string): string {
  // Use proxy route to avoid CORS issues
  // The proxy route handles fetching from AWS PocketBase server-side
  return `/api/images/${collection}/${recordId}/${filename}`;
}

