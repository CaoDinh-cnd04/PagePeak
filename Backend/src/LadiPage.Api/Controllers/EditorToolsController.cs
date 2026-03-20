using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/editor-tools")]
[AllowAnonymous]
public class EditorToolsController : ControllerBase
{
    private readonly AppDbContext _db;

    public EditorToolsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetTools(CancellationToken ct)
    {
        var categories = await _db.ToolCategories
            .Where(c => c.IsActive)
            .OrderBy(c => c.Order)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                icon = c.Icon,
                order = c.Order,
                items = c.Items
                    .Where(i => i.IsActive)
                    .OrderBy(i => i.Order)
                    .Select(i => new
                    {
                        id = i.Id,
                        name = i.Name,
                        icon = i.Icon,
                        elementType = i.ElementType,
                        order = i.Order,
                        hasSubTabs = i.HasSubTabs,
                        subTabs = i.SubTabsJson,
                        presets = i.Presets
                            .OrderBy(p => p.Order)
                            .Select(p => new
                            {
                                id = p.Id,
                                name = p.Name,
                                tabName = p.TabName,
                                defaultContent = p.DefaultContent,
                                stylesJson = p.StylesJson,
                                defaultWidth = p.DefaultWidth,
                                defaultHeight = p.DefaultHeight,
                                order = p.Order
                            }).ToList()
                    }).ToList()
            }).ToListAsync(ct);
        return Ok(categories);
    }
}
