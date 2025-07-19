// OpenAI Images Generation Mock API
// 직접 구현 - 서버리스 최적화

// Mock 이미지 URL 생성
function generateMockImageUrl() {
  const imageId = Math.random().toString(36).substr(2, 9);
  return `https://via.placeholder.com/512x512/4f46e5/ffffff?text=Mock+Image+${imageId}`;
}

// POST /api/openai/images (프론트에선 /v1/images/generations로 rewrite)
export default async function handler(req, res) {
  console.log('🖼️ Mock Images API Handler called');
  
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { n = 1, size = '512x512' } = req.body;
    
    console.log(`🎨 Generating ${n} mock images of size ${size}`);
    
    // Mock 이미지 응답 생성
    const images = Array.from({ length: n }, () => ({
      url: generateMockImageUrl()
    }));
    
    const response = {
      created: Math.floor(Date.now() / 1000),
      data: images
    };
    
    res.json(response);
  } catch (err) {
    console.error('❌ Mock Images API Error:', err);
    res.status(500).json({ error: err.message });
  }
}