import React, { useState, useEffect, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import { ToastProvider, useToast } from './components/ToastProvider';
import { AuthProvider, useAuth } from './components/AuthContext';
import Login from './components/Login';
import {
  LayoutDashboard,
  Users,
  Wand2,
  Mail,
  Settings,
  Plus,
  Send,
  Trash2,
  CheckCircle,
  AlertCircle,
  Save,
  Search,
  Phone,
  Mic,
  MicOff,
  FolderOpen,
  FileText,
  Upload,
  Paperclip,
  X,
  Download,
  Menu,
  Pencil,
  Moon,
  Sun,
  Inbox,
  Building2,
  User,
  MapPin,
  RefreshCw,
  Calendar,
  CheckSquare,
  Repeat,
  PhoneCall,
  Check,
  LogOut
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Lead, LeadStatus, EmailDraft, ViewState, FileAsset, IncomingEmail, LeadType, Task } from './types';
import { generateEmailForLead, generateFollowUpEmail, processCallLog, extractTasksFromPrompt, extractTasksFromEmail } from './services/openaiService';
import { sendEmailProfessional, fetchEmailReplies, startEmailMonitoring } from './services/emailService';
import {
  onLeadsChange,
  addLead as addLeadToFirestore,
  updateLead as updateLeadInFirestore,
  onTasksChange,
  addTask as addTaskToFirestore,
  updateTask as updateTaskInFirestore,
  deleteTask as deleteTaskFromFirestore,
  onDraftsChange,
  addDraft as addDraftToFirestore,
  updateDraft as updateDraftInFirestore,
  deleteDraft as deleteDraftFromFirestore,
  onEmailsChange,
  addEmail as addEmailToFirestore,
  updateEmail as updateEmailInFirestore,
  deleteEmail as deleteEmailFromFirestore,
  getDeletedEmailIds,
  onFilesChange,
  addFileMetadata,
  deleteLead as deleteLeadFromFirestore,
  deleteFileMetadata as deleteFileMetadataFromFirestore
} from './services/realtimeDbService';
import { uploadFileWithProgress, deleteFile as deleteFileFromStorage } from './services/storageService';

// --- Helper for Speech Recognition ---
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'nl-NL';
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(prev => prev + (prev ? ' ' : '') + text);
          setIsListening(false);
        };

        recognition.onerror = (e: any) => {
          console.error("Mic error", e);
          setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (e) {
        console.error("Mic error", e);
        setIsListening(false);
      }
    } else {
      alert("Spraakherkenning wordt niet ondersteund in deze browser.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const resetTranscript = () => setTranscript('');

  return { isListening, transcript, startListening, stopListening, setTranscript, resetTranscript };
};

// --- Components ---

// 0. Analog Clock Component
const AnalogClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondDegrees = (seconds / 60) * 360;
  const minuteDegrees = ((minutes + seconds / 60) / 60) * 360;
  const hourDegrees = (((hours % 12) + minutes / 60) / 12) * 360;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-full min-h-[140px] aspect-square mx-auto flex items-center justify-center p-4 relative overflow-hidden group">
      {/* Clock Face */}
      <div className="relative w-full h-full max-w-[140px] max-h-[140px] rounded-full border-4 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-inner flex items-center justify-center">
        {/* Brand */}
        <div className="absolute top-[28%] text-[8px] font-bold tracking-[0.15em] text-slate-400 dark:text-slate-600 uppercase select-none font-sans">
          AcquiMail
        </div>

        {/* Hour Markers (12, 3, 6, 9) */}
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            className="absolute w-1 h-2.5 bg-slate-300 dark:bg-slate-600 rounded-full"
            style={{
              transform: `rotate(${deg}deg) translate(0, -52px)` // Adjusted for size
            }}
          />
        ))}

        {/* Hands */}
        {/* Hour */}
        <div
          className="absolute bg-slate-800 dark:bg-slate-200 w-1.5 h-10 rounded-full origin-bottom"
          style={{
            bottom: '50%',
            transform: `rotate(${hourDegrees}deg) translate(0, 0)`,
            transition: 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
          }}
        />
        {/* Minute */}
        <div
          className="absolute bg-slate-500 dark:bg-slate-400 w-1 h-14 rounded-full origin-bottom"
          style={{
            bottom: '50%',
            transform: `rotate(${minuteDegrees}deg) translate(0, 0)`,
            transition: 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
          }}
        />
        {/* Second */}
        <div
          className="absolute bg-orange-500 w-0.5 h-16 rounded-full origin-bottom"
          style={{
            bottom: '50%',
            transform: `rotate(${secondDegrees}deg) translate(0, 0)`,
            transition: 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
          }}
        />
        {/* Center Cap */}
        <div className="absolute w-2.5 h-2.5 bg-white dark:bg-slate-800 border-2 border-orange-500 rounded-full z-10" />
      </div>
    </div>
  );
};

// 1. Sidebar Component
const Sidebar = ({
  currentView,
  setView,
  isOpen,
  closeMenu,
  unreadEmails = 0,
  newTasks = 0
}: {
  currentView: ViewState,
  setView: (v: ViewState) => void,
  isOpen: boolean,
  closeMenu: () => void,
  unreadEmails?: number,
  newTasks?: number
}) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Track last seen counts to detect new items
  const [lastSeenEmails, setLastSeenEmails] = useState<number>(() => {
    const stored = localStorage.getItem('lastSeenEmailCount');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [lastSeenTasks, setLastSeenTasks] = useState<number>(() => {
    const stored = localStorage.getItem('lastSeenTaskCount');
    return stored ? parseInt(stored, 10) : 0;
  });

  // Determine if there are NEW items (more than last seen)
  const hasNewEmails = unreadEmails > lastSeenEmails;
  const hasNewTasks = newTasks > lastSeenTasks;

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // When clicking on inbox, mark emails as "seen"
  const handleViewChange = (viewId: string) => {
    if (viewId === 'inbox') {
      setLastSeenEmails(unreadEmails);
      localStorage.setItem('lastSeenEmailCount', unreadEmails.toString());
    }
    if (viewId === 'tasks') {
      setLastSeenTasks(newTasks);
      localStorage.setItem('lastSeenTaskCount', newTasks.toString());
    }
    setView(viewId as ViewState);
    closeMenu();
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Define menu items with notification dot flag
  const menuItems: Array<{ id: string, label: string, icon: any, hasNotification?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox', icon: Inbox, hasNotification: hasNewEmails },
    { id: 'tasks', label: 'Taken & Agenda', icon: Calendar, hasNotification: hasNewTasks },
    { id: 'crm', label: 'Relatiebeheer', icon: Users },
    { id: 'library', label: 'Bibliotheek', icon: FolderOpen },
    { id: 'generator', label: 'AI Generator', icon: Wand2 },
    { id: 'review', label: 'Verzendlijst', icon: Mail },
    { id: 'settings', label: 'Instellingen', icon: Settings },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-64 bg-slate-900 text-white z-30 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="text-blue-400" /> AcquiMail
          </h1>
          <button onClick={closeMenu} className="md:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${currentView === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
                {/* Blinking Notification Dot */}
                {item.hasNotification && currentView !== item.id && (
                  <span className="absolute right-4 w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50" />
                )}
              </button>
            );
          })}
        </nav>

        {installPrompt && (
          <div className="px-4 pb-2 mt-auto">
            <button
              onClick={handleInstallClick}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Download size={16} /> Installeer App
            </button>
          </div>
        )}

        <div className="p-4 border-t border-slate-800">
          <SidebarUserProfile />
        </div>
      </div>
    </>
  );
};

