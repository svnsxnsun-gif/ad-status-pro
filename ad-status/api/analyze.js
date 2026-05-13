export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { domain, industry, name, keywords, target } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${domain} (${name}) 사이트의 마케팅 전략을 ${industry} 관점에서 분석해줘. 키워드는 ${keywords}, 타겟은 ${target}이야. 1.타겟분석 2.광고키워드 3.개선안을 한국어로 작성해줘.` }] }]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    res.status(200).json({ result: data.candidates[0].content.parts[0].text });
  } catch (e) {
    res.status(500).json({ error: 'AI 연결 오류' });
  }
}
