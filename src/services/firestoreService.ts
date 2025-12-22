// Firestore service for CRUD operations
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    setDoc,
    getDoc,
    getDocs,
    Timestamp,
    DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead, Task, EmailDraft, IncomingEmail, FileAsset, SmtpConfig } from '../types';

// Collection references
const leadsCollection = collection(db, 'leads');
const tasksCollection = collection(db, 'tasks');
const draftsCollection = collection(db, 'drafts');
const emailsCollection = collection(db, 'emails');
const filesCollection = collection(db, 'files');
const settingsDoc = doc(db, 'settings', 'smtp');

// Helper to convert Firestore document to typed object
const docToLead = (doc: DocumentData, id: string): Lead => ({
    id,
    type: doc.type || 'business',
    name: doc.name || '',
    company: doc.company || '',
    email: doc.email || '',
    phone: doc.phone || '',
    website: doc.website || '',
    address: doc.address || { street: '', houseNumber: '', zipCode: '', city: '' },
    status: doc.status,
    notes: doc.notes || '',
    lastContactDate: doc.lastContactDate,
    followUpConfig: doc.followUpConfig
});

const docToTask = (doc: DocumentData, id: string): Task => ({
    id,
    title: doc.title || '',
    description: doc.description,
    dueDate: doc.dueDate || '',
    priority: doc.priority || 'medium',
    completed: doc.completed || false,
    leadId: doc.leadId,
    leadName: doc.leadName
});

const docToDraft = (doc: DocumentData, id: string): EmailDraft => ({
    id,
    leadId: doc.leadId || '',
    leadName: doc.leadName || '',
    leadEmail: doc.leadEmail || '',
    subject: doc.subject || '',
    body: doc.body || '',
    attachments: doc.attachments || [],
    status: doc.status || 'draft',
    generatedAt: doc.generatedAt || ''
});

const docToEmail = (doc: DocumentData, id: string): IncomingEmail => ({
    id,
    senderName: doc.senderName || '',
    senderEmail: doc.senderEmail || '',
    subject: doc.subject || '',
    body: doc.body || '',
    receivedAt: doc.receivedAt || '',
    read: doc.read || false,
    leadId: doc.leadId
});

const docToFile = (doc: DocumentData, id: string): FileAsset => ({
    id,
    name: doc.name || '',
    type: doc.type || '',
    size: doc.size || 0,
    downloadUrl: doc.downloadUrl || '',
    storagePath: doc.storagePath || '',
    uploadedAt: doc.uploadedAt || ''
});

// ============ LEADS ============

export const onLeadsChange = (callback: (leads: Lead[]) => void) => {
    const q = query(leadsCollection, orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        const leads = snapshot.docs.map(doc => docToLead(doc.data(), doc.id));
        callback(leads);
    });
};

export const addLead = async (lead: Omit<Lead, 'id'>): Promise<string> => {
    const docRef = await addDoc(leadsCollection, lead);
    return docRef.id;
};

export const updateLead = async (lead: Lead): Promise<void> => {
    const { id, ...data } = lead;
    // Remove undefined fields
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    await updateDoc(doc(db, 'leads', id), cleanData);
};

export const deleteLead = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'leads', id));
};

// ============ TASKS ============

export const onTasksChange = (callback: (tasks: Task[]) => void) => {
    const q = query(tasksCollection, orderBy('dueDate'));
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => docToTask(doc.data(), doc.id));
        callback(tasks);
    });
};

export const addTask = async (task: Omit<Task, 'id'>): Promise<string> => {
    const docRef = await addDoc(tasksCollection, task);
    return docRef.id;
};

export const updateTask = async (task: Task): Promise<void> => {
    const { id, ...data } = task;
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    await updateDoc(doc(db, 'tasks', id), cleanData);
};

export const deleteTask = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'tasks', id));
};

// ============ DRAFTS ============

export const onDraftsChange = (callback: (drafts: EmailDraft[]) => void) => {
    const q = query(draftsCollection, orderBy('generatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const drafts = snapshot.docs.map(doc => docToDraft(doc.data(), doc.id));
        callback(drafts);
    });
};

