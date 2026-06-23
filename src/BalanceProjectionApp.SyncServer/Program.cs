using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseExceptionHandler();

var dataDir = app.Configuration["DataDir"] ?? Path.Combine(AppContext.BaseDirectory, "data");
var masterKey = app.Configuration["MasterKey"]
    ?? throw new InvalidOperationException("MasterKey não configurada.");

Directory.CreateDirectory(dataDir);

string ClientsPath => Path.Combine(dataDir, "clients.json");

List<ClientRecord> LoadClients()
{
    if (!File.Exists(ClientsPath)) return [];
    return JsonSerializer.Deserialize<List<ClientRecord>>(File.ReadAllText(ClientsPath)) ?? [];
}

void SaveClients(List<ClientRecord> clients) =>
    File.WriteAllText(ClientsPath,
        JsonSerializer.Serialize(clients, new JsonSerializerOptions { WriteIndented = true }));

ClientRecord? Authenticate(HttpContext ctx)
{
    if (!ctx.Request.Headers.TryGetValue("X-Api-Key", out var key)) return null;
    return LoadClients().FirstOrDefault(c => c.ApiKey == key.ToString());
}

bool AuthenticateMaster(HttpContext ctx) =>
    ctx.Request.Headers.TryGetValue("X-Master-Key", out var key) && key == masterKey;

// GET /version — devolve o timestamp do último upload do cliente
app.MapGet("/version", (HttpContext ctx) =>
{
    var client = Authenticate(ctx);
    if (client is null) return Results.Unauthorized();

    var dbPath = Path.Combine(dataDir, client.Id, "database.db");
    if (!File.Exists(dbPath))
        return Results.Ok(new { timestamp = (DateTimeOffset?)null });

    var ts = new DateTimeOffset(File.GetLastWriteTimeUtc(dbPath), TimeSpan.Zero);
    return Results.Ok(new { timestamp = (DateTimeOffset?)ts });
});

// GET /download — devolve o ficheiro .db do cliente
app.MapGet("/download", (HttpContext ctx) =>
{
    var client = Authenticate(ctx);
    if (client is null) return Results.Unauthorized();

    var dbPath = Path.Combine(dataDir, client.Id, "database.db");
    if (!File.Exists(dbPath)) return Results.NotFound();

    return Results.File(dbPath, "application/octet-stream", "database.db");
});

// POST /upload — recebe o ficheiro .db do cliente
app.MapPost("/upload", async (HttpContext ctx) =>
{
    var client = Authenticate(ctx);
    if (client is null) return Results.Unauthorized();

    if (!ctx.Request.HasFormContentType)
        return Results.BadRequest(new { title = "Esperado multipart/form-data." });

    var form = await ctx.Request.ReadFormAsync();
    var file = form.Files["database"];
    if (file is null)
        return Results.BadRequest(new { title = "Campo 'database' em falta." });

    var clientDir = Path.Combine(dataDir, client.Id);
    Directory.CreateDirectory(clientDir);

    var dbPath = Path.Combine(clientDir, "database.db");
    var tmpPath = dbPath + ".tmp";

    await using (var stream = File.Create(tmpPath))
        await file.CopyToAsync(stream);

    // substituição atómica para não corromper o ficheiro em caso de falha
    File.Move(tmpPath, dbPath, overwrite: true);

    var ts = new DateTimeOffset(File.GetLastWriteTimeUtc(dbPath), TimeSpan.Zero);
    return Results.Ok(new { timestamp = ts });
});

// GET /admin/clients — lista clientes (sem expor API keys)
app.MapGet("/admin/clients", (HttpContext ctx) =>
{
    if (!AuthenticateMaster(ctx)) return Results.Unauthorized();
    return Results.Ok(LoadClients().Select(c => new { c.Id, c.Name }));
});

// POST /admin/clients — cria novo cliente e gera a sua API key
app.MapPost("/admin/clients", (HttpContext ctx, CreateClientRequest req) =>
{
    if (!AuthenticateMaster(ctx)) return Results.Unauthorized();

    var clients = LoadClients();
    if (clients.Any(c => c.Name.Equals(req.Name, StringComparison.OrdinalIgnoreCase)))
        return Results.Conflict(new { title = "Já existe um cliente com esse nome." });

    var client = new ClientRecord(
        Id: Guid.NewGuid().ToString("N"),
        Name: req.Name,
        ApiKey: Guid.NewGuid().ToString("N")
    );

    clients.Add(client);
    SaveClients(clients);
    Directory.CreateDirectory(Path.Combine(dataDir, client.Id));

    return Results.Ok(new { client.Id, client.Name, client.ApiKey });
});

// DELETE /admin/clients/{id} — remove cliente e os seus dados
app.MapDelete("/admin/clients/{id}", (HttpContext ctx, string id) =>
{
    if (!AuthenticateMaster(ctx)) return Results.Unauthorized();

    var clients = LoadClients();
    var client = clients.FirstOrDefault(c => c.Id == id);
    if (client is null) return Results.NotFound();

    clients.Remove(client);
    SaveClients(clients);

    var clientDir = Path.Combine(dataDir, id);
    if (Directory.Exists(clientDir))
        Directory.Delete(clientDir, recursive: true);

    return Results.NoContent();
});

app.Run();

record ClientRecord(string Id, string Name, string ApiKey);
record CreateClientRequest(string Name);
