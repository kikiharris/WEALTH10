export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pdfText, fileName } = req.body;

  if (!pdfText || pdfText.trim().length < 50) {
    return res.status(400).json({ error: 'No valid PDF text provided.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const systemPrompt = `You are a professional credit analyst for Wealth 10.0, a premium wealth-building and business funding advisory platform. You will receive raw extracted text from a credit report PDF. Analyze it thoroughly and return ONLY a valid JSON object — no markdown, no explanation, no backticks, no preamble. The JSON must have exactly this structure:

{
  "header": {
    "userName": "Full name from report or Not Found",
    "date": "Report pull date if found, else today's date",
    "reportType": "e.g. Full Credit Report",
    "bureau": "Experian / TransUnion / Equifax / Multi-Bureau / Not Specified"
  },
  "creditBreakdown": {
    "score": {
      "value": "Score number e.g. 712",
      "status": "Excellent or Good or Moderate or Weak or Needs Improvement",
      "interpretation": "1-2 sentence explanation of what this score means for funding"
    },
    "revolvingLimits": {
      "value": "Total revolving credit limit e.g. $12,400",
      "status": "Excellent or Good or Moderate or Weak or Needs Improvement",
      "interpretation": "1-2 sentence explanation"
    },
    "utilization": {
      "value": "Overall utilization percentage e.g. 28%",
      "status": "Excellent or Good or Moderate or Weak or Needs Improvement",
      "interpretation": "1-2 sentence explanation"
    },
    "bankMix": {
      "value": "Brief summary e.g. 3 bank cards, 1 credit union",
      "status": "Excellent or Good or Moderate or Weak or Needs Improvement",
      "interpretation": "1-2 sentence explanation"
    },
    "loanLoad": {
      "value": "Number and type of loans e.g. 2 installment loans",
      "status": "Excellent or Good or Moderate or Weak or Needs Improvement",
      "interpretation": "1-2 sentence explanation"
    },
    "profileDepth": {
      "value": "Oldest account age e.g. 6 years 4 months",
      "status": "Excellent or Good or Moderate or Weak or Needs Improvement",
      "interpretation": "1-2 sentence explanation"
    }
  },
  "estimatedFunding": {
    "range": "Dollar range e.g. $35,000 - $75,000",
    "note": "2-3 sentence explanation of how this estimate was derived based on their specific profile."
  },
  "phase": {
    "name": "Build or Optimize or Funding",
    "number": 1,
    "explanation": "3-4 sentence paragraph explaining why this person was placed in this phase, referencing specifics from their report."
  },
  "phaseReasons": [
    "reason 1",
    "reason 2",
    "reason 3",
    "reason 4"
  ],
  "nextSteps": [
    "actionable step 1",
    "actionable step 2",
    "actionable step 3",
    "actionable step 4",
    "actionable step 5"
  ],
  "programEligibility": {
    "status": "Eligible or Conditionally Eligible or Not Yet Eligible",
    "note": "2-3 sentence explanation of why they received this eligibility status and what it means for them."
  }
}

Phase definitions:
- Build (Phase 1): Score below 680, derogatory marks, very short history, or significant profile weaknesses
- Optimize (Phase 2): Score 680-729, moderate utilization, some gaps, near-ready for funding
- Funding (Phase 3): Score 730+, low utilization, strong revolving limits, clean profile

Business funding estimate basis:
- Build phase: $5,000 - $25,000
- Optimize phase: $25,000 - $75,000
- Funding phase: $75,000 - $250,000+

Adjust based on their specific revolving limits, score, utilization, and payment history.

Respond ONLY with the JSON object. Nothing else.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Here is the extracted text from a credit report PDF (file: ${fileName || 'credit_report.pdf'}):\n\n${pdfText.slice(0, 80000)}\n\nAnalyze this credit report and return the JSON object as instructed.`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    const rawText = data.content.map(b => b.text || '').join('').trim();
    const clean = rawText.replace(/```json|```/g, '').trim();
    const report = JSON.parse(clean);

    return res.status(200).json(report);

  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed: ' + err.message });
  }
}
