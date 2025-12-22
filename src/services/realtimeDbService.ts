// Realtime Database service for CRUD operations
import {
    ref,
    push,
    set,
    update,
    remove,
    onValue,
    get,
    child,
    query,
    orderByChild,
    DataSnapshot
} from 'firebase/database';
import { realtimeDb } from '../lib/firebase';
import { Lead, Task, EmailDraft, IncomingEmail, FileAsset, SmtpConfig } from '../types';

// Database path references
const LEADS_PATH = 'leads';
const TASKS_PATH = 'tasks';
const DRAFTS_PATH = 'drafts';
const EMAILS_PATH = 'emails';
const FILES_PATH = 'files';
const DELETED_EMAILS_PATH = 'deletedEmails';
const SETTINGS_PATH = 'settings';

// Helper to convert snapshot to typed array
const snapshotToArray = <T>(snapshot: DataSnapshot, converter: (data: any, id: string) => T): T[] => {
    const items: T[] = [];
    snapshot.forEach((child) => {
        items.push(converter(child.val(), child.key!));
    });
    return items;
};

// Helper converters for each type
const docToLead = (data: any, id: string): Lead => ({
    id,
    type: data.type || 'business',
    name: data.name || '',
    company: data.company || '',
    email: data.email || '',
    phone: data.phone || '',
    website: data.website || '',
    address: data.address || { street: '', houseNumber: '', zipCode: '', city: '' },
    status: data.status,
    notes: data.notes || '',
    lastContactDate: data.lastContactDate,
    followUpConfig: data.followUpConfig
});

const docToTask = (data: any, id: string): Task => ({
    id,
    title: data.title || '',
    description: data.description,
    dueDate: data.dueDate || '',
    priority: data.priority || 'medium',
    completed: data.completed || false,
    leadId: data.leadId,
    leadName: data.leadName
});

const docToDraft = (data: any, id: string): EmailDraft => ({
    id,
    leadId: data.leadId || '',
    leadName: data.leadName || '',
    leadEmail: data.leadEmail || '',
    subject: data.subject || '',
    body: data.body || '',
    attachments: data.attachments || [],
    status: data.status || 'draft',
    generatedAt: data.generatedAt || ''
});

const docToEmail = (data: any, id: string): IncomingEmail => ({
    id,
    senderName: data.senderName || '',
    senderEmail: data.senderEmail || '',
    subject: data.subject || '',
    body: data.body || '',
    receivedAt: data.receivedAt || '',
    read: data.read || false,
    leadId: data.leadId
});

const docToFile = (data: any, id: string): FileAsset => ({
    id,
    name: data.name || '',
    type: data.type || '',
    size: data.size || 0,
    downloadUrl: data.downloadUrl || '',
    storagePath: data.storagePath || '',
    uploadedAt: data.uploadedAt || '',
    base64Content: data.base64Content
});

// Helper to clean undefined values (Firebase Realtime DB doesn't accept undefined)
const cleanData = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
};

// ============ LEADS ============

export const onLeadsChange = (callback: (leads: Lead[]) => void) => {
    const leadsRef = ref(realtimeDb, LEADS_PATH);
    const unsubscribe = onValue(leadsRef, (snapshot) => {
        if (snapshot.exists()) {
            const leads = snapshotToArray(snapshot, docToLead);
            // Sort by name
            leads.sort((a, b) => a.name.localeCompare(b.name));
            callback(leads);
        } else {
            callback([]);
        }
    });
    return unsubscribe;
};

export const addLead = async (lead: Omit<Lead, 'id'>): Promise<string> => {
    const leadsRef = ref(realtimeDb, LEADS_PATH);
    const newRef = push(leadsRef);
    await set(newRef, cleanData(lead));
    return newRef.key!;
};

export const updateLead = async (lead: Lead): Promise<void> => {
    const { id, ...data } = lead;
    const leadRef = ref(realtimeDb, `${LEADS_PATH}/${id}`);
    await update(leadRef, cleanData(data));
};

export const deleteLead = async (id: string): Promise<void> => {
    const leadRef = ref(realtimeDb, `${LEADS_PATH}/${id}`);
    await remove(leadRef);
};

// ============ TASKS ============

export const onTasksChange = (callback: (tasks: Task[]) => void) => {
    const tasksRef = ref(realtimeDb, TASKS_PATH);
    const unsubscribe = onValue(tasksRef, (snapshot) => {
        if (snapshot.exists()) {
            const tasks = snapshotToArray(snapshot, docToTask);
            // Sort by dueDate
            tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            callback(tasks);
        } else {
            callback([]);
        }
    });
    return unsubscribe;
};

export const addTask = async (task: Omit<Task, 'id'>): Promise<string> => {
    const tasksRef = ref(realtimeDb, TASKS_PATH);
    const newRef = push(tasksRef);
    await set(newRef, cleanData(task));
    return newRef.key!;
};

export const updateTask = async (task: Task): Promise<void> => {
    const { id, ...data } = task;
    const taskRef = ref(realtimeDb, `${TASKS_PATH}/${id}`);
    await update(taskRef, cleanData(data));
};

export const deleteTask = async (id: string): Promise<void> => {
    const taskRef = ref(realtimeDb, `${TASKS_PATH}/${id}`);
    await remove(taskRef);
};

// ============ DRAFTS ============

