import { Lead } from "../types";

// Use Vercel serverless function to proxy OpenAI requests
// In development, Vite proxy handles this
// In production, /api/openai-proxy serverless function handles this
const API_BASE_URL = '/api/openai-proxy';

export interface GeneratedEmailResponse {
    subject: string;
    body: string;
}

const callOpenAI = async (messages: Array<{ role: string, content: string }>): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: messages,
                response_format: { type: "json_object" }
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API error:', response.status, errorText);
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('OpenAI API error:', error);
        throw error;
    }
};

export const generateEmailForLead = async (
    lead: Lead,
    userPrompt: string,
    senderName: string,
    attachmentNames: string[]
): Promise<GeneratedEmailResponse> => {
    const systemInstruction = `You are an expert in business acquisition and copywriting. 
  You write professional, persuasive and personalized emails.
  Detect the language of the user's prompt and respond in the SAME language (e.g., if the prompt is in English, the email should be in English; if it is in Dutch, it should be in Dutch).
  Keep the tone professional yet accessible. 
  Do not use placeholders like [Date] unless absolutely necessary.
  The sender is: ${senderName}.`;

    const attachmentContext = attachmentNames.length > 0
        ? `De volgende bestanden worden meegestuurd als bijlage: ${attachmentNames.join(', ')}. Verwijs hier indien relevant naar in de tekst (bijv. "In de bijlage vindt u...").`
        : '';

    const prompt = `
    Schrijf een acquisitie e-mail voor de volgende prospect:
    Naam: ${lead.name}
    Bedrijf: ${lead.company}
    Website: ${lead.website}
    Telefoon: ${lead.phone}
    Huidige notities over klant: ${lead.notes}
    
    Instructie voor de inhoud van de mail: ${userPrompt}
    ${attachmentContext}
    
    Formatteer de output als een geldig JSON object met velden 'subject' en 'body'.
  `;

    try {
        const content = await callOpenAI([
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
        ]);

        if (!content) throw new Error("No response from AI");
        return JSON.parse(content) as GeneratedEmailResponse;
    } catch (error) {
        console.error("Error generating email:", error);
        throw error;
    }
};

export const generateFollowUpEmail = async (
    lead: Lead,
    senderName: string
): Promise<GeneratedEmailResponse> => {
    const systemInstruction = `You are a helpful assistant writing short, friendly follow-up emails.
    Detect the language of the lead's information and your previous context, and respond in the SAME language.`;

    const prompt = `
    Write a friendly, short follow-up (reminder) email for this prospect:
    Name: ${lead.name}
    Company: ${lead.company}
    Last contact date: ${lead.lastContactDate}
    
    Goal: Politely ask if they read my previous email and if there are any questions. Don't force anything, stay helpful.
    Sender: ${senderName}
    
    Format output as a valid JSON object with fields 'subject' and 'body'.
  `;

    try {
        const content = await callOpenAI([
            { role: "user", content: prompt }
        ]);

        if (!content) throw new Error("No response");
        return JSON.parse(content) as GeneratedEmailResponse;
    } catch (e) {
        console.error(e);
        return { subject: "Follow-up", body: "Kon geen follow-up genereren." };
    }
};

export const lookupAddress = async (
    zipCode: string,
    houseNumber: string
): Promise<{ street: string; city: string; sourceUrl?: string }> => {
    const prompt = `Wat is de officiële straatnaam en plaatsnaam die hoort bij postcode ${zipCode} met huisnummer ${houseNumber} in Nederland?
  Antwoord exact in dit JSON formaat:
  {
      "street": "Straatnaam",
      "city": "Plaatsnaam"
  }
  
  Indien onbekend, geef lege strings terug.`;

    try {
        const content = await callOpenAI([
            { role: "user", content: prompt }
        ]);

        if (!content) return { street: '', city: '' };

        const result = JSON.parse(content);
        return {
            street: result.street || '',
            city: result.city || '',
            sourceUrl: undefined
        };
    } catch (error) {
        console.error("Address lookup failed:", error);
        return { street: '', city: '' };
    }
};

export interface CallLogAnalysis {
    summary: string;
    hasTask: boolean;
    taskTitle?: string;
    taskDescription?: string;
    taskDueDate?: string; // YYYY-MM-DD
    taskPriority?: 'low' | 'medium' | 'high';
}

export const processCallLog = async (
    transcript: string,
    leadName: string
): Promise<CallLogAnalysis> => {
    const today = new Date().toISOString().split('T')[0];

    const prompt = `
    Analyseer de volgende transcriptie van een telefoongesprek of notitie over klant '${leadName}'.
    Huidige datum: ${today}.

    Transcriptie: "${transcript}"

    Taken:
    1. Maak een korte, professionele samenvatting van het gesprek voor in het CRM (in het Nederlands). Begin met de datum van vandaag.
    2. Bepaal of er een vervolgactie/taak nodig is. Zo ja, destilleer de taak.
    3. Als er een tijdsaanduiding is (bv. "volgende week dinsdag", "over 2 dagen"), bereken dan de exacte datum (YYYY-MM-DD) gebaseerd op de huidige datum (${today}). Als er geen datum wordt genoemd maar wel een taak is, pak dan morgen.

    Geef antwoord als JSON object:
    {
      "summary": "...",
      "hasTask": true/false,
      "taskTitle": "...", 
      "taskDescription": "...",
      "taskDueDate": "YYYY-MM-DD",
      "taskPriority": "low" | "medium" | "high"
    }
  `;

    try {
        const content = await callOpenAI([
            { role: "user", content: prompt }
        ]);

        if (!content) throw new Error("No response");
        return JSON.parse(content) as CallLogAnalysis;
    } catch (e) {
        console.error(e);
        return {
            summary: `${today}: Gesprek genoteerd: ${transcript}`,
            hasTask: false
        };
    }
};

