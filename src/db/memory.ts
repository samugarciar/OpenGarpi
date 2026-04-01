import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { ChatCompletionMessageParam, ChatCompletionToolMessageParam, ChatCompletionAssistantMessageParam, ChatCompletionSystemMessageParam } from "openai/resources/index.js";

// Initialize Firebase Admin
// This will automatically pick up GOOGLE_APPLICATION_CREDENTIALS from the environment
try {
  initializeApp({
    credential: applicationDefault()
  });
} catch (error: any) {
  if (error.code === 'app/duplicate-app') {
     console.log('Firebase app already initialized');
  } else {
     console.error("🔥 Error initializing Firebase Admin. Did you set GOOGLE_APPLICATION_CREDENTIALS?", error);
     process.exit(1);
  }
}

const db = getFirestore();

export class MemoryManager {
  static async addMessage(
    userId: number,
    message: ChatCompletionMessageParam
  ) {
    let toolCallsJson: string | null = null;
    let toolCallId: string | null = null;
    let content: string | null = null;

    if (message.role === "assistant") {
      const assistantMsg = message as ChatCompletionAssistantMessageParam;
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        toolCallsJson = JSON.stringify(assistantMsg.tool_calls);
      }
      content = assistantMsg.content?.toString() || null;
    } else if (message.role === "tool") {
      const toolMsg = message as ChatCompletionToolMessageParam;
      toolCallId = toolMsg.tool_call_id;
      content = toolMsg.content?.toString() || null;
    } else {
       // user or system message
       if ('content' in message && typeof message.content === 'string') {
          content = message.content;
       } else if ('content' in message && Array.isArray(message.content)) {
          // Flatten array content if it's there
           content = message.content.map(p => {
               if ('text' in p) return p.text;
               return '';
           }).join('');
       }
    }

    const docRef = db.collection('users').doc(userId.toString()).collection('messages').doc();
    
    await docRef.set({
      role: message.role,
      content: content,
      tool_calls: toolCallsJson,
      tool_call_id: toolCallId,
      timestamp: FieldValue.serverTimestamp()
    });
  }

  static async getHistory(userId: number, limit: number = 30): Promise<ChatCompletionMessageParam[]> {
    const messagesRef = db.collection('users').doc(userId.toString()).collection('messages');
    
    // Order by timestamp DESC to get the latest messages, limit them, then reverse locally
    const snapshot = await messagesRef.orderBy('timestamp', 'desc').limit(limit).get();
    
    const rows = snapshot.docs.map(doc => doc.data());
    rows.reverse();

    return rows.map((row) => {
      const base: any = {
        role: row.role,
      };

      if (row.content !== null) {
        base.content = row.content;
      }

      if (row.role === "assistant" && row.tool_calls) {
        base.tool_calls = JSON.parse(row.tool_calls);
      }

      if (row.role === "tool" && row.tool_call_id) {
        base.tool_call_id = row.tool_call_id;
      }

      if (row.role === "assistant") {
        return base as ChatCompletionAssistantMessageParam;
      } else if (row.role === "tool") {
        return base as ChatCompletionToolMessageParam;
      } else if (row.role === "system") {
        return base as ChatCompletionSystemMessageParam;
      }

      // Default to user messages if nothing else
      return base as ChatCompletionMessageParam;
    });
  }

  static async clearHistory(userId: number) {
    const messagesRef = db.collection('users').doc(userId.toString()).collection('messages');
    
    // Fetch all documents in the subcollection and delete them inside a batch
    const snapshot = await messagesRef.get();
    
    if (snapshot.empty) return;
    
    // Firestore batches have a limit of 500 operations, but for chat history this should be fine.
    // If it exceeds 500, we'd need to chunk it.
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }
}
