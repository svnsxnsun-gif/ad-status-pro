export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { domain, brand, industry, keywords, target } = req.body;
  if (!domain || !brand || !industry) {
    return res.status(400).json({ error: '필수 값이 누락되었습니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });

  const prompt = `당신은 10년차 퍼포먼스 마케터이자 브랜드 전략가입니다.
아래 브랜드를 분석해 완전한 광고 전략 리포트를 작성해주세요.

브랜드명: ${brand}
도메인: ${domain}
업종: ${industry}
주요 키워드: ${keywords || '없음'}
타겟 고객: ${target || '미지정'}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트나 마크다운 코드블록 없이 순수 JSON만 출력하세요.

{
  "brandingScore": 숫자(0-100),
  "brandingSummary": "브랜딩 현황 요약 2-3문장. 현재 온라인 인지도·포지셔닝·강도 평가.",
  "fourP": {
    "product": "Product 분석: 주력 상품, 카테고리, 차별점",
    "price": "Price 분석: 가격대, 포지셔닝, 경쟁 대비",
    "place": "Place 분석: 유통 채널, 온오프라인 비중",
    "promotion": "Promotion 분석: 현재 광고 활동, 프로모션 전략"
  },
  "swot": {
    "strength": ["강점1", "강점2", "강점3"],
    "weakness": ["약점1", "약점2", "약점3"],
    "opportunity": ["기회1", "기회2", "기회3"],
    "threat": ["위협1", "위협2", "위협3"]
  },
  "mediaStrategy": [
    {
      "platform": "네이버 SA",
      "priority": 1,
      "badge": "NAVER",
      "badgeColor": "#03C75A",
      "reason": "집행 이유 1-2문장",
      "tactics": "구체적 운용 전술: 키워드 전략, 소재 방향, 예산 가이드",
      "kpi": "핵심 KPI"
    }
  ],
  "budgetAllocation": [
    { "platform": "플랫폼명", "percent": 숫자, "color": "#hex색상" }
  ],
  "actionPlan": [
    { "week": "1주차", "actions": ["액션1", "액션2"] },
    { "week": "2-4주차", "actions": ["액션1", "액션2"] },
    { "week": "2개월차~", "actions": ["액션1", "액션2"] }
  ]
}

규칙:
- mediaStrategy는 해당 브랜드에 맞는 매체만 우선순위 순 4-6개 포함 (네이버SA, 네이버쇼핑검색, 네이버GFA, 구글SA, 구글디스플레이/PMax, 구글YouTube, Meta, 카카오, 모비온/Criteo 중 선택)
- budgetAllocation 합계는 반드시 100
- 모든 내용은 한국어로 작성
- JSON 외 다른 텍스트 절대 포함 금지`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
          }
        })
      }
    );

    const geminiData = await geminiRes.json();

    if (geminiData.error) {
      return res.status(500).json({ error: geminiData.error.message });
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 추출 (마크다운 코드블록 제거)
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패: ' + rawText.slice(0, 200));

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
