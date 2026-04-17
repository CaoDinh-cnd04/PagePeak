using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/editor-icons")]
public class EditorIconsController(AppDbContext db) : ControllerBase
{
    /// <summary>Lấy toàn bộ icon cho editor (từ DB thay vì hardcode trong iconData.ts)</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] string? category)
    {
        var query = db.EditorIcons.Where(x => x.IsActive).AsQueryable();

        if (!string.IsNullOrEmpty(category))
            query = query.Where(x => x.Category == category);

        var icons = await query
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                id = x.IconId,
                x.Name,
                x.Category,
                @char = x.Char,
                color = x.Color,
            })
            .ToListAsync();

        return Ok(icons);
    }

    /// <summary>Lấy danh sách categories của icon</summary>
    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategories()
    {
        var categoryMap = new Dictionary<string, string>
        {
            ["socials"] = "SOCIALS",
            ["icons"] = "ICONS",
            ["arrows"] = "ARROWS",
            ["pattern"] = "PATTERN",
        };

        var existingCats = await db.EditorIcons
            .Where(x => x.IsActive)
            .Select(x => x.Category)
            .Distinct()
            .ToListAsync();

        var result = existingCats
            .Where(c => categoryMap.ContainsKey(c))
            .OrderBy(c => Array.IndexOf(new[] { "socials", "icons", "arrows", "pattern" }, c))
            .Select(c => new { id = c, label = categoryMap[c] });

        return Ok(result);
    }
}
