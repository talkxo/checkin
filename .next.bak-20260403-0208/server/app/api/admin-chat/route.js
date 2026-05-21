"use strict";(()=>{var e={};e.id=4615,e.ids=[4615],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},36827:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>f,patchFetch:()=>y,requestAsyncStorage:()=>p,routeModule:()=>m,serverHooks:()=>g,staticGenerationAsyncStorage:()=>h});var n={};a.r(n),a.d(n,{POST:()=>d,dynamic:()=>c});var o=a(49303),s=a(88716),i=a(60670),r=a(87070),l=a(26729);let c="force-dynamic",u=new Map;async function d(e){try{let t;if(!process.env.OPENROUTER_API_KEY||""===process.env.OPENROUTER_API_KEY.trim())return console.error("OpenRouter API key not configured"),r.NextResponse.json({response:"AI service is not configured. Please contact the administrator to set up the OpenRouter API key. For now, you can use the admin dashboard to view attendance data directly."});let a=e.ip||"unknown",n=Date.now(),o=u.get(a);if(o&&n<o.resetTime){if(o.count>=5)return r.NextResponse.json({error:"Rate limit exceeded. Please wait a moment before trying again."},{status:429});o.count++}else u.set(a,{count:1,resetTime:n+6e4});let{message:s,responseStyle:i="short"}=await e.json();if(!s)return r.NextResponse.json({error:"Message is required"},{status:400});let c="",d=s.toLowerCase(),m=async(e,t=5e3)=>{let a=new AbortController,n=setTimeout(()=>a.abort(),t);try{let t=await fetch(e,{signal:a.signal});return clearTimeout(n),t.ok?await t.json():null}catch(t){return clearTimeout(n),console.error(`Timeout or error fetching ${e}:`,t),null}},p=[];p.push(m(`${e.nextUrl.origin}/api/admin/chatbot-data`).then(e=>e?{type:"chatbot",data:e}:null)),(d.includes("pattern")||d.includes("trend")||d.includes("unusual"))&&p.push(m(`${e.nextUrl.origin}/api/admin/historical-data`).then(e=>e?{type:"historical",data:e}:null)),(d.includes("mood")||d.includes("engagement")||d.includes("wellbeing"))&&p.push(m(`${e.nextUrl.origin}/api/admin/mood-data`).then(e=>e?{type:"mood",data:e}:null));try{(await Promise.allSettled(p)).forEach((e,t)=>{if("fulfilled"===e.status&&e.value){let{type:t,data:a}=e.value;"chatbot"===t?(c+=`Team Status: ${JSON.stringify(a.summary,null,2)}
`,a.currentlyCheckedIn?.length>0&&(c+=`Currently Active: ${JSON.stringify(a.currentlyCheckedIn,null,2)}
`),a.todayStats&&(c+=`Today's Distribution: ${JSON.stringify(a.todayStats,null,2)}
`)):"historical"===t?c+=`Historical Patterns: ${JSON.stringify(a,null,2)}
`:"mood"===t&&(c+=`Mood/Engagement Data: ${JSON.stringify(a,null,2)}
`)}})}catch(e){console.error("Error in parallel data fetching:",e)}let h=c.trim().length>0,g=`You are an INSYDE admin assistant for People Ops/HR teams.

User Question: "${s}"
Response Style: ${i}`;if(h?g+=`

Available Data: ${c}

Instructions:
- Analyze the provided data to answer the user's question
- Provide specific insights based on the actual data
- Use bullet points for lists
- Be concise and actionable
- This company uses Basecamp, Google Workspace, and Canva

Response Style Guidelines:
- SHORT: 1-2 sentences maximum
- DETAILED: 2-3 bullet points with insights  
- REPORT: 3-4 bullet points with recommendations`:g+=`

No specific data available. Provide a helpful response that:
- Acknowledges the data access limitation
- Suggests alternative ways to get the information
- Maintains a professional and helpful tone

Response Style: ${i}`,console.log("Calling OpenRouter with prompt:",g.substring(0,200)+"..."),console.log("Context data available:",c?"Yes":"No"),console.log("Context data length:",c.length),console.log("Has data flag:",h),!h){console.log("No context data available, using fallback response");try{let t=await m(`${e.nextUrl.origin}/api/admin/chatbot-data`,3e3);if(t){let e=`I'm having trouble accessing detailed data right now, but here's what I can tell you:

• **Team Overview**: ${t.summary?.totalEmployees||"Unknown"} total employees
• **Active Today**: ${t.summary?.activeToday||0} people have checked in
• **Currently Online**: ${t.summary?.currentlyCheckedIn||0} people are currently working

For more detailed insights, please try asking again in a few minutes or visit the admin dashboard.`;return r.NextResponse.json({response:e})}}catch(e){console.error("Even basic data fetch failed:",e)}let t=`I'm having trouble accessing the attendance data right now. Here are some things you can check:

• **Team Status**: Visit the admin dashboard for current attendance
• **Quick Stats**: Check today's headcount and remote/office distribution  
• **Manual Review**: Use the snapshot view for detailed employee status

Please try asking again in a few minutes, or use the dashboard for immediate insights.`;return r.NextResponse.json({response:t})}try{t=await Promise.race([(0,l.hn)([{role:"system",content:"You are an INSYDE admin assistant. Provide brief, helpful responses about team attendance and status. Keep responses concise and actionable."},{role:"user",content:g}],.3),new Promise((e,t)=>setTimeout(()=>t(Error("AI timeout")),8e3))])}catch(e){console.log("AI request failed or timed out"),t={success:!1,error:"AI request failed"}}if(console.log("AI Response success:",t.success),console.log("AI Response error:",t.error),console.log("AI Response data preview:",t.data?.substring(0,100)+"..."),!t.success){if(console.error("AI Error:",t.error),h)try{let e=c.split("\n").filter(e=>e.trim()),t="";if(e.forEach(e=>{e.includes("Team Status:")?t+=`
**Current Team Status:**
${e.replace("Team Status:","").trim()}
`:e.includes("Currently Active:")?t+=`
**Currently Working:**
${e.replace("Currently Active:","").trim()}
`:e.includes("Today's Distribution:")&&(t+=`
**Today's Distribution:**
${e.replace("Today's Distribution:","").trim()}
`)}),t){let e=`I'm having trouble processing your request with AI, but here's what I can tell you from the current data:${t}

For more detailed insights, please try asking again in a few minutes or visit the admin dashboard.`;return r.NextResponse.json({response:e})}}catch(e){console.error("Error parsing context data for fallback:",e)}if(h&&c.length>0){let e=`I'm having trouble processing your request with AI, but I can see there is attendance data available. Here's what I can tell you:

• **Data Available**: Current team attendance information is accessible
• **Recent Activity**: ${c.includes("recentActivity")?"Recent check-ins are available":"No recent activity data"}
• **Team Status**: ${c.includes("currentlyCheckedIn")?"Some team members are currently working":"No current active sessions"}

For detailed insights, please visit the admin dashboard or try asking again in a few minutes.`;return r.NextResponse.json({response:e})}let e=`I'm having trouble accessing the attendance data right now. Here are some things you can check:

• **Team Status**: Visit the admin dashboard for current attendance
• **Quick Stats**: Check today's headcount and remote/office distribution  
• **Manual Review**: Use the snapshot view for detailed employee status

Please try asking again in a few minutes, or use the dashboard for immediate insights.`;return r.NextResponse.json({response:e})}let f=t.data||"",y=f.trim().length<5,b=f.length>3e3,w=["stack trace","undefined","null",'))":'].some(e=>f.toLowerCase().includes(e.toLowerCase()));if(y||b||w){console.error("AI response rejected for basic issues:",{content:f.substring(0,100),isTooShort:y,isTooLong:b,hasObviousErrors:w});let e="I'm having trouble processing that request right now. ";return h?e+=`Based on the available data, here's what I can tell you:

• **Team Status**: Check the admin dashboard for current attendance
• **Quick Stats**: Review today's headcount and remote/office distribution  
• **Manual Review**: Use the snapshot view for detailed employee status

Please try asking again in a few minutes, or use the dashboard for immediate insights.`:e+="Please try asking again in a few minutes, or use the dashboard for immediate insights.",r.NextResponse.json({response:e})}let v=f;return[/analysis.*?assistantfinal/i,/we need to.*?good\./i,/let's craft.*?words, within/i,/count words.*?good\./i,/that's \d+ words.*?good\./i,/provide concise.*?assistantfinal/i,/use short style.*?assistantfinal/i].forEach(e=>{v=v.replace(e,"")}),v=v.replace(/analysis/i,"").replace(/assistantfinal/i,"").replace(/^\s*/,"").replace(/\s*$/,""),r.NextResponse.json({response:v})}catch(e){return r.NextResponse.json({error:e instanceof Error?e.message:"Unknown error"},{status:500})}}let m=new o.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/admin-chat/route",pathname:"/api/admin-chat",filename:"route",bundlePath:"app/api/admin-chat/route"},resolvedPagePath:"/Users/rishiraj/Downloads/checkin-main/app/api/admin-chat/route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:p,staticGenerationAsyncStorage:h,serverHooks:g}=m,f="/api/admin-chat/route";function y(){return(0,i.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:h})}},26729:(e,t,a)=>{a.d(t,{E5:()=>i,Rt:()=>s,hn:()=>o,ib:()=>l,xg:()=>r});let n=process.env.OPENROUTER_API_KEY||"";async function o(e,t=.7){if(!n)return console.error("OpenRouter API key not configured"),{success:!1,error:"OpenRouter API key not configured"};for(let a of["moonshotai/kimi-k2:free","google/gemma-3n-e4b-it:free","meta-llama/llama-3.2-3b-instruct:free","microsoft/phi-3-mini-128k-instruct:free"]){console.log(`Trying model: ${a}`);for(let o=1;o<=2;o++)try{let o=new AbortController,s=setTimeout(()=>o.abort(),3e4),i=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${n}`,"Content-Type":"application/json","HTTP-Referer":"https://talkxo-checkin.vercel.app","X-Title":"INSYDE AI"},body:JSON.stringify({model:a,messages:e,temperature:t,max_tokens:1200}),signal:o.signal});if(clearTimeout(s),429===i.status){console.log(`Rate limited on ${a}, trying next model...`);break}if(!i.ok){let e=await i.text();if(console.error(`❌ Model ${a} failed: ${i.status} - ${e}`),401===i.status)return console.error("Authentication error - API key might be invalid"),{success:!1,error:"Authentication failed - check API key"};break}let r=await i.json();return console.log(`✅ Success with model: ${a}`),console.log(`Response length: ${r.choices[0]?.message?.content?.length||0} characters`),{success:!0,data:r.choices[0]?.message?.content||""}}catch(s){console.log(`Model ${a} error (attempt ${o}):`,s);let e="undefined"!=typeof DOMException&&s instanceof DOMException&&"AbortError"===s.name,t=s instanceof Error&&"string"==typeof s.message&&s.message.includes("timeout");if(e||t){console.log(`Timeout on ${a}, trying next model...`);break}if(2===o)break;let n=1e3*Math.pow(2,o-1);await new Promise(e=>setTimeout(e,n))}}return{success:!1,error:"All models failed or rate limited"}}async function s(e,t){return o([{role:"system",content:"You are an HR analyst. Provide concise, actionable insights in Markdown format. Focus on key patterns and recommendations."},{role:"user",content:`Analyze attendance data for ${t}. Format response in Markdown with clear sections:

${JSON.stringify(e,null,2)}

**Provide concise insights in Markdown format:**
- Employee engagement patterns
- Team collaboration trends  
- Well-being indicators
- HR recommendations

Keep each section brief and actionable.`}],.6)}async function i(e,t){return o([{role:"system",content:"You are a workplace productivity expert. Provide personalized schedule recommendations."},{role:"user",content:`Based on this user's attendance patterns and team data, suggest optimal work schedule:

User Data: ${JSON.stringify(e,null,2)}
Team Data: ${JSON.stringify(t,null,2)}

Suggest:
1. Optimal check-in time
2. Recommended work hours
3. Best days for office vs remote
4. Productivity tips based on patterns

Be specific and practical.`}],.6)}async function r(e,t){return o([{role:"system",content:"You are a senior HR professional with expertise in employee engagement, organizational psychology, and workplace well-being. Create comprehensive reports that prioritize human connection, empathy, and employee-centric insights."},{role:"user",content:`Generate a comprehensive HR-focused attendance report for ${t}:

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

Format this as a professional HR report that prioritizes employee well-being and engagement.`}],.5)}async function l(e,t){return o([{role:"system",content:"You are a workplace productivity expert. Return ONLY the final motivational message. Never include reasoning, analysis, or explanations. Just the message."},{role:"user",content:`Create a brief motivational message for ${e?.full_name||"Employee"} who is ${t}.

Write ONLY the final message (max 30 words) with:
- A "Did you know?" fact about productivity or workplace wellness
- A practical tip or encouragement

CRITICAL: Return ONLY the message. No reasoning, no analysis, no word counting, no explanations.

Example: "Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline!"`}],.1)}}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),n=t.X(0,[8948,5972],()=>a(36827));module.exports=n})();