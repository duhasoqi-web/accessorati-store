using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using System.Text.Json.Nodes;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient(); builder.Services.AddSingleton<Store>();
// A single instance intentionally invalidates admin sessions on every restart.
builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
builder.Services.AddProblemDetails();
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 6_000_000);
builder.Services.AddAntiforgery(o => { o.HeaderName="X-CSRF-TOKEN"; o.Cookie.HttpOnly=true; o.Cookie.SameSite=SameSiteMode.Strict; o.Cookie.SecurePolicy=builder.Environment.IsDevelopment()?CookieSecurePolicy.SameAsRequest:CookieSecurePolicy.Always; });
builder.Services.AddAuthentication("Admin").AddCookie("Admin", o => {
    o.Cookie.Name="Accessorati.Admin"; o.Cookie.HttpOnly=true; o.Cookie.SameSite=SameSiteMode.Strict;
    o.Cookie.SecurePolicy=builder.Environment.IsDevelopment()?CookieSecurePolicy.SameAsRequest:CookieSecurePolicy.Always;
    o.ExpireTimeSpan=TimeSpan.FromMinutes(30); o.SlidingExpiration=false;
    o.Events.OnRedirectToLogin=c=>{c.Response.StatusCode=401; return Task.CompletedTask;};
    o.Events.OnRedirectToAccessDenied=c=>{c.Response.StatusCode=403; return Task.CompletedTask;};
    o.Events.OnValidatePrincipal=c=>{
        var id=c.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        if(string.IsNullOrWhiteSpace(builder.Configuration["Admin:UserId"]) || id!=builder.Configuration["Admin:UserId"]) c.RejectPrincipal();
        return Task.CompletedTask;
    };
});
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(o=>{
    o.RejectionStatusCode=429;
    o.GlobalLimiter=PartitionedRateLimiter.Create<HttpContext,string>(c=>RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString()??"unknown",_=>new(){PermitLimit=180,Window=TimeSpan.FromMinutes(1),QueueLimit=0}));
    o.AddPolicy("login",c=>RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString()??"unknown",_=>new(){PermitLimit=5,Window=TimeSpan.FromMinutes(10),QueueLimit=0}));
    o.AddPolicy("checkout",c=>RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString()??"unknown",_=>new(){PermitLimit=5,Window=TimeSpan.FromMinutes(10),QueueLimit=0}));
});
var app=builder.Build();
if (string.Equals(builder.Configuration["RENDER"], "true", StringComparison.OrdinalIgnoreCase))
{
    // Render terminates public HTTPS before forwarding requests to Kestrel.
    app.Use(async (context, next) =>
    {
        context.Request.Scheme = "https";
        await next();
    });
}
app.Use(async(c,next)=>{
    c.Response.Headers["X-Content-Type-Options"]="nosniff"; c.Response.Headers["Referrer-Policy"]="strict-origin-when-cross-origin";
    c.Response.Headers["X-Frame-Options"]="DENY";
    c.Response.Headers["Permissions-Policy"]="camera=(), microphone=(), geolocation=()";
    c.Response.Headers["Content-Security-Policy"]="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
    if(!app.Environment.IsDevelopment()) c.Response.Headers["Strict-Transport-Security"]="max-age=31536000";
    if(c.Request.Path.StartsWithSegments("/api")) c.Response.Headers.CacheControl="no-store";
    try { await next(); }
    catch (AntiforgeryValidationException) { c.Response.StatusCode=400; await c.Response.WriteAsJsonAsync(new {error="انتهت صلاحية الطلب. حدّث الصفحة وحاول مجددًا."}); }
    catch(StoreException e) {c.Response.StatusCode=e.Status; await c.Response.WriteAsJsonAsync(new {error=e.Message});}
    catch(Exception e) {app.Logger.LogError("Request failed: {Type}",e.GetType().Name); c.Response.StatusCode=500; await c.Response.WriteAsJsonAsync(new {error="حدث خطأ مؤقت. حاول لاحقًا."});}
});
app.UseRateLimiter(); app.UseAuthentication(); app.UseAuthorization();
app.Use(async(c,next)=>{if(c.Request.Path.StartsWithSegments("/api") && HttpMethods.IsPost(c.Request.Method)||c.Request.Path.StartsWithSegments("/api") && (HttpMethods.IsPut(c.Request.Method)||HttpMethods.IsDelete(c.Request.Method))) await c.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(c); await next();});
app.UseDefaultFiles(); app.UseStaticFiles();
app.MapGet("/api/health",()=>Results.Ok(new {status="ok"}));
app.MapGet("/api/csrf",(HttpContext c,IAntiforgery a)=>Results.Ok(new{token=a.GetAndStoreTokens(c).RequestToken}));
app.MapGet("/api/catalog",async(Store s)=>{
    if(!s.Ready) return Results.Json(Demo.Catalog);
    var products=await s.Send("/rest/v1/products?active=eq.true&order=created_at.desc",HttpMethod.Get);
    var categories=await s.Send("/rest/v1/categories?order=name",HttpMethod.Get);
    var settings=await s.Send("/rest/v1/store_settings?id=eq.1",HttpMethod.Get);
    return Results.Json(new {mode="connected",products,categories,settings=settings?[0]});
});
app.MapPost("/api/orders",async(Store s,Checkout input)=>{
    input.Validate();
    var result=await s.Send("/rest/v1/rpc/place_order",HttpMethod.Post,new {p_key=input.RequestKey,p_name=input.Name.Trim(),p_phone=input.Phone.Trim(),p_address=input.Address.Trim(),p_notes=input.Notes?.Trim()??"",p_items=input.Items.Select(i=>new {product_id=i.ProductId,quantity=i.Quantity})});
    return Results.Json(result);
}).RequireRateLimiting("checkout");
app.MapPost("/api/admin/login",async(HttpContext c,Store s,Login input,IConfiguration cfg)=>{
    if(string.IsNullOrWhiteSpace(cfg["Admin:UserId"])) throw new StoreException("حساب الإدارة لم يُحدّد بعد.",503);
    if(input.Email?.Length is not > 3 or > 200 || input.Password?.Length is not > 0 or > 200) throw new StoreException("تحقق من بيانات الدخول.",400);
    var result=await s.Send("/auth/v1/token?grant_type=password",HttpMethod.Post,new{email=input.Email,password=input.Password},true);
    var id=result?["user"]?["id"]?.GetValue<string>();
    if(id!=cfg["Admin:UserId"] || result?["user"]?["email_confirmed_at"]==null) throw new StoreException("بيانات الدخول أو صلاحية الحساب غير صحيحة.",401);
    // A Supabase user with MFA enabled must not bypass its second factor.
    var factors=result?["user"]?["factors"]?.AsArray();
    var factor=factors?.FirstOrDefault(f=>f?["status"]?.GetValue<string>()=="verified" && f?["factor_type"]?.GetValue<string>()=="totp");
    if(factor!=null) {
        var token=result!["access_token"]!.GetValue<string>();
        var challenge=await AuthApi.Call(cfg,"/factors/"+factor["id"]!.GetValue<string>()+"/challenge",token,new{});
        var principal=new ClaimsPrincipal(new ClaimsIdentity(new[]{new Claim(ClaimTypes.NameIdentifier,id!),new Claim("token",token),new Claim("factor",factor["id"]!.GetValue<string>()),new Claim("challenge",challenge!["id"]!.GetValue<string>()),new Claim("mfa_pending","true")},"Admin"));
        await c.SignInAsync("Admin",principal,new AuthenticationProperties{ExpiresUtc=DateTimeOffset.UtcNow.AddMinutes(3)});
        return Results.Ok(new{mfa=true});
    }
    if(!app.Environment.IsDevelopment() && cfg["Admin:RequireMfa"]!="false") throw new StoreException("فعّل المصادقة الثنائية لحساب الإدارة قبل الدخول. راجع دليل الإعداد.",403);
    await AuthApi.SignIn(c,id!); return Results.Ok(new{mfa=false});
}).RequireRateLimiting("login");
app.MapPost("/api/admin/verify",async(HttpContext c,IConfiguration cfg,MfaCode input)=>{
    if(c.User.FindFirstValue("mfa_pending")!="true") return Results.Unauthorized();
    if(input.Code?.Length!=6 || !input.Code.All(char.IsAsciiDigit)) throw new StoreException("أدخل رمزًا من 6 أرقام.",400);
    await AuthApi.Call(cfg,"/factors/"+c.User.FindFirstValue("factor")+"/verify",c.User.FindFirstValue("token")!,new{challenge_id=c.User.FindFirstValue("challenge"),code=input.Code});
    await AuthApi.SignIn(c,c.User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Results.Ok(new{ok=true});
}).RequireAuthorization().RequireRateLimiting("login");
app.MapPost("/api/admin/logout",async(HttpContext c)=>{await c.SignOutAsync("Admin"); return Results.Ok();});
var admin=app.MapGroup("/api/admin").RequireAuthorization();
admin.AddEndpointFilter(async(ctx,next)=>ctx.HttpContext.User.HasClaim("mfa_pending","true")?Results.Unauthorized():await next(ctx));
admin.MapGet("/me",(HttpContext c)=>new{authenticated=true});
admin.MapGet("/data",async(Store s)=>Results.Json(new{products=await s.Send("/rest/v1/products?order=created_at.desc",HttpMethod.Get),categories=await s.Send("/rest/v1/categories?order=name",HttpMethod.Get),orders=await s.Send("/rest/v1/orders?select=*,order_items(*)&order=created_at.desc&limit=200",HttpMethod.Get),settings=(await s.Send("/rest/v1/store_settings?id=eq.1",HttpMethod.Get))?[0]}));
admin.MapPost("/products",async(Store s,ProductInput p)=>{p.Validate();return Results.Json(await s.Send("/rest/v1/products",HttpMethod.Post,p));});
admin.MapPut("/products/{id:guid}",async(Store s,Guid id,ProductInput p)=>{p.Validate();return Results.Json(await s.Send("/rest/v1/products?id=eq."+id,HttpMethod.Patch,p));});
admin.MapDelete("/products/{id:guid}",async(Store s,Guid id)=>Results.Json(await s.Send("/rest/v1/products?id=eq."+id,HttpMethod.Patch,new{active=false})));
admin.MapPost("/categories",async(Store s,CategoryInput i)=>{if(string.IsNullOrWhiteSpace(i.Name)||i.Name.Length>60)throw new StoreException("أدخل اسم القسم.",400);return Results.Json(await s.Send("/rest/v1/categories",HttpMethod.Post,new{name=i.Name.Trim()}));});
admin.MapPut("/categories/{id:guid}",async(Store s,Guid id,CategoryInput i)=>{if(string.IsNullOrWhiteSpace(i.Name)||i.Name.Length>60)throw new StoreException("أدخل اسم القسم.",400);return Results.Json(await s.Send("/rest/v1/categories?id=eq."+id,HttpMethod.Patch,new{name=i.Name.Trim()}));});
admin.MapDelete("/categories/{id:guid}",async(Store s,Guid id)=>Results.Json(await s.Send("/rest/v1/categories?id=eq."+id,HttpMethod.Delete)));
admin.MapPut("/orders/{id:guid}",async(Store s,Guid id,StatusInput i)=>{if(!new[]{"قيد التجهيز","تم الشحن","تم التسليم","ملغي"}.Contains(i.Status))throw new StoreException("حالة غير صالحة.",400);return Results.Json(await s.Send("/rest/v1/rpc/update_order_status",HttpMethod.Post,new{p_id=id,p_status=i.Status}));});
admin.MapPut("/settings",async(Store s,SettingsInput i)=>{if(i.shipping_fee<0||i.shipping_fee>100000||i.contact_phone.Length>30||i.delivery_note.Length>300)throw new StoreException("تحقق من الإعدادات.",400);return Results.Json(await s.Send("/rest/v1/store_settings?id=eq.1",HttpMethod.Patch,i));});
admin.MapPost("/upload",async(HttpContext c,Store s)=>{var form=await c.Request.ReadFormAsync();var file=form.Files.GetFile("file")??throw new StoreException("اختر صورة.",400);return Results.Ok(new{url=await s.Upload(file)});});
app.MapFallbackToFile("index.html");
app.Run();

record Login(string? Email,string? Password);
record MfaCode(string? Code);
record CategoryInput(string Name);
record StatusInput(string Status);
record SettingsInput(int shipping_fee,bool accepting_orders,string contact_phone,string delivery_note);
record Item(Guid ProductId,int Quantity);
record Checkout(Guid RequestKey,string Name,string Phone,string Address,string? Notes,Item[] Items){public void Validate(){if(RequestKey==Guid.Empty||string.IsNullOrWhiteSpace(Name)||Name.Length>100||string.IsNullOrWhiteSpace(Phone)||Phone.Length>25||Phone.Count(char.IsAsciiDigit)<8||string.IsNullOrWhiteSpace(Address)||Address.Length>400||Notes?.Length>500||Items==null||Items.Length is <1 or >20||Items.Any(i=>i.ProductId==Guid.Empty||i.Quantity is <1 or >20)||Items.Select(i=>i.ProductId).Distinct().Count()!=Items.Length)throw new StoreException("تحقق من الاسم والهاتف والعنوان ومحتويات السلة.",400);}}
record ProductInput(string name,Guid category_id,string description,int price,int stock,string image_url,bool active,bool is_demo){public void Validate(){if(string.IsNullOrWhiteSpace(name)||name.Length>120||description.Length>2000||category_id==Guid.Empty||price is <1 or >10000000||stock is <0 or >100000||!Uri.TryCreate(image_url,UriKind.Absolute,out var u)||u.Scheme!="https"||image_url.Length>1500)throw new StoreException("تحقق من بيانات المنتج والسعر والكمية ورابط الصورة الآمن.",400);}}
static class AuthApi{
 public static async Task SignIn(HttpContext c,string id)=>await c.SignInAsync("Admin",new ClaimsPrincipal(new ClaimsIdentity(new[]{new Claim(ClaimTypes.NameIdentifier,id)},"Admin")),new AuthenticationProperties{IsPersistent=false});
 public static async Task<JsonNode?> Call(IConfiguration cfg,string path,string token,object body){using var client=new HttpClient{Timeout=TimeSpan.FromSeconds(20)}; using var request=new HttpRequestMessage(HttpMethod.Post,cfg["Supabase:Url"]!.TrimEnd('/')+"/auth/v1"+path); request.Headers.Add("apikey",cfg["Supabase:ServiceKey"]);request.Headers.Authorization=new("Bearer",token);request.Content=JsonContent.Create(body);using var result=await client.SendAsync(request);if(!result.IsSuccessStatusCode)throw new StoreException("تعذر التحقق من رمز المصادقة.",401);return JsonNode.Parse(await result.Content.ReadAsStringAsync());}
}
