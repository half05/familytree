const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { initializeDatabase } = require('./src/models/Database');

// dotenv 로드 (환경 변수 사용)
try {
  require('dotenv').config();
} catch (error) {
  // dotenv가 설치되지 않은 경우 무시
}

// Express 앱 생성
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * 로컬 네트워크 IP 주소 가져오기
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4이고, 내부 IP가 아닌 경우
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// 데이터베이스 초기화
initializeDatabase();

// 미들웨어
app.use(cors()); // CORS 허용
app.use(express.json()); // JSON 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 파싱

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 요청 로깅 미들웨어 (정적 파일 제외)
app.use((req, res, next) => {
  // 정적 파일 요청은 로깅하지 않음
  if (!req.path.startsWith('/uploads') && 
      !req.path.startsWith('/images') && 
      !req.path.startsWith('/css') && 
      !req.path.startsWith('/js')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

// API 라우트
app.use('/api/familytrees', require('./src/routes/familytrees'));
app.use('/api/persons', require('./src/routes/persons'));
app.use('/api/relations', require('./src/routes/relations'));
app.use('/api/tree', require('./src/routes/tree'));
app.use('/api/upload', require('./src/routes/upload'));

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 루트 경로 - 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 에러 핸들러
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `경로를 찾을 수 없습니다: ${req.path}`
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('에러 발생:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 서버 시작
app.listen(PORT, () => {
  const localIp = getLocalIpAddress();
  
  console.log('\n🌳 ===================================');
  console.log('   가족 트리 웹 애플리케이션');
  console.log('   ===================================');
  console.log(`\n✅ 서버가 실행 중입니다!`);
  console.log(`\n📡 접속 주소:`);
  console.log(`   로컬:     http://localhost:${PORT}`);
  console.log(`   네트워크: http://${localIp}:${PORT}`);
  console.log(`\n💡 모바일에서 접속하려면 네트워크 주소를 사용하세요!`);
  console.log(`   (같은 WiFi에 연결되어 있어야 합니다)`);
  console.log(`\n⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 서버를 종료합니다...');
  process.exit(0);
});

module.exports = app;

