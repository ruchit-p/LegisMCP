import { NextRequest, NextResponse } from 'next/server';

// For now, we'll store submissions in a simple JSON structure
// In production, this should integrate with Notion API
interface EnterpriseInquiry {
  id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  useCase: string;
  expectedVolume: string;
  additionalNotes?: string;
  submittedAt: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'company', 'useCase', 'expectedVolume'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Create inquiry object
    const inquiry: EnterpriseInquiry = {
      id: `inq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      email: body.email,
      company: body.company,
      phone: body.phone || '',
      useCase: body.useCase,
      expectedVolume: body.expectedVolume,
      additionalNotes: body.additionalNotes || '',
      submittedAt: new Date().toISOString(),
    };

    // TODO: Integrate with Notion API
    // For now, we'll just log the inquiry
    console.log('Enterprise Inquiry:', inquiry);

    // In a real implementation, you would:
    // 1. Send to Notion database
    // 2. Send notification email to sales team
    // 3. Send confirmation email to user

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({ 
      success: true,
      message: 'Your inquiry has been submitted successfully',
      inquiryId: inquiry.id
    });

  } catch (error) {
    console.error('Error submitting enterprise inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to submit inquiry' },
      { status: 500 }
    );
  }
}