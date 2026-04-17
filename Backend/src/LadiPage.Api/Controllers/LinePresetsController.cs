using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/line-presets")]
public class LinePresetsController(AppDbContext db) : ControllerBase
{
    /// <summary>Lấy danh sách mẫu đường kẻ (từ DB thay vì hardcode trong lineData.ts)</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] string? tab)
    {
        var query = db.LinePresets.Where(x => x.IsActive).AsQueryable();

        if (!string.IsNullOrEmpty(tab))
            query = query.Where(x => x.Tab == tab);

        var presets = await query
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                id = x.PresetId,
                x.Name,
                style = x.Style,
                color = x.Color,
                thickness = x.Thickness,
                dashArrayJson = x.DashArrayJson,
                tab = x.Tab,
            })
            .ToListAsync();

        // Parse dashArrayJson về array nếu có
        var result = presets.Select(p => new
        {
            p.id,
            p.Name,
            p.style,
            p.color,
            p.thickness,
            dashArray = p.dashArrayJson != null
                ? System.Text.Json.JsonSerializer.Deserialize<int[]>(p.dashArrayJson)
                : null,
            p.tab,
        });

        return Ok(result);
    }
}
