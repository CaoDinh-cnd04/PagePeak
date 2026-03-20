using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/debug")]
[AllowAnonymous]
public class DebugController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public DebugController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet("db")]
    public IActionResult GetDbInfo()
    {
        var conn = _db.Database.GetDbConnection();
        return Ok(new
        {
            dataSource = conn.DataSource,
            database = conn.Database,
            environment = HttpContext.RequestServices.GetRequiredService<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>().EnvironmentName,
            configured = _config.GetConnectionString("DefaultConnection") is string cs && !string.IsNullOrWhiteSpace(cs)
        });
    }
}
