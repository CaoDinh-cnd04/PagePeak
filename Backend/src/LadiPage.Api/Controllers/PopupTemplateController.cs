using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/popup-templates")]
public class PopupTemplateController(AppDbContext db) : ControllerBase
{
    /// <summary>Lấy toàn bộ popup templates từ database (thay thế hardcode trong popupTemplateCatalog.ts)</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] string? category)
    {
        var query = db.PopupTemplates
            .Where(x => x.IsActive)
            .AsQueryable();

        if (!string.IsNullOrEmpty(category) && category != "all")
            query = query.Where(x => x.Category == category);

        var templates = await query
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                id = x.TemplateId,
                x.Name,
                x.Category,
                thumbnailUrl = x.ThumbnailUrl,
                content = x.ContentJson,
                x.Width,
                x.Height,
                styles = x.StylesJson,
            })
            .ToListAsync();

        // Parse JSON strings về object
        var result = templates.Select(t => new
        {
            t.id,
            name = t.Name,
            t.Category,
            t.thumbnailUrl,
            content = t.content,
            t.Width,
            t.Height,
            styles = System.Text.Json.JsonSerializer.Deserialize<object>(t.styles ?? "{}"),
        });

        return Ok(result);
    }

    /// <summary>Lấy danh sách categories của popup</summary>
    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategories()
    {
        var categoryMap = new Dictionary<string, string>
        {
            ["sticky"] = "Sticky Bar",
            ["promotion"] = "Promotion",
            ["lucky"] = "Lucky Spin",
            ["upsell"] = "Upselling - Cross Selling",
            ["contact"] = "Contact",
            ["giveaway"] = "Giveaway",
            ["thankyou"] = "Thank You",
            ["floating"] = "Floating Bar",
            ["content"] = "Content",
            ["subscribe"] = "Subscribe",
        };

        var existingCats = await db.PopupTemplates
            .Where(x => x.IsActive)
            .Select(x => x.Category)
            .Distinct()
            .ToListAsync();

        var result = new List<object>
        {
            new { id = "all", label = "Tất cả" }
        };

        result.AddRange(existingCats
            .Where(c => categoryMap.ContainsKey(c))
            .OrderBy(c => c)
            .Select(c => (object)new { id = c, label = categoryMap[c] }));

        return Ok(result);
    }
}
