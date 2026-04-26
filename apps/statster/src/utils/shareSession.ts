import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportSession } from '../db/export';

export async function shareSession(sessionId: string, sessionName: string | null): Promise<void> {
  const data = await exportSession(sessionId);
  if (!data) throw new Error('Session not found');

  const slug = (sessionName ?? 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const date = new Date(data.started_at).toISOString().slice(0, 10);
  const filename = `${slug}-${date}.statster`;
  const path = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    UTI: 'com.statster.session',
    dialogTitle: `Export ${sessionName ?? 'session'}`,
  });
}
