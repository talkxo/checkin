"use strict";(()=>{var e={};e.id=6062,e.ids=[6062],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},89416:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>f,patchFetch:()=>h,requestAsyncStorage:()=>m,routeModule:()=>p,serverHooks:()=>g,staticGenerationAsyncStorage:()=>d});var n={};o.r(n),o.d(n,{POST:()=>u,dynamic:()=>l});var i=o(49303),s=o(88716),r=o(60670),a=o(87070),c=o(26729);let l="force-dynamic";async function u(e){try{let{userData:t,context:o}=await e.json();if(!t)return a.NextResponse.json({error:"userData is required"},{status:400});if(!o)return a.NextResponse.json({error:"context is required"},{status:400});console.log("AI Notification Request:",{user:t?.full_name||"Unknown",context:o.substring(0,100)+"..."});let n=await (0,c.ib)(t,o);if(!n.success)return console.error("AI Notification failed:",n.error),a.NextResponse.json({notification:"Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline! Keep up the excellent work!"});let i=n.data||"";return[/analysis.*?assistantfinal/i,/we need to.*?good\./i,/let's craft.*?words, within/i,/count words.*?good\./i,/that's \d+ words.*?good\./i,/we need to produce.*?just the message\./i,/so it's a short session.*?just the message\./i,/max 30 words.*?just the message\./i,/no analysis.*?just the message\./i,/let's craft something like.*?it's fine\./i,/provide only the message\./i,/we need to produce.*?provide only the message\./i,/current session.*?provide only the message\./i,/so it's a short session.*?provide only the message\./i,/let's craft something like.*?provide only the message\./i,/we need to ensure.*?provide only the message\./i,/it's fine\./i,/provide only the message\./i].forEach(e=>{i=i.replace(e,"")}),i=i.replace(/analysis/i,"").replace(/assistantfinal/i,"").replace(/^\s*/,"").replace(/\s*$/,""),console.log("AI Notification success:",i?.substring(0,100)+"..."),a.NextResponse.json({notification:i})}catch(e){return console.error("AI Notification endpoint error:",e),a.NextResponse.json({notification:"Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline! Keep up the excellent work!"})}}let p=new i.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/ai/notification/route",pathname:"/api/ai/notification",filename:"route",bundlePath:"app/api/ai/notification/route"},resolvedPagePath:"/Users/rishiraj/Downloads/checkin-main/app/api/ai/notification/route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:m,staticGenerationAsyncStorage:d,serverHooks:g}=p,f="/api/ai/notification/route";function h(){return(0,r.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:d})}},26729:(e,t,o)=>{o.d(t,{E5:()=>r,Rt:()=>s,hn:()=>i,ib:()=>c,xg:()=>a});let n=process.env.OPENROUTER_API_KEY||"";async function i(e,t=.7){if(!n)return console.error("OpenRouter API key not configured"),{success:!1,error:"OpenRouter API key not configured"};for(let o of["moonshotai/kimi-k2:free","google/gemma-3n-e4b-it:free","meta-llama/llama-3.2-3b-instruct:free","microsoft/phi-3-mini-128k-instruct:free"]){console.log(`Trying model: ${o}`);for(let i=1;i<=2;i++)try{let i=new AbortController,s=setTimeout(()=>i.abort(),3e4),r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${n}`,"Content-Type":"application/json","HTTP-Referer":"https://talkxo-checkin.vercel.app","X-Title":"INSYDE AI"},body:JSON.stringify({model:o,messages:e,temperature:t,max_tokens:1200}),signal:i.signal});if(clearTimeout(s),429===r.status){console.log(`Rate limited on ${o}, trying next model...`);break}if(!r.ok){let e=await r.text();if(console.error(`❌ Model ${o} failed: ${r.status} - ${e}`),401===r.status)return console.error("Authentication error - API key might be invalid"),{success:!1,error:"Authentication failed - check API key"};break}let a=await r.json();return console.log(`✅ Success with model: ${o}`),console.log(`Response length: ${a.choices[0]?.message?.content?.length||0} characters`),{success:!0,data:a.choices[0]?.message?.content||""}}catch(s){console.log(`Model ${o} error (attempt ${i}):`,s);let e="undefined"!=typeof DOMException&&s instanceof DOMException&&"AbortError"===s.name,t=s instanceof Error&&"string"==typeof s.message&&s.message.includes("timeout");if(e||t){console.log(`Timeout on ${o}, trying next model...`);break}if(2===i)break;let n=1e3*Math.pow(2,i-1);await new Promise(e=>setTimeout(e,n))}}return{success:!1,error:"All models failed or rate limited"}}async function s(e,t){return i([{role:"system",content:"You are an HR analyst. Provide concise, actionable insights in Markdown format. Focus on key patterns and recommendations."},{role:"user",content:`Analyze attendance data for ${t}. Format response in Markdown with clear sections:

${JSON.stringify(e,null,2)}

**Provide concise insights in Markdown format:**
- Employee engagement patterns
- Team collaboration trends  
- Well-being indicators
- HR recommendations

Keep each section brief and actionable.`}],.6)}async function r(e,t){return i([{role:"system",content:"You are a workplace productivity expert. Provide personalized schedule recommendations."},{role:"user",content:`Based on this user's attendance patterns and team data, suggest optimal work schedule:

User Data: ${JSON.stringify(e,null,2)}
Team Data: ${JSON.stringify(t,null,2)}

Suggest:
1. Optimal check-in time
2. Recommended work hours
3. Best days for office vs remote
4. Productivity tips based on patterns

Be specific and practical.`}],.6)}async function a(e,t){return i([{role:"system",content:"You are a senior HR professional with expertise in employee engagement, organizational psychology, and workplace well-being. Create comprehensive reports that prioritize human connection, empathy, and employee-centric insights."},{role:"user",content:`Generate a comprehensive HR-focused attendance report for ${t}:

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

Format this as a professional HR report that prioritizes employee well-being and engagement.`}],.5)}async function c(e,t){return i([{role:"system",content:"You are a workplace productivity expert. Return ONLY the final motivational message. Never include reasoning, analysis, or explanations. Just the message."},{role:"user",content:`Create a brief motivational message for ${e?.full_name||"Employee"} who is ${t}.

Write ONLY the final message (max 30 words) with:
- A "Did you know?" fact about productivity or workplace wellness
- A practical tip or encouragement

CRITICAL: Return ONLY the message. No reasoning, no analysis, no word counting, no explanations.

Example: "Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline!"`}],.1)}}};var t=require("../../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),n=t.X(0,[8948,5972],()=>o(89416));module.exports=n})();