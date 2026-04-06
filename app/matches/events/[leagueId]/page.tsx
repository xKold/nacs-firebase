// FACEIT API Diagnostic Tool
// This component helps identify the correct API structure and endpoints

import Link from 'next/link';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams?: Promise<{ 
    season?: string; 
    division?: string;
    stage?: string;
    conference?: string;
    region?: string;
    debug?: string;
    test?: string;
  }>;
}) {
  const { leagueId } = await params;
  const resolvedSearchParams = await searchParams;
  const seasonId = resolvedSearchParams?.season;
  const divisionId = resolvedSearchParams?.division;
  const stageId = resolvedSearchParams?.stage;
  const conferenceId = resolvedSearchParams?.conference;
  const regionId = resolvedSearchParams?.region;
  const debugMode = resolvedSearchParams?.debug === 'true';
  const testMode = resolvedSearchParams?.test === 'true';

  const eventInfo = null; // diagnostic page — no longer backed by static events config

  // Test different API endpoints to find the right structure
  const testResults: any = {};

  if (testMode) {
    // Test 1: Check if league exists
    try {
      const leagueRes = await fetch(`https://open.faceit.com/data/v4/leagues/${leagueId}`, {
        headers: {
          Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      testResults.league = {
        status: leagueRes.status,
        statusText: leagueRes.statusText,
        data: leagueRes.ok ? await leagueRes.json() : await leagueRes.text(),
      };
    } catch (error) {
      testResults.league = { error: String(error) };
    }

    // Test 2: List all seasons for the league
    try {
      const seasonsRes = await fetch(`https://open.faceit.com/data/v4/leagues/${leagueId}/seasons`, {
        headers: {
          Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      testResults.seasons = {
        status: seasonsRes.status,
        statusText: seasonsRes.statusText,
        data: seasonsRes.ok ? await seasonsRes.json() : await seasonsRes.text(),
      };
    } catch (error) {
      testResults.seasons = { error: String(error) };
    }

    // Test 3: Try alternative season endpoint structure
    if (seasonId) {
      try {
        const altSeasonRes = await fetch(`https://open.faceit.com/data/v4/seasons/${seasonId}`, {
          headers: {
            Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        });
        testResults.altSeason = {
          status: altSeasonRes.status,
          statusText: altSeasonRes.statusText,
          data: altSeasonRes.ok ? await altSeasonRes.json() : await altSeasonRes.text(),
        };
      } catch (error) {
        testResults.altSeason = { error: String(error) };
      }
    }

    // Test 4: Try championships endpoint (maybe it's a championship, not a league)
    try {
      const championshipRes = await fetch(`https://open.faceit.com/data/v4/championships/${leagueId}`, {
        headers: {
          Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      testResults.championship = {
        status: championshipRes.status,
        statusText: championshipRes.statusText,
        data: championshipRes.ok ? await championshipRes.json() : await championshipRes.text(),
      };
    } catch (error) {
      testResults.championship = { error: String(error) };
    }

    // Test 5: Try matches endpoint directly
    try {
      const directMatchesRes = await fetch(`https://open.faceit.com/data/v4/matches?league=${leagueId}&season=${seasonId}&limit=10`, {
        headers: {
          Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      testResults.directMatches = {
        status: directMatchesRes.status,
        statusText: directMatchesRes.statusText,
        data: directMatchesRes.ok ? await directMatchesRes.json() : await directMatchesRes.text(),
      };
    } catch (error) {
      testResults.directMatches = { error: String(error) };
    }
  }

  // Continue with your existing logic for when season ID is missing
  if (!seasonId) {
    return (
      <main style={{ padding: 20 }}>
        <h1>FACEIT API Diagnostic Tool</h1>
        <div style={{ backgroundColor: '#fff3cd', padding: 15, borderRadius: 4, marginBottom: 20 }}>
          <p><strong>Missing season ID</strong></p>
          <p>Add season ID to URL: <code>?season=SEASON_ID</code></p>
          <p>Example: <code>?season=3de05c27-da01-4ede-9319-f5b3f16dfb1f</code></p>
        </div>
        
        <div style={{ marginBottom: 20 }}>
          <h2>API Testing Options</h2>
          <Link
            href={`/matches/events/${leagueId}?test=true`}
            style={{ 
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 4,
              marginRight: 10
            }}
          >
            🧪 Test API Endpoints
          </Link>
          
          <Link
            href={`/matches/events/${leagueId}?season=3de05c27-da01-4ede-9319-f5b3f16dfb1f&debug=true`}
            style={{ 
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 4
            }}
          >
            🔍 Debug Mode
          </Link>
        </div>

        <div style={{ backgroundColor: '#f8f9fa', padding: 15, borderRadius: 4 }}>
          <h3>Common Issues & Solutions</h3>
          <ul>
            <li><strong>Wrong API Structure:</strong> FACEIT might use championships instead of leagues</li>
            <li><strong>Invalid Season ID:</strong> Season might have expired or ID might be incorrect</li>
            <li><strong>API Permissions:</strong> Your API key might not have access to league data</li>
            <li><strong>Rate Limiting:</strong> You might be hitting API rate limits</li>
          </ul>
        </div>
      </main>
    );
  }

  // Test mode display
  if (testMode) {
    return (
      <main style={{ padding: 20 }}>
        <h1>🧪 FACEIT API Test Results</h1>
        
        <div style={{ marginBottom: 20 }}>
          <Link
            href={`/matches/events/${leagueId}?season=${seasonId}&debug=true`}
            style={{ 
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 4
            }}
          >
            ← Back to Debug Mode
          </Link>
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          {Object.entries(testResults).map(([testName, result]: [string, any]) => (
            <div key={testName} style={{ 
              border: '1px solid #ddd', 
              borderRadius: 4, 
              padding: 15,
              backgroundColor: result.status === 200 ? '#d4edda' : '#f8d7da'
            }}>
              <h3 style={{ 
                margin: '0 0 10px 0',
                color: result.status === 200 ? '#155724' : '#721c24'
              }}>
                {testName.charAt(0).toUpperCase() + testName.slice(1)} API Test
                {result.status === 200 ? ' ✅' : ' ❌'}
              </h3>
              
              <div style={{ marginBottom: 10 }}>
                <strong>Status:</strong> {result.status || 'Error'} {result.statusText || ''}
              </div>
              
              <details>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  View Response Data
                </summary>
                <pre style={{ 
                  backgroundColor: '#f8f9fa',
                  padding: 10,
                  borderRadius: 4,
                  overflow: 'auto',
                  fontSize: 12,
                  marginTop: 10
                }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 30, padding: 15, backgroundColor: '#e3f2fd', borderRadius: 4 }}>
          <h3>Next Steps Based on Results:</h3>
          <ul>
            <li><strong>If League API works:</strong> Use the seasons list to find the correct season ID</li>
            <li><strong>If Championship API works:</strong> This might be a championship, not a league</li>
            <li><strong>If Direct Matches works:</strong> You can fetch matches directly without season details</li>
            <li><strong>If Alt Season works:</strong> Use the direct season endpoint instead</li>
          </ul>
        </div>
      </main>
    );
  }

  // Your existing debug logic would continue here...
  // For now, let's show the diagnostic results
  return (
    <main style={{ padding: 20 }}>
      <h1>FACEIT API Diagnostic</h1>
      
      <div style={{ marginBottom: 20 }}>
        <h2>Current Configuration</h2>
        <ul>
          <li><strong>League ID:</strong> {leagueId}</li>
          <li><strong>Season ID:</strong> {seasonId}</li>
          <li><strong>Event:</strong> Not found</li>
          <li><strong>API Key:</strong> {process.env.FACEIT_API_KEY ? 'Present' : 'Missing'}</li>
        </ul>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2>Diagnostic Tools</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            href={`/matches/events/${leagueId}?season=${seasonId}&test=true`}
            style={{ 
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 4
            }}
          >
            🧪 Run API Tests
          </Link>
          
          <Link
            href={`/matches/events/${leagueId}?season=${seasonId}&debug=true`}
            style={{ 
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 4
            }}
          >
            🔍 Debug Mode
          </Link>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff3cd', padding: 15, borderRadius: 4, marginBottom: 20 }}>
        <h3>⚠️ Current Issue</h3>
        <p>The season endpoint is returning a 400 Bad Request error. This suggests:</p>
        <ul>
          <li>The league ID or season ID might be incorrect</li>
          <li>The API structure might be different (championship vs league)</li>
          <li>Your API key might not have the right permissions</li>
        </ul>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: 15, borderRadius: 4 }}>
        <h3>Recommended Action</h3>
        <p>Click "Run API Tests" above to test different endpoints and find the correct API structure.</p>
        <p>From the search results, I noticed there's a URL pattern that suggests this might be a championship rather than a league.</p>
      </div>
    </main>
  );
}