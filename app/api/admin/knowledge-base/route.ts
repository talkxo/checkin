import { NextRequest, NextResponse } from 'next/server';
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
  let sectionId = 1;
  
  for (const line of lines) {
    if (line.startsWith('## **') && line.endsWith('**')) {
      // Save previous section if exists
      if (currentSection && currentContent.trim()) {
        sections.push({
          id: sectionId.toString(),
          category: currentSection,
          content: currentContent.trim(),
          lastUpdated: new Date().toISOString()
        });
        sectionId++;
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
      id: sectionId.toString(),
      category: currentSection,
      content: currentContent.trim(),
      lastUpdated: new Date().toISOString()
    });
  }
  
  return sections;
}

// Get the knowledge base from the handbook
let knowledgeBase = parseHandbookSections(getHandbookContent());

// GET - Retrieve all knowledge base items
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: knowledgeBase
    });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base' },
      { status: 500 }
    );
  }
}

// POST - Create a new knowledge base item
export async function POST(request: NextRequest) {
  try {
    const { category, content } = await request.json();

    if (!category || !content) {
      return NextResponse.json(
        { error: 'Category and content are required' },
        { status: 400 }
      );
    }

    const newItem = {
      id: Date.now().toString(),
      category: category.trim(),
      content: content.trim(),
      lastUpdated: new Date().toISOString()
    };

    knowledgeBase.push(newItem);

    return NextResponse.json({
      success: true,
      data: newItem
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge base item:', error);
    return NextResponse.json(
      { error: 'Failed to create knowledge base item' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing knowledge base item
export async function PUT(request: NextRequest) {
  try {
    const { id, category, content } = await request.json();

    if (!id || !category || !content) {
      return NextResponse.json(
        { error: 'ID, category, and content are required' },
        { status: 400 }
      );
    }

    const itemIndex = knowledgeBase.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Knowledge base item not found' },
        { status: 404 }
      );
    }

    knowledgeBase[itemIndex] = {
      ...knowledgeBase[itemIndex],
      category: category.trim(),
      content: content.trim(),
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: knowledgeBase[itemIndex]
    });
  } catch (error) {
    console.error('Error updating knowledge base item:', error);
    return NextResponse.json(
      { error: 'Failed to update knowledge base item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a knowledge base item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const itemIndex = knowledgeBase.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Knowledge base item not found' },
        { status: 404 }
      );
    }

    const deletedItem = knowledgeBase.splice(itemIndex, 1)[0];

    return NextResponse.json({
      success: true,
      data: deletedItem
    });
  } catch (error) {
    console.error('Error deleting knowledge base item:', error);
    return NextResponse.json(
      { error: 'Failed to delete knowledge base item' },
      { status: 500 }
    );
  }
}
