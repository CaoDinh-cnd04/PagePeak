using LadiPage.Api.Models;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public ProductController(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] long workspaceId, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, workspaceId)) return NotFound();
        var items = await _db.Products.Where(p => p.WorkspaceId == workspaceId).OrderByDescending(p => p.CreatedAt)
            .Select(p => new { p.Id, p.Name, p.Price, p.SalePrice, p.Description, p.ImageUrl, p.Category, p.Stock, p.Status, p.CreatedAt }).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, req.WorkspaceId)) return NotFound();
        var p = new Product
        {
            WorkspaceId = req.WorkspaceId,
            Name = req.Name.Trim(),
            Price = req.Price,
            SalePrice = req.SalePrice,
            Description = req.Description,
            ImageUrl = req.ImageUrl,
            Category = req.Category,
            Stock = req.Stock,
            Status = "active",
            CreatedAt = DateTime.UtcNow,
        };
        _db.Products.Add(p);
        await _db.SaveChangesAsync(ct);
        return Ok(new { p.Id, p.Name, p.Price, p.SalePrice, p.Description, p.ImageUrl, p.Category, p.Stock, p.Status, p.CreatedAt });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateProductRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var p = await _db.Products.FindAsync([id], ct);
        if (p == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, p.WorkspaceId)) return NotFound();
        if (!string.IsNullOrWhiteSpace(req.Name)) p.Name = req.Name.Trim();
        if (req.Price.HasValue) p.Price = req.Price.Value;
        if (req.Description != null) p.Description = req.Description;
        if (req.ImageUrl != null) p.ImageUrl = req.ImageUrl;
        if (req.Category != null) p.Category = req.Category;
        if (req.Stock.HasValue) p.Stock = req.Stock.Value;
        if (!string.IsNullOrWhiteSpace(req.Status)) p.Status = req.Status;
        await _db.SaveChangesAsync(ct);
        return Ok(new { p.Id, p.Name, p.Price, p.SalePrice, p.Stock, p.Status });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var p = await _db.Products.FindAsync([id], ct);
        if (p == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, p.WorkspaceId)) return NotFound();
        _db.Products.Remove(p);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
