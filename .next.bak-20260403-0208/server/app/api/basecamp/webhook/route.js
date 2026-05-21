"use strict";(()=>{var e={};e.id=8835,e.ids=[8835],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},20946:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>y,patchFetch:()=>b,requestAsyncStorage:()=>h,routeModule:()=>p,serverHooks:()=>f,staticGenerationAsyncStorage:()=>g});var a={};o.r(a),o.d(a,{POST:()=>m,dynamic:()=>l});var n=o(49303),s=o(88716),r=o(60670),i=o(87070),c=o(26729);let l="force-dynamic";async function d(e,t,o){try{console.log("=== CHECKIN DEBUG ==="),console.log("Sender object:",JSON.stringify(e,null,2));let a=e.email_address||e.email,n=e.name||e.full_name;if(console.log("Extracted email:",a),console.log("Extracted name:",n),!a)return"I need your email address to check you in. Please make sure your Basecamp profile has your email address.";let s=await fetch(`${o}/api/checkin`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:a,fullName:n,mode:t})}),r=await s.json();if(!s.ok)return`❌ Check-in failed: ${r.error||"Unknown error"}. Please make sure your email "${a}" is registered in the system.`;if("Open session already exists"===r.message){let e=r.session,t=new Date(e.checkin_ts).toLocaleString("en-US",{timeZone:"Asia/Kolkata",hour12:!0,hour:"numeric",minute:"2-digit"});return`ℹ️ You're already checked in! You logged in at ${t} in ${e.mode} mode.`}return`✅ Checked in successfully! Mode: ${t}. Welcome to work!`}catch(e){return`❌ Check-in failed: ${e instanceof Error?e.message:"Unknown error"}`}}async function u(e,t){try{console.log("=== CHECKOUT DEBUG ==="),console.log("Sender object:",JSON.stringify(e,null,2));let o=e.email_address||e.email,a=e.name||e.full_name;if(console.log("Extracted email:",o),console.log("Extracted name:",a),!o)return"I need your email address to check you out. Please make sure your Basecamp profile has your email address.";let n=await fetch(`${t}/api/checkout`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:o})}),s=await n.json();if(n.ok)return`✅ Checked out successfully! Have a great day!`;return`❌ Check-out failed: ${s.error||"Unknown error"}. Please make sure your email "${o}" is registered in the system.`}catch(e){return`❌ Check-out failed: ${e instanceof Error?e.message:"Unknown error"}`}}async function m(e){try{let t,o,a;let n=await e.json();if(console.log("Basecamp webhook received:",JSON.stringify(n,null,2)),console.log("Environment variables check:"),console.log("- BC_CHAT_ID:",process.env.BC_CHAT_ID?`Set: ${process.env.BC_CHAT_ID}`:"Not set"),console.log("- BC_ACCOUNT_ID:",process.env.BC_ACCOUNT_ID?`Set: ${process.env.BC_ACCOUNT_ID}`:"Not set"),console.log("- BC_PROJECT_ID:",process.env.BC_PROJECT_ID?`Set: ${process.env.BC_PROJECT_ID}`:"Not set"),"chatbot_message"===n.type)({content:t,sender:o,conversation:a}=n);else{if(!n.command)return i.NextResponse.json({status:"ignored",reason:"Unknown message format"});t=n.command,o={type:"person",id:n.creator?.id,name:n.creator?.name,email_address:n.creator?.email_address,email:n.creator?.email_address};let e=n.callback_url?.split("/")||[],s=e[e.length-2];a={id:`${s}@${process.env.BC_ACCOUNT_ID}`}}let s=process.env.BC_CHAT_ID?.split("\n").map(e=>e.trim()).filter(e=>e)||[];console.log(`Comparing conversation.id: "${a.id}" with BC_CHAT_IDs: [${s.join(", ")}]`);let r=a.id.split("@")[0];if(console.log(`Extracted chat ID from conversation: "${r}"`),!s.includes(r))return console.log(`Message from different chat (${a.id}), extracted chat ID ${r} not in expected: [${s.join(", ")}], ignoring`),i.NextResponse.json({status:"ignored"});if("chatbot"===o.type)return i.NextResponse.json({status:"ignored",reason:"Sender is chatbot"});if(console.log("Processing message:",t),t.toLowerCase().includes("check in")||t.toLowerCase().includes("checkin")||t.toLowerCase().includes("clock in")){let a=t.toLowerCase().includes("remote")?"remote":"office",n=await d(o,a,e.nextUrl.origin);return new Response(n,{headers:{"Content-Type":"text/plain"}})}if(t.toLowerCase().includes("check out")||t.toLowerCase().includes("checkout")||t.toLowerCase().includes("clock out")){let t=await u(o,e.nextUrl.origin);return new Response(t,{headers:{"Content-Type":"text/plain"}})}let l="";try{let t=await fetch(`${e.nextUrl.origin}/api/admin/chatbot-data`);if(t.ok){let e=await t.json();l=`Complete Attendance Data: ${JSON.stringify(e,null,2)}`,console.log("Chatbot data fetched successfully")}else console.log("Failed to fetch chatbot data:",t.status),l="Error: Unable to fetch attendance data"}catch(e){console.error("Error fetching chatbot data:",e),l="Error: Unable to fetch attendance data"}if(!l||l.includes("Error:")||""===l){console.log("No valid attendance data available, using fallback response");let t="I don't have current attendance data available right now. Please try again in a few minutes, or check the admin dashboard for current information.";if(!e.headers.get("user-agent")?.includes("Basecamp")&&!e.headers.get("x-forwarded-for"))return i.NextResponse.json({status:"success",message:"Test webhook successful (no data available)",aiResponse:t,note:"No attendance data available"});return new Response(t,{headers:{"Content-Type":"text/plain"}})}let m=new Date,p=new Date(m.toLocaleString("en-US",{timeZone:"Asia/Kolkata"})),h=p.getHours(),g="";g=h>=5&&h<12?"Good morning!":h>=12&&h<17?"Good afternoon!":h>=17&&h<21?"Good evening!":"Hello!";let f=`You are the INSYDE attendance assistant chatbot in Basecamp. A user has asked: "${t}"

Current time context: ${g} (${p.toLocaleTimeString("en-US",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit"})} IST)

Available Data: ${l}

CRITICAL RULES:
1. Start your response with "${g}" - use this exact greeting based on the current time.
2. ONLY use the data provided above. If no data is available, say "I don't have current attendance data available right now."
3. DO NOT make up any numbers, percentages, or statistics that aren't in the provided data.
4. DO NOT mention specific attendance figures unless they are explicitly in the provided data.
5. If the data shows "Error: Unable to fetch attendance data", respond with "I'm having trouble accessing the attendance data right now. Please try again in a few minutes."
6. This company uses Basecamp, Google Workspace, and Canva - do NOT mention Slack, Microsoft Teams, or other tools they don't use.

Provide a helpful, concise response (max 2-3 sentences) based ONLY on the available data. Be friendly and professional. If no relevant data is available, acknowledge the request but explain the limitation.`,y=await (0,c.hn)([{role:"system",content:"You are a helpful INSYDE attendance assistant in Basecamp. CRITICAL: Only use the data provided to you. Do not make up any numbers, percentages, or statistics. If no data is available, clearly state that. Be brief, friendly, and accurate. This company uses Basecamp, Google Workspace, and Canva - do not mention other tools. IMPORTANT: Always use the exact time greeting provided in the prompt (Good morning/afternoon/evening/Hello) based on the current time."},{role:"user",content:f}],.3);if(!y.success){console.error("AI response failed:",y.error);let t="I'm having trouble accessing the attendance data right now. Please try asking again in a few minutes, or check the admin dashboard for current information.";if(!e.headers.get("user-agent")?.includes("Basecamp")&&!e.headers.get("x-forwarded-for"))return i.NextResponse.json({status:"success",message:"Test webhook successful (fallback response)",aiResponse:t,note:"AI models failed, using fallback response"});return console.log("AI failed, returning fallback response for chatbot to post"),new Response(t,{headers:{"Content-Type":"text/plain"}})}if(!e.headers.get("user-agent")?.includes("Basecamp")&&!e.headers.get("x-forwarded-for"))return console.log("Test request detected, returning AI response without posting to Basecamp"),i.NextResponse.json({status:"success",message:"Test webhook successful",aiResponse:y.data,note:"This was a test request. In real Basecamp integration, the response would be posted to the chat."});return console.log("AI response generated successfully, returning content for chatbot to post"),new Response(y.data,{headers:{"Content-Type":"text/plain"}})}catch(e){return console.error("Basecamp webhook error:",e),i.NextResponse.json({status:"error",error:e instanceof Error?e.message:"Unknown error"},{status:500})}}let p=new n.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/basecamp/webhook/route",pathname:"/api/basecamp/webhook",filename:"route",bundlePath:"app/api/basecamp/webhook/route"},resolvedPagePath:"/Users/rishiraj/Downloads/checkin-main/app/api/basecamp/webhook/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:h,staticGenerationAsyncStorage:g,serverHooks:f}=p,y="/api/basecamp/webhook/route";function b(){return(0,r.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:g})}},26729:(e,t,o)=>{o.d(t,{E5:()=>r,Rt:()=>s,hn:()=>n,ib:()=>c,xg:()=>i});let a=process.env.OPENROUTER_API_KEY||"";async function n(e,t=.7){if(!a)return console.error("OpenRouter API key not configured"),{success:!1,error:"OpenRouter API key not configured"};for(let o of["moonshotai/kimi-k2:free","google/gemma-3n-e4b-it:free","meta-llama/llama-3.2-3b-instruct:free","microsoft/phi-3-mini-128k-instruct:free"]){console.log(`Trying model: ${o}`);for(let n=1;n<=2;n++)try{let n=new AbortController,s=setTimeout(()=>n.abort(),3e4),r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json","HTTP-Referer":"https://talkxo-checkin.vercel.app","X-Title":"INSYDE AI"},body:JSON.stringify({model:o,messages:e,temperature:t,max_tokens:1200}),signal:n.signal});if(clearTimeout(s),429===r.status){console.log(`Rate limited on ${o}, trying next model...`);break}if(!r.ok){let e=await r.text();if(console.error(`❌ Model ${o} failed: ${r.status} - ${e}`),401===r.status)return console.error("Authentication error - API key might be invalid"),{success:!1,error:"Authentication failed - check API key"};break}let i=await r.json();return console.log(`✅ Success with model: ${o}`),console.log(`Response length: ${i.choices[0]?.message?.content?.length||0} characters`),{success:!0,data:i.choices[0]?.message?.content||""}}catch(s){console.log(`Model ${o} error (attempt ${n}):`,s);let e="undefined"!=typeof DOMException&&s instanceof DOMException&&"AbortError"===s.name,t=s instanceof Error&&"string"==typeof s.message&&s.message.includes("timeout");if(e||t){console.log(`Timeout on ${o}, trying next model...`);break}if(2===n)break;let a=1e3*Math.pow(2,n-1);await new Promise(e=>setTimeout(e,a))}}return{success:!1,error:"All models failed or rate limited"}}async function s(e,t){return n([{role:"system",content:"You are an HR analyst. Provide concise, actionable insights in Markdown format. Focus on key patterns and recommendations."},{role:"user",content:`Analyze attendance data for ${t}. Format response in Markdown with clear sections:

${JSON.stringify(e,null,2)}

**Provide concise insights in Markdown format:**
- Employee engagement patterns
- Team collaboration trends  
- Well-being indicators
- HR recommendations

Keep each section brief and actionable.`}],.6)}async function r(e,t){return n([{role:"system",content:"You are a workplace productivity expert. Provide personalized schedule recommendations."},{role:"user",content:`Based on this user's attendance patterns and team data, suggest optimal work schedule:

User Data: ${JSON.stringify(e,null,2)}
Team Data: ${JSON.stringify(t,null,2)}

Suggest:
1. Optimal check-in time
2. Recommended work hours
3. Best days for office vs remote
4. Productivity tips based on patterns

Be specific and practical.`}],.6)}async function i(e,t){return n([{role:"system",content:"You are a senior HR professional with expertise in employee engagement, organizational psychology, and workplace well-being. Create comprehensive reports that prioritize human connection, empathy, and employee-centric insights."},{role:"user",content:`Generate a comprehensive HR-focused attendance report for ${t}:

Data: ${JSON.stringify(e,null,2)}

Please structure the report with:

1. **Executive Summary**
   - Overall employee engagement health
   - Key well-being indicators
   - Team collaboration effectiveness

2. **Employee Engagement Metrics**
   - Work-life balance scores
   - Flexibility utilization rates
   - Consistency and reliability patterns
   - Burnout risk indicators

3. **Team Dynamics Analysis**
   - Office vs remote collaboration patterns
   - Cross-functional interaction opportunities
   - Communication effectiveness
   - Team building needs

4. **Individual Employee Stories**
   - Notable positive patterns
   - Support opportunities
   - Recognition moments
   - Personal circumstances considerations

5. **HR Action Items**
   - Recognition and appreciation opportunities
   - Support initiatives needed
   - Policy recommendations for better engagement
   - Team building and culture initiatives

6. **Empathy & Well-being Focus**
   - Stress management opportunities
   - Work-life balance improvements
   - Mental health support considerations
   - Positive reinforcement strategies

Format this as a professional HR report that prioritizes employee well-being and engagement.`}],.5)}async function c(e,t){return n([{role:"system",content:"You are a workplace productivity expert. Return ONLY the final motivational message. Never include reasoning, analysis, or explanations. Just the message."},{role:"user",content:`Create a brief motivational message for ${e?.full_name||"Employee"} who is ${t}.

Write ONLY the final message (max 30 words) with:
- A "Did you know?" fact about productivity or workplace wellness
- A practical tip or encouragement

CRITICAL: Return ONLY the message. No reasoning, no analysis, no word counting, no explanations.

Example: "Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline!"`}],.1)}}};var t=require("../../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),a=t.X(0,[8948,5972],()=>o(20946));module.exports=a})();