// Sidebar user profile component with logout
const SidebarUserProfile = () => {
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('Weet je zeker dat je wilt uitloggen?')) {
      setLoggingOut(true);
      try {
        await signOut();
      } catch (error) {
        console.error('Logout error:', error);
        setLoggingOut(false);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-slate-400 px-4 py-2">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-8 h-8 rounded-full shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium text-white truncate">
            {user?.displayName || 'User'}
          </p>
          <p className="text-xs truncate">{user?.email}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors disabled:opacity-50"
      >
        <LogOut size={18} />
        <span className="text-sm font-medium">
          {loggingOut ? 'Uitloggen...' : 'Uitloggen'}
        </span>
      </button>
    </div>
  );
};

// 2. Dashboard View
const DashboardView = ({
  leads,
  drafts,
  emails,
  onCheckFollowUps,
  isChecking,
  tasks
}: {
  leads: Lead[],
  drafts: EmailDraft[],
  emails: IncomingEmail[],
  onCheckFollowUps: () => void,
  isChecking: boolean,
  tasks: Task[]
}) => {
  const today = new Date().toISOString().split('T')[0];
  const tasksToday = tasks.filter(t => t.dueDate === today && !t.completed).length;

  const stats = [
    { label: 'Totaal Relaties', value: leads.length, icon: Users, color: 'text-blue-500' },
    { label: 'Concept Mails', value: drafts.filter(d => d.status === 'draft').length, icon: Mail, color: 'text-orange-500' },
    { label: 'Ongelezen Mails', value: emails.filter(e => !e.read).length, icon: Inbox, color: 'text-purple-500' },
    { label: 'Taken Vandaag', value: tasksToday, icon: CheckSquare, color: 'text-green-500' },
  ];

  const statusData = Object.values(LeadStatus).map(status => ({
    name: status,
    count: leads.filter(l => l.status === status).length
  }));

  const pendingFollowUps = leads.filter(l => {
    if (l.status !== LeadStatus.CONTACTED || !l.followUpConfig?.enabled || !l.lastContactDate) return false;
    const diffTime = Math.abs(new Date().getTime() - new Date(l.lastContactDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= l.followUpConfig.days;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h2>
        <div className="flex gap-4 items-center">
          <AnalogClock />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
              <div className={`p-3 rounded-full bg-slate-50 dark:bg-slate-700 ${stat.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold mb-4 text-slate-800 dark:text-slate-100">Relatie Status</h3>
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Wand2 /> AI Assistent
            </h3>
            <p className="text-indigo-100 mb-6 text-sm">
              Laat AI automatisch je CRM scannen op leads die een follow-up nodig hebben.
            </p>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium opacity-80">Wachtend:</span>
              <span className="text-2xl font-bold">{pendingFollowUps}</span>
            </div>
            <button
              onClick={onCheckFollowUps}
              disabled={isChecking || pendingFollowUps === 0}
              className="w-full bg-white text-indigo-600 font-bold py-3 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? <LoadingSpinner /> : <RefreshCw />}
              {isChecking ? 'Scannen...' : 'Genereer Follow-ups'}
            </button>
          </div>
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        </div>
      </div>
    </div>
  );
};

// 3. Inbox View
const InboxView = ({ emails, markRead, deleteEmail, onFetch, isFetching }: {
  emails: IncomingEmail[],
  markRead: (id: string) => void,
  deleteEmail: (id: string) => void,
  onFetch: () => void,
  isFetching: boolean
}) => {
  const [selectedEmail, setSelectedEmail] = useState<IncomingEmail | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Note: Real-time email sync is handled globally by startEmailMonitoring (every 30s)
  // No need for component-level polling
  useEffect(() => {
    // Empty - Firebase listeners handle real-time updates automatically
  }, []);

  const handleEmailClick = (email: IncomingEmail) => {
    setSelectedEmail(email);
    if (!email.read) {
      markRead(email.id);
    }
  };

  const handleDeleteEmail = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    if (window.confirm('Weet je zeker dat je deze e-mail wilt verwijderen?')) {
      deleteEmail(emailId);
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    }
  };

  const toggleSelection = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(emailId)) {
      newSet.delete(emailId);
    } else {
      newSet.add(emailId);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map(e => e.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Weet je zeker dat je ${selectedIds.size} e-mail(s) wilt verwijderen?`)) {
      selectedIds.forEach(id => deleteEmail(id));
      setSelectedIds(new Set());
      setSelectedEmail(null);
    }
  };

  const closeModal = () => {
    setSelectedEmail(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Inbox className="text-blue-600" /> Inbox
        </h2>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-red-600 transition-all font-medium"
            >
              <Trash2 size={18} />
              Verwijder ({selectedIds.size})
            </button>
          )}
          <button
            onClick={onFetch}
            disabled={isFetching}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium disabled:opacity-50"
          >
            {isFetching ? <LoadingSpinner /> : <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />}
            {isFetching ? 'Controleren...' : 'Vernieuwen'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {/* Select All Header */}
        {emails.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.size === emails.length && emails.length > 0
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                }`}
            >
              {selectedIds.size === emails.length && emails.length > 0 && <Check size={12} strokeWidth={3} />}
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {selectedIds.size > 0 ? `${selectedIds.size} geselecteerd` : 'Alles selecteren'}
            </span>
          </div>
        )}
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {emails.length === 0 ? (
            <div className="p-20 text-center text-slate-500">
              <div className="inline-block p-4 bg-slate-50 dark:bg-slate-900 rounded-full mb-4 text-slate-300 dark:text-slate-700">
                <Inbox size={48} />
              </div>
              <p className="font-medium text-slate-600 dark:text-slate-400">Jouw inbox is leeg</p>
              <p className="text-sm text-slate-400 mt-1">Nieuwe replies van cliënten verschijnen hier automatisch.</p>
            </div>
          ) : (
            emails.map(email => (
              <div
                key={email.id}
                className={`group p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all border-l-4 ${!email.read ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-500' : 'border-transparent'}`}
                onClick={() => handleEmailClick(email)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {/* Selection Checkbox */}
                    <button
                      onClick={(e) => toggleSelection(e, email.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${selectedIds.has(email.id)
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                        }`}
                    >
                      {selectedIds.has(email.id) && <Check size={12} strokeWidth={3} />}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs">
                      {email.senderName.charAt(0)}
                    </div>
                    <h4 className={`font-semibold text-slate-900 dark:text-white ${!email.read ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                      {email.senderName}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                      {new Date(email.receivedAt).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={(e) => handleDeleteEmail(e, email.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Verwijder e-mail"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className={`text-sm text-slate-800 dark:text-slate-200 mb-2 leading-relaxed ${!email.read ? 'font-bold' : ''}`}>
                  {email.subject}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                  {email.body}
                </p>
                {/* Badges */}
                <div className="mt-3 flex items-center gap-2">
                  {!email.read && (
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Nieuw
                    </span>
                  )}
                  {email.attachments && email.attachments.length > 0 && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Paperclip size={10} />
                      {email.attachments.length}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Email Detail Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 pr-8">
                  {selectedEmail.subject}
                </h3>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                      {selectedEmail.senderName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedEmail.senderName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{selectedEmail.senderEmail}</p>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Email Meta */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(selectedEmail.receivedAt).toLocaleString('nl-NL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {selectedEmail.read ? (
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full font-medium uppercase tracking-wider">
                  Gelezen
                </span>
              ) : (
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                  Nieuw
                </span>
              )}
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedEmail.body}
                </div>
              </div>

              {/* Attachments Section */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Paperclip size={16} />
                    Bijlagen ({selectedEmail.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedEmail.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {att.filename}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {(att.size / 1024).toFixed(1)} KB • {att.contentType}
                          </p>
                        </div>
                        {att.downloadUrl && (
                          <a
                            href={att.downloadUrl}
                            download={att.filename}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="Download"
                          >
                            <Download size={18} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={(e) => handleDeleteEmail(e, selectedEmail.id)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all font-medium"
              >
                <Trash2 size={18} />
                Verwijderen
              </button>
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all font-medium"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 4. Tasks View
const TasksView = ({
  tasks,
  addTask,
  updateTask,
  deleteTask,
  leads
}: {
  tasks: Task[],
  addTask: (t: Omit<Task, 'id'>) => void,
  updateTask: (t: Task) => void,
  deleteTask: (id: string) => void,
  leads: Lead[]
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask({
      title: newTaskTitle,
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'medium',
      completed: false
    });
    setNewTaskTitle('');
  };

  // Sort tasks by date and priority
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const toggleSelection = (taskId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Weet je zeker dat je ${selectedIds.size} taak/taken wilt verwijderen?`)) {
      selectedIds.forEach(id => deleteTask(id));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="text-blue-600" /> Taken & Agenda
        </h2>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-red-600 transition-all font-medium"
            >
              <Trash2 size={18} />
              Verwijder ({selectedIds.size})
            </button>
          )}
          <span className="text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            {tasks.filter(t => !t.completed).length} openstaand
          </span>
        </div>
      </div>

      {/* Select All Header */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-3 px-2">
          <button
            onClick={toggleSelectAll}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.size === tasks.length && tasks.length > 0
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
              }`}
          >
            {selectedIds.size === tasks.length && tasks.length > 0 && <Check size={12} strokeWidth={3} />}
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {selectedIds.size > 0 ? `${selectedIds.size} geselecteerd` : 'Alles selecteren'}
          </span>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-4">
        <div className="flex-1 relative">
          <input
            className="w-full p-4 pl-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            placeholder="Wat moet er gebeuren?"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
          />
          <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-8 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95">
          Toevoegen
        </button>
      </form>

      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4">
              <CheckCircle size={48} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Helemaal bijgewerkt! Geen openstaande taken.</p>
            <p className="text-xs text-slate-400 mt-1">Nieuwe taken verschijnen hier ook automatisch via AI Generator.</p>
          </div>
        ) : (
          sortedTasks.map(task => (
            <div
              key={task.id}
              className={`group bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border transition-all flex items-center gap-4
                ${task.completed ? 'opacity-60 border-slate-100 dark:border-slate-800' : 'border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-md'}
              `}
            >
              {/* Selection Checkbox */}
              <button
                onClick={() => toggleSelection(task.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${selectedIds.has(task.id)
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                  }`}
              >
                {selectedIds.has(task.id) && <Check size={12} strokeWidth={3} />}
              </button>

              {/* Completion Checkbox */}
              <button
                onClick={() => updateTask({ ...task, completed: !task.completed })}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0
                  ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-slate-500 text-transparent hover:border-green-500 hover:scale-110'}
                `}
              >
                <Check size={14} strokeWidth={3} />
              </button>

              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <p className={`font-semibold text-slate-800 dark:text-slate-100 truncate ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                  {task.title}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar size={12} />
                    <span>{new Date(task.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  {task.leadName && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                      <User size={12} />
                      <span className="font-medium">{task.leadName}</span>
                    </div>
                  )}
                  {task.description && (
                    <p className="text-xs text-slate-400 truncate max-w-xs">{task.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold
                  ${task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                    task.priority === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                  {task.priority}
                </div>

                <button
                  onClick={() => {
                    if (window.confirm('Verwijder deze taak?')) {
                      deleteTask(task.id);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex-1">
                <input
                  className="text-xl font-bold text-slate-900 dark:text-white mb-2 bg-transparent border-none focus:outline-none w-full"
                  value={selectedTask.title}
                  onChange={(e) => {
                    const updated = { ...selectedTask, title: e.target.value };
                    setSelectedTask(updated);
                    updateTask(updated);
                  }}
                />
                {selectedTask.leadName && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <User size={14} />
                    <span>{selectedTask.leadName}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Due Date */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Calendar size={16} /> Vervaldatum
                </label>
                <input
                  type="date"
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={selectedTask.dueDate}
                  onChange={(e) => {
                    const updated = { ...selectedTask, dueDate: e.target.value };
                    setSelectedTask(updated);
                    updateTask(updated);
                  }}
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Prioriteit</label>
                <div className="flex gap-3">
                  {(['low', 'medium', 'high'] as const).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => {
                        const updated = { ...selectedTask, priority };
                        setSelectedTask(updated);
                        updateTask(updated);
                      }}
                      className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${selectedTask.priority === priority
                          ? priority === 'high'
                            ? 'bg-red-500 text-white shadow-lg'
                            : priority === 'medium'
                              ? 'bg-orange-500 text-white shadow-lg'
                              : 'bg-slate-500 text-white shadow-lg'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Beschrijving</label>
                <textarea
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  rows={4}
                  placeholder="Voeg een beschrijving toe..."
                  value={selectedTask.description || ''}
                  onChange={(e) => {
                    const updated = { ...selectedTask, description: e.target.value };
                    setSelectedTask(updated);
                    updateTask(updated);
                  }}
                />
              </div>

              {/* Completion Status */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <button
                  onClick={() => {
                    const updated = { ...selectedTask, completed: !selectedTask.completed };
                    setSelectedTask(updated);
                    updateTask(updated);
                  }}
                  className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${selectedTask.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-slate-300 dark:border-slate-500 text-transparent hover:border-green-500 hover:scale-110'
                    }`}
                >
                  <Check size={18} strokeWidth={3} />
                </button>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    {selectedTask.completed ? 'Voltooid' : 'Markeer als voltooid'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedTask.completed ? 'Deze taak is afgerond' : 'Taak is nog niet afgerond'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-between">
              <button
                onClick={() => {
                  if (window.confirm('Weet je zeker dat je deze taak wilt verwijderen?')) {
                    deleteTask(selectedTask.id);
                    setSelectedTask(null);
                  }
                }}
                className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
              >
                Verwijder taak
              </button>
              <button
                onClick={() => setSelectedTask(null)}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 5. CRM Component
const CRMView = ({
  leads,
  addLead,
  updateLead,
  updateLeadStatus,
  addTask,
  deleteLead
}: {
  leads: Lead[],
  addLead: (l: Omit<Lead, 'id'>) => void,
  updateLead: (l: Lead) => void,
  updateLeadStatus: (id: string, status: LeadStatus) => void,
  addTask: (t: Omit<Task, 'id'>) => void,
  deleteLead: (id: string) => void
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLogLead, setSelectedLogLead] = useState<Lead | null>(null);
  const [isProcessingLog, setIsProcessingLog] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [addressSourceUrl, setAddressSourceUrl] = useState<string | undefined>(undefined);

  const { isListening, transcript, startListening, stopListening, setTranscript, resetTranscript } = useSpeechRecognition();

  // Expanded Form State
  const [formState, setFormState] = useState<{
    type: LeadType;
    name: string;
    company: string;
    email: string;
    phone: string;
    website: string;
    notes: string;
    street: string;
    houseNumber: string;
    zipCode: string;
    city: string;
    followUpEnabled: boolean;
    followUpDays: number;
  }>({
    type: 'business',
    name: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    notes: '',
    street: '',
    houseNumber: '',
    zipCode: '',
    city: '',
    followUpEnabled: false,
    followUpDays: 3
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (lead: Lead) => {
    setFormState({
      type: lead.type || 'business',
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      notes: lead.notes,
      street: lead.address?.street || '',
      houseNumber: lead.address?.houseNumber || '',
      zipCode: lead.address?.zipCode || '',
      city: lead.address?.city || '',
      followUpEnabled: lead.followUpConfig?.enabled || false,
      followUpDays: lead.followUpConfig?.days || 3
    });
    setEditingId(lead.id);
    setIsModalOpen(true);
    setAddressSourceUrl(undefined);
  };

  const handleAddClick = () => {
    setFormState({
      type: 'business',
      name: '',
      company: '',
      email: '',
      phone: '',
      website: '',
      notes: '',
      street: '',
      houseNumber: '',
      zipCode: '',
      city: '',
      followUpEnabled: false,
      followUpDays: 3
    });
    setEditingId(null);
    setIsModalOpen(true);
    setAddressSourceUrl(undefined);
  };

  const handleLogClick = (lead: Lead) => {
    setSelectedLogLead(lead);
    resetTranscript();
    setIsLogModalOpen(true);
  };

  const processLog = async () => {
    if (!selectedLogLead || !transcript.trim()) return;
    setIsProcessingLog(true);

    try {
      const result = await processCallLog(transcript, selectedLogLead.name);

      // Update Lead Notes
      const updatedNotes = (selectedLogLead.notes ? selectedLogLead.notes + '\n\n' : '') + result.summary;
      updateLead({
        ...selectedLogLead,
        notes: updatedNotes,
        lastContactDate: new Date().toISOString().split('T')[0],
        status: LeadStatus.CONTACTED
      });

      // Add Task if needed
      if (result.hasTask && result.taskTitle) {
        addTask({
          title: result.taskTitle,
          description: result.taskDescription || 'Gegenereerd uit gesprek',
          dueDate: result.taskDueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
          priority: result.taskPriority || 'medium',
          completed: false,
          leadId: selectedLogLead.id,
          leadName: selectedLogLead.name
        });
        alert('Notitie toegevoegd en taak aangemaakt!');
      } else {
        alert('Notitie opgeslagen.');
      }
      setIsLogModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Fout bij verwerken log.');
    } finally {
      setIsProcessingLog(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const leadData = {
      type: formState.type,
      name: formState.name,
      company: formState.company,
      email: formState.email,
      phone: formState.phone,
      website: formState.website,
      notes: formState.notes,
      address: {
        street: formState.street,
        houseNumber: formState.houseNumber,
        zipCode: formState.zipCode,
        city: formState.city
      },
      followUpConfig: {
        enabled: formState.followUpEnabled,
        days: formState.followUpDays
      }
    };

    if (editingId) {
      const existingLead = leads.find(l => l.id === editingId);
      if (existingLead) {
        updateLead({ ...existingLead, ...leadData });
      }
    } else {
      addLead({ ...leadData, status: LeadStatus.NEW });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Relatiebeheer</h2>
        <button
          onClick={handleAddClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
        >
          <Plus size={18} /> Nieuwe Relatie
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Zoeken op naam of bedrijf..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-medium">
              <tr>
                <th className="p-4">Naam & Organisatie</th>
                <th className="p-4">Contactgegevens</th>
                <th className="p-4">Adres</th>
                <th className="p-4">Status & Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {lead.type === 'business' ?
                        <Building2 size={14} className="text-blue-500" /> :
                        <User size={14} className="text-green-500" />
                      }
                      <span className="font-medium text-slate-800 dark:text-slate-100">{lead.name}</span>
                    </div>
                    {lead.company && <div className="text-slate-500 dark:text-slate-400 ml-6">{lead.company}</div>}
                    {lead.followUpConfig?.enabled && (
                      <div className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
                        <Repeat size={10} /> Auto follow-up: {lead.followUpConfig.days} dgn
                      </div>
                    )}
                  </td>
                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Mail size={14} /> {lead.email}
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Phone size={14} /> {lead.phone}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">
                    {lead.address?.city ? (
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="mt-0.5 text-slate-400" />
                        <div>
                          <div>{lead.address.street} {lead.address.houseNumber}</div>
                          <div className="text-xs text-slate-400">{lead.address.zipCode} {lead.address.city}</div>
                        </div>
                      </div>
                    ) : <span className="text-slate-400 italic">Geen adres</span>}
                  </td>
                  <td className="p-4 flex items-center gap-3">
                    <select
                      value={['Nieuw', 'New'].includes(lead.status) ? LeadStatus.NEW :
                        ['Gecontacteerd', 'Contacted'].includes(lead.status) ? LeadStatus.CONTACTED :
                          ['Gereageerd', 'Responded'].includes(lead.status) ? LeadStatus.REPLIED :
                            ['Klant', 'Converted', 'Customer'].includes(lead.status) ? LeadStatus.CONVERTED :
                              LeadStatus.LOST}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-none focus:ring-2 focus:ring-blue-500 cursor-pointer
                        ${['Nieuw', 'New'].includes(lead.status) ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100' : ''}
                        ${['Gecontacteerd', 'Contacted'].includes(lead.status) ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100' : ''}
                        ${['Gereageerd', 'Responded'].includes(lead.status) ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100' : ''}
                        ${['Klant', 'Converted', 'Customer'].includes(lead.status) ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100' : ''}
                        ${['Verloren', 'Lost'].includes(lead.status) ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100' : ''}
                      `}
                    >
                      {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button
                      onClick={() => handleLogClick(lead)}
                      className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Log gesprek"
                    >
                      <Mic size={16} />
                    </button>

                    <button
                      onClick={() => handleEditClick(lead)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Wijzigen"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm('Weet je zeker dat je deze relatie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
                          deleteLead(lead.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Call Modal */}
      {isLogModalOpen && selectedLogLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white flex items-center gap-2">
              <PhoneCall size={24} className="text-green-500" />
              Gesprek Loggen
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {selectedLogLead.name} ({selectedLogLead.company})
            </p>

            <div className="mb-6 space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Spreek je samenvatting in:</p>
              <div className={`p-4 border rounded-lg min-h-[120px] bg-slate-50 dark:bg-slate-700/50 ${isListening ? 'border-red-400 ring-2 ring-red-100 dark:ring-red-900/20' : 'border-slate-200 dark:border-slate-600'}`}>
                {transcript ? (
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{transcript}</p>
                ) : (
                  <p className="text-slate-400 italic">Druk op de microfoon en begin met spreken...</p>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`p-4 rounded-full transition-all shadow-lg ${isListening ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                  {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Annuleren
              </button>
              <button
                onClick={processLog}
                disabled={!transcript.trim() || isProcessingLog}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessingLog ? <LoadingSpinner /> : <Wand2 size={18} />}
                {isProcessingLog ? 'Verwerken...' : 'Verwerk met AI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
              {editingId ? <Pencil size={20} /> : <Plus size={20} />}
              {editingId ? 'Relatie Wijzigen' : 'Nieuwe Relatie Toevoegen'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type Selection */}
              <div className="flex gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <label className={`flex-1 cursor-pointer p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${formState.type === 'business' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-100' : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  <input type="radio" name="type" value="business" className="hidden" checked={formState.type === 'business'} onChange={() => setFormState({ ...formState, type: 'business' })} />
                  <Building2 size={18} /> Zakelijk
                </label>
                <label className={`flex-1 cursor-pointer p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${formState.type === 'individual' ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-500 dark:text-green-100' : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  <input type="radio" name="type" value="individual" className="hidden" checked={formState.type === 'individual'} onChange={() => setFormState({ ...formState, type: 'individual' })} />
                  <User size={18} /> Particulier
                </label>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Naam Contactpersoon</label>
                  <input required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {formState.type === 'business' ? 'Bedrijfsnaam' : 'Organisatie (Optioneel)'}
                  </label>
                  <input
                    required={formState.type === 'business'}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={formState.company}
                    onChange={e => setFormState({ ...formState, company: e.target.value })}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input required type="email" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formState.email} onChange={e => setFormState({ ...formState, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefoonnummer</label>
                  <input className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formState.phone} onChange={e => setFormState({ ...formState, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website</label>
                  <input className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="www..." value={formState.website} onChange={e => setFormState({ ...formState, website: e.target.value })} />
                </div>
              </div>

              {/* Address Section */}
              <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <MapPin size={16} /> Adresgegevens
                </h4>
                <div className="grid grid-cols-6 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Postcode</label>
                    <input
                      placeholder="1234 AB"
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                      value={formState.zipCode}
                      onChange={e => setFormState({ ...formState, zipCode: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Huisnr.</label>
                    <input
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formState.houseNumber}
                      onChange={e => setFormState({ ...formState, houseNumber: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3">
                    {/* Spacer or suffix/extension */}
                  </div>

                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Straatnaam</label>
                    <input
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formState.street}
                      onChange={e => setFormState({ ...formState, street: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Plaats</label>
                    <input
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formState.city}
                      onChange={e => setFormState({ ...formState, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Follow-up Section (New) */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                  <Repeat size={16} /> Automatische Follow-up
                </h4>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={formState.followUpEnabled}
                      onChange={e => setFormState({ ...formState, followUpEnabled: e.target.checked })}
                    />
                    Inschakelen
                  </label>
                  {formState.followUpEnabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Stuur reminder na:</span>
                      <input
                        type="number"
                        min="1"
                        className="w-16 p-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center"
                        value={formState.followUpDays}
                        onChange={e => setFormState({ ...formState, followUpDays: parseInt(e.target.value) || 3 })}
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">dagen geen contact</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Als de klant niet reageert binnen dit aantal dagen, zet het systeem automatisch een concept mail klaar op het dashboard.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Interne Notities</label>
                <textarea className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg h-24 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formState.notes} onChange={e => setFormState({ ...formState, notes: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                  Annuleren
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm">
                  {editingId ? 'Wijzigingen Opslaan' : 'Toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// 6. Library Component
const LibraryView = ({ files, onUpload, onDelete }: { files: FileAsset[], onUpload: (f: File) => void, onDelete: (file: FileAsset) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Bestandsbibliotheek</h2>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Upload size={18} /> <span className="hidden md:inline">Bestand Uploaden</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 min-h-[400px]">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg text-slate-400">
            <FolderOpen size={48} className="mb-2" />
            <p>Sleep bestanden hierheen of klik op uploaden</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map(file => (
              <div key={file.id} className="group relative border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-700/30">
                <div className="h-24 bg-white dark:bg-slate-600 rounded-lg flex items-center justify-center mb-3">
                  {file.type.startsWith('image/') ? (
                    <img src={file.downloadUrl} alt={file.name} className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <FileText size={40} className="text-slate-400 dark:text-slate-300" />
                  )}
                </div>
                <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={file.name}>{file.name}</div>
                <div className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Weet je zeker dat je dit bestand wilt verwijderen?')) {
                      onDelete(file);
                    }
                  }}
                  className="absolute top-2 right-2 p-1 bg-white/80 dark:bg-slate-800/80 rounded-full text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 7. Generator Component
const GeneratorView = ({
  leads,
  onGenerate,
  isLoading,
  files
}: {
  leads: Lead[],
  onGenerate: (selectedIds: string[], prompt: string, attachments: string[]) => void,
  isLoading: boolean,
  files: FileAsset[]
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState('');
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<Set<string>>(new Set());
  const [showFilePicker, setShowFilePicker] = useState(false);

  const { isListening, transcript, startListening, stopListening, setTranscript } = useSpeechRecognition();

  // Effect to append transcript to prompt
  useEffect(() => {
    if (transcript) {
      setPrompt(prev => {
        const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + spacer + transcript;
      });
      setTranscript('');
    }
  }, [transcript, setTranscript]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAttachment = (id: string) => {
    setSelectedAttachmentIds(prevSet => {
      const newSet = new Set(prevSet);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleGenerate = () => {
    if (selectedIds.size === 0 || !prompt.trim()) return;
    onGenerate(Array.from(selectedIds), prompt, Array.from(selectedAttachmentIds));
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 md:h-[calc(100vh-8rem)]">
      {/* Sidebar: Select People */}
      <div className="w-full md:w-1/3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-64 md:h-auto">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">1. Selecteer Ontvangers</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kies wie je wilt mailen ({selectedIds.size} geselecteerd)</p>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {leads.map(lead => (
            <div
              key={lead.id}
              onClick={() => toggleSelection(lead.id)}
              className={`p-3 mb-2 rounded-lg cursor-pointer border transition-all flex items-center justify-between
                ${selectedIds.has(lead.id) ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600'}`}
            >
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{lead.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  {lead.type === 'business' ? <Building2 size={10} /> : <User size={10} />}
                  {lead.company || 'Particulier'}
                </div>
              </div>
              {selectedIds.has(lead.id) && <CheckCircle className="text-blue-600 dark:text-blue-400" size={18} />}
            </div>
          ))}
        </div>
      </div>

      {/* Main: Prompt Area */}
      <div className="w-full md:w-2/3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col p-6 min-h-[500px]">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">2. Schrijf Instructie</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Wat is het doel van deze mail?</p>

        <div className="relative flex-1 mb-4">
          <textarea
            className="w-full h-full p-4 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-900 dark:placeholder:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none pb-12"
            placeholder="Typ je instructie of gebruik de microfoon..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500'}`}
              title={isListening ? "Stop opname" : "Start inspreken"}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>
        </div>

        {/* Attachments Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Paperclip size={16} /> Attachments ( {selectedAttachmentIds.size} )
            </label>
            <button
              onClick={() => setShowFilePicker(!showFilePicker)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add from library
            </button>
          </div>

          {/* Selected Files Chips */}
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedAttachmentIds).map(id => {
              const file = files.find(f => f.id === id);
              if (!file) return null;
              return (
                <div key={id} className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-slate-200 dark:border-slate-600 dark:text-slate-200">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => toggleAttachment(id)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                </div>
              );
            })}
          </div>

          {/* Mini File Picker */}
          {showFilePicker && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg max-h-40 overflow-y-auto">
              {files.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-2">Geen bestanden in bibliotheek.</div>
              ) : (
                files.map(file => (
                  <div
                    key={file.id}
                    onClick={() => toggleAttachment(file.id)}
                    className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-600 rounded cursor-pointer"
                  >
                    <div className={`w-4 h-4 border rounded ${selectedAttachmentIds.has(file.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500'}`}></div>
                    <span className="text-sm truncate dark:text-slate-200">{file.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          disabled={isLoading || selectedIds.size === 0 || !prompt.trim()}
          onClick={handleGenerate}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? <LoadingSpinner /> : <Wand2 />}
          {isLoading ? 'Genereren...' : 'Genereer Concepten'}
        </button>
      </div>
    </div>
  );
};

// 8. Review/Queue Component
const ReviewView = ({
  drafts,
  updateDraft,
  sendEmails,
  deleteDraft,
  files,
  leads
}: {
  drafts: EmailDraft[],
  updateDraft: (id: string, updates: Partial<EmailDraft>) => void,
  sendEmails: (ids: string[]) => void,
  deleteDraft: (id: string) => void,
  files: FileAsset[],
  leads: Lead[]
}) => {
  const { user } = useAuth(); // Get authenticated user
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'sent'>('pending');

  const pendingDrafts = drafts.filter(d => d.status === 'draft');
  const sentDrafts = drafts.filter(d => d.status === 'sent');

  const displayDrafts = activeTab === 'pending' ? pendingDrafts : sentDrafts;
  const selectedDraft = displayDrafts.find(d => d.id === selectedDraftId) || displayDrafts[0];

  useEffect(() => {
    if (!selectedDraftId && displayDrafts.length > 0) {
      setSelectedDraftId(displayDrafts[0].id);
    }
  }, [displayDrafts, selectedDraftId]);

  // Reset selection when switching tabs
  useEffect(() => {
    if (displayDrafts.length > 0) {
      setSelectedDraftId(displayDrafts[0].id);
    } else {
      setSelectedDraftId(null);
    }
  }, [activeTab]);

  if (pendingDrafts.length === 0 && sentDrafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <CheckCircle size={64} className="mb-4 text-green-500" />
        <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">Alles bijgewerkt!</h3>
        <p>Er zijn geen concepten in de wachtrij.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 md:h-[calc(100vh-8rem)]">
      <div className="w-full md:w-1/3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-64 md:h-auto">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Wachtrij ({pendingDrafts.length})</h3>
          <button
            onClick={() => sendEmails(pendingDrafts.map(d => d.id))}
            className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100 px-2 py-1 rounded font-bold hover:bg-green-200"
          >
            Verzend Alles
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {pendingDrafts.map(draft => (
            <div
              key={draft.id}
              onClick={() => setSelectedDraftId(draft.id)}
              className={`p-4 border-b dark:border-slate-700 cursor-pointer transition-colors ${selectedDraft?.id === draft.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-600' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-4 border-l-transparent'
                }`}
            >
              <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{draft.leadName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{draft.leadEmail}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 truncate">{draft.subject}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full md:w-2/3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col min-h-[500px]">
        {selectedDraft ? (
          <>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-xl space-y-2">
              {/* Email Change Warning */}
              {(() => {
                const currentLead = leads.find(l => l.id === selectedDraft.leadId);
                const emailChanged = currentLead && currentLead.email !== selectedDraft.leadEmail;

                return emailChanged ? (
                  <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                    <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">E-mailadres bijgewerkt</p>
                      <p className="text-amber-700 dark:text-amber-400">
                        Deze e-mail wordt verzonden naar <strong>{currentLead.email}</strong> (nieuw adres), niet naar {selectedDraft.leadEmail}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="w-20 font-bold">Aan:</span>
                <span>{selectedDraft.leadName} &lt;{selectedDraft.leadEmail}&gt;</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="w-20 font-bold">Van:</span>
                <span>{user?.email || 'Gmail'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="w-20 font-bold">Onderwerp:</span>
                <input
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:border-blue-500 focus:outline-none flex-1"
                  value={selectedDraft.subject}
                  onChange={(e) => updateDraft(selectedDraft.id, { subject: e.target.value })}
                />
              </div>
              {selectedDraft.attachments && selectedDraft.attachments.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 pt-1">
                  <span className="w-20 font-bold shrink-0 flex items-center gap-1"><Paperclip size={14} /> Bijlagen:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedDraft.attachments.map(attId => {
                      const file = files.find(f => f.id === attId);
                      return file ? (
                        <span key={attId} className="bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 px-2 py-0.5 rounded text-xs text-slate-700 dark:text-slate-200">
                          {file.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <textarea
              className="flex-1 p-6 focus:outline-none resize-none font-sans leading-relaxed bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              value={selectedDraft.body}
              onChange={(e) => updateDraft(selectedDraft.id, { body: e.target.value })}
            />

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <button
                onClick={() => deleteDraft(selectedDraft.id)}
                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors"
                title="Verwijder concept"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={() => sendEmails([selectedDraft.id])}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Send size={18} /> Verstuur Nu
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">Selecteer een e-mail om te bewerken</div>
        )}
      </div>
    </div>
  );
};

// 9. Settings Component
const SettingsView = ({
  theme,
  setTheme
}: {
  theme: string,
  setTheme: (t: string) => void
}) => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Settings /> Instellingen
        </h2>

        {/* Gmail Account Info */}
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Mail className="text-blue-500" />
            <div className="flex-1">
              <p className="font-bold text-slate-800 dark:text-slate-100">Gmail Account</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{user?.email || 'Niet ingelogd'}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            E-mails worden verzonden via Gmail API met je Google account
          </p>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="text-blue-500" /> : <Sun className="text-orange-500" />}
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100">Donkere Modus</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pas het uiterlijk van de app aan</p>
            </div>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`relative w-14 h-7 rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'
              }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
                }`}
            />
          </button>
        </div>

        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-2">
            <CheckCircle className="text-green-500 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Gmail API Actief</p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Je app gebruikt nu de Gmail API voor professionele e-mail verzending en ontvangst.
                Geen SMTP configuratie meer nodig!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
// --- Main App Content ---
const AppContent = () => {
  const { addToast, updateToast, removeToast } = useToast();
  const { user } = useAuth(); // Get authenticated user
  const [view, setView] = useState<ViewState>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [emails, setEmails] = useState<IncomingEmail[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Theme State
  const [theme, setTheme] = useState('light');

  // Firebase Real-time Listeners
  useEffect(() => {
    // Subscribe to leads collection
    const unsubLeads = onLeadsChange((leadsData) => {
      setLeads(leadsData);
    });

    // Subscribe to tasks collection
    const unsubTasks = onTasksChange((tasksData) => {
      setTasks(tasksData);
    });

    // Subscribe to drafts collection
    const unsubDrafts = onDraftsChange((draftsData) => {
      setDrafts(draftsData);
    });

    // Subscribe to emails collection
    const unsubEmails = onEmailsChange((emailsData) => {
      setEmails(emailsData);
    });

    // Subscribe to files collection
    const unsubFiles = onFilesChange((filesData) => {
      setFiles(filesData);
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubLeads();
      unsubTasks();
      unsubDrafts();
      unsubEmails();
      unsubFiles();
    };
  }, []);

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Real-time Gmail API email monitoring
  useEffect(() => {
    console.log('🚀 Starting Gmail API real-time monitoring...');

    // Start monitoring - checks every 30 seconds
    const stopMonitoring = startEmailMonitoring();

    // Cleanup when component unmounts
    return () => {
      console.log('🛑 Stopping Gmail API monitoring');
      stopMonitoring();
    };
  }, []); // Only run once on mount

  const handleAddLead = async (lead: Omit<Lead, 'id'>) => {
    await addLeadToFirestore(lead);
  };

  const handleUpdateLead = async (updatedLead: Lead) => {
    // Check if email has changed
    const oldLead = leads.find(l => l.id === updatedLead.id);
    const emailChanged = oldLead && oldLead.email !== updatedLead.email;

    await updateLeadInFirestore(updatedLead);

    // If email changed, update all pending drafts for this lead
    if (emailChanged) {
      const pendingDraftsForLead = drafts.filter(
        d => d.leadId === updatedLead.id && d.status === 'draft'
      );

      for (const draft of pendingDraftsForLead) {
        await updateDraftInFirestore(draft.id, {
          leadEmail: updatedLead.email
        });
      }

      if (pendingDraftsForLead.length > 0) {
        addToast({
          type: 'info',
          title: 'E-mail bijgewerkt',
          message: `${pendingDraftsForLead.length} concept(en) bijgewerkt met nieuw e-mailadres.`
        });
      }
    }
  };

  const handleUpdateLeadStatus = async (id: string, status: LeadStatus) => {
    try {
      console.log('Updating status for:', id, 'to', status);
      const lead = leads.find(l => l.id === id);
      if (lead) {
        // Ensure we persist the change to Firestore
        await updateLeadInFirestore({ ...lead, status });
        console.log('Status updated successfully');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      addToast({ type: 'error', title: 'Fout', message: 'Kon status niet updaten.' });
    }
  };

  const handleDeleteLead = async (id: string) => {
    await deleteLeadFromFirestore(id);
  };

  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    await addTaskToFirestore(task);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    await updateTaskInFirestore(updatedTask);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTaskFromFirestore(id);
  };

  const handleCheckFollowUps = async () => {
    try {
      setIsLoading(true);
      const pendingLeads = leads.filter(l => {
        if (l.status !== LeadStatus.CONTACTED || !l.followUpConfig?.enabled || !l.lastContactDate) return false;
        const diffTime = Math.abs(new Date().getTime() - new Date(l.lastContactDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= l.followUpConfig.days;
      });

      let generatedCount = 0;
      for (const lead of pendingLeads) {
        const response = await generateFollowUpEmail(
          lead,
          user?.email || user?.displayName || 'AcquiMail'
        );
        const newDraft: Omit<EmailDraft, 'id'> = {
          leadId: lead.id,
          leadName: lead.name,
          leadEmail: lead.email,
          subject: response.subject,
          body: response.body,
          attachments: [],
          status: 'draft',
          generatedAt: new Date().toISOString()
        };
        await addDraftToFirestore(newDraft);
        generatedCount++;
      }

      setIsLoading(false);
      if (generatedCount > 0) {
        setView('review');
        addToast({ type: 'success', title: 'Succes', message: `${generatedCount} follow-up mails gegenereerd!` });
      } else {
        addToast({ type: 'info', title: 'Geen updates', message: 'Geen leads gevonden die aan de follow-up criteria voldoen.' });
      }
    } catch (error: any) {
      console.error('Error generating follow-ups:', error);
      setIsLoading(false);
      addToast({
        type: 'error',
        title: 'Fout bij genereren',
        message: error.message || 'Er is een fout opgetreden bij het genereren.'
      });
    }
  };

  const handleGenerateEmails = async (selectedIds: string[], userPrompt: string, attachmentIds: string[]) => {
    try {
      setIsLoading(true);
      const selectedLeads = leads.filter(l => selectedIds.includes(l.id));

      // Get attachment names for context
      const attachmentNames = files
        .filter(f => attachmentIds.includes(f.id))
        .map(f => f.name);

      // Generate emails for each lead
      for (const lead of selectedLeads) {
        const response = await generateEmailForLead(
          lead,
          userPrompt,
          user?.email || user?.displayName || 'AcquiMail',
          attachmentNames
        );
        const newDraft: Omit<EmailDraft, 'id'> = {
          leadId: lead.id,
          leadName: lead.name,
          leadEmail: lead.email,
          subject: response.subject,
          body: response.body,
          attachments: attachmentIds,
          status: 'draft',
          generatedAt: new Date().toISOString()
        };
        await addDraftToFirestore(newDraft);
      }

      // Extract tasks/agenda items from the user's prompt
      const leadNames = selectedLeads.map(l => l.name);
      const taskExtractionResult = await extractTasksFromPrompt(userPrompt, leadNames);

      if (taskExtractionResult.hasTasks && taskExtractionResult.tasks.length > 0) {
        let tasksCreated = 0;
        for (const extractedTask of taskExtractionResult.tasks) {
          const newTask: Omit<Task, 'id'> = {
            title: extractedTask.title,
            description: extractedTask.description,
            dueDate: extractedTask.dueDate,
            priority: extractedTask.priority,
            completed: false,
            // Link to first lead if there's only one, otherwise leave unlinked
            leadId: selectedLeads.length === 1 ? selectedLeads[0].id : undefined,
            leadName: selectedLeads.length === 1 ? selectedLeads[0].name : undefined
          };
          await addTaskToFirestore(newTask);
          tasksCreated++;
        }

        // Show success message with task count
        addToast({
          type: 'success',
          title: 'Succes',
          message: `Concepten gegenereerd! ${tasksCreated} taak/taken automatisch toegevoegd aan Agenda.`
        });
      } else {
        addToast({ type: 'success', title: 'Succes', message: 'Concepten gegenereerd!' });
      }

      setIsLoading(false);
      setView('review');
    } catch (error: any) {
      console.error('Error generating emails:', error);
      setIsLoading(false);
      addToast({
        type: 'error',
        title: 'Fout bij genereren',
        message: error.message || 'Er is een fout opgetreden.'
      });
    }
  };

  const handleUpdateDraft = async (id: string, updates: Partial<EmailDraft>) => {
    await updateDraftInFirestore(id, updates);
  };

  const handleSendEmails = async (ids: string[]) => {
    const draftsToSend = drafts.filter(d => ids.includes(d.id));
    let sentCount = 0;
    let failCount = 0;

    for (const draft of draftsToSend) {
      try {
        // Prepare attachments if any
        const attachments = [];
        console.log(`Draft ${draft.id} has ${draft.attachments?.length || 0} attachments`, draft.attachments);
        if (draft.attachments && draft.attachments.length > 0) {
          for (const attId of draft.attachments) {
            const file = files.find(f => f.id === attId);
            console.log(`Looking for attachment ${attId}, found:`, file ? `${file.name} (${file.type})` : 'NOT FOUND');
            if (file) {
              // Try base64 first
              if (file.base64Content) {
                attachments.push({
                  filename: file.name,
                  contentType: file.type,
                  content: file.base64Content
                });
                console.log(`✅ Added attachment from stored base64: ${file.name}, length: ${file.base64Content.length}`);
              }
              // Fallback to download URL if available (backend api updated to support 'path')
              else if (file.downloadUrl) {
                attachments.push({
                  filename: file.name,
                  contentType: file.type,
                  path: file.downloadUrl
                });
                console.log(`✅ Added attachment from URL: ${file.name}`);
              }
              else {
                console.warn(`⚠️ File ${file.name} has no base64Content stored. Please re-upload this file.`);
                addToast({
                  type: 'info',
                  title: 'Bijlage waarschuwing',
                  message: `${file.name} moet opnieuw worden geüpload om als bijlage te kunnen worden verzonden.`
                });
              }
            }
          }
        }

        // CRITICAL FIX: Get the CURRENT lead email, not the draft's stored email
        const currentLead = leads.find(l => l.id === draft.leadId);

        if (!currentLead) {
          throw new Error('Lead niet gevonden. Mogelijk is de relatie verwijderd.');
        }

        // Use the current lead's email, not the draft's stored email
        const recipientEmail = currentLead.email;

        // Warn if email has changed
        if (recipientEmail !== draft.leadEmail) {
          console.warn(`Email changed for ${draft.leadName}: ${draft.leadEmail} -> ${recipientEmail}`);
        }

        console.log(`Sending email to ${recipientEmail} with ${attachments.length} attachments`);

        // Send via Gmail API instead of SMTP
        await sendEmailProfessional({
          to: recipientEmail,
          subject: draft.subject,
          html: draft.body,
          attachments: attachments
        });

        console.log(`✅ Email sent successfully to ${recipientEmail} via Gmail API`);

        // Delete the draft after successful send
        await deleteDraftFromFirestore(draft.id);

        // Update Lead status for sent draft
        if (currentLead) {
          await handleUpdateLead({
            ...currentLead,
            status: LeadStatus.CONTACTED,
            lastContactDate: new Date().toISOString().split('T')[0]
          });
        }
        sentCount++;
      } catch (error: any) {
        console.error('Error sending email:', error);
        failCount++;
        addToast({
          type: 'error',
          title: 'Verzendfout',
          message: `Kon e-mail naar ${draft.leadName} niet verzenden: ${error.message}`
        });
      }
    }

    if (sentCount > 0) {
      addToast({
        type: 'success',
        title: 'Verzonden',
        message: `Succesvol ${sentCount} e-mails verzonden!`
      });
    }

    if (failCount > 0) {
      addToast({
        type: 'error',
        title: 'Fout',
        message: `${failCount} e-mails konden niet worden verzonden.`
      });
    }
  };

  const handleDeleteDraft = async (id: string) => {
    await deleteDraftFromFirestore(id);
  };

  const handleFileUpload = async (file: File) => {
    const toastId = addToast({
      type: 'progress',
      title: 'Bestand uploaden...',
      progress: 0
    });

    try {
      // Read file as base64 for email attachments
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove the data URL prefix
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      // Upload file to Firebase Storage with progress
      const { downloadUrl, storagePath } = await uploadFileWithProgress(file, (progress) => {
        updateToast(toastId, { progress });
      });

      // Save file metadata to Firestore (including base64 for attachments)
      const fileMetadata: Omit<FileAsset, 'id'> = {
        name: file.name,
        type: file.type,
        size: file.size,
        downloadUrl,
        storagePath,
        uploadedAt: new Date().toISOString(),
        base64Content // Store base64 to avoid CORS issues when sending emails
      };
      await addFileMetadata(fileMetadata);

      updateToast(toastId, {
        type: 'success',
        title: 'Upload voltooid',
        message: `${file.name} is toegevoegd aan de bibliotheek.`,
        duration: 3000
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      updateToast(toastId, {
        type: 'error',
        title: 'Fout bij uploaden',
        message: 'Probeer het later opnieuw.'
      });
    }
  };

  const handleDeleteFile = async (file: FileAsset) => {
    try {
      if (file.storagePath) {
        try {
          await deleteFileFromStorage(file.storagePath);
        } catch (storageError) {
          console.warn('Could not delete file from storage (might actially be missing), proceeding to delete metadata:', storageError);
        }
      }
      await deleteFileMetadataFromFirestore(file.id);
      addToast({ type: 'success', title: 'Verwijderd', message: 'Bestand is succesvol verwijderd.' });
    } catch (error) {
      console.error('Error deleting file:', error);
      addToast({ type: 'error', title: 'Fout', message: 'Fout bij het verwijderen van het bestand.' });
    }
  };

  const handleMarkEmailRead = async (id: string) => {
    await updateEmailInFirestore(id, { read: true });
  };

  const handleDeleteEmail = async (id: string) => {
    try {
      await deleteEmailFromFirestore(id);
      addToast({ type: 'success', title: 'Verwijderd', message: 'E-mail is succesvol verwijderd.' });
    } catch (error) {
      console.error('Error deleting email:', error);
      addToast({ type: 'error', title: 'Fout', message: 'Fout bij het verwijderen van de e-mail.' });
    }
  };

  const handleFetchEmails = async () => {
    try {
      setIsLoading(true);
      console.log('📥 Fetching emails via Gmail API...');

      // Use the professional Gmail API service
      await fetchEmailReplies();

      console.log('✅ Email fetch completed via Gmail API');
      // No toast here - automatic monitoring runs every 30s, don't spam user
    } catch (error) {
      console.error('Error fetching emails:', error);
      addToast({ type: 'error', title: 'Fout', message: 'Kon e-mails niet ophalen. Check console voor details.' });
    } finally {
      setIsLoading(false);
    }
  };

  // SMTP config handler removed - using Gmail API now

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar
        currentView={view}
        setView={setView}
        isOpen={isMobileMenuOpen}
        closeMenu={() => setIsMobileMenuOpen(false)}
        unreadEmails={emails.filter(e => !e.read).length}
        newTasks={tasks.filter(t => !t.completed).length}
      />

      <div className="flex-1 md:ml-64 transition-all duration-300">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-slate-900 p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Mail className="text-blue-500" /> AcquiMail
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <main className="p-4 md:p-8 max-w-7xl mx-auto">
          {view === 'dashboard' && (
            <DashboardView
              leads={leads}
              drafts={drafts}
              emails={emails}
              onCheckFollowUps={handleCheckFollowUps}
              isChecking={isLoading}
              tasks={tasks}
            />
          )}

          {view === 'crm' && (
            <CRMView
              leads={leads}
              addLead={handleAddLead}
              updateLead={handleUpdateLead}
              updateLeadStatus={handleUpdateLeadStatus}
              addTask={handleAddTask}
              deleteLead={handleDeleteLead}
            />
          )}

          {view === 'tasks' && (
            <TasksView
              tasks={tasks}
              addTask={handleAddTask}
              updateTask={handleUpdateTask}
              deleteTask={handleDeleteTask}
              leads={leads}
            />
          )}

          {view === 'inbox' && (
            <InboxView
              emails={emails}
              markRead={handleMarkEmailRead}
              deleteEmail={handleDeleteEmail}
              onFetch={handleFetchEmails}
              isFetching={isLoading}
            />
          )}

          {view === 'generator' && (
            <GeneratorView
              leads={leads}
              onGenerate={handleGenerateEmails}
              isLoading={isLoading}
              files={files}
            />
          )}

          {view === 'review' && (
            <ReviewView
              drafts={drafts}
              sendEmails={handleSendEmails}
              updateDraft={handleUpdateDraft}
              deleteDraft={handleDeleteDraft}
              files={files}
              leads={leads}
            />
          )}

          {view === 'library' && (
            <LibraryView
              files={files}
              onUpload={handleFileUpload}
              onDelete={handleDeleteFile}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              theme={theme}
              setTheme={setTheme}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppContentWithAuth />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Wrapper to check auth state before rendering main app
const AppContentWithAuth = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AppContent />;
};
