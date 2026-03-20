using LadiPage.Api.Models;
using LadiPage.Application.Features.Workspaces;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/workspaces")]
[Authorize]
public class WorkspaceController : ControllerBase
{
    private readonly IMediator _mediator;

    public WorkspaceController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var list = await _mediator.Send(new GetWorkspacesQuery(), ct);
        return Ok(list);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var w = await _mediator.Send(new GetWorkspaceByIdQuery(id), ct);
        return w == null ? NotFound() : Ok(w);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWorkspaceRequest req, CancellationToken ct)
    {
        try
        {
            var result = await _mediator.Send(new CreateWorkspaceCommand(req.Name, req.Slug), ct);
            return Created($"/api/workspaces/{result.Id}", result);
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Slug"))
        {
            return Conflict(new { error = ex.Message });
        }
        catch (FluentValidation.ValidationException ex)
        {
            return BadRequest(ex.Errors);
        }
    }
}
