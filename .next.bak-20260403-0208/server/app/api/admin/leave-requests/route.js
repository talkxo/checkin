"use strict";(()=>{var e={};e.id=775,e.ids=[775],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},14300:e=>{e.exports=require("buffer")},6113:e=>{e.exports=require("crypto")},82361:e=>{e.exports=require("events")},13685:e=>{e.exports=require("http")},95687:e=>{e.exports=require("https")},41808:e=>{e.exports=require("net")},85477:e=>{e.exports=require("punycode")},12781:e=>{e.exports=require("stream")},24404:e=>{e.exports=require("tls")},57310:e=>{e.exports=require("url")},59796:e=>{e.exports=require("zlib")},297:(e,r,t)=>{t.r(r),t.d(r,{originalPathname:()=>q,patchFetch:()=>_,requestAsyncStorage:()=>c,routeModule:()=>d,serverHooks:()=>v,staticGenerationAsyncStorage:()=>m});var s={};t.r(s),t.d(s,{GET:()=>u,dynamic:()=>l});var a=t(49303),o=t(88716),i=t(60670),n=t(87070),p=t(85662);async function u(e){try{let r=new URL(e.url).searchParams.get("status")||"all",t=p.p.from("leave_requests").select(`
        id,
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        reason,
        status,
        approved_by,
        approved_at,
        created_at,
        updated_at,
        employees!leave_requests_employee_id_fkey(full_name, email),
        leave_types!leave_requests_leave_type_id_fkey(name)
      `).order("created_at",{ascending:!1});"all"!==r&&(t=t.eq("status",r));let{data:s,error:a}=await t;if(a)return console.error("Error fetching leave requests:",a),n.NextResponse.json({error:a.message},{status:500});return n.NextResponse.json({leaveRequests:s||[]})}catch(e){return console.error("Error in admin leave requests API:",e),n.NextResponse.json({error:e instanceof Error?e.message:"Unknown error"},{status:500})}}let l="force-dynamic",d=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/admin/leave-requests/route",pathname:"/api/admin/leave-requests",filename:"route",bundlePath:"app/api/admin/leave-requests/route"},resolvedPagePath:"/Users/rishiraj/Downloads/checkin-main/app/api/admin/leave-requests/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:c,staticGenerationAsyncStorage:m,serverHooks:v}=d,q="/api/admin/leave-requests/route";function _(){return(0,i.patchFetch)({serverHooks:v,staticGenerationAsyncStorage:m})}},85662:(e,r,t)=>{t.d(r,{p:()=>i});var s=t(12814);let a="https://mfbgnipqkkkredgmediu.supabase.co",o=process.env.SUPABASE_SERVICE_ROLE_KEY||"placeholder-service-role";(0,s.eI)(a,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYmduaXBxamtrcmVkZ21lZGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNzI5OTksImV4cCI6MjAzOTc0ODk5OX0.1wz9tDfhObRgN0gw0TcvJQ0ZhM0QGsp-R5z70BFZB7M");let i=(0,s.eI)(a,o,{auth:{persistSession:!1,autoRefreshToken:!1}})}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[8948,5972,2814],()=>t(297));module.exports=s})();