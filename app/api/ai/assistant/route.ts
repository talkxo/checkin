import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

// Company Knowledge Base - Using the actual handbook.md file
import { readFileSync } from 'fs';
import { join } from 'path';

// Function to read the handbook.md file
function getHandbookContent() {
  try {
    const handbookPath = join(process.cwd(), 'components', 'handbook.md');
    const content = readFileSync(handbookPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading handbook.md:', error);
    return '';
  }
}

// Parse the handbook content into structured sections
function parseHandbookSections(content: string) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = '';
  let currentContent = '';
  
  for (const line of lines) {
    if (line.startsWith('## **') && line.endsWith('**')) {
      // Save previous section if exists
      if (currentSection && currentContent.trim()) {
        sections.push({
          category: currentSection,
          content: currentContent.trim()
        });
      }
      // Start new section
      currentSection = line.replace('## **', '').replace('**', '').trim();
      currentContent = '';
    } else if (line.startsWith('### ') && currentSection) {
      // Add subsection to current content
      currentContent += '\n' + line + '\n';
    } else if (currentSection) {
      // Add content to current section
      currentContent += line + '\n';
    }
  }
  
  // Add the last section
  if (currentSection && currentContent.trim()) {
    sections.push({
      category: currentSection,
      content: currentContent.trim()
    });
  }
  
  return sections;
}

// Get the knowledge base from the handbook
const COMPANY_KNOWLEDGE_BASE = parseHandbookSections(getHandbookContent());

// Simple vector similarity search (in production, use a proper vector database)
function searchKnowledgeBase(query: string, topK: number = 3) {
  const queryLower = query.toLowerCase();
  const results = [];

  for (const item of COMPANY_KNOWLEDGE_BASE) {
    const contentLower = item.content.toLowerCase();
    let score = 0;

    // Simple keyword matching
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 1;
      }
    }

    // Category matching
    if (item.category.toLowerCase().includes(queryLower)) {
      score += 2;
    }

    if (score > 0) {
      results.push({
        category: item.category,
        content: item.content,
        score: score
      });
    }
  }

  // Sort by score and return top K results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function POST(request: NextRequest) {
  try {
    const { query, conversationHistory = [], userSlug } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if this is a leave balance query
    const isLeaveBalanceQuery = query.toLowerCase().includes('leave balance') || 
                               query.toLowerCase().includes('my leaves') ||
                               query.toLowerCase().includes('how many leaves') ||
                               query.toLowerCase().includes('remaining leaves');

    if (isLeaveBalanceQuery && userSlug) {
      // Fetch actual leave balance data
      try {
        const leaveResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/leave/balance?slug=${userSlug}`);
        
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json();
          
          // Format the leave balance response
          let leaveBalanceText = '';
          
          if (leaveData.leaveBalance && leaveData.leaveBalance.length > 0) {
            leaveBalanceText = 'Here\'s your current leave balance:\n\n';
            leaveData.leaveBalance.forEach((leave: any) => {
              leaveBalanceText += `• **${leave.leave_type_name}**: ${leave.remaining_days} days remaining\n`;
            });
          } else {
            leaveBalanceText = 'I couldn\'t find your leave balance information. ';
          }

          // Add pending requests if any
          if (leaveData.pendingRequests && leaveData.pendingRequests.length > 0) {
            leaveBalanceText += '\n**Pending Leave Requests:**\n';
            leaveData.pendingRequests.forEach((request: any) => {
              const status = request.status === 'pending' ? '⏳ Pending' : '✅ Approved';
              leaveBalanceText += `• ${request.start_date} to ${request.end_date} (${request.total_days} days) - ${status}\n`;
            });
          }

          return NextResponse.json({
            success: true,
            response: leaveBalanceText || 'I couldn\'t retrieve your leave balance. Please contact HR for assistance.',
            sources: ['Leave Management System'],
            timestamp: new Date().toISOString()
          });
        }
      } catch (leaveError) {
        console.error('Error fetching leave balance:', leaveError);
        // Continue with normal AI response if leave API fails
      }
    }

    // Search knowledge base for relevant information
    const relevantDocs = searchKnowledgeBase(query);
    
    // Build context from relevant documents
    const context = relevantDocs.length > 0 
      ? relevantDocs.map(doc => `${doc.category}:\n${doc.content}`).join('\n\n')
      : 'No specific company information found for this query.';

    // Create the system prompt
    const systemPrompt = `You are an assistant for INSYDE company. You help employees with questions about company policies, procedures, and general information.

IMPORTANT GUIDELINES:
1. Always be helpful, professional, and friendly
2. Base your answers on the provided company knowledge base
3. If you don't have specific information, say so and suggest who to contact
4. Keep responses concise but informative
5. Use a conversational tone
6. If asked about something not in the knowledge base, suggest contacting HR or management
7. NEVER include the words "analysisUser asks" or similar phrases in your response
8. NEVER show your thinking process or internal analysis
9. Respond directly and naturally as if you're having a conversation
10. For leave balance queries, suggest they use the "Leave Balance" quick action button

Company Knowledge Base:
${context}`;

    // Build conversation history for context
    const conversationContext = conversationHistory.length > 0
      ? `\n\nPrevious conversation:\n${conversationHistory.map((msg: any) => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')}\n\n`
      : '';

    // Create the user message
    const userMessage = `${conversationContext}Current user question: ${query}`;

    // Call the AI model
    const aiResponse = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], 0.7);

    if (!aiResponse.success) {
      return NextResponse.json(
        { error: 'Failed to generate response', details: aiResponse.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: aiResponse.data,
      sources: relevantDocs.map(doc => doc.category),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
