export default async function handler(req, res) {
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

  const systemPrompt = `You are a senior credit analyst and business funding strategist for Wealth 10.0. Analyze the provided credit report text and return ONLY a valid JSON object — no markdown, no explanation, no backticks, no preamble. Use this exact structure:

{
  "header": {
    "userName": "Full name from report or Not Found",
    "date": "Report pull date or today",
    "reportType": "e.g. Full Credit Report",
    "bureau": "Experian / TransUnion / Equifax / Multi-Bureau / Not Specified"
  },
  "fundingReadiness": {
    "status": "Not Funding Ready OR Partially Ready / Needs Optimization OR Funding Ready",
    "explanation": "2-4 sentence explanation of the overall funding readiness verdict."
  },
  "creditBreakdown": {
    "score": { "value": "e.g. 712", "status": "Excellent OR Good OR Moderate OR Weak OR Needs Improvement", "interpretation": "1-2 sentences" },
    "revolvingLimits": { "value": "e.g. $12,400", "status": "Excellent OR Good OR Moderate OR Weak OR Needs Improvement", "interpretation": "1-2 sentences" },
    "utilization": { "value": "e.g. 28%", "status": "Excellent OR Good OR Moderate OR Weak OR Needs Improvement", "interpretation": "1-2 sentences" },
    "bankMix": { "value": "e.g. 3 bank cards, 1 credit union", "status": "Excellent OR Good OR Moderate OR Weak OR Needs Improvement", "interpretation": "1-2 sentences" },
    "loanLoad": { "value": "e.g. 2 installment loans", "status": "Excellent OR Good OR Moderate OR Weak OR Needs Improvement", "interpretation": "1-2 sentences" },
    "profileDepth": { "value": "e.g. 6 years 4 months", "status": "Excellent OR Good OR Moderate OR Weak OR Needs Improvement", "interpretation": "1-2 sentences" }
  },
  "categoryScorecard": [
    { "name": "Derogatory Marks", "score": "Strong OR Needs Improvement OR Major Weakness", "explanation": "1 sentence" },
    { "name": "Payment History", "score": "Strong OR Needs Improvement OR Major Weakness", "explanation": "1 sentence" },
    { "name": "Utilization", "score": "Strong OR Needs Improvement OR Major Weakness", "explanation": "1 sentence" },
    { "name": "Positive Account Count", "score": "Strong OR Needs Improvement OR Major Weakness", "explanation": "1 sentence" },
    { "name": "Account Mix", "score": "Strong OR Needs Improvement OR Major Weakness", "explanation": "1 sentence" },
    { "name": "Hard Inquiries", "score": "Strong OR Needs Improvement OR Major Weakness", "explanation": "1 sentence" },
    { "name": "Average Age of Accounts", "score": "Strong OR Needs Improvement OR Major Weakness", "explanation": "1 sentence" },
    { "name": "Major Bank Cards", "score": "Strong OR Needs Improvement OR Major Weakness", "explanation": "1 sentence" },
    { "name": "Card Limits", "score": "Strong OR Needs Improvement OR Major Weakness", "explanation": "1 sentence" },
    { "name": "Overall Funding Position", "score": "Strong OR Needs Improvement OR Major Weakness", "explanation": "1 sentence" }
  ],
  "blockingIssues": [
    {
      "title": "Issue name",
      "score": "Needs Improvement OR Major Weakness",
      "whyItMatters": "1-2 sentences",
      "action": "Clear recommended action"
    }
  ],
  "applyNowVsWait": {
    "applyNow": ["consequence 1", "consequence 2", "consequence 3", "consequence 4"],
    "optimizeFirst": ["benefit 1", "benefit 2", "benefit 3", "benefit 4"]
  },
  "fundingIdentity": {
    "label": "e.g. New / Unproven Borrower OR Moderate Risk Profile OR Strong Borrower",
    "items": ["lender perception 1", "lender perception 2", "lender perception 3"]
  },
  "estimatedFunding": {
    "range": "e.g. $35,000 - $75,000",
    "note": "2-3 sentence explanation of how this estimate was derived.",
    "logic": [
      "This range is based on your current total revolving credit limits",
      "Business funding is typically approved at 10-20x your total revolving limits",
      "Increasing your limits and reducing utilization will directly increase this range"
    ]
  },
  "bankStrategy": [
    "Open a business checking account at Chase or Bank of America",
    "Make consistent monthly deposits to show cash flow activity",
    "Maintain a positive balance and avoid overdrafts",
    "Generate at least 2-3 months of bank statements before applying",
    "Keep the account active with regular transactions"
  ],
  "applicationStrategy": [
    "Do not apply for multiple cards or loans at the same time",
    "Each application creates a hard inquiry — protect your inquiry count",
    "Apply in sequence: establish one account, let it age, then apply for the next",
    "Research lenders before applying to maximize approval odds",
    "Target lenders whose minimum requirements match your current profile"
  ],
  "phase": {
    "name": "Build OR Optimize OR Funding",
    "number": 1,
    "explanation": "3-4 sentences explaining this phase placement."
  },
  "phaseReasons": ["reason 1", "reason 2", "reason 3", "reason 4"],
  "nextSteps": ["step 1", "step 2", "step 3", "step 4", "step 5"],
  "programEligibility": {
    "status": "Eligible OR Conditionally Eligible OR Not Yet Eligible",
    "note": "2-3 sentence explanation."
  },
  "finalRecommendation": {
    "decision": "Apply Now OR Optimize First, Then Apply OR Do Not Apply Yet",
    "reasoning": "3-4 sentence explanation referencing specific profile details.",
    "timeline": "e.g. 3-6 months to optimize OR Ready to apply now"
  }
}

Phase definitions: Build (Phase 1) score below 680 or major weaknesses. Optimize (Phase 2) score 680-729, moderate issues. Funding (Phase 3) score 730+ clean profile.
Funding ranges: Build $5K-$25K, Optimize $25K-$75K, Funding $75K-$250K+.
Only list blockingIssues that actually apply. Return empty array if none.
Respond ONLY with the JSON object.`;

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
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Credit report text (file: ${fileName || 'credit_report.pdf'}):\n\n${pdfText.slice(0, 80000)}\n\nAnalyze and return the JSON.`
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
