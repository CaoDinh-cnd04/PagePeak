using LadiPage.Api.Models;
using LadiPage.Application.Features.Pages;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/pages")]
[Authorize]
public class PageController : ControllerBase
{
    private readonly IMediator _mediator;

    public PageController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetPages([FromQuery] long workspaceId, CancellationToken ct)
    {
        var list = await _mediator.Send(new GetPagesQuery(workspaceId), ct);
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePageRequest req, CancellationToken ct)
    {
        try
        {
            var created = await _mediator.Send(new CreatePageCommand(req.WorkspaceId, req.Name, req.Slug, req.TemplateId, req.JsonContent), ct);
            return Ok(created);
        }
        catch (FluentValidation.ValidationException ex)
        {
            return BadRequest(ex.Errors);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:long}/publish")]
    public async Task<IActionResult> Publish(long id, CancellationToken ct)
    {
        var result = await _mediator.Send(new PublishPageCommand(id), ct);
        if (result.Error == "Page not found") return NotFound();
        return result.Success
            ? Ok(new { ok = true, checks = result.Checks })
            : StatusCode(422, new { ok = false, error = result.Error, checks = result.Checks });
    }

    [HttpGet("{id:long}/content")]
    public async Task<IActionResult> GetContent(long id, CancellationToken ct)
    {
        var content = await _mediator.Send(new GetPageContentQuery(id), ct);
        return content is null ? NotFound() : Ok(content);
    }

    [HttpPut("{id:long}/content")]
    public async Task<IActionResult> UpdateContent(long id, [FromBody] PageContentDto body, CancellationToken ct)
    {
        var ok = await _mediator.Send(new UpdatePageContentCommand(id, body), ct);
        return ok ? Ok(new { ok = true }) : NotFound();
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdatePageRequest req, CancellationToken ct)
    {
        var result = await _mediator.Send(new UpdatePageCommand(id, req.Name, req.Slug), ct);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var ok = await _mediator.Send(new DeletePageCommand(id), ct);
        return ok ? Ok(new { ok = true }) : NotFound();
    }

    [HttpPost("{id:long}/duplicate")]
    public async Task<IActionResult> Duplicate(long id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DuplicatePageCommand(id), ct);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpGet("{id:long}/stats")]
    public async Task<IActionResult> GetStats(long id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetPageStatsQuery(id), ct);
        return result != null ? Ok(result) : NotFound();
    }
}
