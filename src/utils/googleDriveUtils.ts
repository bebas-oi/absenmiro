/**
 * Utility to convert Google Drive share links into direct image URLs
 * that can be rendered inside <img> tags, Student ID cards, Exam cards, and Kiosk popups.
 */

export function convertGoogleDriveUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  if (!trimmed) return '';

  // If already a direct data URL or standard blob/googleusercontent link
  if (
    trimmed.startsWith('data:image') ||
    trimmed.startsWith('blob:') ||
    trimmed.includes('lh3.googleusercontent.com')
  ) {
    return trimmed;
  }

  // Extract Google Drive file ID from common URL formats:
  // 1. https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // 2. https://drive.google.com/open?id=FILE_ID
  // 3. https://drive.google.com/uc?id=FILE_ID&export=view
  // 4. https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
  const driveFileRegex =
    /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=[^&]+&)?id=|thumbnail\?(?:[^&]+&)*id=))([a-zA-Z0-9_-]{15,})/;
  const match = trimmed.match(driveFileRegex);

  if (match && match[1]) {
    const fileId = match[1];
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return trimmed;
}

export function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com');
}

export function getAvatarFallback(nis: string): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nis || 'student')}`;
}

export function getStudentPhotoSrc(photoUrl: string | undefined, nis: string): string {
  if (!photoUrl || !photoUrl.trim()) {
    return getAvatarFallback(nis);
  }
  return convertGoogleDriveUrl(photoUrl) || getAvatarFallback(nis);
}
