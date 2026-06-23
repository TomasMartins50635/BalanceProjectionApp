var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseExceptionHandler();

var logger = app.Logger;
var dataDir = app.Configuration["DataDir"] ?? Path.Combine(AppContext.BaseDirectory, "data");
var apiKey  = app.Configuration["ApiKey"]
    ?? throw new InvalidOperationException("ApiKey não configurada.");

Directory.CreateDirectory(dataDir);

bool Authenticate(HttpContext ctx)
{
    if (!ctx.Request.Headers.TryGetValue("X-Api-Key", out var key) || key != apiKey)
    {
        logger.LogWarning("401 {Method} {Path} — chave inválida ou ausente (IP: {IP})",
            ctx.Request.Method, ctx.Request.Path, ctx.Connection.RemoteIpAddress);
        return false;
    }
    return true;
}

var dbPath = Path.Combine(dataDir, "database.db");

// GET /version — devolve o timestamp do último upload
app.MapGet("/version", (HttpContext ctx) =>
{
    if (!Authenticate(ctx)) return Results.Unauthorized();

    if (!File.Exists(dbPath))
    {
        logger.LogInformation("GET /version — sem base de dados");
        return Results.Ok(new { timestamp = (DateTimeOffset?)null });
    }

    var ts = new DateTimeOffset(File.GetLastWriteTimeUtc(dbPath), TimeSpan.Zero);
    logger.LogInformation("GET /version — {Timestamp}", ts);
    return Results.Ok(new { timestamp = (DateTimeOffset?)ts });
});

// GET /download — devolve o ficheiro .db
app.MapGet("/download", (HttpContext ctx) =>
{
    if (!Authenticate(ctx)) return Results.Unauthorized();

    if (!File.Exists(dbPath))
    {
        logger.LogWarning("GET /download — base de dados não encontrada");
        return Results.NotFound();
    }

    var size = new FileInfo(dbPath).Length;
    logger.LogInformation("GET /download — {Size} bytes", size);
    return Results.File(dbPath, "application/octet-stream", "database.db");
});

// POST /upload — recebe o ficheiro .db
app.MapPost("/upload", async (HttpContext ctx) =>
{
    if (!Authenticate(ctx)) return Results.Unauthorized();

    if (!ctx.Request.HasFormContentType)
    {
        logger.LogWarning("POST /upload — content-type inválido: {CT}", ctx.Request.ContentType);
        return Results.BadRequest(new { title = "Esperado multipart/form-data." });
    }

    var form = await ctx.Request.ReadFormAsync();
    var file = form.Files["database"];
    if (file is null)
    {
        logger.LogWarning("POST /upload — campo 'database' em falta");
        return Results.BadRequest(new { title = "Campo 'database' em falta." });
    }

    var tmpPath = dbPath + ".tmp";
    await using (var stream = File.Create(tmpPath))
        await file.CopyToAsync(stream);

    File.Move(tmpPath, dbPath, overwrite: true);

    var ts = new DateTimeOffset(File.GetLastWriteTimeUtc(dbPath), TimeSpan.Zero);
    logger.LogInformation("POST /upload — {Size} bytes guardados ({Timestamp})", file.Length, ts);
    return Results.Ok(new { timestamp = ts });
});

app.Run();
