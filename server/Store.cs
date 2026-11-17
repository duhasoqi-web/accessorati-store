using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;

public sealed class Store(IConfiguration config, IHttpClientFactory factory)
{
    public bool Ready => Uri.TryCreate(config["Supabase:Url"], UriKind.Absolute, out var u) && u.Scheme == "https" && !string.IsNullOrWhiteSpace(config["Supabase:ServiceKey"]);
    public async Task<JsonNode?> Send(string path, HttpMethod method, object? body = null, bool auth = false)
    {
        if (!Ready) throw new StoreException("لم يتم ربط قاعدة البيانات بعد.", 503);
        using var client = factory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(20);
        using var req = new HttpRequestMessage(method, config["Supabase:Url"]!.TrimEnd('/') + path);
        req.Headers.Add("apikey", config["Supabase:ServiceKey"]);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config["Supabase:ServiceKey"]);
        req.Headers.Add("Prefer", "return=representation");
        if (body != null) req.Content = JsonContent.Create(body);
        using var response = await client.SendAsync(req);
        var text = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            if (auth) throw new StoreException("تعذر تسجيل الدخول. تأكد من البيانات وصلاحية الحساب.", 401);
            // Never expose provider errors, SQL, credentials or customer details.
            if ((int)response.StatusCode < 500) throw new StoreException("تعذر تنفيذ العملية. تحقق من البيانات والمخزون وإعدادات المتجر.", 400);
            throw new StoreException("خدمة البيانات غير متاحة مؤقتًا.", 503);
        }
        return string.IsNullOrWhiteSpace(text) ? null : JsonNode.Parse(text);
    }
    public async Task<string> Upload(IFormFile file)
    {
        if (!Ready) throw new StoreException("قاعدة البيانات غير متصلة.", 503);
        if (file.Length is <= 0 or > 5_000_000) throw new StoreException("الحد الأقصى للصورة 5 ميجابايت.", 400);
        using var data = new MemoryStream(); await file.CopyToAsync(data); var bytes = data.ToArray();
        var type = bytes.Length > 12 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47 ? "image/png" :
                   bytes.Length > 3 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff ? "image/jpeg" :
                   bytes.Length > 12 && System.Text.Encoding.ASCII.GetString(bytes,0,4)=="RIFF" && System.Text.Encoding.ASCII.GetString(bytes,8,4)=="WEBP" ? "image/webp" : null;
        if (type == null) throw new StoreException("الصورة يجب أن تكون PNG أو JPEG أو WebP.", 400);
        var name = Guid.NewGuid().ToString("N") + (type=="image/png"?".png":type=="image/jpeg"?".jpg":".webp");
        using var client = factory.CreateClient(); client.Timeout = TimeSpan.FromSeconds(30);
        using var req = new HttpRequestMessage(HttpMethod.Post,config["Supabase:Url"]!.TrimEnd('/')+"/storage/v1/object/products/"+name);
        req.Headers.Add("apikey", config["Supabase:ServiceKey"]); req.Headers.Authorization = new("Bearer", config["Supabase:ServiceKey"]);
        req.Content = new ByteArrayContent(bytes); req.Content.Headers.ContentType = new(type);
        using var res = await client.SendAsync(req);
        if (!res.IsSuccessStatusCode) throw new StoreException("تعذر رفع الصورة.", 503);
        return config["Supabase:Url"]!.TrimEnd('/')+"/storage/v1/object/public/products/"+name;
    }
}
public sealed class StoreException(string message, int status) : Exception(message) { public int Status { get; } = status; }
