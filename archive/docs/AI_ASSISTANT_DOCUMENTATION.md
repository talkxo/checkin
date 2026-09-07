# Assistant for Company Queries - Documentation

## Overview

The Assistant module is a comprehensive solution that provides employees with instant access to company information through an intelligent chat interface. It uses Retrieval-Augmented Generation (RAG) to provide accurate, context-aware responses based on the company's knowledge base.

## Features

### 🎯 Core Features
- **Intelligent Chat Interface**: Natural language conversations with the assistant
- **Speech-to-Text Integration**: Voice input support for hands-free interaction
- **Knowledge Base Management**: Admin interface to manage company policies and information
- **Context-Aware Responses**: Assistant remembers conversation history for better interactions
- **Source Attribution**: Shows which knowledge base sections were used for responses

### 🎨 User Interface
- **Modern Chat Design**: Clean, intuitive chat interface matching the app's design
- **Real-time Typing Indicators**: Visual feedback during AI processing
- **Quick Action Buttons**: Pre-defined common queries for easy access
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 🔧 Technical Features
- **RAG Implementation**: Retrieval-Augmented Generation for accurate responses
- **Fallback AI Models**: Multiple AI model support with automatic fallbacks
- **Error Handling**: Graceful error handling and user feedback
- **Performance Optimized**: Fast response times and efficient processing

## Architecture

### Components

1. **Frontend Components**
   - `AIAssistant` - Main chat interface component (named for file consistency)
   - `KnowledgeBaseManager` - Admin interface for managing knowledge base

2. **API Endpoints**
   - `/api/ai/assistant` - Main assistant endpoint
   - `/api/admin/knowledge-base` - Knowledge base management API

3. **Knowledge Base**
   - Structured company information storage
   - Categorized content (HR, IT, Office, etc.)
   - Markdown support for rich formatting

### Data Flow

```
User Input → Speech-to-Text → Assistant API → Knowledge Base Search → AI Model → Response
```

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed
- OpenRouter API key configured (for AI model access)
- Modern browser with Web Speech API support

### 2. Environment Variables
Add the following to your `.env.local` file:
```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Installation
The AI Assistant module is already integrated into the existing codebase. No additional installation steps are required.

### 4. Configuration
The knowledge base is pre-populated with sample company information. You can customize it through the admin interface or by modifying the API endpoints.

## Usage Guide

### For Employees

#### Accessing the Assistant
1. Log into the INSYDE app
2. Click on the "Assistant" tab in the main interface
3. Start asking questions about company policies, work culture, benefits, etc.

#### Using Voice Input
1. Click the microphone icon in the chat input
2. Speak your question clearly
3. The assistant will transcribe your speech and respond

#### Quick Actions
Use the pre-defined buttons for common queries:
- Leave & Benefits
- Work Culture
- Systems & Tools
- Team Rituals

### For Administrators

#### Managing the Knowledge Base
1. Access the admin panel
2. Navigate to Knowledge Base Manager
3. Add, edit, or delete knowledge base items
4. Organize content by categories

#### Adding New Content
1. Click "Add New" in the Knowledge Base Manager
2. Enter a category name (e.g., "Security Policies")
3. Add content in Markdown format
4. Save the changes

#### Best Practices
- Use clear, concise language
- Organize content with headers and bullet points
- Keep information up-to-date
- Use categories for easy navigation

## Knowledge Base Structure

### Current Categories

1. **HR Policies**
   - Leave policies and procedures
   - Work hours and schedules
   - Dress code guidelines
   - Employee benefits

2. **IT & Technology**
   - Equipment and software
   - IT support contacts
   - Security policies
   - Tools and platforms

3. **Office & Facilities**
   - Office location and access
   - Building hours and security
   - Amenities and services
   - Meeting room booking

4. **Company Culture**
   - Company values and mission
   - Events and activities
   - Recognition programs
   - Communication guidelines

5. **Career Development**
   - Learning and development
   - Career growth opportunities
   - Performance management
   - Skills development

### Content Format
All knowledge base content supports Markdown formatting:
- Headers (`#`, `##`, `###`)
- Bullet points (`-`)
- Bold and italic text
- Links and references

## API Reference

### Assistant Endpoint

**POST** `/api/ai/assistant`

Request body:
```json
{
  "query": "What are the leave policies?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous question"
    },
    {
      "role": "assistant", 
      "content": "Previous answer"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "response": "Assistant generated response",
  "sources": ["Benefits & Perks", "Leave Policy"],
  "timestamp": "2024-01-23T10:30:00.000Z"
}
```

### Knowledge Base Management Endpoints

**GET** `/api/admin/knowledge-base` - Retrieve all knowledge base items
**POST** `/api/admin/knowledge-base` - Create new knowledge base item
**PUT** `/api/admin/knowledge-base` - Update existing knowledge base item
**DELETE** `/api/admin/knowledge-base?id=<id>` - Delete knowledge base item

## Customization

### Adding New AI Models
The system supports multiple AI models through OpenRouter. To add new models:

1. Update the `models` array in `/lib/ai.ts`
2. Add fallback models in order of preference
3. Configure model-specific parameters

### Extending Knowledge Base
To add new knowledge base categories:

1. Add content to the `COMPANY_KNOWLEDGE_BASE` array in `/app/api/ai/assistant/route.ts`
2. Update the knowledge base manager interface
3. Test with sample queries

### Customizing UI
The Assistant uses the existing design system:
- Colors: Purple theme (`purple-600`, `purple-700`)
- Components: UI components from `/components/ui/`
- Icons: Font Awesome icons

## Troubleshooting

### Common Issues

1. **Speech Recognition Not Working**
   - Ensure you're using Chrome or Edge browser
   - Check microphone permissions
   - Verify HTTPS connection (required for speech API)

2. **Assistant Responses Not Loading**
   - Check OpenRouter API key configuration
   - Verify network connectivity
   - Check browser console for errors

3. **Knowledge Base Not Updating**
   - Clear browser cache
   - Check admin permissions
   - Verify API endpoint accessibility

### Debug Mode
Enable debug logging by checking browser console for detailed error messages and API responses.

## Security Considerations

- All API calls are authenticated through the existing auth system
- Knowledge base content is validated and sanitized
- Speech data is processed locally and not stored
- API keys are stored securely in environment variables

## Performance Optimization

- Knowledge base search uses efficient keyword matching
- Conversation history is limited to prevent memory issues
- AI responses are cached where appropriate
- Speech recognition is optimized for accuracy and speed

## Future Enhancements

### Planned Features
- **Multi-language Support**: Support for multiple languages
- **Advanced Analytics**: Usage analytics and insights
- **Integration APIs**: Connect with external knowledge sources
- **Mobile App**: Native mobile application
- **Voice Response**: Text-to-speech for responses

### Scalability Improvements
- **Vector Database**: Implement proper vector similarity search
- **Caching Layer**: Redis-based response caching
- **Load Balancing**: Multiple AI model instances
- **Database Storage**: Persistent knowledge base storage

## Support

For technical support or questions about the Assistant module:
- Check this documentation first
- Review the browser console for error messages
- Contact the development team with specific error details

## License

This Assistant module is part of the INSYDE application and follows the same licensing terms.