export const addDraft = async (draft: Omit<EmailDraft, 'id'>): Promise<string> => {
    const docRef = await addDoc(draftsCollection, draft);
    return docRef.id;
};

export const updateDraft = async (id: string, updates: Partial<EmailDraft>): Promise<void> => {
    const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await updateDoc(doc(db, 'drafts', id), cleanUpdates);
};

export const deleteDraft = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'drafts', id));
};

// ============ EMAILS ============

export const onEmailsChange = (callback: (emails: IncomingEmail[]) => void) => {
    const q = query(emailsCollection, orderBy('receivedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const emails = snapshot.docs.map(doc => docToEmail(doc.data(), doc.id));
        callback(emails);
    });
};

export const addEmail = async (email: Omit<IncomingEmail, 'id'>): Promise<string> => {
    const docRef = await addDoc(emailsCollection, email);
    return docRef.id;
};

export const updateEmail = async (id: string, updates: Partial<IncomingEmail>): Promise<void> => {
    const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await updateDoc(doc(db, 'emails', id), cleanUpdates);
};

export const deleteEmail = async (id: string): Promise<void> => {
    // Get the email data before deleting to track it
    const emailDoc = await getDoc(doc(db, 'emails', id));
    if (emailDoc.exists()) {
        const emailData = emailDoc.data();
        // Store a unique identifier for this deleted email
        const deletedEmailId = `${emailData.senderEmail}_${emailData.subject}_${emailData.receivedAt}`;
        await setDoc(doc(db, 'deletedEmails', deletedEmailId), {
            senderEmail: emailData.senderEmail,
            subject: emailData.subject,
            receivedAt: emailData.receivedAt,
            deletedAt: new Date().toISOString()
        });
    }
    await deleteDoc(doc(db, 'emails', id));
};

// Check if an email was previously deleted
export const isEmailDeleted = async (senderEmail: string, subject: string, receivedAt: string): Promise<boolean> => {
    const deletedEmailId = `${senderEmail}_${subject}_${receivedAt}`;
    const docSnap = await getDoc(doc(db, 'deletedEmails', deletedEmailId));
    return docSnap.exists();
};

// Get all deleted email identifiers
export const getDeletedEmailIds = async (): Promise<Set<string>> => {
    const deletedEmailsCollection = collection(db, 'deletedEmails');
    const snapshot = await getDocs(deletedEmailsCollection);
    const deletedIds = new Set<string>();
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        deletedIds.add(`${data.senderEmail}_${data.subject}_${data.receivedAt}`);
    });
    return deletedIds;
};

// ============ FILES ============

export const onFilesChange = (callback: (files: FileAsset[]) => void) => {
    const q = query(filesCollection, orderBy('uploadedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const files = snapshot.docs.map(doc => docToFile(doc.data(), doc.id));
        callback(files);
    });
};

export const addFileMetadata = async (file: Omit<FileAsset, 'id'>): Promise<string> => {
    const docRef = await addDoc(filesCollection, file);
    return docRef.id;
};

export const deleteFileMetadata = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'files', id));
};

// ============ SETTINGS ============

export const getSmtpConfig = async (): Promise<SmtpConfig | null> => {
    const docSnap = await getDoc(settingsDoc);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            host: data.host || '',
            port: data.port || '',
            user: data.user || '',
            pass: data.pass || '',
            fromEmail: data.fromEmail || ''
        };
    }
    return null;
};

export const saveSmtpConfig = async (config: SmtpConfig): Promise<void> => {
    await setDoc(settingsDoc, config);
};

export const onSmtpConfigChange = (callback: (config: SmtpConfig | null) => void) => {
    return onSnapshot(settingsDoc, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                host: data.host || '',
                port: data.port || '',
                user: data.user || '',
                pass: data.pass || '',
                fromEmail: data.fromEmail || ''
            });
        } else {
            callback(null);
        }
    });
};
