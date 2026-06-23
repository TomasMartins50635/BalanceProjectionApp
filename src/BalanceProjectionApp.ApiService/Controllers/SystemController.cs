using BalanceProjectionApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("[controller]")]
public class SystemController(AppDbContext db) : ControllerBase
{
    [HttpGet("db-path")]
    public IActionResult DbPath()
    {
        var connStr = db.Database.GetConnectionString() ?? "";
        var builder = new SqliteConnectionStringBuilder(connStr);
        var src = builder.DataSource;

        if (string.IsNullOrEmpty(src))
            return Problem("Caminho da base de dados não encontrado.");

        var absolutePath = Path.IsPathRooted(src) ? src : Path.GetFullPath(src);
        return Ok(new { path = absolutePath });
    }
}
