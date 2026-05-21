"use strict";(()=>{var e={};e.id=7218,e.ids=[7218],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},14300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},82361:e=>{e.exports=require("events")},57147:e=>{e.exports=require("fs")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},41808:e=>{e.exports=require("net")},71017:e=>{e.exports=require("path")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},24404:e=>{e.exports=require("tls")},57310:e=>{e.exports=require("url")},59796:e=>{e.exports=require("zlib")},83610:(e,t,n)=>{n.r(t),n.d(t,{originalPathname:()=>w,patchFetch:()=>b,requestAsyncStorage:()=>f,routeModule:()=>h,serverHooks:()=>v,staticGenerationAsyncStorage:()=>y});var o={};n.r(o),n.d(o,{POST:()=>g});var r=n(49303),a=n(88716),s=n(60670),i=n(87070),c=n(26729),l=n(89590),u=n(57147),p=n(71017);let d=function(e){let t=[],n=e.split("\n"),o="",r="";for(let e of n)e.startsWith("## **")&&e.endsWith("**")?(o&&r.trim()&&t.push({category:o,content:r.trim()}),o=e.replace("## **","").replace("**","").trim(),r=""):e.startsWith("### ")&&o?r+="\n"+e+"\n":o&&(r+=e+"\n");return o&&r.trim()&&t.push({category:o,content:r.trim()}),t}(function(){try{let e=(0,p.join)(process.cwd(),"components","handbook.md");return(0,u.readFileSync)(e,"utf-8")}catch(e){return console.error("Error reading handbook.md:",e),""}}());async function m(e,t=5){return[]}async function g(e){try{let t;let{query:n,conversationHistory:o=[],userSlug:r}=await e.json();if(!n||"string"!=typeof n)return i.NextResponse.json({error:"Query is required and must be a string"},{status:400});if((n.toLowerCase().includes("leave balance")||n.toLowerCase().includes("my leaves")||n.toLowerCase().includes("how many leaves")||n.toLowerCase().includes("remaining leaves"))&&r)try{let e=await (0,l.H)(r);if(!e.error){let t="";return e.leaveBalance&&e.leaveBalance.length>0?(t="**Your Leave Balance**\n\n",e.leaveBalance.forEach(e=>{t+=`• **${e.leave_type_name}**: ${e.available_leaves} days remaining
`})):t="I couldn't find your leave balance information. ",e.pendingRequests&&e.pendingRequests.length>0&&(t+="\n**Pending Requests:**\n",e.pendingRequests.forEach(e=>{let n="pending"===e.status?"Pending":"Approved",o=new Date(e.start_date).toLocaleDateString("en-US",{month:"short",day:"numeric"}),r=new Date(e.end_date).toLocaleDateString("en-US",{month:"short",day:"numeric"});t+=`• ${o} - ${r} (${e.total_days} days) - ${n}
`})),i.NextResponse.json({success:!0,response:t||"I couldn't retrieve your leave balance. Please contact HR for assistance.",sources:["Leave Management System"],timestamp:new Date().toISOString()})}}catch(e){return console.error("Error fetching leave balance:",e),i.NextResponse.json({success:!0,response:'I\'m having trouble accessing your leave balance right now. You can check your leave balance by clicking the "Leave Balance" button below, or visit the Leave Management system directly.',sources:["Leave Management System"],timestamp:new Date().toISOString()})}let a=await m(n,5);a&&0!==a.length||(a=function(e,t=3){let n=e.toLowerCase(),o=[];for(let e of d){let t=e.content.toLowerCase(),r=0;for(let e of n.split(" ").filter(e=>e.length>2))t.includes(e)&&(r+=1);e.category.toLowerCase().includes(n)&&(r+=2),r>0&&o.push({category:e.category,content:e.content,score:r})}return o.sort((e,t)=>t.score-e.score).slice(0,t)}(n,3));let s=a.length>0?a.map(e=>`${e.category}:
${e.content}`).join("\n\n"):"No specific company information found for this query.",u=`You are an assistant for INSYDE company. You help employees with questions about company policies, procedures, and general information.

IMPORTANT GUIDELINES:
1. Always be helpful, professional, and friendly
2. Base your answers on the provided company knowledge base
3. If you don't have specific information, say so and suggest who to contact
4. Keep responses concise but informative
5. Use a conversational tone
6. If asked about something not in the knowledge base, suggest contacting HR or management
7. NEVER include the words "analysisUser asks" or similar phrases in your response
8. NEVER show your thinking process or internal analysis
9. Respond directly and naturally as if you're having a conversation
10. For leave balance queries, suggest they use the "Leave Balance" quick action button

Company Knowledge Base:
${s}`,p=o.length>0?`

Previous conversation:
${o.map(e=>`${"user"===e.role?"User":"Assistant"}: ${e.content}`).join("\n")}

`:"",g=`${p}Current user question: ${n}`;try{t=await Promise.race([(0,c.hn)([{role:"system",content:u},{role:"user",content:g}],.7),new Promise((e,t)=>setTimeout(()=>t(Error("AI request timeout")),8e3))])}catch(e){console.log("AI request failed or timed out, using fallback response"),t={success:!1,error:"AI request failed"}}if(!t.success){console.log("AI models failed, providing smart fallback response");let e="",t=n.toLowerCase();return e=t.includes("leave")||t.includes("balance")?'I can help you with leave-related questions! You can check your leave balance by clicking the "Leave Balance" button below, or visit the Leave Management system. For specific leave policies, I can provide information from our company handbook.':t.includes("work")||t.includes("culture")||t.includes("policy")?"I can help you with work culture and company policies! Based on our handbook, I can provide information about how we work, our principles, and company policies. What specific aspect would you like to know about?":t.includes("benefit")||t.includes("perk")?"I can help you with benefits and perks information! Our company offers various benefits including paid time off, health insurance, and work culture perks. You can find detailed information in our handbook or contact HR for specific questions.":"I'm here to help with company-related questions! I can assist with leave policies, work culture, benefits, and general company information. You can also use the quick action buttons below for common queries.",i.NextResponse.json({success:!0,response:e,sources:a.map(e=>e.category),timestamp:new Date().toISOString()})}return i.NextResponse.json({success:!0,response:t.data,sources:a.map(e=>e.category),timestamp:new Date().toISOString()})}catch(e){return console.error("AI Assistant error:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}let h=new r.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/ai/assistant/route",pathname:"/api/ai/assistant",filename:"route",bundlePath:"app/api/ai/assistant/route"},resolvedPagePath:"/Users/rishiraj/Downloads/checkin-main/app/api/ai/assistant/route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:f,staticGenerationAsyncStorage:y,serverHooks:v}=h,w="/api/ai/assistant/route";function b(){return(0,s.patchFetch)({serverHooks:v,staticGenerationAsyncStorage:y})}},26729:(e,t,n)=>{n.d(t,{E5:()=>s,Rt:()=>a,hn:()=>r,ib:()=>c,xg:()=>i});let o=process.env.OPENROUTER_API_KEY||"";async function r(e,t=.7){if(!o)return console.error("OpenRouter API key not configured"),{success:!1,error:"OpenRouter API key not configured"};for(let n of["moonshotai/kimi-k2:free","google/gemma-3n-e4b-it:free","meta-llama/llama-3.2-3b-instruct:free","microsoft/phi-3-mini-128k-instruct:free"]){console.log(`Trying model: ${n}`);for(let r=1;r<=2;r++)try{let r=new AbortController,a=setTimeout(()=>r.abort(),3e4),s=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json","HTTP-Referer":"https://talkxo-checkin.vercel.app","X-Title":"INSYDE AI"},body:JSON.stringify({model:n,messages:e,temperature:t,max_tokens:1200}),signal:r.signal});if(clearTimeout(a),429===s.status){console.log(`Rate limited on ${n}, trying next model...`);break}if(!s.ok){let e=await s.text();if(console.error(`❌ Model ${n} failed: ${s.status} - ${e}`),401===s.status)return console.error("Authentication error - API key might be invalid"),{success:!1,error:"Authentication failed - check API key"};break}let i=await s.json();return console.log(`✅ Success with model: ${n}`),console.log(`Response length: ${i.choices[0]?.message?.content?.length||0} characters`),{success:!0,data:i.choices[0]?.message?.content||""}}catch(a){console.log(`Model ${n} error (attempt ${r}):`,a);let e="undefined"!=typeof DOMException&&a instanceof DOMException&&"AbortError"===a.name,t=a instanceof Error&&"string"==typeof a.message&&a.message.includes("timeout");if(e||t){console.log(`Timeout on ${n}, trying next model...`);break}if(2===r)break;let o=1e3*Math.pow(2,r-1);await new Promise(e=>setTimeout(e,o))}}return{success:!1,error:"All models failed or rate limited"}}async function a(e,t){return r([{role:"system",content:"You are an HR analyst. Provide concise, actionable insights in Markdown format. Focus on key patterns and recommendations."},{role:"user",content:`Analyze attendance data for ${t}. Format response in Markdown with clear sections:

${JSON.stringify(e,null,2)}

**Provide concise insights in Markdown format:**
- Employee engagement patterns
- Team collaboration trends  
- Well-being indicators
- HR recommendations

Keep each section brief and actionable.`}],.6)}async function s(e,t){return r([{role:"system",content:"You are a workplace productivity expert. Provide personalized schedule recommendations."},{role:"user",content:`Based on this user's attendance patterns and team data, suggest optimal work schedule:

User Data: ${JSON.stringify(e,null,2)}
Team Data: ${JSON.stringify(t,null,2)}

Suggest:
1. Optimal check-in time
2. Recommended work hours
3. Best days for office vs remote
4. Productivity tips based on patterns

Be specific and practical.`}],.6)}async function i(e,t){return r([{role:"system",content:"You are a senior HR professional with expertise in employee engagement, organizational psychology, and workplace well-being. Create comprehensive reports that prioritize human connection, empathy, and employee-centric insights."},{role:"user",content:`Generate a comprehensive HR-focused attendance report for ${t}:

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

Format this as a professional HR report that prioritizes employee well-being and engagement.`}],.5)}async function c(e,t){return r([{role:"system",content:"You are a workplace productivity expert. Return ONLY the final motivational message. Never include reasoning, analysis, or explanations. Just the message."},{role:"user",content:`Create a brief motivational message for ${e?.full_name||"Employee"} who is ${t}.

Write ONLY the final message (max 30 words) with:
- A "Did you know?" fact about productivity or workplace wellness
- A practical tip or encouragement

CRITICAL: Return ONLY the message. No reasoning, no analysis, no word counting, no explanations.

Example: "Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline!"`}],.1)}},89590:(e,t,n)=>{n.d(t,{H:()=>r});var o=n(85662);async function r(e,t=new Date().getFullYear()){try{let{data:n}=await o.p.from("employees").select("id, full_name, slug").eq("slug",e).maybeSingle();if(!n)return{error:"employee not found"};let{data:r,error:a}=await o.p.rpc("get_employee_leave_balance",{emp_id:n.id,target_year:t});if(a)return console.error("Error fetching leave balance:",a),{error:a.message};let{data:s,error:i}=await o.p.from("leave_accruals").select(`
        month,
        extra_office_days,
        accrued_leaves,
        calculation_date
      `).eq("employee_id",n.id).eq("year",t).order("month",{ascending:!0});i&&console.error("Error fetching accrual history:",i);let{data:c,error:l}=await o.p.from("leave_requests").select(`
        id,
        start_date,
        end_date,
        total_days,
        reason,
        status,
        created_at,
        leave_types(name)
      `).eq("employee_id",n.id).in("status",["pending","approved"]).gte("start_date",`${t}-01-01`).lte("start_date",`${t}-12-31`).order("created_at",{ascending:!1});return l&&console.error("Error fetching pending requests:",l),{employee:n,year:t,leaveBalance:r||[],accrualHistory:s||[],pendingRequests:c||[]}}catch(e){return console.error("Error in getEmployeeLeaveBalance:",e),{error:e instanceof Error?e.message:"Unknown error"}}}},85662:(e,t,n)=>{n.d(t,{p:()=>s});var o=n(12814);let r="https://mfbgnipqkkkredgmediu.supabase.co",a=process.env.SUPABASE_SERVICE_ROLE_KEY||"placeholder-service-role";(0,o.eI)(r,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYmduaXBxamtrcmVkZ21lZGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNzI5OTksImV4cCI6MjAzOTc0ODk5OX0.1wz9tDfhObRgN0gw0TcvJQ0ZhM0QGsp-R5z70BFZB7M");let s=(0,o.eI)(r,a,{auth:{persistSession:!1,autoRefreshToken:!1}})}};var t=require("../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),o=t.X(0,[8948,5972,2814],()=>n(83610));module.exports=o})();