using LadiPage.Api.Models;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/forms")]
[Authorize]
public class FormController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public FormController(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    [HttpGet]
    public async Task<IActionResult> GetForms([FromQuery] long workspaceId, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, workspaceId)) return NotFound();
        var items = await _db.FormConfigs.Where(f => f.WorkspaceId == workspaceId).OrderByDescending(f => f.CreatedAt)
            .Select(f => new { f.Id, f.Name, f.FieldsJson, f.WebhookUrl, f.EmailNotify, f.CreatedAt }).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFormRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, req.WorkspaceId)) return NotFound();
        var form = new FormConfig { WorkspaceId = req.WorkspaceId, Name = req.Name.Trim(), FieldsJson = req.FieldsJson ?? "[]", WebhookUrl = req.WebhookUrl, EmailNotify = req.EmailNotify, CreatedAt = DateTime.UtcNow };
        _db.FormConfigs.Add(form);
        await _db.SaveChangesAsync(ct);
        return Ok(new { form.Id, form.Name, form.FieldsJson, form.WebhookUrl, form.EmailNotify, form.CreatedAt });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateFormRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var form = await _db.FormConfigs.FindAsync([id], ct);
        if (form == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, form.WorkspaceId)) return NotFound();
        if (!string.IsNullOrWhiteSpace(req.Name)) form.Name = req.Name.Trim();
        if (req.FieldsJson != null) form.FieldsJson = req.FieldsJson;
        if (req.WebhookUrl != null) form.WebhookUrl = string.IsNullOrWhiteSpace(req.WebhookUrl) ? null : req.WebhookUrl.Trim();
        form.EmailNotify = req.EmailNotify;
        await _db.SaveChangesAsync(ct);
        return Ok(new { form.Id, form.Name, form.FieldsJson, form.WebhookUrl, form.EmailNotify });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var form = await _db.FormConfigs.FindAsync([id], ct);
        if (form == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, form.WorkspaceId)) return NotFound();
        _db.FormConfigs.Remove(form);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
