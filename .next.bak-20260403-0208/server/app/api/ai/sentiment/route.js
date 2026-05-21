"use strict";(()=>{var e={};e.id=7571,e.ids=[7571],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},48439:(e,t,n)=>{n.r(t),n.d(t,{originalPathname:()=>y,patchFetch:()=>h,requestAsyncStorage:()=>u,routeModule:()=>p,serverHooks:()=>g,staticGenerationAsyncStorage:()=>d});var o={};n.r(o),n.d(o,{POST:()=>m,dynamic:()=>c});var i=n(49303),r=n(88716),a=n(60670),s=n(87070),l=n(26729);let c="force-dynamic";async function m(e){try{let{moodData:t,timeRange:n}=await e.json();if(!t||!Array.isArray(t))return s.NextResponse.json({error:"moodData array is required"},{status:400});if(!n)return s.NextResponse.json({error:"timeRange is required"},{status:400});let o=`Analyze this employee mood data from an HR and well-being perspective for ${n}:

${JSON.stringify(t,null,2)}

Please provide insights focusing on:

1. **Mood Trends & Patterns**
   - Overall mood trajectory (improving/declining/stable)
   - Weekly patterns and seasonal variations
   - Correlation with work patterns

2. **Well-being Indicators**
   - Stress level assessment
   - Work-life balance indicators
   - Burnout risk signals
   - Positive engagement patterns

3. **Individual Employee Insights**
   - Personal mood stories and patterns
   - Support opportunities
   - Recognition moments
   - Intervention recommendations

4. **Team Dynamics**
   - Team mood health
   - Collaboration impact on mood
   - Cross-team mood patterns

5. **HR Recommendations**
   - Support initiatives needed
   - Recognition opportunities
   - Policy adjustments for better well-being
   - Team building suggestions

6. **Empathy-Driven Analysis**
   - Personal circumstances considerations
   - Individual coping patterns
   - Positive reinforcement areas
   - Supportive intervention timing

Focus on employee-centric analysis with empathy and understanding.`,i=await (0,l.hn)([{role:"system",content:"You are a compassionate HR professional with expertise in employee well-being, organizational psychology, and workplace mental health. Provide empathetic, employee-focused insights that prioritize human connection and understanding."},{role:"user",content:o}],.6);if(!i.success)return s.NextResponse.json({error:i.error},{status:500});return s.NextResponse.json({sentiment:i.data})}catch(e){return s.NextResponse.json({error:e instanceof Error?e.message:"Unknown error"},{status:500})}}let p=new i.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/ai/sentiment/route",pathname:"/api/ai/sentiment",filename:"route",bundlePath:"app/api/ai/sentiment/route"},resolvedPagePath:"/Users/rishiraj/Downloads/checkin-main/app/api/ai/sentiment/route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:u,staticGenerationAsyncStorage:d,serverHooks:g}=p,y="/api/ai/sentiment/route";function h(){return(0,a.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:d})}},26729:(e,t,n)=>{n.d(t,{E5:()=>a,Rt:()=>r,hn:()=>i,ib:()=>l,xg:()=>s});let o=process.env.OPENROUTER_API_KEY||"";async function i(e,t=.7){if(!o)return console.error("OpenRouter API key not configured"),{success:!1,error:"OpenRouter API key not configured"};for(let n of["moonshotai/kimi-k2:free","google/gemma-3n-e4b-it:free","meta-llama/llama-3.2-3b-instruct:free","microsoft/phi-3-mini-128k-instruct:free"]){console.log(`Trying model: ${n}`);for(let i=1;i<=2;i++)try{let i=new AbortController,r=setTimeout(()=>i.abort(),3e4),a=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json","HTTP-Referer":"https://talkxo-checkin.vercel.app","X-Title":"INSYDE AI"},body:JSON.stringify({model:n,messages:e,temperature:t,max_tokens:1200}),signal:i.signal});if(clearTimeout(r),429===a.status){console.log(`Rate limited on ${n}, trying next model...`);break}if(!a.ok){let e=await a.text();if(console.error(`❌ Model ${n} failed: ${a.status} - ${e}`),401===a.status)return console.error("Authentication error - API key might be invalid"),{success:!1,error:"Authentication failed - check API key"};break}let s=await a.json();return console.log(`✅ Success with model: ${n}`),console.log(`Response length: ${s.choices[0]?.message?.content?.length||0} characters`),{success:!0,data:s.choices[0]?.message?.content||""}}catch(r){console.log(`Model ${n} error (attempt ${i}):`,r);let e="undefined"!=typeof DOMException&&r instanceof DOMException&&"AbortError"===r.name,t=r instanceof Error&&"string"==typeof r.message&&r.message.includes("timeout");if(e||t){console.log(`Timeout on ${n}, trying next model...`);break}if(2===i)break;let o=1e3*Math.pow(2,i-1);await new Promise(e=>setTimeout(e,o))}}return{success:!1,error:"All models failed or rate limited"}}async function r(e,t){return i([{role:"system",content:"You are an HR analyst. Provide concise, actionable insights in Markdown format. Focus on key patterns and recommendations."},{role:"user",content:`Analyze attendance data for ${t}. Format response in Markdown with clear sections:

${JSON.stringify(e,null,2)}

**Provide concise insights in Markdown format:**
- Employee engagement patterns
- Team collaboration trends  
- Well-being indicators
- HR recommendations

Keep each section brief and actionable.`}],.6)}async function a(e,t){return i([{role:"system",content:"You are a workplace productivity expert. Provide personalized schedule recommendations."},{role:"user",content:`Based on this user's attendance patterns and team data, suggest optimal work schedule:

User Data: ${JSON.stringify(e,null,2)}
Team Data: ${JSON.stringify(t,null,2)}

Suggest:
1. Optimal check-in time
2. Recommended work hours
3. Best days for office vs remote
4. Productivity tips based on patterns

Be specific and practical.`}],.6)}async function s(e,t){return i([{role:"system",content:"You are a senior HR professional with expertise in employee engagement, organizational psychology, and workplace well-being. Create comprehensive reports that prioritize human connection, empathy, and employee-centric insights."},{role:"user",content:`Generate a comprehensive HR-focused attendance report for ${t}:

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

Format this as a professional HR report that prioritizes employee well-being and engagement.`}],.5)}async function l(e,t){return i([{role:"system",content:"You are a workplace productivity expert. Return ONLY the final motivational message. Never include reasoning, analysis, or explanations. Just the message."},{role:"user",content:`Create a brief motivational message for ${e?.full_name||"Employee"} who is ${t}.

Write ONLY the final message (max 30 words) with:
- A "Did you know?" fact about productivity or workplace wellness
- A practical tip or encouragement

CRITICAL: Return ONLY the message. No reasoning, no analysis, no word counting, no explanations.

Example: "Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline!"`}],.1)}}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),o=t.X(0,[8948,5972],()=>n(48439));module.exports=o})();