export interface ExtractedTask {
    title: string;
    description: string;
    dueDate: string; // YYYY-MM-DD
    priority: 'low' | 'medium' | 'high';
}

export interface TaskExtractionResult {
    hasTasks: boolean;
    tasks: ExtractedTask[];
}

export const extractTasksFromPrompt = async (
    userPrompt: string,
    leadNames: string[]
): Promise<TaskExtractionResult> => {
    const today = new Date().toISOString().split('T')[0];

    const prompt = `
    Analyze the following instruction/prompt for creating an email campaign.
    Current date: ${today}.
    Recipients: ${leadNames.join(', ')}

    User's instruction: "${userPrompt}"

    Your task:
    1. Identify ANY tasks, agenda items, follow-ups, meetings, calls, deadlines, or action items mentioned in this instruction.
    2. If you find MULTIPLE related tasks that are part of the same activity, CONSOLIDATE them into a SINGLE comprehensive task.
    3. For the consolidated task, extract:
       - A clear, comprehensive task title that captures all related activities
       - A detailed description covering all aspects and action items
       - Due date (YYYY-MM-DD format). If a relative time is mentioned (e.g., "next week", "tomorrow", "in 3 days"), calculate the actual date from today (${today}). If no date is mentioned, use tomorrow's date.
       - Priority level: "high" (urgent, important, ASAP, critical), "medium" (normal follow-up, standard tasks), "low" (nice to have, when possible)

    IMPORTANT: Avoid creating duplicate tasks. If the instruction mentions the same activity in different ways, combine them into ONE task.
    
    Examples:
    - "Schedule a follow-up call next week and discuss pricing" → ONE task: "Follow-up call to discuss pricing"
    - "Send proposal by Friday" → ONE task: "Send proposal"  
    - "Remind me to check in, call them, and ask about their decision" → ONE task: "Follow-up call to check decision status"

    Return a JSON object:
    {
      "hasTasks": true/false,
      "tasks": [
        {
          "title": "Comprehensive task title",
          "description": "Detailed description covering all related action items",
          "dueDate": "YYYY-MM-DD",
          "priority": "low" | "medium" | "high"
        }
      ]
    }

    If no tasks are found, return {"hasTasks": false, "tasks": []}.
    Remember: Quality over quantity - one well-structured task is better than many duplicated ones.
  `;

    try {
        const content = await callOpenAI([
            { role: "user", content: prompt }
        ]);

        if (!content) throw new Error("No response");
        const result = JSON.parse(content) as TaskExtractionResult;
        return result;
    } catch (e) {
        console.error("Error extracting tasks:", e);
        return {
            hasTasks: false,
            tasks: []
        };
    }
};
export const extractTasksFromEmail = async (
    emailBody: string,
    senderName: string
): Promise<TaskExtractionResult> => {
    const today = new Date().toISOString().split('T')[0];

    const prompt = `
    Analyze the following email reply from a client/prospect named '${senderName}'.
    Current date: ${today}.

    Email Content: "${emailBody}"

    Your task:
    1. Identify any tasks, commitments, meetings, or action items requested by the client or implied for me to do.
    2. For EACH task found, extract:
       - A clear, concise task title
       - A brief description of what needs to be done
       - Due date (YYYY-MM-DD format). If they mention a relative time (e.g., "next week", "Friday", "tomorrow"), calculate the actual date from today (${today}). If no date is mentioned, use tomorrow's date.
       - Priority level: "high" (urgent/important), "medium" (standard), "low" (nice to have)

    Examples:
    - "Let's talk next Monday" -> Task: Meeting with ${senderName}
    - "Send me the invoice please" -> Task: Send invoice to ${senderName}
    - "I will check this and let you know" -> Task: Follow up with ${senderName}

    Return a JSON object:
    {
      "hasTasks": true/false,
      "tasks": [
        {
          "title": "...",
          "description": "...",
          "dueDate": "YYYY-MM-DD",
          "priority": "low" | "medium" | "high"
        }
      ]
    }
  `;

    try {
        const content = await callOpenAI([
            { role: "system", content: "You are a helpful assistant that extracts actionable tasks from emails." },
            { role: "user", content: prompt }
        ]);

        if (!content) throw new Error("No response");
        return JSON.parse(content) as TaskExtractionResult;
    } catch (e) {
        console.error("Error extracting tasks from email:", e);
        return { hasTasks: false, tasks: [] };
    }
};
