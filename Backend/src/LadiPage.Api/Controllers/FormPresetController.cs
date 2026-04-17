using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/form-presets")]
public class FormPresetController(AppDbContext db) : ControllerBase
{
    /// <summary>Lấy toàn bộ form presets từ database (thay thế hardcode trong formData.ts)</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] string? formType, [FromQuery] string? tabName)
    {
        var query = db.FormPresetTemplates
            .Where(x => x.IsActive)
            .AsQueryable();

        if (!string.IsNullOrEmpty(formType))
            query = query.Where(x => x.FormType == formType);

        if (!string.IsNullOrEmpty(tabName))
            query = query.Where(x => x.TabName == tabName);

        var presets = await query
            .OrderBy(x => x.Order)
            .Select(x => new
            {
                x.PresetId,
                x.Name,
                x.FormType,
                x.TabName,
                x.Title,
                x.ButtonText,
                Fields = x.FieldsJson,
                x.InputStyle,
                x.Width,
                x.Height,
                x.ButtonColor,
                x.ButtonTextColor,
                x.BackgroundColor,
                x.FormBorderRadius,
                x.TitleColor,
                x.InputRadius,
                x.AccentColor,
            })
            .ToListAsync();

        // Parse FieldsJson thành object để trả về đúng format
        var result = presets.Select(p => new
        {
            id = p.PresetId,
            p.Name,
            formType = p.FormType,
            tabName = p.TabName,
            p.Title,
            buttonText = p.ButtonText,
            fields = System.Text.Json.JsonSerializer.Deserialize<object>(p.Fields ?? "[]"),
            inputStyle = p.InputStyle,
            p.Width,
            p.Height,
            buttonColor = p.ButtonColor,
            buttonTextColor = p.ButtonTextColor,
            backgroundColor = p.BackgroundColor,
            formBorderRadius = p.FormBorderRadius,
            titleColor = p.TitleColor,
            inputRadius = p.InputRadius,
            accentColor = p.AccentColor,
        });

        return Ok(result);
    }

    /// <summary>Lấy danh sách tabs và số preset của mỗi tab</summary>
    [HttpGet("tabs")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTabs()
    {
        var tabs = await db.FormPresetTemplates
            .Where(x => x.IsActive)
            .GroupBy(x => x.TabName)
            .Select(g => new { tabName = g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(tabs);
    }
}
