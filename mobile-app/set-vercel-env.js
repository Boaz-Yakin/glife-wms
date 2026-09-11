const fs = require('fs');
const cp = require('child_process');

const content = fs.readFileSync('.env.local', 'utf-8');
content.split('\n').forEach(line => {
    line = line.trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        const val = line.substring(line.indexOf('=') + 1).trim();
        console.log("Setting NEXT_PUBLIC_SUPABASE_URL...");
        cp.execSync('vercel env add NEXT_PUBLIC_SUPABASE_URL production --value "' + val + '"', {stdio: 'inherit'});
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        const val = line.substring(line.indexOf('=') + 1).trim();
        console.log("Setting NEXT_PUBLIC_SUPABASE_ANON_KEY...");
        cp.execSync('vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --value "' + val + '"', {stdio: 'inherit'});
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        const val = line.substring(line.indexOf('=') + 1).trim();
        console.log("Setting SUPABASE_SERVICE_ROLE_KEY...");
        cp.execSync('vercel env add SUPABASE_SERVICE_ROLE_KEY production --value "' + val + '"', {stdio: 'inherit'});
    }
});
