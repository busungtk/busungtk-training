// 부성티케이 교육 사이트 접근 보호 (Vercel Edge Middleware)
// 비밀번호는 Vercel 환경변수 SITE_PASSWORD 로 관리합니다. 코드에 값을 적지 않습니다.
// 미설정 시 열어주지 않고 막습니다 (fail closed).

export const config = {
  matcher: '/((?!_vercel).*)',
};

const COOKIE = 'bt_training';
const MAX_AGE = 60 * 60 * 24 * 30; // 30일

function html(body, status) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

function loginPage(message) {
  return html(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>부성티케이 교육 사이트</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0e17;color:#e2e8f0;font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;
       min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;line-height:1.7}
  .box{width:100%;max-width:380px;text-align:center}
  .icon{font-size:44px;margin-bottom:18px}
  h1{font-size:1.35rem;font-weight:800;color:#f8fafc;margin-bottom:8px;letter-spacing:-0.01em}
  p{color:#94a3b8;font-size:0.9rem;margin-bottom:26px}
  input{width:100%;background:#111827;border:1px solid #1e2d3d;border-radius:10px;padding:13px 16px;
        color:#f8fafc;font-size:1rem;font-family:inherit;text-align:center;letter-spacing:0.14em}
  input:focus{outline:none;border-color:#38bdf8}
  button{width:100%;margin-top:10px;background:linear-gradient(135deg,#38bdf8,#818cf8);color:#0a0e17;
         border:none;border-radius:10px;padding:13px;font-size:0.96rem;font-weight:700;
         font-family:inherit;cursor:pointer}
  button:hover{opacity:.9}
  .err{color:#f87171;font-size:0.86rem;margin-bottom:14px}
  .foot{margin-top:26px;font-size:0.76rem;color:#64748b}
</style>
</head>
<body>
  <div class="box">
    <div class="icon">🔒</div>
    <h1>부성티케이 교육 사이트</h1>
    <p>내부 자료가 포함돼 있어 비밀번호가 필요합니다.</p>
    ${message ? `<div class="err">${message}</div>` : ''}
    <form method="POST">
      <input type="password" name="password" placeholder="비밀번호" autofocus autocomplete="current-password" required>
      <button type="submit">들어가기</button>
    </form>
    <div class="foot">비밀번호를 모르시면 담당자에게 문의하세요.</div>
  </div>
</body>
</html>`, message ? 401 : 401);
}

export default async function middleware(request) {
  // 환경변수 값 끝에 개행/공백이 붙어 들어오는 경우가 있어 반드시 정리한다.
  const pass = (process.env.SITE_PASSWORD || '').trim();

  if (!pass) {
    return html(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>설정 필요</title></head><body style="background:#0a0e17;color:#e2e8f0;
font-family:sans-serif;padding:40px;line-height:1.7">
<h1 style="font-size:1.2rem">사이트 설정이 완료되지 않았습니다</h1>
<p style="color:#94a3b8">환경변수 <code>SITE_PASSWORD</code>가 설정되지 않아 접근을 막았습니다.</p>
</body></html>`, 503);
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const authed = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .some((c) => c === `${COOKIE}=${encodeURIComponent(pass)}`);

  if (authed) return; // 통과

  if (request.method === 'POST') {
    let submitted = null;
    try {
      const raw = await request.text();
      const value = new URLSearchParams(raw).get('password');
      submitted = value === null ? null : value.trim();
    } catch (e) {
      submitted = null;
    }

    if (submitted === pass) {
      const url = new URL(request.url);
      return new Response(null, {
        status: 303,
        headers: {
          location: url.pathname + url.search,
          'set-cookie': `${COOKIE}=${encodeURIComponent(pass)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
          'cache-control': 'no-store',
        },
      });
    }
    return loginPage('비밀번호가 맞지 않습니다.');
  }

  return loginPage('');
}
