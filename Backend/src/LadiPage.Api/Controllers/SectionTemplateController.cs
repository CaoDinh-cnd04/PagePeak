using LadiPage.Api.Models;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/section-templates")]
public class SectionTemplateController : ControllerBase
{
    private readonly IAppDbContext _db;

    public SectionTemplateController(IAppDbContext db) => _db = db;

    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(Duration = 120, VaryByQueryKeys = [])]
    public async Task<IActionResult> GetTemplates(CancellationToken ct)
    {
        var templates = await _db.Templates.AsNoTracking()
            .Where(t => t.Category == "section")
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new { t.Id, t.Name, t.ThumbnailUrl, t.JsonContent })
            .ToListAsync(ct);
        return Ok(templates);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] SectionTemplateCreateDto dto, CancellationToken ct)
    {
        var template = new Template
        {
            Name = dto.Name,
            Category = "section",
            ThumbnailUrl = dto.PreviewUrl,
            JsonContent = dto.JsonContent,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Templates.Add(template);
        await _db.SaveChangesAsync(ct);
        return Created($"/api/section-templates/{template.Id}", new { template.Id, template.Name });
    }
}
