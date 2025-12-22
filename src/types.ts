
export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  REPLIED = 'Responded',
  CONVERTED = 'Customer',
  LOST = 'Lost'
}

export type LeadType = 'business' | 'individual';

export interface Address {
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
}

export interface Lead {
  id: string;
  type: LeadType;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: Address;
  status: LeadStatus;
  notes: string;
  lastContactDate?: string;
  followUpConfig?: {
    enabled: boolean;
    days: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date string YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  leadId?: string; // Link to a lead
  leadName?: string; // Snapshot for display
}

export interface FileAsset {
  id: string;
  name: string;
  type: string;
  size: number;
  downloadUrl: string;
  storagePath: string;
  uploadedAt: string;
  base64Content?: string; // Store base64 for email attachments to avoid CORS issues
}

export interface EmailDraft {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  subject: string;
  body: string;
  attachments: string[];
  status: 'draft' | 'sent';
  generatedAt: string;
}

export interface IncomingEmail {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  read: boolean;
  leadId?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    downloadUrl?: string;
  }>;
}

export interface SmtpConfig {
  host: string;
  port: string;
  user: string;
  pass: string;
  fromEmail: string;
}

export type ViewState = 'dashboard' | 'crm' | 'library' | 'generator' | 'review' | 'settings' | 'inbox' | 'tasks';
