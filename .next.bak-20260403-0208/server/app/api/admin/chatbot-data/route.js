"use strict";(()=>{var e={};e.id=207,e.ids=[207],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},14300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},82361:e=>{e.exports=require("events")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},41808:e=>{e.exports=require("net")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},24404:e=>{e.exports=require("tls")},57310:e=>{e.exports=require("url")},59796:e=>{e.exports=require("zlib")},25184:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>y,patchFetch:()=>f,requestAsyncStorage:()=>h,routeModule:()=>p,serverHooks:()=>k,staticGenerationAsyncStorage:()=>g});var n={};o.r(n),o.d(n,{GET:()=>u,dynamic:()=>m});var r=o(49303),i=o(88716),a=o(60670),s=o(87070),c=o(85662),l=o(81829);let m="force-dynamic";async function u(e){try{let e=(0,l.eG)(),t=new Date(e);t.setHours(0,0,0,0);let o=new Date(e);o.setDate(e.getDate()-7);let{data:n}=await c.p.from("employees").select("id, full_name, slug, active").eq("active",!0).order("full_name"),{data:r}=await c.p.from("sessions").select(`
        id,
        checkin_ts,
        checkout_ts,
        mode,
        mood,
        mood_comment,
        employees (
          id,
          full_name,
          slug
        )
      `).gte("checkin_ts",t.toISOString()).lte("checkin_ts",e.toISOString()).order("checkin_ts",{ascending:!1}),{data:i}=await c.p.from("sessions").select(`
        id,
        checkin_ts,
        mode,
        employees (
          id,
          full_name,
          slug
        )
      `).is("checkout_ts",null).order("checkin_ts",{ascending:!1}),{data:a}=await c.p.from("sessions").select(`
        id,
        checkin_ts,
        checkout_ts,
        mode,
        employees (
          id,
          full_name,
          slug
        )
      `).gte("checkin_ts",o.toISOString()).lte("checkin_ts",e.toISOString()).order("checkin_ts",{ascending:!1}).limit(20);if(console.log("=== TIME DEBUG ==="),console.log("Current time (now):",e.toISOString()),console.log("Current time (IST):",e.toLocaleString("en-US",{timeZone:"Asia/Kolkata"})),a&&a.length>0){let e=a[0];console.log("Latest session checkin_ts (raw):",e.checkin_ts),console.log("Latest session checkin_ts (parsed):",new Date(e.checkin_ts).toISOString()),console.log("Latest session checkin_ts (IST):",new Date(e.checkin_ts).toLocaleString("en-US",{timeZone:"Asia/Kolkata"}))}console.log("=== END TIME DEBUG ===");let m={summary:{totalEmployees:n?.length||0,activeToday:r?.length||0,currentlyCheckedIn:i?.length||0,recentActivity:a?.length||0},currentlyCheckedIn:i?.map(t=>{let o=Array.isArray(t.employees)?t.employees[0]:t.employees,n=new Date(t.checkin_ts);return{name:o?.full_name||"Unknown",checkinTime:n.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"}),mode:t.mode,timeAgo:d(n,e)}})||[],recentActivity:a?.map(t=>{let o=Array.isArray(t.employees)?t.employees[0]:t.employees,n=new Date(t.checkin_ts);return{name:o?.full_name||"Unknown",checkinTime:n.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"}),mode:t.mode,isOpen:!t.checkout_ts,timeAgo:d(n,e)}})||[],todayStats:{officeCount:r?.filter(e=>"office"===e.mode).length||0,remoteCount:r?.filter(e=>"remote"===e.mode).length||0,totalSessions:r?.length||0},employees:n?.map(e=>({name:e.full_name,slug:e.slug,active:e.active}))||[],moodData:r?.filter(e=>e.mood).map(e=>{let t=Array.isArray(e.employees)?e.employees[0]:e.employees;return{name:t?.full_name||"Unknown",mood:e.mood,comment:e.mood_comment||""}})||[]};return s.NextResponse.json(m)}catch(e){return console.error("Chatbot data error:",e),s.NextResponse.json({error:e instanceof Error?e.message:"Unknown error"},{status:500})}}function d(e,t){let o=Math.floor((t.getTime()-e.getTime())/6e4),n=Math.floor(o/60),r=Math.floor(n/24);return r>0?`${r} day${r>1?"s":""} ago`:n>0?`${n} hour${n>1?"s":""} ago`:o>0?`${o} minute${o>1?"s":""} ago`:"Just now"}let p=new r.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/admin/chatbot-data/route",pathname:"/api/admin/chatbot-data",filename:"route",bundlePath:"app/api/admin/chatbot-data/route"},resolvedPagePath:"/Users/rishiraj/Downloads/checkin-main/app/api/admin/chatbot-data/route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:h,staticGenerationAsyncStorage:g,serverHooks:k}=p,y="/api/admin/chatbot-data/route";function f(){return(0,a.patchFetch)({serverHooks:k,staticGenerationAsyncStorage:g})}},85662:(e,t,o)=>{o.d(t,{p:()=>a});var n=o(12814);let r="https://mfbgnipqkkkredgmediu.supabase.co",i=process.env.SUPABASE_SERVICE_ROLE_KEY||"placeholder-service-role";(0,n.eI)(r,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYmduaXBxamtrcmVkZ21lZGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNzI5OTksImV4cCI6MjAzOTc0ODk5OX0.1wz9tDfhObRgN0gw0TcvJQ0ZhM0QGsp-R5z70BFZB7M");let a=(0,n.eI)(r,i,{auth:{persistSession:!1,autoRefreshToken:!1}})},81829:(e,t,o)=>{o.d(t,{It:()=>s,JE:()=>a,eG:()=>r,rb:()=>i});let n="Asia/Kolkata",r=()=>new Date,i=()=>{let e=r().getDay();return e>=1&&e<=5},a=e=>{try{return new Date(e).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:n})}catch{return new Date(e).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}},s=e=>{try{return new Date(e).toLocaleDateString("en-CA",{timeZone:n})}catch{return new Date(e).toLocaleDateString("en-CA")}}}};var t=require("../../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),n=t.X(0,[8948,5972,2814],()=>o(25184));module.exports=n})();