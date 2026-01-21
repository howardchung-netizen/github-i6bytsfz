import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const buildCredential = () => {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    || process.env.FIREBASE_PROJECT_ID
    || 'tutoring-classes-18476';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return { projectId };
};

export const getAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const credentialConfig = buildCredential();
  const hasServiceAccount = Boolean(
    (credentialConfig as { clientEmail?: string }).clientEmail
    && (credentialConfig as { privateKey?: string }).privateKey
  );

  return initializeApp({
    credential: hasServiceAccount
      ? cert(credentialConfig as { projectId: string; clientEmail: string; privateKey: string })
      : applicationDefault(),
    projectId: credentialConfig.projectId
  });
};

export const getAdminDb = () => getFirestore(getAdminApp());