export const onDraftsChange = (callback: (drafts: EmailDraft[]) => void) => {
    const draftsRef = ref(realtimeDb, DRAFTS_PATH);
    const unsubscribe = onValue(draftsRef, (snapshot) => {
        if (snapshot.exists()) {
            const drafts = snapshotToArray(snapshot, docToDraft);
            // Sort by generatedAt descending
            drafts.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
            callback(drafts);
        } else {
            callback([]);
        }
    });
    return unsubscribe;
};

export const addDraft = async (draft: Omit<EmailDraft, 'id'>): Promise<string> => {
    const draftsRef = ref(realtimeDb, DRAFTS_PATH);
    const newRef = push(draftsRef);
    await set(newRef, cleanData(draft));
    return newRef.key!;
};

export const updateDraft = async (id: string, updates: Partial<EmailDraft>): Promise<void> => {
    const draftRef = ref(realtimeDb, `${DRAFTS_PATH}/${id}`);
    await update(draftRef, cleanData(updates));
};

export const deleteDraft = async (id: string): Promise<void> => {
    const draftRef = ref(realtimeDb, `${DRAFTS_PATH}/${id}`);
    await remove(draftRef);
};

// ============ EMAILS ============

export const onEmailsChange = (callback: (emails: IncomingEmail[]) => void) => {
    const emailsRef = ref(realtimeDb, EMAILS_PATH);
    const unsubscribe = onValue(emailsRef, (snapshot) => {
        if (snapshot.exists()) {
            const emails = snapshotToArray(snapshot, docToEmail);
            // Sort by receivedAt descending
            emails.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
            callback(emails);
        } else {
            callback([]);
        }
    });
    return unsubscribe;
};

export const addEmail = async (email: Omit<IncomingEmail, 'id'>): Promise<string> => {
    const emailsRef = ref(realtimeDb, EMAILS_PATH);
    const newRef = push(emailsRef);
    await set(newRef, cleanData(email));
    return newRef.key!;
};

export const updateEmail = async (id: string, updates: Partial<IncomingEmail>): Promise<void> => {
    const emailRef = ref(realtimeDb, `${EMAILS_PATH}/${id}`);
    await update(emailRef, cleanData(updates));
};

export const deleteEmail = async (id: string): Promise<void> => {
    // Get the email data before deleting to track it
    const emailRef = ref(realtimeDb, `${EMAILS_PATH}/${id}`);
    const snapshot = await get(emailRef);

    if (snapshot.exists()) {
        const emailData = snapshot.val();
        // Store a unique identifier for this deleted email
        const deletedEmailId = `${emailData.senderEmail}_${emailData.subject}_${emailData.receivedAt}`
            .replace(/[.#$[\]]/g, '_'); // Firebase keys can't contain these characters

        const deletedRef = ref(realtimeDb, `${DELETED_EMAILS_PATH}/${deletedEmailId}`);
        await set(deletedRef, {
            senderEmail: emailData.senderEmail,
            subject: emailData.subject,
            receivedAt: emailData.receivedAt,
            deletedAt: new Date().toISOString()
        });
    }

    await remove(emailRef);
};

// Check if an email was previously deleted
export const isEmailDeleted = async (senderEmail: string, subject: string, receivedAt: string): Promise<boolean> => {
    const deletedEmailId = `${senderEmail}_${subject}_${receivedAt}`
        .replace(/[.#$[\]]/g, '_');
    const deletedRef = ref(realtimeDb, `${DELETED_EMAILS_PATH}/${deletedEmailId}`);
    const snapshot = await get(deletedRef);
    return snapshot.exists();
};

// Get all deleted email identifiers
export const getDeletedEmailIds = async (): Promise<Set<string>> => {
    const deletedRef = ref(realtimeDb, DELETED_EMAILS_PATH);
    const snapshot = await get(deletedRef);
    const deletedIds = new Set<string>();

    if (snapshot.exists()) {
        snapshot.forEach((child) => {
            const data = child.val();
            deletedIds.add(`${data.senderEmail}_${data.subject}_${data.receivedAt}`);
        });
    }

    return deletedIds;
};

// ============ FILES ============

export const onFilesChange = (callback: (files: FileAsset[]) => void) => {
    const filesRef = ref(realtimeDb, FILES_PATH);
    const unsubscribe = onValue(filesRef, (snapshot) => {
        if (snapshot.exists()) {
            const files = snapshotToArray(snapshot, docToFile);
            // Sort by uploadedAt descending
            files.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
            callback(files);
        } else {
            callback([]);
        }
    });
    return unsubscribe;
};

export const addFileMetadata = async (file: Omit<FileAsset, 'id'>): Promise<string> => {
    const filesRef = ref(realtimeDb, FILES_PATH);
    const newRef = push(filesRef);
    await set(newRef, cleanData(file));
    return newRef.key!;
};

export const deleteFileMetadata = async (id: string): Promise<void> => {
    const fileRef = ref(realtimeDb, `${FILES_PATH}/${id}`);
    await remove(fileRef);
};

// ============ SETTINGS ============

export const getSmtpConfig = async (): Promise<SmtpConfig | null> => {
    const smtpRef = ref(realtimeDb, `${SETTINGS_PATH}/smtp`);
    const snapshot = await get(smtpRef);

    if (snapshot.exists()) {
        const data = snapshot.val();
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
    const smtpRef = ref(realtimeDb, `${SETTINGS_PATH}/smtp`);
    await set(smtpRef, config);
};

export const onSmtpConfigChange = (callback: (config: SmtpConfig | null) => void) => {
    const smtpRef = ref(realtimeDb, `${SETTINGS_PATH}/smtp`);
    const unsubscribe = onValue(smtpRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
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
    return unsubscribe;
};
