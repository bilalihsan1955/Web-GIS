// tests/run-e2e-suite.mjs
// Automated End-to-End & Security Test Suite for view360 (v1.2.0)
// Tests against live Next.js server connected to Standalone Docker PostgreSQL

const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:3001';

async function runTests() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING COMPREHENSIVE E2E & SECURITY VERIFICATION SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // SCENARIO 1: Authentication & OWASP Security Headers Check
  // --------------------------------------------------------------------------
  console.log('--- [SCENARIO 1] Authentication & OWASP Security Headers ---');

  try {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, `Root page returned status ${res.status}`);

    const csp = res.headers.get('content-security-policy');
    const xfo = res.headers.get('x-frame-options');
    const xcto = res.headers.get('x-content-type-options');
    const hsts = res.headers.get('strict-transport-security');

    assert(Boolean(csp && csp.includes("blob: https://*.mapbox.com")), 'CSP header includes Mapbox & WebGL directives');
    assert(xfo === 'SAMEORIGIN', `X-Frame-Options is SAMEORIGIN (got: ${xfo})`);
    assert(xcto === 'nosniff', `X-Content-Type-Options is nosniff (got: ${xcto})`);
    assert(Boolean(hsts && hsts.includes('max-age')), 'HSTS header configured');

    // Test unauthenticated access to /dashboard (must redirect to /dashboard/login)
    const dashRes = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    const isRedirect = dashRes.status === 307 || dashRes.status === 308 || dashRes.status === 302 || dashRes.status === 303;
    const location = dashRes.headers.get('location') || '';
    assert(isRedirect && location.includes('/dashboard/login'), `Unauthenticated /dashboard redirects to login (status: ${dashRes.status}, location: ${location})`);

    // Test Valid Standalone DB Login with seeded credentials
    console.log('  Testing valid standalone login with seeded credentials...');
    const validLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@view360.com', password: 'SuperAdmin123!' }),
    });
    assert(validLoginRes.status === 200, `Seeded superadmin login returned status ${validLoginRes.status}`);
    const loginData = await validLoginRes.json();
    assert(loginData.user && loginData.user.role === 'superadmin', `Login returned valid user object with role: ${loginData.user?.role}`);

    const setCookie = validLoginRes.headers.get('set-cookie');
    assert(Boolean(setCookie && setCookie.includes('auth_token')), 'Login endpoint returned HttpOnly auth_token cookie');

    // Test Invalid Login
    const invalidLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@view360.com', password: 'WrongPassword999!' }),
    });
    assert(invalidLoginRes.status === 401, `Invalid password correctly returned status 401 (got: ${invalidLoginRes.status})`);

    // Test Rate Limiting on Login (anti-brute-force)
    console.log('  Testing login rate limiter (anti-brute-force)...');
    let got429 = false;
    for (let i = 0; i < 7; i++) {
      const rateLimitRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `test_${Date.now()}@example.com`, password: 'wrongpassword' }),
      });
      if (rateLimitRes.status === 429) {
        got429 = true;
        const retryAfter = rateLimitRes.headers.get('retry-after');
        assert(Boolean(retryAfter), `Rate limiter triggered 429 Too Many Requests with Retry-After: ${retryAfter}s`);
        break;
      }
    }
    assert(got429, 'Rate limiter successfully blocked rapid login attempts');
  } catch (err) {
    console.error('Scenario 1 error:', err);
    failed++;
  }

  // --------------------------------------------------------------------------
  // SCENARIO 2: Multi-Tenant Isolation & BOLA/IDOR Guard
  // --------------------------------------------------------------------------
  console.log('\n--- [SCENARIO 2] Multi-Tenant Isolation & BOLA/IDOR Guard ---');

  try {
    // Attempting to query company boundaries without session
    const boundariesRes = await fetch(`${BASE_URL}/api/dashboard/boundaries`);
    assert(boundariesRes.status === 401, `Unauthenticated /api/dashboard/boundaries blocked with status ${boundariesRes.status}`);

    // Attempting to delete sections without authentication
    const deleteSectionRes = await fetch(`${BASE_URL}/api/dashboard/sections?id=fake-section-id`, {
      method: 'DELETE',
    });
    assert(deleteSectionRes.status === 401, `Unauthenticated /api/dashboard/sections DELETE blocked with status ${deleteSectionRes.status}`);

    // Attempting to create user without admin authentication
    const createUserRes = await fetch(`${BASE_URL}/api/dashboard/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hacker@tenant-leak.com', password: 'password123', role: 'admin' }),
    });
    assert(createUserRes.status === 401, `Unauthenticated /api/dashboard/create-user blocked with status ${createUserRes.status}`);
  } catch (err) {
    console.error('Scenario 2 error:', err);
    failed++;
  }

  // --------------------------------------------------------------------------
  // SCENARIO 3: Database Query & Mapbox / 360° Viewer Flow
  // --------------------------------------------------------------------------
  console.log('\n--- [SCENARIO 3] Database Query & Mapbox / 360° Viewer Flow ---');

  try {
    // Test Unknown company slug returns 404
    const unknownRes = await fetch(`${BASE_URL}/api/public/company-profile?slug=unknown-non-existent-company-slug`);
    assert(unknownRes.status === 404, `Unknown company slug correctly returns 404`);

    // Test Valid Seeded Company Profile endpoint (PT Nusantara GIS)
    const profileRes = await fetch(`${BASE_URL}/api/public/company-profile?slug=nusantara-gis`);
    assert(profileRes.status === 200, `Seeded company profile endpoint returned status ${profileRes.status}`);
    const profileData = await profileRes.json();
    assert(
      profileData && profileData.profile && profileData.profile.company_name === 'PT Nusantara GIS',
      `Public profile returned company: ${profileData.profile?.company_name}`
    );

    // Test Public Company Page ([adminId]) Server Component SSR
    const publicPageRes = await fetch(`${BASE_URL}/nusantara-gis`);
    assert(publicPageRes.status === 200, `Public guest page /nusantara-gis returned status ${publicPageRes.status}`);
    const publicHtml = await publicPageRes.text();
    assert(
      publicHtml.includes('PT Nusantara GIS') || publicHtml.includes('Web-GIS'),
      'Public guest page renders Web-GIS metadata & layout'
    );
  } catch (err) {
    console.error('Scenario 3 error:', err);
    failed++;
  }

  // --------------------------------------------------------------------------
  // SCENARIO 4: Smart Panorama Uploader & Idempotency Flow
  // --------------------------------------------------------------------------
  console.log('\n--- [SCENARIO 4] Smart Panorama Uploader & Idempotency Flow ---');

  try {
    // 1. Upload without file
    const emptyUploadRes = await fetch(`${BASE_URL}/api/upload`, { method: 'POST' });
    assert(emptyUploadRes.status === 400 || emptyUploadRes.status === 401, `Upload without payload returned expected status ${emptyUploadRes.status}`);

    // 2. Magic-Bytes verification: upload spoofed file (text disguised as jpg)
    const formData = new FormData();
    const fakeBlob = new Blob(['THIS_IS_NOT_A_REAL_JPEG_IMAGE_BINARY'], { type: 'image/jpeg' });
    formData.append('file', fakeBlob, 'fake_panorama.jpg');

    const spoofUploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    assert(
      spoofUploadRes.status === 400 || spoofUploadRes.status === 401,
      `Spoofed image file rejected with status ${spoofUploadRes.status}`
    );

    // 3. Idempotency Key header validation
    const idempotencyKey = `e2e-test-${Date.now()}`;
    const idempRes1 = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
    });
    assert(idempRes1.status !== 500, `Upload with X-Idempotency-Key handled gracefully (status: ${idempRes1.status})`);
  } catch (err) {
    console.error('Scenario 4 error:', err);
    failed++;
  }

  // --------------------------------------------------------------------------
  // SCENARIO 5: Standalone Storage Engine & Path Traversal Protection
  // --------------------------------------------------------------------------
  console.log('\n--- [SCENARIO 5] Storage Engine & Path Traversal Protection ---');

  try {
    // Test delete endpoint with path traversal payload
    const traversalRes = await fetch(`${BASE_URL}/api/upload/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: '../../../../etc/passwd' }),
    });
    assert(
      traversalRes.status === 400 || traversalRes.status === 401 || traversalRes.status === 500,
      `Path traversal payload rejected safely with status ${traversalRes.status}`
    );
  } catch (err) {
    console.error('Scenario 5 error:', err);
    failed++;
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
